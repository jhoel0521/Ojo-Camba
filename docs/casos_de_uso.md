# Archivo: casos_de_uso.md

# Casos de Uso del Sistema

**Descripción:** Listado de las interacciones principales que los diferentes actores (Ciudadano, Moderador, Técnico y Público) pueden realizar dentro de la plataforma Ojo Camba. Un mismo usuario puede poseer múltiples roles simultáneamente (ej. ser Ciudadano reportante y Técnico de cuadrilla).

## Actor: Ciudadano (Anónimo o Registrado)

* **CU-01:** Visualizar el mapa de calor de problemas urbanos en tiempo real.
* **CU-02:** Registrar un nuevo reporte urbano adjuntando fotografía, categoría y ubicación GPS.
* **CU-03:** Crear una cuenta de usuario y enlazar su historial de reportes previos mediante su DeviceID.
* **CU-04:** Consultar la "Bitácora Pública" (línea de tiempo) de su reporte para ver los avances diarios, comentarios y fotos subidas por las cuadrillas.
* **CU-05:** Compartir el estado de su reporte en redes sociales mediante un enlace o sticker dinámico.

## Actor: Moderador Comunitario / Administrador

* **CU-06:** Visualizar la bandeja de entrada de reportes en estado inicial ("Reportado").
* **CU-07:** Validar un reporte visualmente y aceptarlo o rechazarlo. Al aceptar, el sistema crea automáticamente un Caso de Obra (`GrupoReporte`) con código único (ej. `O-26-0000001`), asigna el reporte al grupo y cambia el estado a "Aceptado". El moderador puede confirmar o corregir la categoría del grupo en ese momento.
* **CU-08:** Fusionar reportes adicionales de una misma zona en un Caso de Obra ya existente (agregar reportes sueltos al grupo).
* **CU-09:** Bloquear (banear) de forma permanente el DeviceID de un usuario por generar spam.

## Actor: Técnico en Campo (Cuadrilla)

* **CU-10:** Visualizar reportes o Casos de Obra en un radio cercano basados en la ubicación actual (Hexágonos H3 resolución 13).
* **CU-11:** Agrupar en terreno múltiples reportes duplicados cercanos entre sí (mismo hexágono o vecino), creando un "Caso de Obra" oficial con código único (Ej: O-26-0000001).
* **CU-12:** Registrar una actualización en la bitácora de trabajo (diario de obra) adjuntando fotos, comentarios, necesidades de maquinaria y estimaciones de fecha de fin, sin cambiar obligatoriamente el estado general.
* **CU-13:** Actualizar las coordenadas GPS exactas del problema al llegar al lugar.
* **CU-14:** Cambiar el estado general del Caso de Obra a "En Trabajo" o "Finalizado".

## Actor: Usuario Público / Auditor de Sistemas

* **CU-15:** Visualizar el estado de conexión (uptime y latencia) de cada microservicio en la App de Status.
