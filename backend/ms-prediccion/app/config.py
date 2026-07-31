"""Configuracion del microservicio de prediccion (ISSUE-31)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ = Path(__file__).resolve().parent.parent


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Misma base que el resto de los microservicios.
    database_url: str = "postgresql+psycopg://ojocamba:ojocamba_secret@localhost:5432/ojocamba"

    puerto: int = 3007

    # Santa Cruz de la Sierra: la precipitacion sale de Open-Meteo (dato real,
    # a diferencia del historial, que es sintetico mientras corra el simulador).
    lat_ciudad: float = -17.7833
    lng_ciudad: float = -63.1821

    # El entrenamiento NO corre al arrancar: se dispara a mano por el endpoint.
    # En el VPS actual (2 nucleos, sin swap) un entrenamiento desatendido puede
    # dejar sin memoria a los demas contenedores.
    entrenar_al_iniciar: bool = False

    directorio_modelos: Path = RAIZ / "modelos"
    directorio_datos: Path = RAIZ / "datos"

    # Umbrales de la operacion municipal (ISSUE-26: configuracion_operativa).
    # Se leen de la base al predecir; estos son el respaldo si falta la fila.
    carga_alerta_por_defecto: int = 8
    carga_maxima_por_defecto: int = 10
    visitas_meta_diaria_por_defecto: int = 5


@lru_cache
def obtener_config() -> Config:
    config = Config()
    config.directorio_modelos.mkdir(parents=True, exist_ok=True)
    config.directorio_datos.mkdir(parents=True, exist_ok=True)
    return config
