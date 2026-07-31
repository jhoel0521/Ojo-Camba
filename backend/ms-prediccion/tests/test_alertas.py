"""Reglas de alerta por capacidad (ISSUE-31)."""

import pandas as pd
import pytest

from app.alertas import UMBRAL_APOYO, UMBRAL_PREVENTIVO, Estado, generar


def estado(cuadrillas=2, abiertos=0, reportes_por_caso=1.0, carga_maxima=10) -> Estado:
    return Estado(
        cuadrillas_activas=cuadrillas,
        reportes_abiertos=abiertos,
        reportes_por_caso=reportes_por_caso,
        capacidad=cuadrillas * carga_maxima,
    )


def pronostico(casos: float, abiertos: float = 0, zona: str = "z1") -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "h3": zona,
                "categoria_id": 1,
                "casos_pronosticados": casos,
                "casos_abiertos_inicio": abiertos,
                "casos_media_4": 1.0,
                "es_lluvias": 0,
                "precipitacion_mm": 0.0,
                "confianza": "alta",
            }
        ]
    )


def test_por_debajo_del_umbral_no_alerta():
    # Una sola zona: la cuota es toda la capacidad (20 reportes).
    alertas, _ = generar(pronostico(casos=10), estado())
    assert alertas[0].nivel == "normal"
    assert alertas[0].riesgo == pytest.approx(0.5)


def test_ochenta_por_ciento_dispara_preventiva():
    alertas, _ = generar(pronostico(casos=16), estado())
    assert alertas[0].riesgo == pytest.approx(UMBRAL_PREVENTIVO)
    assert alertas[0].nivel == "preventiva"


def test_cien_por_ciento_dispara_apoyo():
    alertas, _ = generar(pronostico(casos=20), estado())
    assert alertas[0].riesgo == pytest.approx(UMBRAL_APOYO)
    assert alertas[0].nivel == "apoyo"
    assert "Solicitar apoyo" in alertas[0].recomendacion


def test_la_cola_abierta_tambien_ocupa_capacidad():
    """Los Casos ya abiertos cuentan: si no, el riesgo saldria subestimado."""
    sin_cola, _ = generar(pronostico(casos=10), estado())
    con_cola, _ = generar(pronostico(casos=10, abiertos=8), estado())

    # 10 de 20 es media capacidad; sumando la cola son 18 de 20.
    assert sin_cola[0].riesgo == pytest.approx(0.5)
    assert sin_cola[0].nivel == "normal"
    assert con_cola[0].riesgo == pytest.approx(0.9)
    assert con_cola[0].nivel == "preventiva"


def test_la_carga_se_mide_en_reportes_no_en_casos():
    """ISSUE-26: la capacidad se cuenta por reportes abiertos, no por Casos."""
    alertas, resumen = generar(pronostico(casos=10), estado(reportes_por_caso=2.0))
    assert alertas[0].reportes_estimados == pytest.approx(20.0)
    assert alertas[0].riesgo == pytest.approx(1.0)
    assert resumen["reportes_por_caso"] == pytest.approx(2.0)


def test_solo_criticas_omite_las_normales():
    datos = pd.concat([pronostico(casos=1, zona="tranquila"), pronostico(casos=30, zona="saturada")])
    todas, _ = generar(datos, estado(), solo_criticas=False)
    criticas, _ = generar(datos, estado(), solo_criticas=True)
    assert len(todas) == 2
    assert [a.zona_h3 for a in criticas] == ["saturada"]


def test_las_alertas_explican_por_que():
    """La issue pide recomendacion explicable, no una metrica suelta."""
    alertas, _ = generar(pronostico(casos=25, abiertos=3), estado(abiertos=15))
    alerta = alertas[0]
    assert alerta.factores, "toda alerta debe traer factores"
    assert any("reportes abiertos" in f for f in alerta.factores)
    assert alerta.recomendacion != "Sin accion requerida."


def test_ordena_por_riesgo_descendente():
    datos = pd.concat(
        [pronostico(casos=5, zona="a"), pronostico(casos=40, zona="b"), pronostico(casos=20, zona="c")]
    )
    alertas, _ = generar(datos, estado(), solo_criticas=False)
    assert [a.zona_h3 for a in alertas] == ["b", "c", "a"]
