# ISSUE-26 — Matriz de permisos y capacidad operativa

## Principios

- Todo usuario registrado conserva `ciudadano`; los demás roles se agregan y pueden revocarse sin impedir reportar.
- `responsable de cuadrilla` es una asignación en `cuadrilla_miembros.es_responsable`, nunca un rol global.
- La autorización se comprueba en el gateway (respuesta HTTP 401/403) y las acciones de campo reciben el usuario autenticado, no un id aportado por el navegador.
- `moderador → backoffice` y `admin → encargado_it` son equivalencias temporales de compatibilidad; las nuevas cuentas usan los nombres vigentes.

## Matriz

| Acción | Ciudadano | Backoffice | Técnico asignado | Coordinador operativo | Encargado IT | Autoridad |
| --- | --- | --- | --- | --- | --- | --- |
| Reportar/consultar público | Sí | Sí | Sí | Sí | Sí | Sí |
| Aceptar/rechazar bandeja | No | Sí | No | No | No | No |
| Ver/actualizar casos asignados | No | No | Sí | Sí | No | No |
| Confirmar derivación en campo | No | No | Responsable de su cuadrilla | Sí (audita) | No | No |
| Priorizar/reasignar cuadrilla | No | No | No | Sí | No | No |
| Gestionar usuarios, roles y umbrales | No | No | No | No | Sí | No |
| Consultar tablero estratégico | No | No | No | Sí | Sí | Sí |

## Definición de capacidad

Un **reporte abierto** es un reporte de un Caso de Obra asignado a una cuadrilla cuyo estado no es `Finalizado` ni `Rechazado`. La carga se cuenta por reportes, no por casos agrupados.

Los umbrales se guardan en `configuracion_operativa`: `visitas_meta_diaria=5`, `carga_alerta=8` y `carga_maxima=10`. Una visita válida es una actualización de campo con coordenadas GPS; es un KPI, no bloquea el trabajo. Desde 8 se advierte; al intentar superar 10 la asignación se rechaza y se registra solicitud de apoyo.

## Derivaciones

Una derivación se registra en `derivaciones_caso` con entidad destino, motivo, URL de evidencia, fecha automática y técnico responsable. Solo el responsable de la cuadrilla asignada puede confirmarla; el coordinador puede auditarla.
