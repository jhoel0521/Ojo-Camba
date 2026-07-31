# ms-prediccion — pronóstico semanal de Casos de Obra (ISSUE-31)

Predice cuántos **Casos de Obra nuevos** se abrirán por zona H3 (resolución 8) y
categoría en los próximos 7 días, y convierte ese pronóstico en **alertas de
capacidad** para el coordinador operativo.

Es el único microservicio en Python: el pipeline de Machine Learning usa pandas
y scikit-learn. No se publica con dominio propio — se llega por
`gateway-principal`, que es donde se comprueban los roles.

## Por qué predice Casos y no reportes

La operación municipal se planifica por Casos: una visita atiende el Caso
completo. Predecir reportes sobrevaloraría las zonas con reportes virales —
diez vecinos reportando el mismo bache son **un** trabajo para la cuadrilla.

## Cómo correr

```bash
# 1. Infraestructura y datos (el histórico lo genera ISSUE-28)
pnpm docker:up

# 2. Entrenar (descarga el clima real y compara los tres modelos)
docker build -t ojo-camba/ms-prediccion:dev backend/ms-prediccion
docker run --rm \
  -e DATABASE_URL="postgresql+psycopg://ojocamba:ojocamba_secret@host.docker.internal:5432/ojocamba" \
  -v "$PWD/backend/ms-prediccion/modelos:/app/modelos" \
  -v "$PWD/backend/ms-prediccion/datos:/app/datos" \
  ojo-camba/ms-prediccion:dev python -m app.entrenar_cli

# 3. Servir
docker run -d -p 3007:3007 ... ojo-camba/ms-prediccion:dev
```

**El entrenamiento no corre al arrancar, y es a propósito.** En el VPS actual
(2 núcleos, sin swap, compartido con otros proyectos) un entrenamiento
desatendido compite por memoria con el resto de la plataforma. Se dispara a
mano: `POST /prediccion/entrenar` o el CLI.

## Documentos que acompañan al modelo

| Documento | Contenido | Cómo se mantiene |
|---|---|---|
| [`docs/ISSUE-31-eda.md`](../../docs/ISSUE-31-eda.md) | Análisis exploratorio: cobertura, distribuciones, nulos, atípicos, estacionalidad y correlaciones | Generado con `python -m app.eda_cli` — **no editar a mano** |
| [`docs/ISSUE-31-sesgos.md`](../../docs/ISSUE-31-sesgos.md) | Auditoría de sesgos geográficos, temporales y de cobertura; límites de uso y bitácora | A mano, revisando contra el EDA |

```bash
docker run --rm -v "$PWD:/repo" -w /repo/backend/ms-prediccion \
  -e DATABASE_URL="postgresql+psycopg://ojocamba:ojocamba_secret@host.docker.internal:5432/ojocamba" \
  ojo-camba/ms-prediccion:dev python -m app.eda_cli --salida ../../docs/ISSUE-31-eda.md
```

## Diccionario de datos

Una fila del dataset = **(semana, zona H3 res-8, categoría)**.

| Columna | Tipo | Origen | Descripción |
|---|---|---|---|
| `casos_nuevos` | entero | `grupos_reportes` | **Objetivo.** Casos abiertos esa semana en esa zona y categoría |
| `casos_lag_1..3` | entero | derivado | Casos de las 1, 2 y 3 semanas anteriores |
| `casos_media_4` | decimal | derivado | Promedio de Casos del último mes (sin incluir la semana actual) |
| `reportes_lag_1..3` | entero | `reportes` | Reportes ciudadanos de las semanas anteriores |
| `reportes_media_4` | decimal | derivado | Promedio de reportes del último mes |
| `dispositivos_lag_1` | entero | `reportes` | Dispositivos distintos que reportaron la semana previa |
| `gravedad_lag_1` | decimal | `reportes` | Gravedad media de la semana previa (Baja=1 … Emergencia=4) |
| `casos_abiertos_inicio` | entero | `grupos_reportes` + `actualizaciones_caso` | Cola al comenzar la semana: ya creado y todavía sin cerrar **en esa semana**, según el historial de estados — no según el estado de hoy |
| `cuadrillas_activas` | entero | `cuadrillas` | Capacidad acumulada hasta esa semana |
| `carga_por_cuadrilla` | decimal | derivado | Cola dividida entre cuadrillas activas |
| `mes`, `semana_del_anio` | entero | calendario | Estacionalidad |
| `es_lluvias` | 0/1 | calendario | Noviembre a marzo en Santa Cruz |
| `precipitacion_mm` | decimal | **Open-Meteo** | Lluvia semanal real |
| `temperatura_media` | decimal | **Open-Meteo** | Temperatura media semanal real |
| `categoria_id` | entero | `categorias` | Bache, luminaria, residuos, alcantarillado, tráfico, otro |

### Fuga de información: qué NO entra

`reportes`, `dispositivos` y `gravedad_media` **de la propia semana** están
excluidos de las variables predictoras. Con ellos el modelo daba MAE 0.351 y
R² 0.721, pero explicaba el 90% con datos que al momento de pronosticar todavía
no existen. Sin ellos, el R² real es 0.385. **El número peor es el honesto.**

