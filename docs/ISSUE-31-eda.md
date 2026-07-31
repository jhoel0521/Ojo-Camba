# EDA — pronostico semanal de Casos de Obra (ISSUE-31)

> Generado por `python -m app.eda_cli` el 2026-07-31 05:01 UTC. **No editar a mano:**
> regenerarlo cuando cambie el historial.

**Origen de los Casos y reportes:** simulador historico de ISSUE-28. Es
**sintetico** y sigue reglas conocidas. **Origen del clima:** Open-Meteo, dato
real. La separacion entre ambos se mantiene explicita en todo el documento, como
pide la issue.

## 1. Cobertura del dataset

Una fila = **(semana, zona H3 res-8, categoria)**.

| Etapa | Filas | Que representa |
|---|---|---|
| Consulta a la base | 4,811 | Combinaciones con al menos un Caso abierto esa semana |
| Rejilla completa | 8,964 | Las 8,964 combinaciones posibles: las que faltaban entran con cero |
| Utilizable | 8,640 | Tras descartar las primeras semanas de cada serie, que no tienen rezagos |

- **Periodo:** 2024-12-30 a 2026-07-27 (83 semanas).
- **Zonas H3 (res 8):** 18.
- **Categorias:** 6.
- **Densidad:** el 53.7% de las combinaciones posibles tuvo actividad; el resto entra con cero al completar la rejilla. Esos ceros son informacion: sin ellos el modelo nunca aprende a predecir calma.
- **Filas descartadas por falta de historia:** 324 (3.6%). Se descartan en vez de imputarlas, para no inventar pasado que el modelo tomaria por real.

## 2. Distribucion del objetivo (`casos_nuevos`)

| Estadistico | Valor |
|---|---|
| Media | 1.172 |
| Desvio estandar | 1.485 |
| Minimo | 0 |
| Mediana (p50) | 1 |
| p75 | 2 |
| p90 | 3 |
| p95 | 4 |
| p99 | 6 |
| Maximo | 12 |
| Semanas en cero | 45.5% |

La distribucion esta **fuertemente sesgada a cero**: 45.5% de las filas no
tiene ningun Caso nuevo. Eso condiciona la lectura de las metricas — un modelo
que prediga siempre cerca de cero ya acierta la mayoria de las veces, asi que un
MAE bajo por si solo no prueba nada. Por eso se publica tambien el R2, que mide
cuanta de la variacion real explica el modelo, y se compara contra los otros dos.

## 3. Nulos

| Columna | Nulos | % del total | Por que |
|---|---|---|---|
| `reportes_lag_3` | 324 | 3.6% | Primeras semanas de cada serie: no hay pasado que mirar |
| `casos_lag_3` | 324 | 3.6% | Primeras semanas de cada serie: no hay pasado que mirar |
| `reportes_lag_2` | 216 | 2.4% | Primeras semanas de cada serie: no hay pasado que mirar |
| `casos_lag_2` | 216 | 2.4% | Primeras semanas de cada serie: no hay pasado que mirar |
| `casos_lag_1` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |
| `reportes_lag_1` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |
| `dispositivos_lag_1` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |
| `gravedad_lag_1` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |
| `casos_media_4` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |
| `reportes_media_4` | 108 | 1.2% | Primeras semanas de cada serie: no hay pasado que mirar |

Los nulos **no se imputan**: las filas afectadas se descartan. Imputar el pasado
de una serie temporal equivale a inventarle historia a una zona, y el modelo la
tomaria como observada.

Tras completar la rejilla, las columnas que vienen de la base quedan con
0 nulos: las combinaciones sin actividad entran con cero, que es
el valor correcto, no un dato faltante.

## 4. Atipicos

**143 filas (1.7%)** superan el limite de 5.0 Casos (Q3 + 1.5 x IQR).

| Zona H3 | Semanas atipicas | Maximo de Casos |
|---|---|---|
| `888b221a6bfffff` | 29 | 7 |
| `888b221a55fffff` | 25 | 7 |
| `888b221b59fffff` | 22 | 12 |
| `888b221869fffff` | 13 | 10 |
| `888b221b19fffff` | 11 | 7 |

**No se eliminan.** Un pico de Casos en una zona no es un error de medicion: es
exactamente la semana que el coordinador necesita anticipar. Recortarlos mejoraria
las metricas y empeoraria el servicio. Lo que si se hace es acotar la prediccion a
valores no negativos y publicar un margen de error junto a cada pronostico.

## 5. Variables degeneradas

2 de las 19 variables predictoras son constantes o estan dominadas por un unico valor en mas del 98% de las filas:

