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
MAE global de 0,899 puede esconder que en las cuatro zonas activas el error es
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

**Qué se midió.** Tres de las 19 variables predictoras no aportan nada en este
dataset:

| Variable | Estado | Causa |
|---|---|---|
| `casos_abiertos_inicio` | **constante en 0** | Los 278 Casos abiertos fueron creados todos en la última semana del historial |
| `carga_por_cuadrilla` | **constante en 0** | Se deriva de la anterior dividida por cuadrillas |
| `cuadrillas_activas` | 0 salvo la última semana | Las 20 cuadrillas se dan de alta en el seed, con fecha de hoy |

**Por qué importa.** Hay dos problemas distintos acá y conviene no confundirlos.

El primero es de **datos**: el simulador cierra todo lo que genera y deja el
backlog y las cuadrillas para el final. No hay cola histórica que aprender.

El segundo es de **método**, y es más grave: la consulta que arma
`casos_abiertos_inicio` decide si un Caso estaba abierto en la semana W mirando
su estado *de hoy*, no el que tenía en W. Sobre datos reales eso sería filtrar el
presente hacia el pasado. Acá el error se esconde porque el resultado colapsa a
cero, pero el día que haya cola histórica el modelo entrenaría con información
que en producción no va a tener.

**Estado.** La base ya tiene con qué corregirlo: `actualizaciones_caso` guarda
51.353 transiciones de estado con fecha, así que el estado de un Caso en
cualquier semana pasada es reconstruible. Mientras no se corrija, las métricas
publicadas se obtuvieron **sin** información de cola ni de capacidad: son las de
un modelo que predice sólo por inercia de la demanda.

---

## 5. Fuga de información: qué se excluyó y por qué

`reportes`, `dispositivos` y `gravedad_media` **de la propia semana** están fuera
de las variables predictoras. Con ellas el modelo daba MAE 0,351 y R² 0,721;
sin ellas, R² 0,382.

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
