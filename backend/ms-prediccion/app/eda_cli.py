"""
Analisis exploratorio del dataset (ISSUE-31).

    python -m app.eda_cli [--salida docs/ISSUE-31-eda.md] [--sin-clima]

Genera el EDA a partir de la base, no a mano: si el historial cambia, el
documento se regenera y los numeros siguen siendo ciertos. Un EDA escrito a
mano envejece en silencio, que es la peor forma de envejecer para un documento
que sostiene decisiones sobre el modelo.

Lo que se busca responder: cuanta historia hay, cuan disparejo es el reparto
entre zonas, donde estan los nulos y los atipicos, y si la estacionalidad que
supone el modelo (lluvias de noviembre a marzo) se ve en los datos.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine

from . import clima as modulo_clima
from .config import obtener_config
from .dataset import (
    COLUMNA_OBJETIVO,
    COLUMNAS_PREDICTORAS,
    MESES_LLUVIOSOS,
    agregar_variables_temporales,
    completar_rejilla,
    construir_desde,
    leer_base,
)

MESES = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}


def _tabla(encabezados: list[str], filas: list[list[str]]) -> str:
    lineas = ["| " + " | ".join(encabezados) + " |"]
    lineas.append("|" + "|".join(["---"] * len(encabezados)) + "|")
    lineas += ["| " + " | ".join(fila) + " |" for fila in filas]
    return "\n".join(lineas)


def _cobertura(base: pd.DataFrame, rejilla: pd.DataFrame, utilizable: pd.DataFrame) -> str:
    semanas = base["semana"].nunique()
    zonas = base["h3"].nunique()
    categorias = base["categoria_id"].nunique()
    posibles = semanas * zonas * categorias

    return f"""## 1. Cobertura del dataset

Una fila = **(semana, zona H3 res-8, categoria)**.

{_tabla(
    ["Etapa", "Filas", "Que representa"],
    [
        [
            "Consulta a la base",
            f"{len(base):,}",
            "Combinaciones con al menos un Caso abierto esa semana",
        ],
        [
            "Rejilla completa",
            f"{len(rejilla):,}",
            f"Las {posibles:,} combinaciones posibles: las que faltaban entran con cero",
        ],
        [
            "Utilizable",
            f"{len(utilizable):,}",
            "Tras descartar las primeras semanas de cada serie, que no tienen rezagos",
        ],
    ],
)}

- **Periodo:** {base['semana'].min().date()} a {base['semana'].max().date()} ({semanas} semanas).
- **Zonas H3 (res 8):** {zonas}.
- **Categorias:** {categorias}.
- **Densidad:** el {len(base) / posibles:.1%} de las combinaciones posibles tuvo actividad; el resto entra con cero al completar la rejilla. Esos ceros son informacion: sin ellos el modelo nunca aprende a predecir calma.
- **Filas descartadas por falta de historia:** {len(rejilla) - len(utilizable):,} ({(len(rejilla) - len(utilizable)) / len(rejilla):.1%}). Se descartan en vez de imputarlas, para no inventar pasado que el modelo tomaria por real.
"""


def _objetivo(datos: pd.DataFrame) -> str:
    objetivo = datos[COLUMNA_OBJETIVO]
    ceros = float((objetivo == 0).mean())
    percentiles = objetivo.quantile([0.5, 0.75, 0.9, 0.95, 0.99])

    return f"""## 2. Distribucion del objetivo (`casos_nuevos`)

{_tabla(
    ["Estadistico", "Valor"],
    [
        ["Media", f"{objetivo.mean():.3f}"],
        ["Desvio estandar", f"{objetivo.std():.3f}"],
        ["Minimo", f"{objetivo.min():.0f}"],
        ["Mediana (p50)", f"{percentiles[0.5]:.0f}"],
        ["p75", f"{percentiles[0.75]:.0f}"],
        ["p90", f"{percentiles[0.9]:.0f}"],
        ["p95", f"{percentiles[0.95]:.0f}"],
        ["p99", f"{percentiles[0.99]:.0f}"],
        ["Maximo", f"{objetivo.max():.0f}"],
        ["Semanas en cero", f"{ceros:.1%}"],
    ],
)}

