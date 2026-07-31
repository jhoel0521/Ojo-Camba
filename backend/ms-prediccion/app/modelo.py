"""
Carga del modelo entrenado y armado del pronostico (ISSUE-31).

La prediccion de la proxima semana se construye con la historia hasta hoy: por
cada zona y categoria se toma la ultima fila conocida y se desplazan los
rezagos. Nada de la semana a predecir entra como variable — es justamente lo
que hace honesto al pronostico (ver el comentario de COLUMNAS_PREDICTORAS).
"""

from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import Engine, text

from .dataset import COLUMNAS_PREDICTORAS, MESES_LLUVIOSOS, construir


class ModeloNoEntrenado(RuntimeError):
    """El servicio arranca sin modelo: hay que llamar a POST /entrenar."""


class Pronosticador:
    def __init__(self, directorio: Path):
        self.directorio = directorio
        self._modelo = None
        self._metadatos: dict | None = None

    @property
    def disponible(self) -> bool:
        return (self.directorio / "modelo.joblib").exists()

    def cargar(self) -> None:
        if not self.disponible:
            raise ModeloNoEntrenado(
                "No hay modelo entrenado. Ejecuta POST /entrenar o `python -m app.entrenar_cli`."
            )
        self._modelo = joblib.load(self.directorio / "modelo.joblib")
        self._metadatos = json.loads(
            (self.directorio / "metadatos.json").read_text(encoding="utf-8")
        )

    @property
    def metadatos(self) -> dict:
        if self._metadatos is None:
            self.cargar()
        return self._metadatos  # type: ignore[return-value]

    def _asegurar_cargado(self):
        if self._modelo is None:
            self.cargar()
        return self._modelo

    def pronosticar(self, engine: Engine, clima: pd.DataFrame | None = None) -> pd.DataFrame:
        modelo = self._asegurar_cargado()
        historia = construir(engine, clima)
        if historia.empty:
            raise ValueError("No hay historia suficiente para pronosticar.")

        futuro = _fila_de_la_proxima_semana(historia, clima)
        futuro["casos_pronosticados"] = np.clip(modelo.predict(futuro[COLUMNAS_PREDICTORAS]), 0, None)

        # Confianza: el error tipico del modelo en prueba acota el intervalo. No
        # es un intervalo estadistico formal, y se declara como tal en la API.
        rmse = float(self.metadatos["comparacion"][0]["prueba"]["rmse"])
        for resultado in self.metadatos["comparacion"]:
            if resultado["nombre"] == self.metadatos["modelo_elegido"]:
                rmse = float(resultado["prueba"]["rmse"])
        futuro["margen"] = rmse
        futuro["confianza"] = _confianza(futuro["casos_pronosticados"], rmse)
        return futuro


def _fila_de_la_proxima_semana(historia: pd.DataFrame, clima: pd.DataFrame | None) -> pd.DataFrame:
    """Desplaza los rezagos una semana hacia adelante para cada zona/categoria."""
    ultima_semana = historia["semana"].max()
    proxima = ultima_semana + timedelta(days=7)

    ultimas = historia.sort_values("semana").groupby(["h3", "categoria_id"], as_index=False).last()

    futuro = pd.DataFrame(
        {
            "semana": proxima,
            "h3": ultimas["h3"],
            "categoria_id": ultimas["categoria_id"],
            # Lo de la semana pasada pasa a ser el rezago 1, y asi sucesivamente.
            "casos_lag_1": ultimas["casos_nuevos"],
            "casos_lag_2": ultimas["casos_lag_1"],
            "casos_lag_3": ultimas["casos_lag_2"],
            "reportes_lag_1": ultimas["reportes"],
            "reportes_lag_2": ultimas["reportes_lag_1"],
            "reportes_lag_3": ultimas["reportes_lag_2"],
            "dispositivos_lag_1": ultimas["dispositivos"],
            "gravedad_lag_1": ultimas["gravedad_media"],
            "casos_abiertos_inicio": ultimas["casos_abiertos_inicio"],
            "cuadrillas_activas": ultimas["cuadrillas_activas"],
            "carga_por_cuadrilla": ultimas["carga_por_cuadrilla"],
        }
    )

    futuro["casos_media_4"] = (
        futuro[["casos_lag_1", "casos_lag_2", "casos_lag_3"]].mean(axis=1)
    )
    futuro["reportes_media_4"] = (
        futuro[["reportes_lag_1", "reportes_lag_2", "reportes_lag_3"]].mean(axis=1)
    )

    futuro["mes"] = proxima.month
    futuro["semana_del_anio"] = int(pd.Timestamp(proxima).isocalendar().week)
    futuro["es_lluvias"] = int(proxima.month in MESES_LLUVIOSOS)

    # El clima de la semana que viene es un pronostico meteorologico, no un dato
    # observado: si no hay, se usa el promedio historico del mismo mes.
    if clima is not None and not clima.empty and (clima["semana"] == proxima).any():
        fila = clima[clima["semana"] == proxima].iloc[0]
        futuro["precipitacion_mm"] = float(fila["precipitacion_mm"])
        futuro["temperatura_media"] = float(fila["temperatura_media"])
    else:
        del_mes = historia[historia["mes"] == proxima.month]
        futuro["precipitacion_mm"] = float(del_mes["precipitacion_mm"].mean() or 0.0)
        futuro["temperatura_media"] = float(del_mes["temperatura_media"].mean() or 0.0)

    return futuro


def _confianza(prediccion: pd.Series, rmse: float) -> pd.Series:
    """
    Alta cuando el margen de error es chico frente a lo pronosticado. Con
    valores cercanos a cero cualquier error relativo es enorme, asi que la
    confianza baja: es honesto avisar que ahi el modelo no distingue.
    """
    relativo = rmse / prediccion.clip(lower=0.5)
    return pd.cut(
        relativo,
        bins=[-np.inf, 0.5, 1.0, np.inf],
        labels=["alta", "media", "baja"],
    ).astype(str)


SQL_UMBRALES = """
SELECT clave, valor FROM configuracion_operativa
WHERE clave IN ('visitas_meta_diaria', 'carga_alerta', 'carga_maxima')
"""


def leer_umbrales(engine: Engine, respaldo: dict[str, int]) -> dict[str, int]:
    """Los umbrales operativos son configurables (ISSUE-26): se leen de la base."""
    try:
        with engine.connect() as conexion:
            filas = conexion.execute(text(SQL_UMBRALES)).fetchall()
        umbrales = {clave: int(valor) for clave, valor in filas}
    except Exception:  # noqa: BLE001
        umbrales = {}
    return {**respaldo, **umbrales}
