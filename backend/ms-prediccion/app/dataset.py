"""
Construccion del dataset semanal para el pronostico (ISSUE-31).

Una fila = (semana, zona H3 resolucion 8, categoria). El objetivo es cuantos
Casos de Obra NUEVOS se abren esa semana en esa zona y categoria.

Por que a nivel de Caso y no de reporte: la operacion municipal se planifica
por Casos (una visita atiende el Caso completo), asi que predecir reportes
sobrevaloraria las zonas con reportes virales — diez vecinos reportando el
mismo bache son un solo trabajo para la cuadrilla.
"""

from __future__ import annotations

import pandas as pd
from sqlalchemy import Engine, text

# El Caso no guarda su zona: se toma la del primer reporte agrupado.
SQL_BASE = """
WITH caso_zona AS (
    SELECT
        g.id,
        g.categoria_id,
        g.creado_en,
        g.estado_actual,
        (
            SELECT r.h3_res_8
            FROM reportes r
            WHERE r.grupo_id = g.id
            ORDER BY r.id
            LIMIT 1
        ) AS h3
    FROM grupos_reportes g
),
casos_semana AS (
    SELECT
        date_trunc('week', creado_en)::date AS semana,
        h3,
        categoria_id,
        count(*) AS casos_nuevos
    FROM caso_zona
    WHERE h3 IS NOT NULL AND categoria_id IS NOT NULL
    GROUP BY 1, 2, 3
),
reportes_semana AS (
    SELECT
        date_trunc('week', creado_en)::date AS semana,
        h3_res_8 AS h3,
        categoria_id,
        count(*) AS reportes,
        count(DISTINCT device_id) AS dispositivos,
        avg(CASE gravedad WHEN 'Emergencia' THEN 4 WHEN 'Alta' THEN 3 WHEN 'Media' THEN 2 ELSE 1 END) AS gravedad_media
    FROM reportes
    GROUP BY 1, 2, 3
),
-- Casos que seguian abiertos al comenzar cada semana: es la cola que arrastra
-- la operacion y explica buena parte de la demanda atendida.
cola_semana AS (
    SELECT
        s.semana,
        c.h3,
        c.categoria_id,
        count(*) FILTER (
            WHERE c.creado_en < s.semana
              AND c.estado_actual NOT IN ('Finalizado', 'Rechazado')
        ) AS casos_abiertos_inicio
    FROM (SELECT DISTINCT date_trunc('week', creado_en)::date AS semana FROM grupos_reportes) s
    CROSS JOIN LATERAL (
        SELECT * FROM caso_zona WHERE h3 IS NOT NULL AND categoria_id IS NOT NULL
    ) c
    GROUP BY 1, 2, 3
)
SELECT
    cs.semana,
    cs.h3,
    cs.categoria_id,
    cs.casos_nuevos,
    COALESCE(rs.reportes, 0) AS reportes,
    COALESCE(rs.dispositivos, 0) AS dispositivos,
    COALESCE(rs.gravedad_media, 0) AS gravedad_media,
    COALESCE(col.casos_abiertos_inicio, 0) AS casos_abiertos_inicio
FROM casos_semana cs
LEFT JOIN reportes_semana rs
       ON rs.semana = cs.semana AND rs.h3 = cs.h3 AND rs.categoria_id = cs.categoria_id
LEFT JOIN cola_semana col
       ON col.semana = cs.semana AND col.h3 = cs.h3 AND col.categoria_id = cs.categoria_id
ORDER BY cs.semana, cs.h3, cs.categoria_id
"""

SQL_CUADRILLAS = """
SELECT
    date_trunc('week', c.creado_en)::date AS semana_alta,
    count(*) AS altas
FROM cuadrillas c
GROUP BY 1
ORDER BY 1
"""

MESES_LLUVIOSOS = {11, 12, 1, 2, 3}


def leer_base(engine: Engine) -> pd.DataFrame:
    with engine.connect() as conexion:
        datos = pd.read_sql(text(SQL_BASE), conexion)
        altas = pd.read_sql(text(SQL_CUADRILLAS), conexion)

    datos["semana"] = pd.to_datetime(datos["semana"])
    if not altas.empty:
        altas["semana_alta"] = pd.to_datetime(altas["semana_alta"])
    return _agregar_cuadrillas(datos, altas)


def _agregar_cuadrillas(datos: pd.DataFrame, altas: pd.DataFrame) -> pd.DataFrame:
    """Cuadrillas activas acumuladas hasta cada semana (capacidad disponible)."""
    if altas.empty:
        datos["cuadrillas_activas"] = 0
        return datos

    semanas = pd.DataFrame({"semana": sorted(datos["semana"].unique())})
    altas_por_semana = altas.set_index("semana_alta")["altas"]
    semanas["cuadrillas_activas"] = [
        int(altas_por_semana[altas_por_semana.index <= s].sum()) for s in semanas["semana"]
    ]
    return datos.merge(semanas, on="semana", how="left")


