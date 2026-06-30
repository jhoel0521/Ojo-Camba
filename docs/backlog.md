# Archivo: backlog.md

# Backlog e Historias de Usuario

**Descripción:** Inventario de historias de usuario priorizadas para el desarrollo de la plataforma, redactadas bajo estándares ágiles e incluyendo criterios de aceptación técnicos claros para la nueva lógica de agrupaciones y bitácoras.

## Módulo 1: Reportes y Mapa (App de Reporte)

**HU-01: Registro de Reporte**

* **Como** ciudadano, **quiero** tomar una foto de un problema, categorizarlo y enviarlo usando mi ubicación, **para** que se registre en el mapa de la ciudad.
* **Criterios de Aceptación:**
* El sistema captura de forma transparente el DeviceID.
* La imagen se guarda en MinIO y se devuelve una URL persistente.
* El microservicio calcula y guarda el índice H3 en resoluciones 8, 11 y 13.
* El estado inicial es "Reportado".

```gherkin
Característica: Registro de reporte ciudadano

  Escenario: Ciudadano anónimo registra un reporte exitosamente
    Dado que el ciudadano tiene la app abierta y el GPS activado
    Y la cámara captura una fotografía válida
    Cuando envía el reporte con categoría y ubicación
    Entonces el sistema captura el DeviceID de forma transparente
    Y la imagen queda almacenada en MinIO con una URL persistente
    Y se generan los índices H3 en resoluciones 8, 11 y 13
    Y el reporte queda con estado "Reportado"

  Escenario: Fallo de conectividad al enviar el reporte
    Dado que el ciudadano completa el formulario de reporte
    Cuando no hay conexión a internet al enviar
    Entonces la app muestra un mensaje de error claro
    Y no se crea ningún registro incompleto en la base de datos
```



**HU-02: Visualización de la Bitácora del Reporte (Línea de tiempo)**

* **Como** ciudadano, **quiero** entrar al detalle de mi reporte y ver una línea de tiempo con todas las actualizaciones, **para** saber exactamente qué trabajo está realizando la alcaldía día a día.
* **Criterios de Aceptación:**
* Si el reporte fue agrupado, la vista redirige transparentemente al historial del "Caso de Obra" (Grupo) al que pertenece.
* Se muestran cronológicamente los comentarios de los técnicos, fotos de avance y cambios de fecha estimada de finalización.

```gherkin
Característica: Bitácora pública del reporte

  Escenario: Ciudadano consulta la línea de tiempo de su reporte individual
    Dado que el ciudadano tiene un reporte registrado sin agrupar
    Cuando accede al detalle de su reporte
    Entonces ve la línea de tiempo con actualizaciones cronológicas
    Y se muestran comentarios, fotos de avance y cambios de fecha estimada

  Escenario: Reporte agrupado redirige al Caso de Obra
    Dado que el reporte del ciudadano fue agrupado en un Caso de Obra
    Cuando accede al detalle de su reporte
    Entonces es redirigido transparentemente al historial del Caso de Obra
    Y ve todas las actualizaciones del grupo de reportes
```



## Módulo 2: Monitoreo y Salud del Sistema (App de Status)

**HU-03: Monitoreo de Microservicios**

* **Como** administrador o usuario público, **quiero** acceder a una página de estado independiente, **para** verificar en tiempo real si los microservicios están operativos.
* **Criterios de Aceptación:**
* El API Gateway Status realiza un ping por TCP cada 60 segundos a todos los microservicios.
* La interfaz muestra el estado "Operativo" (Verde) o "Interrupción" (Rojo).

```gherkin
Característica: Monitoreo público de microservicios

  Escenario: Todos los microservicios responden correctamente
    Dado que el Gateway de Status realiza un ping TCP cada 60 segundos
    Cuando todos los microservicios responden dentro del timeout
    Entonces la App de Status muestra estado "Operativo" en verde para cada uno

  Escenario: Un microservicio no responde al ping
    Dado que el Gateway de Status realiza el ciclo de ping periódico
    Cuando un microservicio no responde dentro del timeout configurado
    Entonces la App de Status muestra estado "Interrupción" en rojo para ese servicio
    Y los demás microservicios mantienen su estado sin verse afectados
```



