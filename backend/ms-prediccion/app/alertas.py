"""
Reglas de alerta por capacidad (ISSUE-31).

El pronostico solo no sirve para decidir: la alerta compara la demanda esperada
contra la capacidad real de las cuadrillas y propone una accion.

La capacidad se mide como la define ISSUE-26 (docs/ISSUE-26-matriz-permisos.md):
un "reporte abierto" es un reporte de un Caso asignado a una cuadrilla cuyo
estado no es Finalizado ni Rechazado, y **la carga se cuenta por reportes, no
por Casos agrupados**. Por eso el pronostico de Casos se convierte a reportes
con el tamano medio de grupo antes de comparar.

  - riesgo >= 80%  -> alerta preventiva
  - riesgo >= 100% -> alerta y recomendacion de solicitar apoyo

El servicio NUNCA asigna ni reasigna cuadrillas: la decision queda en el
coordinador y debe registrarse con su motivo.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from sqlalchemy import Engine, text

UMBRAL_PREVENTIVO = 0.80
UMBRAL_APOYO = 1.00

SQL_CARGA = """
SELECT
    (SELECT count(*) FROM cuadrillas WHERE activa) AS cuadrillas_activas,
    (
        SELECT count(*)
        FROM reportes r
        JOIN grupos_reportes g ON g.id = r.grupo_id
        WHERE g.cuadrilla_id IS NOT NULL
          AND g.estado_actual NOT IN ('Finalizado', 'Rechazado')
    ) AS reportes_abiertos,
    (
        SELECT COALESCE(avg(cantidad), 1)
        FROM (
            SELECT count(*) AS cantidad
            FROM reportes
            WHERE grupo_id IS NOT NULL
            GROUP BY grupo_id
        ) t
    ) AS reportes_por_caso
"""


@dataclass
class Estado:
    cuadrillas_activas: int
    reportes_abiertos: int
    reportes_por_caso: float
    capacidad: int

    @property
    def carga_actual(self) -> float:
        return self.reportes_abiertos / self.capacidad if self.capacidad else 0.0


def leer_estado(engine: Engine, umbrales: dict[str, int]) -> Estado:
    with engine.connect() as conexion:
        fila = conexion.execute(text(SQL_CARGA)).fetchone()

    cuadrillas = int(fila[0] or 0)
    return Estado(
        cuadrillas_activas=cuadrillas,
        reportes_abiertos=int(fila[1] or 0),
        reportes_por_caso=float(fila[2] or 1.0),
        capacidad=max(cuadrillas, 1) * int(umbrales["carga_maxima"]),
    )


@dataclass
class Alerta:
    zona_h3: str
    categoria_id: int
    casos_estimados: float
    reportes_estimados: float
    cuota_zona: float
    riesgo: float
    nivel: str
    confianza: str
    recomendacion: str
    factores: list[str]

    def como_dict(self) -> dict:
        return {
            "zona_h3": self.zona_h3,
            "categoria_id": int(self.categoria_id),
            "casos_estimados": round(float(self.casos_estimados), 2),
            "reportes_estimados": round(float(self.reportes_estimados), 2),
            "cuota_zona": round(float(self.cuota_zona), 2),
            "riesgo": round(float(self.riesgo), 3),
            "nivel": self.nivel,
            "confianza": self.confianza,
            "recomendacion": self.recomendacion,
            "factores": self.factores,
        }


def _factores(fila: pd.Series, estado: Estado) -> list[str]:
    """La issue pide alertas explicables, no un numero suelto."""
    factores: list[str] = []
    if fila.get("es_lluvias"):
        factores.append("temporada de lluvias (noviembre a marzo)")
    if float(fila.get("precipitacion_mm", 0)) > 30:
        factores.append(f"precipitacion esperada de {float(fila['precipitacion_mm']):.0f} mm")
    if float(fila.get("casos_abiertos_inicio", 0)) > 0:
        factores.append(f"{int(fila['casos_abiertos_inicio'])} Casos abiertos en la zona")
    if float(fila.get("casos_media_4", 0)) > 0:
        factores.append(
            f"promedio de {float(fila['casos_media_4']):.1f} Casos por semana en el ultimo mes"
        )
    factores.append(
        f"{estado.reportes_abiertos} reportes abiertos sobre una capacidad de {estado.capacidad} "
        f"({estado.cuadrillas_activas} cuadrillas activas)"
    )
    return factores


def _recomendacion(nivel: str, zona: str, estado: Estado) -> str:
    if nivel == "apoyo":
        return (
            f"Solicitar apoyo para la zona {zona}: la demanda esperada supera la cuota de "
            f"capacidad de las {estado.cuadrillas_activas} cuadrillas activas. Revisar con el "
            f"coordinador antes de comprometer visitas."
        )
    if nivel == "preventiva":
        return (
            f"Vigilar la zona {zona}: se acerca al limite de capacidad. Conviene repriorizar la "
            f"cola antes de que se acumule."
        )
    return "Sin accion requerida."


def generar(
    pronostico: pd.DataFrame,
    estado: Estado,
    solo_criticas: bool = False,
) -> tuple[list[Alerta], dict]:
    """
    Reparte la capacidad entre las zonas con demanda esperada y evalua cada una
    contra su cuota.

    Limitacion conocida: las cuadrillas no tienen especialidad cargada todavia
    (tabla `especialidades` vacia), asi que la capacidad se reparte de forma
    pareja entre zonas activas en vez de por especialidad. Cuando ISSUE-29
    cargue las especialidades, la cuota debe calcularse por categoria.
    """
    zonas_activas = pronostico.loc[pronostico["casos_pronosticados"] > 0.1, "h3"].nunique() or 1
    cuota_por_zona = estado.capacidad / zonas_activas

    alertas: list[Alerta] = []
    for zona, filas in pronostico.groupby("h3"):
        casos_zona = float(filas["casos_pronosticados"].sum())
        reportes_zona = casos_zona * estado.reportes_por_caso
        # La cola ya asignada tambien ocupa capacidad: entra en el riesgo.
        abiertos_zona = float(filas["casos_abiertos_inicio"].sum()) * estado.reportes_por_caso
        riesgo = (reportes_zona + abiertos_zona) / cuota_por_zona if cuota_por_zona else 0.0

        if riesgo >= UMBRAL_APOYO:
            nivel = "apoyo"
        elif riesgo >= UMBRAL_PREVENTIVO:
            nivel = "preventiva"
        else:
            nivel = "normal"

        if solo_criticas and nivel == "normal":
            continue

        principal = filas.loc[filas["casos_pronosticados"].idxmax()]
        alertas.append(
            Alerta(
                zona_h3=str(zona),
                categoria_id=int(principal["categoria_id"]),
                casos_estimados=casos_zona,
                reportes_estimados=reportes_zona,
                cuota_zona=cuota_por_zona,
                riesgo=riesgo,
                nivel=nivel,
                confianza=str(principal.get("confianza", "media")),
                recomendacion=_recomendacion(nivel, str(zona), estado),
                factores=_factores(principal, estado),
            )
        )

    resumen = {
        "cuadrillas_activas": estado.cuadrillas_activas,
        "capacidad_reportes": estado.capacidad,
        "reportes_abiertos": estado.reportes_abiertos,
        "ocupacion_actual": round(estado.carga_actual, 3),
        "reportes_por_caso": round(estado.reportes_por_caso, 2),
        "zonas_con_demanda": int(zonas_activas),
        "cuota_por_zona": round(cuota_por_zona, 2),
    }
    return sorted(alertas, key=lambda a: a.riesgo, reverse=True), resumen
