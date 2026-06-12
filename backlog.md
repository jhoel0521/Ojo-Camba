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



**HU-02: Visualización de la Bitácora del Reporte (Línea de tiempo)**

* **Como** ciudadano, **quiero** entrar al detalle de mi reporte y ver una línea de tiempo con todas las actualizaciones, **para** saber exactamente qué trabajo está realizando la alcaldía día a día.
* **Criterios de Aceptación:**
* Si el reporte fue agrupado, la vista redirige transparentemente al historial del "Caso de Obra" (Grupo) al que pertenece.
* Se muestran cronológicamente los comentarios de los técnicos, fotos de avance y cambios de fecha estimada de finalización.



## Módulo 2: Monitoreo y Salud del Sistema (App de Status)

**HU-03: Monitoreo de Microservicios**

* **Como** administrador o usuario público, **quiero** acceder a una página de estado independiente, **para** verificar en tiempo real si los microservicios están operativos.
* **Criterios de Aceptación:**
* El API Gateway Status realiza un ping por TCP cada 60 segundos a todos los microservicios.
* La interfaz muestra el estado "Operativo" (Verde) o "Interrupción" (Rojo).



## Módulo 3: Trabajo de Cuadrillas (App de Técnicos)

**HU-04: Creación de Caso de Obra (Agrupación de Reportes)**

* **Como** técnico en campo o moderador, **quiero** seleccionar varios reportes que apuntan al mismo problema y agruparlos, **para** crear un único "Caso de Obra" que consolide la atención.
* **Criterios de Aceptación:**
* La aplicación permite seleccionar múltiples IDs de reportes del mismo H3 (res 11 o 13).
* El sistema genera un registro en la tabla grupos_reportes con un código único.
* Todos los reportes seleccionados adquieren el grupo_id y heredan su estado.



**HU-05: Actualización Diaria (Bitácora de Trabajo)**

* **Como** técnico en campo, **quiero** subir actualizaciones diarias a un Caso de Obra (fotos, solicitud de maquinaria, corrección GPS), **para** informar del progreso sin tener que dar por "Finalizado" el trabajo prematuramente.
* **Criterios de Aceptación:**
* El sistema permite insertar un registro en actualizaciones_caso sin requerir un cambio en el estado_nuevo.
* Permite capturar latitud y longitud actualizadas para corregir el pin en el mapa.
* Los campos fecha_estimada_fin y recursos_solicitados son opcionales pero visibles en la bitácora pública.



## Módulo 4: Gamificación y Cultura Local

**HU-06: Recompensas por Reportes Aceptados**

* **Como** usuario registrado, **quiero** recibir puntos y subir de nivel por cada reporte válido, **para** motivarme a seguir colaborando.
* **Criterios de Aceptación:**
* Los puntos se suman a la cuenta en la transición a "Aceptado".
* Si el reporte es agrupado posteriormente en un Caso de Obra, el usuario conserva sus puntos íntegramente.
* Alcanzar un nuevo nivel desbloquea un nuevo sticker visual en la aplicación.