## Módulo 3: Trabajo de Cuadrillas (App de Técnicos)

**HU-04: Creación de Caso de Obra (Agrupación de Reportes)**

* **Como** técnico en campo o moderador, **quiero** seleccionar varios reportes que apuntan al mismo problema y agruparlos, **para** crear un único "Caso de Obra" que consolide la atención.
* **Criterios de Aceptación:**
* La aplicación sugiere reportes cercanos por proximidad física (no por igualdad estricta de celda H3, ya que un mismo problema real puede caer en celdas distintas si está cerca de un borde de hexágono); el backoffice/moderador decide cuáles incluir.
* El sistema genera un registro en la tabla grupos_reportes con un código único.
* Todos los reportes seleccionados adquieren el grupo_id y heredan su estado.

```gherkin
Característica: Creación de Caso de Obra

  Escenario: Moderador agrupa reportes cercanos sugeridos por el sistema
    Dado que existen 3 reportes cercanos entre sí (mismo hexágono H3 resolución 11 o sus vecinos)
    Y el moderador los selecciona en el backoffice
    Cuando ejecuta la acción "Crear Caso de Obra"
    Entonces se genera un registro en grupos_reportes con código único (Ej: O-26-0000001)
    Y los 3 reportes adquieren el grupo_id del nuevo caso
    Y heredan el estado "Aceptado" del grupo

  Escenario: Moderador agrupa reportes de hexágonos H3 distintos
    Dado que el moderador selecciona reportes de hexágonos H3 diferentes pero del mismo problema real
    Cuando ejecuta la acción "Crear Caso de Obra"
    Entonces el sistema permite la agrupación sin restricción estricta por celda
    Y el moderador es responsable de validar que correspondan al mismo problema
```



**HU-05: Actualización Diaria (Bitácora de Trabajo)**

* **Como** técnico en campo, **quiero** subir actualizaciones diarias a un Caso de Obra (fotos, solicitud de maquinaria, corrección GPS), **para** informar del progreso sin tener que dar por "Finalizado" el trabajo prematuramente.
* **Criterios de Aceptación:**
* El sistema permite insertar un registro en actualizaciones_caso sin requerir un cambio en el estado_nuevo.
* Permite capturar latitud y longitud actualizadas para corregir el pin en el mapa.
* Los campos fecha_estimada_fin y recursos_solicitados son opcionales pero visibles en la bitácora pública.

```gherkin
Característica: Bitácora de trabajo del técnico

  Escenario: Técnico registra actualización diaria sin cambiar el estado
    Dado que el técnico tiene un Caso de Obra en estado "En Trabajo"
    Cuando sube una foto de progreso con comentario "Día 2 - Retirando escombros"
    Y no modifica el estado_nuevo del caso
    Entonces se inserta un registro en actualizaciones_caso con estado_nuevo nulo
    Y la actualización es visible en la bitácora pública del ciudadano

  Escenario: Técnico corrige coordenadas GPS en terreno
    Dado que el técnico está físicamente en el lugar del Caso de Obra
    Cuando captura la posición GPS actual y la guarda como corrección
    Entonces el pin del mapa se actualiza con las nuevas coordenadas lat_actualizada y lng_actualizada
    Y la corrección queda registrada en la bitácora con timestamp

  Escenario: Técnico solicita maquinaria adicional
    Dado que el Caso de Obra requiere una volqueta
    Cuando el técnico completa el campo recursos_solicitados
    Y actualiza la fecha_estimada_fin
    Entonces ambos campos aparecen visibles en la bitácora pública
```



