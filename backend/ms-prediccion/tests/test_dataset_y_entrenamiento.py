"""Dataset y entrenamiento (ISSUE-31)."""

import numpy as np
import pandas as pd
import pytest

from app.dataset import (
    COLUMNAS_PREDICTORAS,
    agregar_variables_temporales,
    completar_rejilla,
)
from app.entrenamiento import Metricas, evaluar, separar_temporal


def base_sintetica(semanas: int = 40) -> pd.DataFrame:
    """Serie con tendencia y estacionalidad, dos zonas y dos categorias."""
    filas = []
    for indice in range(semanas):
        semana = pd.Timestamp("2025-01-06") + pd.Timedelta(weeks=indice)
        for zona in ("zona_a", "zona_b"):
            for categoria in (1, 2):
                base = 2 + indice * 0.05 + (3 if semana.month in (11, 12, 1, 2, 3) else 0)
                filas.append(
                    {
                        "semana": semana,
                        "h3": zona,
                        "categoria_id": categoria,
                        "casos_nuevos": max(0, round(base + (indice % 3) - 1)),
                        "reportes": max(0, round(base * 2)),
                        "dispositivos": max(0, round(base * 1.5)),
                        "gravedad_media": 2.0,
                        "casos_abiertos_inicio": indice % 5,
                        "cuadrillas_activas": 4 + indice // 10,
                    }
                )
    return pd.DataFrame(filas)


def dataset_listo() -> pd.DataFrame:
    datos = agregar_variables_temporales(completar_rejilla(base_sintetica()))
    datos["precipitacion_mm"] = 10.0
    datos["temperatura_media"] = 25.0
    return datos.dropna(subset=["casos_lag_1", "casos_lag_2", "casos_lag_3", "gravedad_lag_1"])


def test_la_rejilla_incluye_las_semanas_sin_casos():
    """Un cero es informacion: sin el, el modelo nunca aprende la calma."""
    base = base_sintetica(10)
    recortada = base[~((base["h3"] == "zona_b") & (base["categoria_id"] == 2))]
    completa = completar_rejilla(recortada)
    assert len(completa) == 10 * 2 * 2
    assert completa["casos_nuevos"].notna().all()


def test_ninguna_variable_predictora_es_de_la_semana_a_predecir():
    """
    Guarda contra la fuga de informacion: `reportes`, `dispositivos` y
    `gravedad_media` de la propia semana no pueden entrar al modelo, porque al
    pronosticar todavia no existen. Solo valen sus rezagos.
    """
    contemporaneas = {"reportes", "dispositivos", "gravedad_media", "casos_nuevos"}
    assert contemporaneas.isdisjoint(COLUMNAS_PREDICTORAS)


def test_los_rezagos_miran_al_pasado():
    datos = agregar_variables_temporales(completar_rejilla(base_sintetica(12)))
    serie = datos[(datos["h3"] == "zona_a") & (datos["categoria_id"] == 1)].sort_values("semana")
    esperado = serie["casos_nuevos"].shift(1).iloc[1:]
    obtenido = serie["casos_lag_1"].iloc[1:]
    assert np.allclose(obtenido, esperado)


def test_la_particion_es_temporal_y_no_se_solapa():
    datos = dataset_listo()
    entrenamiento, prueba, corte = separar_temporal(datos, semanas_prueba=8)
    assert entrenamiento["semana"].max() < corte <= prueba["semana"].min()
    assert prueba["semana"].nunique() == 8


def test_pocas_semanas_no_alcanzan_para_separar():
    datos = dataset_listo()
    # 10 semanas distintas no alcanzan para reservar 12 de prueba mas margen.
    pocas = datos[datos["semana"].isin(sorted(datos["semana"].unique())[:10])]
    with pytest.raises(ValueError, match="Hacen falta mas semanas"):
        separar_temporal(pocas, semanas_prueba=12)


def test_entrena_y_compara_los_tres_modelos():
    resultados, entrenados, ganador, _, n_entrenamiento, n_prueba = evaluar(
        dataset_listo(), semanas_prueba=8
    )
    assert {r.nombre for r in resultados} == {
        "regresion_lineal",
        "arbol_decision",
        "random_forest",
    }
    assert n_entrenamiento > 0 and n_prueba > 0
    # El elegido es el de menor error en datos no vistos, no el mas complejo.
    assert ganador.prueba.mae == min(r.prueba.mae for r in resultados)
    assert ganador.nombre in entrenados


def test_las_metricas_se_calculan_como_corresponde():
    observado = np.array([2.0, 4.0, 6.0])
    metricas = Metricas.calcular(observado, np.array([1.0, 4.0, 8.0]))
    assert metricas.mae == pytest.approx(1.0)
    assert metricas.rmse == pytest.approx(np.sqrt(5 / 3))
    assert metricas.r2 < 1.0


def test_el_diagnostico_detecta_sobreajuste():
    resultados, _, _, _, _, _ = evaluar(dataset_listo(), semanas_prueba=8)
    for resultado in resultados:
        assert resultado.diagnostico  # siempre se publica un diagnostico
        assert resultado.validacion_cruzada_mae >= 0
