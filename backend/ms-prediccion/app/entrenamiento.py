"""
Entrenamiento y comparacion de modelos (ISSUE-31).

Compara Regresion Lineal, Arbol de Decision y Random Forest sobre el mismo
dataset y elige uno con evidencia, no por preferencia.

Dos decisiones que condicionan todo el resultado:

1. La particion es TEMPORAL, nunca aleatoria. Un split al azar dejaria semanas
   futuras en entrenamiento y pasadas en prueba: el modelo "adivinaria" con
   informacion que en produccion no va a tener, y las metricas saldrian
   preciosas y mentirosas.
2. La validacion cruzada es TimeSeriesSplit por el mismo motivo: cada pliegue
   entrena con el pasado y valida con el futuro inmediato.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeRegressor

from .dataset import COLUMNAS_PREDICTORAS, COLUMNA_OBJETIVO

VERSION_DATASET = "1.0.0"
SEMANAS_PRUEBA = 12


@dataclass
class Metricas:
    mae: float
    rmse: float
    r2: float

    @staticmethod
    def calcular(observado: np.ndarray, predicho: np.ndarray) -> "Metricas":
        return Metricas(
            mae=float(mean_absolute_error(observado, predicho)),
            rmse=float(np.sqrt(mean_squared_error(observado, predicho))),
            r2=float(r2_score(observado, predicho)),
        )


@dataclass
class ResultadoModelo:
    nombre: str
    entrenamiento: Metricas
    prueba: Metricas
    validacion_cruzada_mae: float
    validacion_cruzada_desvio: float
    diagnostico: str

    def como_dict(self) -> dict:
        salida = asdict(self)
        salida["entrenamiento"] = asdict(self.entrenamiento)
        salida["prueba"] = asdict(self.prueba)
        return salida


def construir_modelos() -> dict[str, Pipeline]:
    """
    n_jobs=1 a proposito: este servicio puede terminar entrenando en un VPS de
    dos nucleos compartido con el resto de la plataforma, y un Random Forest en
    paralelo lo deja sin aire.
    """
    return {
        "regresion_lineal": Pipeline(
            [("escalado", StandardScaler()), ("modelo", LinearRegression())]
        ),
        "arbol_decision": Pipeline(
            [("modelo", DecisionTreeRegressor(max_depth=8, min_samples_leaf=5, random_state=42))]
        ),
        "random_forest": Pipeline(
            [
                (
                    "modelo",
                    RandomForestRegressor(
                        n_estimators=100,
                        max_depth=12,
                        min_samples_leaf=3,
                        random_state=42,
                        n_jobs=1,
                    ),
                )
            ]
        ),
    }


def separar_temporal(datos: pd.DataFrame, semanas_prueba: int = SEMANAS_PRUEBA):
    semanas = np.sort(datos["semana"].unique())
    if len(semanas) <= semanas_prueba + 4:
        raise ValueError(
            f"Hacen falta mas semanas para separar entrenamiento y prueba: hay {len(semanas)}."
        )
    corte = semanas[-semanas_prueba]
    entrenamiento = datos[datos["semana"] < corte]
    prueba = datos[datos["semana"] >= corte]
    return entrenamiento, prueba, pd.Timestamp(corte)


def _diagnosticar(entrenamiento: Metricas, prueba: Metricas) -> str:
    """Sobreajuste y subajuste leidos de la brecha entre entrenamiento y prueba."""
    if entrenamiento.mae <= 0.01 and prueba.mae > entrenamiento.mae * 3:
        return "sobreajuste severo: memoriza el entrenamiento y falla en datos nuevos"
    if prueba.mae > entrenamiento.mae * 1.5:
        return "sobreajuste moderado: la brecha entre entrenamiento y prueba es amplia"
    if prueba.r2 < 0.3 and entrenamiento.r2 < 0.3:
        return "subajuste: el modelo no captura el patron ni en entrenamiento"
    return "ajuste razonable: el error de prueba acompana al de entrenamiento"


def evaluar(datos: pd.DataFrame, semanas_prueba: int = SEMANAS_PRUEBA):
    entrenamiento, prueba, corte = separar_temporal(datos, semanas_prueba)

    x_entrenamiento = entrenamiento[COLUMNAS_PREDICTORAS]
    y_entrenamiento = entrenamiento[COLUMNA_OBJETIVO]
    x_prueba = prueba[COLUMNAS_PREDICTORAS]
    y_prueba = prueba[COLUMNA_OBJETIVO]

    particion = TimeSeriesSplit(n_splits=5)
    resultados: list[ResultadoModelo] = []
    entrenados: dict[str, Pipeline] = {}

    for nombre, modelo in construir_modelos().items():
        errores_cv = []
        for indices_entrenamiento, indices_validacion in particion.split(x_entrenamiento):
            modelo.fit(
                x_entrenamiento.iloc[indices_entrenamiento],
                y_entrenamiento.iloc[indices_entrenamiento],
            )
            prediccion = modelo.predict(x_entrenamiento.iloc[indices_validacion])
            errores_cv.append(
                mean_absolute_error(y_entrenamiento.iloc[indices_validacion], prediccion)
            )

        modelo.fit(x_entrenamiento, y_entrenamiento)
        metricas_entrenamiento = Metricas.calcular(
            y_entrenamiento, modelo.predict(x_entrenamiento)
        )
        metricas_prueba = Metricas.calcular(y_prueba, modelo.predict(x_prueba))

        resultados.append(
            ResultadoModelo(
                nombre=nombre,
                entrenamiento=metricas_entrenamiento,
                prueba=metricas_prueba,
                validacion_cruzada_mae=float(np.mean(errores_cv)),
                validacion_cruzada_desvio=float(np.std(errores_cv)),
                diagnostico=_diagnosticar(metricas_entrenamiento, metricas_prueba),
            )
        )
        entrenados[nombre] = modelo

    # Se elige por MAE en datos no vistos: es el error medio en cantidad de
    # Casos, la unidad con la que el coordinador razona.
    ganador = min(resultados, key=lambda r: r.prueba.mae)
    return resultados, entrenados, ganador, corte, len(entrenamiento), len(prueba)


def importancia_variables(modelo: Pipeline, nombre: str) -> dict[str, float]:
    interno = modelo.named_steps["modelo"]
    if hasattr(interno, "feature_importances_"):
        valores = interno.feature_importances_
    elif hasattr(interno, "coef_"):
        valores = np.abs(interno.coef_)
    else:
        return {}
    total = float(np.sum(valores)) or 1.0
    pares = sorted(
        ((c, float(v) / total) for c, v in zip(COLUMNAS_PREDICTORAS, valores)),
        key=lambda p: p[1],
        reverse=True,
    )
    return dict(pares)


def entrenar_y_guardar(
    datos: pd.DataFrame,
    directorio: Path,
    procedencia_clima: dict,
    origen_datos: str,
    semanas_prueba: int = SEMANAS_PRUEBA,
) -> dict:
    resultados, entrenados, ganador, corte, n_entrenamiento, n_prueba = evaluar(
        datos, semanas_prueba
    )
    modelo = entrenados[ganador.nombre]

    version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    joblib.dump(modelo, directorio / "modelo.joblib")

    metadatos = {
        "version_modelo": version,
        "version_dataset": VERSION_DATASET,
        "entrenado_en": datetime.now(timezone.utc).isoformat(),
        "modelo_elegido": ganador.nombre,
        "justificacion": (
            f"Menor MAE en las {semanas_prueba} semanas no vistas "
            f"({ganador.prueba.mae:.3f} Casos de error medio). {ganador.diagnostico}."
        ),
        "corte_temporal": corte.date().isoformat(),
        "filas_entrenamiento": int(n_entrenamiento),
        "filas_prueba": int(n_prueba),
        "columnas": COLUMNAS_PREDICTORAS,
        "comparacion": [r.como_dict() for r in resultados],
        "importancia_variables": importancia_variables(modelo, ganador.nombre),
        "procedencia_datos": {
            "casos_y_reportes": origen_datos,
            "clima": procedencia_clima,
        },
        "limitaciones": [
            "El historial de Casos proviene del simulador de ISSUE-28: es sintetico "
            "y sigue reglas conocidas (demanda creciente, factor estacional 1.25 en "
            "lluvias y 0.78 en seca, ruido acotado). Un R2 alto mide que el modelo "
            "aprendio esas reglas, no que anticipe la operacion municipal real.",
            "La unica variable observada del dataset es el clima (Open-Meteo).",
            "Antes de usarlo para decidir en produccion hace falta reentrenar con "
            "Casos reales y volver a publicar estas metricas.",
        ],
    }

    (directorio / "metadatos.json").write_text(
        json.dumps(metadatos, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return metadatos
