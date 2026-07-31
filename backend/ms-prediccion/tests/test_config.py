"""
Normalizacion de DATABASE_URL (ISSUE-31).

El resto de los microservicios Nest usan `postgresql://` sin driver. SQLAlchemy
resuelve ese esquema a psycopg2, que aca no esta instalado (solo psycopg v3):
si alguien copia la URL de otro servicio, la API moria al arrancar con
`NoSuchModuleError`. Estas pruebas fijan que la URL siempre termina con el
driver `+psycopg`.
"""

from app.config import Config


def test_agrega_driver_cuando_viene_estilo_nest():
    cfg = Config(database_url="postgresql://ojocamba:secreto@host:5432/ojocamba")
    assert cfg.database_url == "postgresql+psycopg://ojocamba:secreto@host:5432/ojocamba"


def test_acepta_el_alias_postgres_sin_driver():
    cfg = Config(database_url="postgres://ojocamba:secreto@host:5432/ojocamba")
    assert cfg.database_url == "postgresql+psycopg://ojocamba:secreto@host:5432/ojocamba"


def test_no_toca_la_url_que_ya_tiene_el_driver():
    cfg = Config(database_url="postgresql+psycopg://ojocamba:secreto@host:5432/ojocamba")
    assert cfg.database_url == "postgresql+psycopg://ojocamba:secreto@host:5432/ojocamba"