La distribucion esta **fuertemente sesgada a cero**: {ceros:.1%} de las filas no
tiene ningun Caso nuevo. Eso condiciona la lectura de las metricas — un modelo
que prediga siempre cerca de cero ya acierta la mayoria de las veces, asi que un
MAE bajo por si solo no prueba nada. Por eso se publica tambien el R2, que mide
cuanta de la variacion real explica el modelo, y se compara contra los otros dos.
"""


def _nulos(rejilla: pd.DataFrame, con_variables: pd.DataFrame) -> str:
    columnas = [c for c in COLUMNAS_PREDICTORAS if c in con_variables.columns]
    nulos = con_variables[columnas].isna().sum()
    con_nulos = nulos[nulos > 0].sort_values(ascending=False)

    if con_nulos.empty:
        detalle = "Ninguna variable predictora quedo con nulos tras armar los rezagos."
    else:
        detalle = _tabla(
            ["Columna", "Nulos", "% del total", "Por que"],
            [
                [
                    f"`{columna}`",
                    f"{int(cantidad):,}",
                    f"{cantidad / len(con_variables):.1%}",
                    "Primeras semanas de cada serie: no hay pasado que mirar",
                ]
                for columna, cantidad in con_nulos.items()
            ],
        )

    nulos_base = rejilla.isna().sum().sum()

    return f"""## 3. Nulos

{detalle}

Los nulos **no se imputan**: las filas afectadas se descartan. Imputar el pasado
de una serie temporal equivale a inventarle historia a una zona, y el modelo la
tomaria como observada.

Tras completar la rejilla, las columnas que vienen de la base quedan con
{int(nulos_base)} nulos: las combinaciones sin actividad entran con cero, que es
el valor correcto, no un dato faltante.
"""


def _atipicos(datos: pd.DataFrame) -> str:
    objetivo = datos[COLUMNA_OBJETIVO]
    q1, q3 = objetivo.quantile([0.25, 0.75])
    iqr = q3 - q1
    limite = q3 + 1.5 * iqr
    atipicos = datos[objetivo > limite]

    if atipicos.empty:
        resumen = "La regla del rango intercuartilico no marca ningun atipico."
        detalle = ""
    else:
        por_zona = atipicos["h3"].value_counts().head(5)
        resumen = (
            f"**{len(atipicos):,} filas ({len(atipicos) / len(datos):.1%})** superan el limite "
            f"de {limite:.1f} Casos (Q3 + 1.5 x IQR)."
        )
        detalle = "\n" + _tabla(
            ["Zona H3", "Semanas atipicas", "Maximo de Casos"],
            [
                [
                    f"`{zona}`",
                    f"{int(cantidad)}",
                    f"{int(atipicos[atipicos['h3'] == zona][COLUMNA_OBJETIVO].max())}",
                ]
                for zona, cantidad in por_zona.items()
            ],
        )

    return f"""## 4. Atipicos

{resumen}
{detalle}

**No se eliminan.** Un pico de Casos en una zona no es un error de medicion: es
exactamente la semana que el coordinador necesita anticipar. Recortarlos mejoraria
las metricas y empeoraria el servicio. Lo que si se hace es acotar la prediccion a
valores no negativos y publicar un margen de error junto a cada pronostico.
"""


def _por_zona(datos: pd.DataFrame) -> str:
    por_zona = datos.groupby("h3")[COLUMNA_OBJETIVO].sum().sort_values(ascending=False)
    total = float(por_zona.sum())
    cuantas = len(por_zona)
    top_20_pct = max(1, round(cuantas * 0.2))
    concentracion = float(por_zona.head(top_20_pct).sum()) / total if total else 0.0
    sin_casos = int((por_zona == 0).sum())
    cola = (
        f" {sin_casos} zonas no registran ninguno."
        if sin_casos
        else " Todas registran al menos uno."
    )

    filas = [
        [f"`{zona}`", f"{int(casos):,}", f"{casos / total:.1%}"]
        for zona, casos in por_zona.head(5).items()
    ]

    return f"""## 5. Reparto geografico

{cuantas} zonas H3 con actividad. El 20% mas activo ({top_20_pct} zonas) concentra el **{concentracion:.1%}** de los Casos.{cola}

Zonas con mas Casos:

{_tabla(["Zona H3", "Casos", "% del total"], filas)}

