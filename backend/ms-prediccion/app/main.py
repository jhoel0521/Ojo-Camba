"""
API del microservicio de prediccion (ISSUE-31).

Se expone por HTTP y no por TCP como el resto de los microservicios: FastAPI no
habla el protocolo de NestJS. El gateway-principal hace de proxy, asi que el
servicio no necesita salir a internet — en Coolify va sin dominio publico.
"""

from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine

from . import alertas as modulo_alertas
from . import clima as modulo_clima
from . import dataset as modulo_dataset
from .config import obtener_config
from .entrenamiento import entrenar_y_guardar
from .modelo import ModeloNoEntrenado, Pronosticador, leer_umbrales

app = FastAPI(
    title="Ojo Camba — Prediccion",
    description="Pronostico semanal de Casos de Obra y alertas de capacidad (ISSUE-31).",
    version="1.0.0",
)

_config = obtener_config()
_engine = create_engine(_config.database_url, pool_pre_ping=True)
_pronosticador = Pronosticador(_config.directorio_modelos)


def _clima_cacheado() -> pd.DataFrame | None:
    cache = _config.directorio_datos / "clima_semanal.json"
    if not cache.exists():
        return None
    semanal, _ = modulo_clima.obtener(
        _config.lat_ciudad, _config.lng_ciudad, date.today(), date.today(), cache=cache
    )
    return semanal


@app.get("/health")
def salud():
    return {
        "status": "ok",
        "service": "ms-prediccion",
        "modelo_entrenado": _pronosticador.disponible,
    }


@app.get("/modelo")
def modelo():
    """Version, metricas comparadas, procedencia de datos y limitaciones."""
    try:
        return _pronosticador.metadatos
    except ModeloNoEntrenado as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.get("/pronostico")
def pronostico(
    zona: str | None = Query(default=None, description="Filtra por celda H3 resolucion 8"),
    categoria_id: int | None = Query(default=None),
):
    """Casos de Obra esperados por zona y categoria en los proximos 7 dias."""
    try:
        datos = _pronosticador.pronosticar(_engine, _clima_cacheado())
    except ModeloNoEntrenado as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    if zona:
        datos = datos[datos["h3"] == zona]
    if categoria_id is not None:
        datos = datos[datos["categoria_id"] == categoria_id]

    metadatos = _pronosticador.metadatos
    semana = datos["semana"].iloc[0] if not datos.empty else None

    return {
        "periodo": {
            "desde": semana.date().isoformat() if semana is not None else None,
            "hasta": (semana + timedelta(days=6)).date().isoformat() if semana is not None else None,
        },
        "version_modelo": metadatos["version_modelo"],
        "version_dataset": metadatos["version_dataset"],
        "modelo": metadatos["modelo_elegido"],
        "origen": "estimacion",
        "limitaciones": metadatos["limitaciones"],
        "total_casos_estimados": round(float(datos["casos_pronosticados"].sum()), 2),
        "detalle": [
            {
                "zona_h3": fila["h3"],
                "categoria_id": int(fila["categoria_id"]),
                "casos_estimados": round(float(fila["casos_pronosticados"]), 2),
                "margen_error": round(float(fila["margen"]), 2),
                "confianza": str(fila["confianza"]),
            }
            for _, fila in datos.iterrows()
        ],
    }


@app.get("/alertas")
def alertas(solo_criticas: bool = Query(default=True)):
    """Alertas de capacidad al 80% y 100%, con recomendacion explicable."""
    try:
        datos = _pronosticador.pronosticar(_engine, _clima_cacheado())
    except ModeloNoEntrenado as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    umbrales = leer_umbrales(
        _engine,
        {
            "carga_alerta": _config.carga_alerta_por_defecto,
            "carga_maxima": _config.carga_maxima_por_defecto,
            "visitas_meta_diaria": _config.visitas_meta_diaria_por_defecto,
        },
    )
    estado = modulo_alertas.leer_estado(_engine, umbrales)
    generadas, resumen = modulo_alertas.generar(datos, estado, solo_criticas=solo_criticas)
    metadatos = _pronosticador.metadatos

    return {
        "version_modelo": metadatos["version_modelo"],
        "umbrales": umbrales,
        "capacidad": resumen,
        "total": len(generadas),
        "por_nivel": {
            "apoyo": sum(1 for a in generadas if a.nivel == "apoyo"),
            "preventiva": sum(1 for a in generadas if a.nivel == "preventiva"),
        },
        "alertas": [a.como_dict() for a in generadas],
        "nota": "El servicio no asigna ni reasigna cuadrillas: la decision es del coordinador.",
    }


@app.post("/entrenar")
def entrenar(semanas_prueba: int = Query(default=12, ge=4, le=26)):
    """
    Reentrena y compara los tres modelos. Es sincrono y pesado a proposito:
    conviene ejecutarlo a mano y no dejarlo suelto en un servidor compartido.
    """
    try:
        semanal, procedencia = modulo_clima.obtener(
            _config.lat_ciudad,
            _config.lng_ciudad,
            date.today() - timedelta(days=730),
            date.today(),
            cache=_config.directorio_datos / "clima_semanal.json",
        )
    except Exception as error:  # noqa: BLE001
        semanal, procedencia = None, {"fuente": "no incorporado", "motivo": str(error)}

    datos = modulo_dataset.construir(_engine, semanal)
    if datos.empty:
        raise HTTPException(status_code=422, detail="No hay historia suficiente para entrenar.")

    metadatos = entrenar_y_guardar(
        datos,
        _config.directorio_modelos,
        procedencia,
        origen_datos="simulador historico ISSUE-28 (sintetico)",
        semanas_prueba=semanas_prueba,
    )
    _pronosticador.cargar()
    return metadatos
