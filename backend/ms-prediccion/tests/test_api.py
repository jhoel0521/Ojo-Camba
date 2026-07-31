"""
Contrato HTTP de la API (ISSUE-31).

Estas pruebas fijan lo que el gateway y el panel de decision (ISSUE-32) pueden
dar por sentado: que campos llegan, que codigo sale cuando todavia no hay
modelo y que una estimacion nunca se presenta como dato observado.

No tocan la base ni el modelo entrenado: el pronosticador y el estado de las
cuadrillas se sustituyen por dobles, porque lo que se prueba aca es el contrato
de la API, no el pipeline (eso vive en los otros dos archivos de tests).
"""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app import main
from app.alertas import Estado
from app.modelo import ModeloNoEntrenado

METADATOS = {
    "version_modelo": "20260730120000",
    "version_dataset": "1.0.0",
    "modelo_elegido": "regresion_lineal",
    "comparacion": [{"nombre": "regresion_lineal", "prueba": {"rmse": 1.25}}],
    "limitaciones": ["El historial de Casos es sintetico (simulador de ISSUE-28)."],
}


def _pronostico(filas: list[dict]) -> pd.DataFrame:
    """Lo que devuelve Pronosticador.pronosticar, con las columnas que usa la API."""
    return pd.DataFrame(
        [
            {
                "semana": pd.Timestamp("2026-08-03"),
                "h3": fila.get("h3", "z1"),
                "categoria_id": fila.get("categoria_id", 1),
                "casos_pronosticados": fila["casos"],
                "casos_abiertos_inicio": fila.get("abiertos", 0),
                "casos_media_4": 2.0,
                "es_lluvias": 0,
                "precipitacion_mm": 0.0,
                "margen": 1.25,
                "confianza": fila.get("confianza", "media"),
            }
            for fila in filas
        ]
    )


class PronosticadorFalso:
    disponible = True

    def __init__(self, datos: pd.DataFrame):
        self._datos = datos

    @property
    def metadatos(self) -> dict:
        return METADATOS

    def pronosticar(self, engine, clima=None) -> pd.DataFrame:
        return self._datos


class PronosticadorSinModelo:
    """Como arranca el servicio recien desplegado: sin nada entrenado."""

    disponible = False
    _error = ModeloNoEntrenado(
        "No hay modelo entrenado. Ejecuta POST /entrenar o `python -m app.entrenar_cli`."
    )

    @property
    def metadatos(self) -> dict:
        raise self._error

    def pronosticar(self, engine, clima=None):
        raise self._error


@pytest.fixture(autouse=True)
def sin_dependencias_externas(monkeypatch):
    """Ni clima descargado, ni base: la API se prueba aislada."""
    monkeypatch.setattr(main, "_clima_cacheado", lambda: None)
    monkeypatch.setattr(main, "leer_umbrales", lambda engine, respaldo: respaldo)
    monkeypatch.setattr(
        main.modulo_alertas,
        "leer_estado",
        lambda engine, umbrales: Estado(
            cuadrillas_activas=2,
            reportes_abiertos=4,
            reportes_por_caso=2.0,
            capacidad=2 * umbrales["carga_maxima"],
        ),
    )


def cliente(pronosticador, monkeypatch) -> TestClient:
    monkeypatch.setattr(main, "_pronosticador", pronosticador)
    return TestClient(main.app)


@pytest.fixture
def con_modelo(monkeypatch):
    datos = _pronostico([{"casos": 3.0, "confianza": "alta"}])
    return cliente(PronosticadorFalso(datos), monkeypatch)


@pytest.fixture
def sin_modelo(monkeypatch):
    return cliente(PronosticadorSinModelo(), monkeypatch)


def test_health_avisa_si_todavia_no_hay_modelo(sin_modelo):
    """El health tiene que distinguir "vivo" de "listo para pronosticar"."""
    cuerpo = sin_modelo.get("/health").json()
    assert cuerpo["status"] == "ok"
    assert cuerpo["service"] == "ms-prediccion"
    assert cuerpo["modelo_entrenado"] is False


@pytest.mark.parametrize("ruta", ["/modelo", "/pronostico", "/alertas"])
def test_sin_modelo_responde_409_y_dice_como_entrenar(sin_modelo, ruta):
    """
    409 y no 500: no es una falla del servicio, es un estado esperado del
    despliegue. El detalle tiene que decir como salir de ahi.
    """
    respuesta = sin_modelo.get(ruta)
    assert respuesta.status_code == 409
    assert "entrenar" in respuesta.json()["detail"].lower()


