# Auditoría de sesgos y bitácora del modelo de predicción (ISSUE-31)

Este documento acompaña al modelo de `ms-prediccion`. Los números salen de
[`ISSUE-31-eda.md`](ISSUE-31-eda.md), que se regenera con
`python -m app.eda_cli`; si el historial cambia, hay que regenerar el EDA y
revisar este texto.

**Regla de lectura:** el modelo estima demanda para ayudar a repartir cuadrillas.
Un sesgo acá no es una curiosidad estadística — es una zona de la ciudad que
recibe menos atención de la que necesita.

---

## 1. Sesgo geográfico

**Qué se midió.** 18 zonas H3 (resolución 8) con actividad. El 20% más activo
—4 zonas— concentra el **37,5%** de los Casos. La zona más activa acumula el
10,0%; la menos activa está un orden de magnitud por debajo.

**Por qué importa.** El modelo aprende mucho mejor donde hay ejemplos. En las
zonas de cola larga ve casi puros ceros, así que tiende a predecir cero: la
predicción es "correcta" en promedio y **útil para nadie**. Si la capacidad se
reparte siguiendo el pronóstico sin corrección, las zonas con poca historia
quedan sistemáticamente al final de la fila.

**Mitigación aplicada.** La cuota de capacidad de las alertas se reparte pareja
entre zonas con demanda esperada, no proporcional al pronóstico. Una zona con
poca historia no queda sin cuota por el solo hecho de tener poca historia.

**Pendiente.** Publicar el error del modelo *por zona* y no sólo agregado. Un
MAE global de 0,897 puede esconder que en las cuatro zonas activas el error es
la mitad y en el resto el doble.

---

## 2. Sesgo de cobertura de reportes

**Qué se midió.** El objetivo (`casos_nuevos`) se construye a partir de reportes
ciudadanos agrupados. Una zona sólo aparece en el dataset si alguien reportó.

**Por qué importa.** Es el sesgo más serio del sistema y **no se corrige con
mejor modelo**. Lo que se predice no es "dónde hay más baches" sino "dónde más
se reporta". Si un barrio reporta poco —menos smartphones, menos confianza en
que sirva, menos conocimiento de la app— su demanda real queda invisible, el
modelo predice calma y la operación confirma el diagnóstico no yendo. El circuito
se retroalimenta.

**Mitigación aplicada.** Ninguna dentro del modelo: no hay forma honesta de
inferir lo que nadie reportó. Lo que sí se hace es **declararlo** acá y en las
limitaciones que devuelve `GET /prediccion/modelo`, para que la recomendación no
se lea como un mapa de necesidad.

**Pendiente.** Cruzar con una fuente que no dependa de que el vecino reporte
(inspecciones programadas, censo de infraestructura) y comparar cobertura. Sin
eso, cualquier lectura del pronóstico como "necesidad real" es incorrecta.

---

## 3. Sesgo temporal

**Qué se midió.** 83 semanas, del 2024-12-30 al 2026-07-27. La razón entre
temporada de lluvias y seca es **1,32x**.

**Por qué importa.** El simulador de ISSUE-28 genera la demanda con un factor
estacional conocido (1,25 en lluvias, 0,78 en seca). El 1,32x medido **es ese
factor**, recuperado. El modelo no descubrió la estacionalidad de Santa Cruz:
reaprendió la fórmula con la que se generaron los datos.

Además, 83 semanas cubren menos de dos ciclos anuales completos. Cualquier patrón
anual está soportado por una repetición y media — estadísticamente, casi nada.

**Mitigación aplicada.** La partición de entrenamiento y prueba es temporal y la
validación cruzada usa `TimeSeriesSplit`: ningún pliegue entrena con futuro. Eso
evita inflar las métricas, pero no crea historia que no existe.

---

## 4. Variables degeneradas (hallazgo del EDA)

El EDA marca automáticamente toda variable predictora cuyo valor más frecuente
cubra más del 98% de las filas. La primera corrida encontró **tres**, por dos
motivos que conviene no confundir: uno de datos y uno de método.

### 4.1 El de método: `casos_abiertos_inicio` — **corregido**

La consulta que arma la cola decidía si un Caso estaba abierto en la semana W
mirando su estado **de hoy**, no el que tenía en W. Dos problemas en uno:

1. Daba cero en todo el historial, porque el simulador cierra todo lo que genera
   y los 278 Casos que siguen abiertos se crearon todos en la última semana.
2. Más grave: sobre datos reales habría filtrado el presente hacia el pasado. El
   modelo habría entrenado con información que en producción no existe al
   momento de pronosticar — la misma clase de error que la sección 5 describe
   para las variables contemporáneas, pero escondido detrás de un cero.

**Corregido.** La cola de la semana W se reconstruye desde `actualizaciones_caso`
(51.353 transiciones con fecha): un Caso cuenta si ya existía en W y todavía no
se había cerrado en W. La columna pasó de constante a seis valores distintos, con
correlación 0,58 con el objetivo.