**HU-07: Visualización de Casos Cercanos (Radio H3)**

* **Como** técnico en campo, **quiero** ver los reportes y Casos de Obra en un radio cercano a mi ubicación actual, **para** saber qué problemas atender primero.
* **Criterios de Aceptación:**
* La app obtiene los hexágonos H3 vecinos a la posición GPS del técnico en resolución 13.
* El sistema devuelve los reportes agrupados por Caso de Obra dentro de esos hexágonos.
* Se muestran ordenados por proximidad al punto actual.

```gherkin
Característica: Visualización de casos cercanos

  Escenario: Técnico consulta casos en su zona
    Dado que el técnico está en una ubicación con coordenadas GPS específicas
    Cuando abre la app y solicita casos cercanos
    Entonces el sistema calcula los hexágonos H3 resolución 13 vecinos
    Y devuelve los Casos de Obra y reportes en esos hexágonos
    Y se ordenan por distancia al punto actual
```



**HU-08: Cambio de Estado del Caso de Obra**

* **Como** técnico en campo, **quiero** cambiar el estado de un Caso de Obra a "En Trabajo" o "Finalizado", **para** reflejar el progreso real de la obra.
* **Criterios de Aceptación:**
* El sistema permite transicionar el estado del grupo entre los valores del enum EstadoReporte.
* Al cambiar a "Finalizado", todos los reportes del grupo heredan el nuevo estado.
* La transición queda registrada en la bitácora de actualizaciones.

```gherkin
Característica: Cambio de estado del Caso de Obra

  Escenario: Técnico inicia el trabajo en un caso
    Dado que existe un Caso de Obra en estado "Aceptado"
    Cuando el técnico registra una actualización con estado_nuevo "EnTrabajo"
    Entonces el grupo y todos sus reportes cambian a estado "EnTrabajo"
    Y la transición queda registrada en la bitácora con timestamp

  Escenario: Técnico finaliza el caso
    Dado que un Caso de Obra está en estado "EnTrabajo"
    Cuando el técnico registra una actualización con estado_nuevo "Finalizado"
    Entonces el grupo y todos sus reportes cambian a estado "Finalizado"
```



## Módulo 4: Gamificación y Cultura Local

> **⏳ Pendiente de implementación** — `ms-gamify` existe como stub. La entidad `Nivel` y los endpoints `/gamify/*` no están implementados.

**HU-06: Recompensas por Reportes Aceptados**

* **Como** usuario registrado, **quiero** recibir puntos y subir de nivel por cada reporte válido, **para** motivarme a seguir colaborando.
* **Criterios de Aceptación:**
* Los puntos se suman a la cuenta en la transición a "Aceptado".
* Si el reporte es agrupado posteriormente en un Caso de Obra, el usuario conserva sus puntos íntegramente.
* Alcanzar un nuevo nivel desbloquea un nuevo sticker visual en la aplicación.

```gherkin
Característica: Gamificación y recompensas

  Escenario: Usuario gana puntos al ser aceptado su reporte
    Dado que el usuario tiene un reporte en estado "Reportado"
    Cuando el moderador cambia el estado a "Aceptado"
    Entonces los puntos correspondientes se suman al total del usuario en la transición
    Y el nuevo total de puntos queda persistido en la cuenta

  Escenario: Puntos conservados al agrupar el reporte en un Caso de Obra
    Dado que el usuario ya recibió puntos por su reporte aceptado
    Cuando ese reporte es agrupado en un Caso de Obra por un moderador
    Entonces el usuario conserva íntegramente los puntos previamente ganados
    Y no se aplica ninguna penalización

  Escenario: Usuario sube de nivel
    Dado que el usuario acumula los puntos necesarios para el siguiente nivel
    Cuando el sistema detecta que se superó el umbral de puntos_requeridos
    Entonces el nivel_id del usuario se actualiza automáticamente
    Y se desbloquea el nuevo sticker visual en la aplicación
```