Esta concentracion es el principal **sesgo geografico** del modelo: aprende mucho
mejor las zonas activas que las de cola larga, donde casi solo ve ceros. Se
documenta en `ISSUE-31-sesgos.md`.
"""


def _por_categoria(datos: pd.DataFrame) -> str:
    por_categoria = datos.groupby("categoria_id")[COLUMNA_OBJETIVO].agg(["sum", "mean"])
    total = float(por_categoria["sum"].sum())

    filas = [
        [
            str(int(categoria)),
            f"{int(fila['sum']):,}",
            f"{fila['sum'] / total:.1%}",
            f"{fila['mean']:.3f}",
        ]
        for categoria, fila in por_categoria.sort_values("sum", ascending=False).iterrows()
    ]

    return f"""## 6. Reparto por categoria

{_tabla(["Categoria", "Casos", "% del total", "Media semanal por zona"], filas)}

La categoria entra al modelo como variable, asi que un reparto disparejo no lo
invalida, pero si explica que el error sea mayor en las categorias menos
frecuentes: hay menos ejemplos de los que aprender.
"""


def _estacionalidad(datos: pd.DataFrame) -> str:
    por_mes = datos.groupby("mes")[COLUMNA_OBJETIVO].mean()
    lluvias = float(datos[datos["es_lluvias"] == 1][COLUMNA_OBJETIVO].mean())
    seca = float(datos[datos["es_lluvias"] == 0][COLUMNA_OBJETIVO].mean())
    razon = lluvias / seca if seca else 0.0

    filas = [
        [MESES[int(mes)], f"{media:.3f}", "lluvias" if int(mes) in MESES_LLUVIOSOS else "seca"]
        for mes, media in por_mes.items()
    ]

    return f"""## 7. Estacionalidad

{_tabla(["Mes", "Casos medios por zona y categoria", "Temporada"], filas)}

- Temporada de lluvias (noviembre a marzo): **{lluvias:.3f}** Casos de media.
- Temporada seca: **{seca:.3f}**.
- Razon lluvias/seca: **{razon:.2f}x**.

La estacionalidad se ve y coincide con la que el simulador de ISSUE-28 genera por
construccion (factor 1.25 en lluvias, 0.78 en seca). **Eso es exactamente la
limitacion del ejercicio:** el modelo esta recuperando una regla conocida, no
descubriendo un patron de la operacion municipal real.
"""


def _clima(datos: pd.DataFrame, procedencia: dict) -> str:
    if "precipitacion_mm" not in datos or datos["precipitacion_mm"].eq(0).all():
        return f"""## 8. Clima

No se incorporo clima en esta corrida: {procedencia.get('motivo', 'sin detalle')}.
Las columnas quedan en cero y el modelo entrena sin esa variable.
"""

    lluvias = datos[datos["es_lluvias"] == 1]["precipitacion_mm"].mean()
    seca = datos[datos["es_lluvias"] == 0]["precipitacion_mm"].mean()

    return f"""## 8. Clima (unica variable observada real)

Fuente: **{procedencia.get('fuente', 'Open-Meteo')}**, extraida el
{procedencia.get('extraido_en', 'fecha no registrada')}.

{_tabla(
    ["Variable", "Media", "Minimo", "Maximo"],
    [
        [
            "Precipitacion semanal (mm)",
            f"{datos['precipitacion_mm'].mean():.1f}",
            f"{datos['precipitacion_mm'].min():.1f}",
            f"{datos['precipitacion_mm'].max():.1f}",
        ],
        [
            "Temperatura media (C)",
            f"{datos['temperatura_media'].mean():.1f}",
            f"{datos['temperatura_media'].min():.1f}",
            f"{datos['temperatura_media'].max():.1f}",
        ],
    ],
)}

Precipitacion media en lluvias: **{lluvias:.1f} mm** frente a **{seca:.1f} mm** en
seca. Es el unico dato del dataset que no sale del simulador, y por eso se
declara aparte en la procedencia del modelo.
"""


def _correlaciones(datos: pd.DataFrame) -> str:
    columnas = [c for c in COLUMNAS_PREDICTORAS if c in datos.columns]
    correlaciones = (
        datos[columnas + [COLUMNA_OBJETIVO]]
        .corr(numeric_only=True)[COLUMNA_OBJETIVO]
        .drop(COLUMNA_OBJETIVO)
        .sort_values(key=abs, ascending=False)
    )

    fuertes = correlaciones.head(6)
    debiles = correlaciones.tail(5).sort_values(key=abs)

    return f"""## 9. Correlacion con el objetivo