| Variable | Valores distintos | Valor mas frecuente | Media |
|---|---|---|---|
| `cuadrillas_activas` | 2 | 98.8% | 0.250 |
| `carga_por_cuadrilla` | 4 | 99.5% | 0.000 |

Una variable asi no le aporta nada al modelo, y casi siempre delata un problema
aguas arriba: o la consulta no esta midiendo lo que dice medir, o el dato no
existe en el origen. El detalle de cada caso esta en `ISSUE-31-sesgos.md`.

## 6. Reparto geografico

18 zonas H3 con actividad. El 20% mas activo (4 zonas) concentra el **37.5%** de los Casos. Todas registran al menos uno.

Zonas con mas Casos:

| Zona H3 | Casos | % del total |
|---|---|---|
| `888b221a55fffff` | 1,017 | 10.0% |
| `888b221a6bfffff` | 992 | 9.8% |
| `888b221b59fffff` | 965 | 9.5% |
| `888b221b19fffff` | 827 | 8.2% |
| `888b221a15fffff` | 816 | 8.1% |

Esta concentracion es el principal **sesgo geografico** del modelo: aprende mucho
mejor las zonas activas que las de cola larga, donde casi solo ve ceros. Se
documenta en `ISSUE-31-sesgos.md`.

## 7. Reparto por categoria

| Categoria | Casos | % del total | Media semanal por zona |
|---|---|---|---|
| 1 | 2,399 | 23.7% | 1.666 |
| 3 | 2,362 | 23.3% | 1.640 |
| 4 | 1,637 | 16.2% | 1.137 |
| 2 | 1,611 | 15.9% | 1.119 |
| 5 | 1,560 | 15.4% | 1.083 |
| 6 | 558 | 5.5% | 0.388 |

La categoria entra al modelo como variable, asi que un reparto disparejo no lo
invalida, pero si explica que el error sea mayor en las categorias menos
frecuentes: hay menos ejemplos de los que aprender.

## 8. Estacionalidad

| Mes | Casos medios por zona y categoria | Temporada |
|---|---|---|
| enero | 1.369 | lluvias |
| febrero | 1.221 | lluvias |
| marzo | 1.263 | lluvias |
| abril | 0.955 | seca |
| mayo | 1.016 | seca |
| junio | 1.087 | seca |
| julio | 1.293 | seca |
| agosto | 0.796 | seca |
| septiembre | 0.907 | seca |
| octubre | 0.988 | seca |
| noviembre | 1.583 | lluvias |
| diciembre | 1.633 | lluvias |

- Temporada de lluvias (noviembre a marzo): **1.367** Casos de media.
- Temporada seca: **1.035**.
- Razon lluvias/seca: **1.32x**.

La estacionalidad se ve y coincide con la que el simulador de ISSUE-28 genera por
construccion (factor 1.25 en lluvias, 0.78 en seca). **Eso es exactamente la
limitacion del ejercicio:** el modelo esta recuperando una regla conocida, no
descubriendo un patron de la operacion municipal real.

## 9. Clima (unica variable observada real)

Fuente: **Open-Meteo Archive API (ERA5)**, extraida el
2026-07-31T02:48:26.554475+00:00.

| Variable | Media | Minimo | Maximo |
|---|---|---|---|
| Precipitacion semanal (mm) | 26.6 | 0.0 | 107.6 |
| Temperatura media (C) | 23.1 | 14.0 | 28.3 |

Precipitacion media en lluvias: **39.8 mm** frente a **17.3 mm** en
seca. Es el unico dato del dataset que no sale del simulador, y por eso se
declara aparte en la procedencia del modelo.

## 10. Correlacion con el objetivo

Las seis variables que mas se mueven con el objetivo:

| Variable predictora | Correlacion de Pearson |
|---|---|
| `casos_media_4` | +0.708 |
| `reportes_media_4` | +0.706 |
| `reportes_lag_1` | +0.639 |
| `dispositivos_lag_1` | +0.639 |
| `casos_lag_1` | +0.617 |
| `reportes_lag_2` | +0.614 |

Y las cinco que menos:

| Variable predictora | Correlacion de Pearson |
|---|---|
| `semana_del_anio` | +0.007 |
| `mes` | +0.020 |
| `precipitacion_mm` | +0.044 |
| `temperatura_media` | +0.067 |
| `es_lluvias` | +0.110 |

Toda la senal util esta en el **pasado reciente de la propia serie**: los rezagos
y las medias moviles llegan a 0.71, mientras el calendario y el
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