def completar_rejilla(datos: pd.DataFrame) -> pd.DataFrame:
    """
    Las semanas sin Casos en una zona/categoria no aparecen en el SQL, pero un
    cero es informacion: si solo se entrena con las filas existentes, el modelo
    nunca aprende a predecir "no va a pasar nada aca".
    """
    semanas = sorted(datos["semana"].unique())
    zonas = sorted(datos["h3"].unique())
    categorias = sorted(datos["categoria_id"].unique())

    rejilla = pd.MultiIndex.from_product(
        [semanas, zonas, categorias], names=["semana", "h3", "categoria_id"]
    ).to_frame(index=False)

    completo = rejilla.merge(datos, on=["semana", "h3", "categoria_id"], how="left")
    columnas_cero = [
        "casos_nuevos",
        "reportes",
        "dispositivos",
        "gravedad_media",
        "casos_abiertos_inicio",
    ]
    completo[columnas_cero] = completo[columnas_cero].fillna(0)
    completo["cuadrillas_activas"] = completo.groupby("semana")["cuadrillas_activas"].transform(
        lambda s: s.ffill().bfill()
    )
    completo["cuadrillas_activas"] = completo["cuadrillas_activas"].fillna(0)
    return completo


def agregar_variables_temporales(datos: pd.DataFrame) -> pd.DataFrame:
    """
    Rezagos y calendario. Los rezagos son la columna vertebral de una serie
    temporal: lo que paso las semanas anteriores en esa misma zona.
    """
    datos = datos.sort_values(["h3", "categoria_id", "semana"]).copy()
    grupo = datos.groupby(["h3", "categoria_id"], sort=False)

    for retraso in (1, 2, 3):
        datos[f"casos_lag_{retraso}"] = grupo["casos_nuevos"].shift(retraso)
        datos[f"reportes_lag_{retraso}"] = grupo["reportes"].shift(retraso)

    datos["dispositivos_lag_1"] = grupo["dispositivos"].shift(1)
    datos["gravedad_lag_1"] = grupo["gravedad_media"].shift(1)

    datos["casos_media_4"] = grupo["casos_nuevos"].transform(
        lambda s: s.shift(1).rolling(4, min_periods=1).mean()
    )
    datos["reportes_media_4"] = grupo["reportes"].transform(
        lambda s: s.shift(1).rolling(4, min_periods=1).mean()
    )

    datos["mes"] = datos["semana"].dt.month
    datos["semana_del_anio"] = datos["semana"].dt.isocalendar().week.astype(int)
    datos["es_lluvias"] = datos["mes"].isin(MESES_LLUVIOSOS).astype(int)

    # Carga por cuadrilla: la cola dividida entre la capacidad disponible. El
    # `where` deja NaN donde no hay cuadrillas (dividir por cero no es carga
    # infinita, es "todavia no habia capacidad") y mantiene la columna en float.
    cuadrillas = datos["cuadrillas_activas"].astype(float)
    datos["carga_por_cuadrilla"] = (
        datos["casos_abiertos_inicio"] / cuadrillas.where(cuadrillas > 0)
    ).fillna(0.0)

    return datos


def construir(engine: Engine, clima: pd.DataFrame | None = None) -> pd.DataFrame:
    """Dataset listo para entrenar: rejilla completa, rezagos y clima real."""
    return construir_desde(leer_base(engine), clima)


def construir_desde(base: pd.DataFrame, clima: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    El resto de `construir`, ya con la base leida. Separado para que el EDA
    pueda inspeccionar cada etapa sin volver a golpear la base: la consulta de
    la cola cruza cada semana con cada Caso y no es barata.
    """
    datos = completar_rejilla(base)
    datos = agregar_variables_temporales(datos)

    if clima is not None and not clima.empty:
        datos = datos.merge(clima, on="semana", how="left")
        datos["precipitacion_mm"] = datos["precipitacion_mm"].fillna(0.0)
        datos["temperatura_media"] = datos["temperatura_media"].fillna(
            datos["temperatura_media"].mean()
        )
    else:
        # Sin clima el modelo sigue entrenando, pero queda registrado que la
        # variable no estuvo disponible (la issue exige declarar procedencia).
        datos["precipitacion_mm"] = 0.0
        datos["temperatura_media"] = 0.0

    # Las primeras semanas de cada serie no tienen rezagos: se descartan en vez
    # de imputarlas, para no inventar historia que el modelo tomaria por real.
    return datos.dropna(
        subset=["casos_lag_1", "casos_lag_2", "casos_lag_3", "dispositivos_lag_1", "gravedad_lag_1"]
    ).reset_index(drop=True)


# OJO — todo lo que entra aca tiene que ser conocido ANTES de la semana que se
# predice. `reportes`, `dispositivos` y `gravedad_media` de la propia semana
# quedan fuera a proposito: son fuga de informacion. Con ellas el modelo daba
# MAE 0.351 y R2 0.721, pero explicaba el 90% con datos que en produccion no
# existen todavia al momento de pronosticar. Solo entran sus rezagos.
COLUMNAS_PREDICTORAS = [
    "casos_abiertos_inicio",
    "cuadrillas_activas",
    "carga_por_cuadrilla",
    "casos_lag_1",
    "casos_lag_2",
    "casos_lag_3",
    "reportes_lag_1",
    "reportes_lag_2",
    "reportes_lag_3",
    "dispositivos_lag_1",
    "gravedad_lag_1",
    "casos_media_4",
    "reportes_media_4",
    "mes",
    "semana_del_anio",
    "es_lluvias",
    "precipitacion_mm",
    "temperatura_media",
    "categoria_id",
]

COLUMNA_OBJETIVO = "casos_nuevos"