Las seis variables que mas se mueven con el objetivo:

{_tabla(
    ["Variable predictora", "Correlacion de Pearson"],
    [[f"`{columna}`", f"{valor:+.3f}"] for columna, valor in fuertes.items()],
)}

Y las cinco que menos:

{_tabla(
    ["Variable predictora", "Correlacion de Pearson"],
    [[f"`{columna}`", f"{valor:+.3f}"] for columna, valor in debiles.items()],
)}

Toda la senal util esta en el **pasado reciente de la propia serie**: los rezagos
y las medias moviles llegan a {fuertes.iloc[0]:.2f}, mientras el calendario y el
clima apenas se despegan de cero. Dicho de otro modo, el modelo predice sobre todo
por inercia — lo que viene pasando en esa zona — y la estacionalidad solo corrige
al margen.

Eso tiene dos consecuencias honestas. La primera es que el modelo va a reaccionar
tarde ante un cambio brusco: si una zona se dispara esta semana, recien lo
incorpora la proxima. La segunda es que estas correlaciones **no incluyen** las
variables contemporaneas que serian mas fuertes todavia (`reportes`,
`dispositivos` y `gravedad_media` de la misma semana): estan excluidas a
proposito porque al momento de pronosticar no existen. Ver la seccion de fuga de
informacion en el README del servicio.
"""


def construir_documento(
    base: pd.DataFrame,
    rejilla: pd.DataFrame,
    con_variables: pd.DataFrame,
    utilizable: pd.DataFrame,
    procedencia: dict,
) -> str:
    generado = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    secciones = [
        f"""# EDA — pronostico semanal de Casos de Obra (ISSUE-31)

> Generado por `python -m app.eda_cli` el {generado}. **No editar a mano:**
> regenerarlo cuando cambie el historial.

**Origen de los Casos y reportes:** simulador historico de ISSUE-28. Es
**sintetico** y sigue reglas conocidas. **Origen del clima:** Open-Meteo, dato
real. La separacion entre ambos se mantiene explicita en todo el documento, como
pide la issue.
""",
        _cobertura(base, rejilla, utilizable),
        _objetivo(utilizable),
        _nulos(rejilla, con_variables),
        _atipicos(utilizable),
        _por_zona(utilizable),
        _por_categoria(utilizable),
        _estacionalidad(utilizable),
        _clima(utilizable, procedencia),
        _correlaciones(utilizable),
    ]
    return "\n\n".join(seccion.strip() for seccion in secciones) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Genera el EDA del dataset de prediccion.")
    parser.add_argument("--salida", type=Path, default=Path("docs/ISSUE-31-eda.md"))
    parser.add_argument("--sin-clima", action="store_true")
    argumentos = parser.parse_args()

    config = obtener_config()
    engine = create_engine(config.database_url)

    print("1/3 leyendo Casos y reportes de la base...")
    base = leer_base(engine)
    if base.empty:
        print("ERROR: no hay Casos de Obra en la base. Corre antes el simulador historico.")
        return 1
    print(f"    {len(base):,} filas con actividad")

    procedencia: dict = {"fuente": "no incorporado", "motivo": "ejecutado con --sin-clima"}
    semanal = None
    if not argumentos.sin_clima:
        print("2/3 obteniendo clima real de Open-Meteo...")
        try:
            semanal, procedencia = modulo_clima.obtener(
                config.lat_ciudad,
                config.lng_ciudad,
                base["semana"].min().date(),
                base["semana"].max().date(),
                cache=config.directorio_datos / "clima_semanal.json",
            )
            print(f"    {len(semanal)} semanas")
        except Exception as error:  # noqa: BLE001
            print(f"    aviso: sin clima ({error})")
            procedencia = {"fuente": "no incorporado", "motivo": str(error)}
    else:
        print("2/3 clima omitido por --sin-clima")

    print("3/3 analizando...")
    rejilla = completar_rejilla(base)
    con_variables = agregar_variables_temporales(rejilla)
    utilizable = construir_desde(base, semanal)

    argumentos.salida.parent.mkdir(parents=True, exist_ok=True)
    argumentos.salida.write_text(
        construir_documento(base, rejilla, con_variables, utilizable, procedencia),
        encoding="utf-8",
    )
    print(f"\nEDA escrito en {argumentos.salida} ({len(utilizable):,} filas analizadas)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