Lo que cambió al reentrenar es instructivo: **el error casi no se movió** (MAE de
0,899 a 0,897), pero `casos_abiertos_inicio` se convirtió en la **segunda
variable más influyente del modelo, con el 17,0%**. Es decir, el modelo anterior
llegaba al mismo número por inercia pura de la demanda; el corregido llega a un
número parecido pero **por las razones correctas**. Para una alerta que tiene que
explicarle al coordinador de dónde sale el riesgo, eso no es un detalle.

### 4.2 El de datos: capacidad — **sin corregir, y no es corregible**

| Variable | Valor dominante | Causa |
|---|---|---|
| `cuadrillas_activas` | 0 en el 98,8% | Las 20 cuadrillas se dan de alta en el seed, con fecha de hoy |
| `carga_por_cuadrilla` | 0 en el 99,5% | Se deriva de la anterior |

No hay historia de capacidad en la base y no se puede inventar: nadie registró
cuándo empezó a operar cada cuadrilla. **El modelo entrena sin información de
capacidad**, y eso queda en las limitaciones que devuelve
`GET /prediccion/modelo`. Se resuelve solo con el tiempo, cuando la operación
real acumule altas y bajas fechadas.

---

## 5. Fuga de información: qué se excluyó y por qué

`reportes`, `dispositivos` y `gravedad_media` **de la propia semana** están fuera
de las variables predictoras. Con ellas el modelo daba MAE 0,351 y R² 0,721;
sin ellas, R² 0,385.

La diferencia no es una mejora perdida: esas variables no existen todavía cuando
hay que pronosticar. Un modelo que las use tiene métricas de laboratorio y
resultados de producción muy distintos. **Se eligió el número peor porque es el
honesto**, y queda como test automático
(`test_ninguna_variable_predictora_es_de_la_semana_a_predecir`) para que nadie
las reintroduzca sin darse cuenta.

El clima de la semana a predecir sí se usa: en producción se obtiene de un
pronóstico meteorológico, que es información disponible de antemano.

---

## 6. Procedencia de los datos

| Fuente | Tipo | Detalle |
|---|---|---|
| Casos y reportes | **Sintético** | Simulador histórico de ISSUE-28, reglas conocidas |
| Clima | **Real** | Open-Meteo Archive API (ERA5), licencia CC-BY 4.0 |
| Cuadrillas y umbrales | Seed de desarrollo | `configuracion_operativa` (ISSUE-26) |

La separación se mantiene explícita en el EDA, en los metadatos que devuelve
`GET /prediccion/modelo` y en el campo `origen: "estimacion"` de cada pronóstico.
Un pronóstico nunca viaja etiquetado como observación.

---

## 7. Uso de IA en el desarrollo

El microservicio se construyó con asistencia de un modelo de lenguaje (Claude,
vía Claude Code): diseño del pipeline, consultas SQL, código y documentación,
todo revisado y corregido por el equipo antes de commitear. La decisión de
excluir las variables contemporáneas, la de no eliminar atípicos y la elección
del modelo final se tomaron sobre evidencia medida, no sobre la sugerencia de la
herramienta.

Vale la aclaración inversa: **el servicio no usa IA generativa en tiempo de
ejecución**. El pronóstico sale de una regresión lineal entrenada con
scikit-learn y las alertas de reglas de umbral explícitas. No hay nada que
"alucine" — hay un modelo estadístico con un error medio publicado.

---

## 8. Límites de uso

Lo que este modelo **no** habilita:

1. **No decide sobre personas.** No evalúa desempeño de cuadrillas ni de técnicos.
2. **No asigna ni reasigna.** Recomienda; la decisión y su motivo son del
   coordinador, y quedan registrados (ISSUE-32).
3. **No mide necesidad real de un barrio.** Mide reportes, que es otra cosa
   (sección 2).
4. **No sirve todavía para decidir en producción.** El historial es sintético.
   Antes de usarlo hace falta reentrenar con Casos reales y volver a publicar
   estas métricas y esta auditoría.

---

## 9. Bitácora

| Fecha | Hecho |
|---|---|
| 2026-07-30 | Primera versión del pipeline; se detecta y elimina la fuga de información (R² baja de 0,721 a 0,382) |
| 2026-07-30 | Se incorpora clima real de Open-Meteo con procedencia y fecha de extracción |
| 2026-07-30 | Se comparan los tres modelos; gana regresión lineal por MAE en 12 semanas no vistas |
| 2026-07-31 | EDA generado desde la base; se detectan tres variables degeneradas y el anacronismo de `casos_abiertos_inicio` (sección 4) |
| 2026-07-31 | Se corrige la cola histórica usando `actualizaciones_caso` y se reentrena. MAE 0,899 → 0,897; `casos_abiertos_inicio` pasa a ser la segunda variable del modelo (17,0%) |