def test_el_pronostico_se_declara_como_estimacion(con_modelo):
    """
    ISSUE-32 exige no mezclar observado con estimado. El campo `origen` y la
    version del modelo son lo que le permite al panel etiquetar la fuente.
    """
    cuerpo = con_modelo.get("/pronostico").json()
    assert cuerpo["origen"] == "estimacion"
    assert cuerpo["version_modelo"] == METADATOS["version_modelo"]
    assert cuerpo["version_dataset"] == METADATOS["version_dataset"]
    assert cuerpo["modelo"] == "regresion_lineal"
    assert cuerpo["limitaciones"], "el pronostico nunca sale sin sus limitaciones"


def test_el_pronostico_cubre_siete_dias_y_trae_confianza(con_modelo):
    cuerpo = con_modelo.get("/pronostico").json()
    assert cuerpo["periodo"] == {"desde": "2026-08-03", "hasta": "2026-08-09"}

    detalle = cuerpo["detalle"][0]
    assert set(detalle) == {
        "zona_h3",
        "categoria_id",
        "casos_estimados",
        "margen_error",
        "confianza",
    }
    assert detalle["confianza"] == "alta"
    assert detalle["margen_error"] == 1.25
    assert cuerpo["total_casos_estimados"] == 3.0


def test_el_pronostico_filtra_por_zona_y_categoria(monkeypatch):
    datos = _pronostico(
        [
            {"casos": 3.0, "h3": "z1", "categoria_id": 1},
            {"casos": 5.0, "h3": "z2", "categoria_id": 1},
            {"casos": 7.0, "h3": "z2", "categoria_id": 2},
        ]
    )
    api = cliente(PronosticadorFalso(datos), monkeypatch)

    assert api.get("/pronostico?zona=z2").json()["total_casos_estimados"] == 12.0
    assert api.get("/pronostico?categoria_id=2").json()["total_casos_estimados"] == 7.0
    assert api.get("/pronostico?zona=z2&categoria_id=1").json()["total_casos_estimados"] == 5.0


def test_un_filtro_sin_resultados_no_rompe_el_periodo(con_modelo):
    """Zona inexistente: responde vacio, no revienta al calcular el periodo."""
    cuerpo = con_modelo.get("/pronostico?zona=no-existe").json()
    assert cuerpo["periodo"] == {"desde": None, "hasta": None}
    assert cuerpo["detalle"] == []
    assert cuerpo["total_casos_estimados"] == 0


def test_las_alertas_publican_capacidad_umbrales_y_recomendacion(monkeypatch):
    """
    La issue pide una recomendacion explicable, no una metrica suelta: la
    respuesta tiene que mostrar de donde sale el riesgo.
    """
    api = cliente(PronosticadorFalso(_pronostico([{"casos": 40.0}])), monkeypatch)
    cuerpo = api.get("/alertas").json()

    assert cuerpo["umbrales"]["carga_maxima"] == 10
    assert cuerpo["capacidad"]["cuadrillas_activas"] == 2
    assert cuerpo["capacidad"]["capacidad_reportes"] == 20
    assert cuerpo["total"] == 1

    alerta = cuerpo["alertas"][0]
    assert alerta["nivel"] == "apoyo"
    assert cuerpo["por_nivel"]["apoyo"] == 1
    assert alerta["factores"], "la alerta explica por que"
    assert "Solicitar apoyo" in alerta["recomendacion"]


def test_las_alertas_aclaran_que_no_asignan_cuadrillas(con_modelo):
    """El servicio recomienda; la decision y su motivo son del coordinador."""
    assert "no asigna" in con_modelo.get("/alertas").json()["nota"]


def test_solo_criticas_es_el_valor_por_defecto(monkeypatch):
    api = cliente(PronosticadorFalso(_pronostico([{"casos": 0.5}])), monkeypatch)
    assert api.get("/alertas").json()["total"] == 0
    assert api.get("/alertas?solo_criticas=false").json()["total"] == 1


@pytest.mark.parametrize("semanas", [3, 27])
def test_entrenar_rechaza_ventanas_de_prueba_absurdas(con_modelo, semanas):
    """
    Menos de 4 semanas no mide nada y mas de 26 se come la historia disponible.
    Se corta en la API para no descubrirlo despues de minutos de entrenamiento.
    """
    assert con_modelo.post(f"/entrenar?semanas_prueba={semanas}").status_code == 422