El clima de la semana a predecir sí se usa, porque en producción se obtiene de
un pronóstico meteorológico; cuando no está disponible se cae al promedio
histórico del mes.

### Transformaciones

1. Rejilla completa: las semanas sin Casos en una zona se rellenan con cero — un
   cero es información, y sin él el modelo nunca aprende a predecir calma.
2. Rezagos y medias móviles por (zona, categoría).
3. Las primeras semanas de cada serie se descartan por no tener historia, en vez
   de imputarlas.

## Comparación de modelos

Partición **temporal** (nunca aleatoria: mezclar semanas dejaría futuro en el
entrenamiento) y validación cruzada con `TimeSeriesSplit`.

| Modelo | MAE | RMSE | R² | Diagnóstico |
|---|---|---|---|---|
| **Regresión lineal** | **0.897** | 1.252 | 0.385 | ajuste razonable |
| Árbol de decisión | 0.958 | 1.367 | 0.268 | sobreajuste moderado |
| Random Forest | 0.904 | 1.266 | 0.372 | sobreajuste moderado |

**Elegido: regresión lineal**, por menor error en las 12 semanas no vistas.
Que le gane al Random Forest tiene sentido: el simulador genera la demanda con
una fórmula casi lineal (base creciente × factor estacional + ruido), así que el
bosque agrega varianza sin aportar señal.

Variables más influyentes: `casos_media_4` (25.7%), **`casos_abiertos_inicio`
(17.0%)**, `reportes_media_4` (15.7%), `casos_lag_1` (13.6%).

Que la cola abierta sea la segunda variable del modelo es reciente: hasta que se
corrigió la consulta que la calcula (ver limitaciones) valía cero en todo el
historial y el modelo predecía sólo por inercia de la demanda. El error apenas
se movió —de 0.899 a 0.897 de MAE—, pero la explicación de cada pronóstico
cambió: ahora la cola pesa, que es como razona el coordinador.

## Limitaciones

- **El historial es sintético.** Lo genera el simulador de ISSUE-28 con reglas
  conocidas (demanda creciente, factor 1.25 en lluvias y 0.78 en seca, ruido
  acotado). Un R² alto mediría que el modelo aprendió esas reglas, no que
  anticipe la operación municipal real.
- La única variable observada del dataset es el clima.
- **Dos variables predictoras siguen muertas:** `cuadrillas_activas` vale cero en
  el 98.8% de las filas y `carga_por_cuadrilla`, que se deriva de ella, en el
  99.5%. Las 20 cuadrillas se dan de alta en el seed con fecha de hoy, así que no
  hay historia de capacidad que aprender y no es reconstruible desde los datos.
  El modelo entrena **sin** información de capacidad.
- Una tercera, `casos_abiertos_inicio`, estaba muerta por un motivo distinto y ya
  **se corrigió**: la consulta decidía si un Caso estaba abierto en la semana W
  mirando su estado de hoy en vez del que tenía en W. Además de dar cero en todo
  el historial, sobre datos reales habría filtrado el presente hacia el pasado.
  Ahora se reconstruye con `actualizaciones_caso`. Detalle en la sección 4 de
  [`ISSUE-31-sesgos.md`](../../docs/ISSUE-31-sesgos.md).
- Las cuadrillas todavía no tienen especialidad cargada, así que la capacidad se
  reparte pareja entre zonas en vez de por especialidad. Cuando ISSUE-29 cargue
  las especialidades, la cuota debe calcularse por categoría.
- Antes de usarlo para decidir en producción hace falta reentrenar con Casos
  reales y volver a publicar estas métricas.

## Endpoints

| Ruta | Rol | Qué devuelve |
|---|---|---|
| `GET /health` | — | Estado y si hay modelo entrenado |
| `GET /modelo` | coordinador, autoridad, IT | Métricas comparadas, procedencia, limitaciones |
| `GET /pronostico` | coordinador, autoridad | Casos esperados por zona y categoría, con confianza |
| `GET /alertas` | coordinador | Alertas al 80% y 100% con recomendación explicable |
| `POST /entrenar` | IT | Reentrena y vuelve a comparar |

Por el gateway: `/prediccion/...` con `Authorization: Bearer <token>`.

**El servicio nunca asigna ni reasigna cuadrillas.** Recomienda; la decisión y
su motivo son del coordinador.

## Tests

```bash
docker run --rm -v "$PWD/backend/ms-prediccion:/app" -w /app \
  ojo-camba/ms-prediccion:dev sh -c "pip install -q pytest && python -m pytest -q"
```

29 pruebas, en tres archivos:

- `test_alertas.py` — umbrales 80/100, que la carga se mida en reportes y no en
  Casos, que la cola abierta ocupe capacidad y que toda alerta traiga factores.
- `test_dataset_y_entrenamiento.py` — la guarda contra fuga de información, la
  rejilla completa, que los rezagos miren al pasado, que la partición sea
  temporal y que se comparen los tres modelos.
- `test_api.py` — contrato HTTP: 409 mientras no haya modelo, campos de cada
  respuesta, filtros y validación de rangos.

El proxy del gateway se prueba aparte, del lado de NestJS, porque ahí es donde
viven los roles:

```bash
pnpm --filter @ojo-camba/gateway-principal test
```
