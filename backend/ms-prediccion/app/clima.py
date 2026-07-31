"""
Precipitacion y temperatura reales de Santa Cruz de la Sierra (ISSUE-31).

La issue pide datos climaticos publicos reales, con procedencia y fecha de
extraccion documentadas: el historial de Casos es sintetico mientras corra el
simulador, asi que esta es la unica variable observada del dataset y conviene
que quede claro cual es cual.

Fuente: Open-Meteo Archive API (ERA5) — https://open-meteo.com/
Licencia: CC-BY 4.0, sin clave de API.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
import pandas as pd

URL_ARCHIVO = "https://archive-api.open-meteo.com/v1/archive"
FUENTE = "Open-Meteo Archive API (ERA5)"


def descargar_diario(
    lat: float, lng: float, desde: date, hasta: date, tiempo_maximo: float = 60.0
) -> pd.DataFrame:
    respuesta = httpx.get(
        URL_ARCHIVO,
        params={
            "latitude": lat,
            "longitude": lng,
            "start_date": desde.isoformat(),
            "end_date": hasta.isoformat(),
            "daily": "precipitation_sum,temperature_2m_mean",
            "timezone": "America/La_Paz",
        },
        timeout=tiempo_maximo,
    )
    respuesta.raise_for_status()
    cuerpo = respuesta.json()["daily"]

    return pd.DataFrame(
        {
            "fecha": pd.to_datetime(cuerpo["time"]),
            "precipitacion_mm": cuerpo["precipitation_sum"],
            "temperatura_media": cuerpo["temperature_2m_mean"],
        }
    )


def agregar_por_semana(diario: pd.DataFrame) -> pd.DataFrame:
    """Misma definicion de semana que el dataset: lunes como inicio."""
    semanal = diario.copy()
    semanal["semana"] = semanal["fecha"].dt.to_period("W-SUN").dt.start_time
    return (
        semanal.groupby("semana")
        .agg(precipitacion_mm=("precipitacion_mm", "sum"), temperatura_media=("temperatura_media", "mean"))
        .reset_index()
    )


def obtener(
    lat: float, lng: float, desde: date, hasta: date, cache: Path | None = None
) -> tuple[pd.DataFrame, dict]:
    """
    Devuelve el clima semanal y su procedencia. Si hay cache en disco se usa,
    para no depender de la red al reentrenar ni pedirle lo mismo dos veces a un
    servicio publico y gratuito.
    """
    if cache and cache.exists():
        guardado = json.loads(cache.read_text(encoding="utf-8"))
        semanal = pd.DataFrame(guardado["datos"])
        semanal["semana"] = pd.to_datetime(semanal["semana"])
        return semanal, guardado["procedencia"]

    diario = descargar_diario(lat, lng, desde, hasta)
    semanal = agregar_por_semana(diario)

    procedencia = {
        "fuente": FUENTE,
        "url": URL_ARCHIVO,
        "licencia": "CC-BY 4.0",
        "coordenadas": {"lat": lat, "lng": lng},
        "rango": {"desde": desde.isoformat(), "hasta": hasta.isoformat()},
        "extraido_en": datetime.now(timezone.utc).isoformat(),
        "variables": ["precipitation_sum", "temperature_2m_mean"],
        "dias_descargados": int(len(diario)),
    }

    if cache:
        copia = semanal.copy()
        copia["semana"] = copia["semana"].dt.strftime("%Y-%m-%d")
        cache.write_text(
            json.dumps(
                {"procedencia": procedencia, "datos": copia.to_dict(orient="records")},
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    return semanal, procedencia
