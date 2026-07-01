# Defensa oral — Actividades 6 y 7 (Sprint 2 y Sprint 3)

**Sistema Ojo Camba — Plataforma Ciudadana de Reporte Urbano**
Sistemas de Información II · Universidad Privada Domingo Savio
Docente: Ing. Jimmy Nataniel Requena Llorentty
Equipo: Gerson Alvarado (PO) · Jhoel Cruz (SM) · Jonathan Arrieta (Dev) · Alexis Santiváñez (Dev)

> Notas de apoyo para la exposición oral. Cada bloque trae los números y comandos exactos que puedes citar de memoria o mostrar en vivo. El detalle completo (con código y capturas) está en `docs/words/out/word base/Actividad 6-7.docx`.

---

## 1. Portada (30 segundos)

- **Sistema:** Ojo Camba — reporte ciudadano de problemas urbanos con indexación H3.
- **Entrega:** Actividades 6 y 7, unificadas por continuidad de equipo/código (igual criterio que Actividad 2-3).
- **Periodo:** Sprint 2 (8-29 jun 2026) + Sprint 3 (27-30 jun 2026, sprint corto de integración).

---

## 2. Resumen Ejecutivo — TL;DR (1 minuto)

**¿Cumple los objetivos?** Sí, al 100% en ambos sprints:

| Sprint | SP comprometidos | SP completados | Cumplimiento |
|---|---|---|---|
| Sprint 2 | 27 | 27 | 100% |
| Sprint 3 | 7 | 7 | 100% |

- 4 módulos CRUD completos (Reportes, Casos de Obra, Dispositivos, Usuarios), todos paginados y validados.
- Dashboard con 8 KPIs, 4 tipos de gráfico Recharts, **filtro de fechas real y funcional** (verificado en vivo hoy: tasa de resolución pasa de 89% a 25% al filtrar a junio 2026).
- 12 casos de prueba de integración documentados, todos PASS.
- 5 criterios de aceptación Given/When/Then (Definition of Ready) verificados contra datos reales, no genéricos.

**Obstáculos críticos enfrentados:**
- Día 4 del Sprint 2: bloqueo porque HU-11 dependía de reutilizar la generación de `codigo_obra` de HU-08, sin documentar esa dependencia — resuelto con pair programming (TD-01 cerrado).
- Al preparar esta entrega se detectó que el Dashboard **describía un filtro de fechas que no estaba implementado en el código** — se implementó de verdad (backend + frontend + tests) en vez de dejar la documentación desalineada del sistema real.
- Cronograma institucional comprimido: Sprint 3 se ejecutó en 4 días en paralelo con el cierre del Sprint 2, en vez del trimestre completo planificado en la Actividad 4.

**Decisiones pendientes para la siguiente fase (backlog para Actividad 8):**
- TD-04: migrar el despacho de errores de `sendRpc()` (hoy por subcadena de texto) a códigos de error tipados.
- TD-05: evaluar activar un `ValidationPipe` global una vez verificada la compatibilidad de cada DTO.
- Automatizar los 12 casos de prueba manuales como suite Playwright.

---

## 3. Planteamiento del problema técnico de este ciclo (1 minuto)

- Al cierre del Sprint 1 (Actividad 5), el sistema tenía autenticación y moderación básica, pero **ningún módulo operativo de negocio**: no había forma de gestionar Casos de Obra desde el terreno, ni de administrar usuarios/dispositivos, ni de ver el estado global del sistema en un solo lugar.
- Impacto de esa carencia: sin CRUD de Casos de Obra no hay ciclo de vida completo del reporte (HU-04); sin Dashboard, la alcaldía no tiene forma de tomar decisiones gerenciales sobre los datos ya recolectados — el sistema quedaba en "recolectar datos" sin "convertirlos en información".
- **Objetivo del ciclo:** cerrar el ciclo operativo completo (técnico en campo + administrador) y entregar un verdadero Sistema de Soporte a la Decisión (Power, 2002) sobre esos datos.

---

## 4. Análisis de requerimientos (1-2 minutos)

**Historias de usuario cubiertas:** HU-10 a HU-14 (técnico), HU-19 a HU-21 (admin/usuarios), HU-18 (Dashboard).

**Requisitos no funcionales verificados en este ciclo:**
- Atomicidad: bloqueo pesimista de fila (`pessimistic_write`) evita que dos moderadores acepten el mismo reporte a la vez.
- Trazabilidad: máquina de estados `EstadoReporte` en vez de borrado lógico — decisión de diseño justificada por la transparencia pública del dominio.
- Rendimiento: filtro de fechas del Dashboard resuelto con `BETWEEN` a nivel SQL (QueryBuilder), no post-procesado en memoria.

**Priorización MVP:** los 4 CRUD + Dashboard con filtro fueron el corte de alcance del Sprint 2/3; quedó fuera de este ciclo (por decisión de priorización, no por olvido) la automatización E2E de los 12 casos de prueba — está documentada como deuda técnica explícita, no oculta.

---

## 5. Arquitectura del sistema (1 minuto)

- Arquitectura en capas **Controller → Service → Repository** sobre NestJS, igual patrón en los 6 microservicios desde el Sprint 1.
- `libs/common` centraliza las entidades TypeORM compartidas (Reporte, GrupoReporte, Dispositivo, Categoria, ActualizacionCaso) — evita desfase de esquema entre `ms-register` y `ms-admin`.
- Nuevo en este ciclo: `ms-admin.admin.service.ts` gana el método `resolveRango()` + filtro `desde/hasta` en `getDashboardKpis()`; el Gateway (`gateway-principal`) expone `GET /admin/dashboard/kpis?desde=&hasta=`.
- Frontend: `app-backoffice` consume Recharts (`^3.9.1`) por coherencia declarativa con React — mismo paradigma que el resto del frontend, sin mezclar Chart.js imperativo.

*(Mostrar en vivo si hay proyector: `docker compose -f docker/dev/docker-compose.yml up`, o simplemente abrir `http://localhost:5174/dashboard` si el stack ya está corriendo.)*

---

## 6. Decisiones de diseño clave (reemplaza "Modelado UML" — ver Actividad 2-3 para los diagramas formales)

- **Máquina de estados en vez de borrado lógico:** `EstadoReporte` (Reportado → Aceptado/Rechazado → ValidacionEnCampo → EnTrabajo → Finalizado). Las vistas "activas" filtran por `estado_actual NOT IN (Rechazado, Finalizado)` en vez de un booleano `activo`.
- **Sin `PUT` genérico:** cada transición tiene un endpoint con nombre semántico (`.../accept`, `.../reject`, `.../updates`, `.../ban`) — nivel 2-3 del modelo de madurez de Richardson.
- **Formato de error uniforme en dos niveles:** microservicio → `{status:'error', message}`; Gateway (`rpc.helper.ts`, `sendRpc()`) traduce a la excepción HTTP semánticamente correcta (409/401/404/400).

---

## 7. Implementación y desarrollo (1 minuto)

- Ciclo Scrum de 2 sprints: Sprint 2 normal (3 semanas), Sprint 3 corto de integración (4 días).
- CI (`GitHub Actions`): jobs `lint` → `build` → `test` (Jest en 5 microservicios, incluye ahora el filtro de fechas).
- Pre-commit real vía Husky: `pnpm run pre-commit` (format + lint + test + build) se dispara solo en cada commit.
- Herramienta CASE de documentación: generación programática de este informe vía `docx` (Node) — mismo patrón que Actividades 4 y 5, para que el documento sea 100% reproducible y verificable contra el repo real, no texto suelto.

---

## 8. Pruebas y aseguramiento de calidad (1-2 minutos)

- **12 casos de prueba de integración** (mínimo exigido: 10) — autenticación, CRUD, Dashboard. Todos PASS.
- Caso destacado #4: doble aceptación simultánea de un reporte → solo la primera resuelve 201, la segunda recibe 400 (bloqueo pesimista real, no simulado).
- Casos #11 y #12 (filtro de fechas): re-verificados el 30 de junio de 2026 contra la implementación real — no eran casos de prueba de un feature inexistente.
- Cobertura Jest: unidades de `admin.service.ts` (createGroup, updateCase, resolveRango, getDashboardKpis) con mocks de repos TypeORM.
- **Gap reconocido sin ocultarlo:** no hay integración E2E automatizada de estos 12 casos todavía — backlog explícito para Actividad 8.

---

## 9. Resultados y KPIs (1-2 minutos, con captura en pantalla si es posible)

| Indicador | Sin filtro (histórico) | Con filtro 01-30 jun 2026 |
|---|---|---|
| Casos de Obra activos | 160 | — (contador en tiempo real, no filtra) |
| Reportes del periodo | — (últimos 6 meses: feb-jul) | 259 (solo junio) |
| Tasa de resolución | 89% | 25% |

- La caída de 89% a 25% al filtrar **no es un error** — junio incluye muchos Casos de Obra recién creados que aún no llegan a "Finalizado"; es la prueba de que el filtro realmente recalcula sobre el subconjunto, no solo redibuja las mismas cifras.
- Colección Postman: 34 endpoints documentados (27 → 34, +4 en este ciclo: `reports/nearby`, `devices/unban`, `groups/:id/reports`, `dashboard/kpis` con filtro).
- Estado del sistema desplegado: stack completo funcional en local vía `pnpm docker:dev`; Dashboard verificado con capturas reales (Playwright) el mismo día de esta entrega.

---

## 10. Conclusiones y futuras mejoras (1 minuto de cierre)

- La arquitectura en capas del Sprint 1 escaló sin fricción a los 4 CRUD y al Dashboard, reutilizando las mismas entidades y el mismo criterio de "activo" (máquina de estados) en ambos módulos.
- Lección aprendida más importante: **documentar una funcionalidad no la vuelve real** — al redactar el Anexo de código de esta misma entrega se descubrió que el filtro de fechas estaba descrito pero no implementado, y se corrigió construyendo el feature en vez de ajustar el texto para ocultarlo.
- Roadmap para Actividad 8: códigos de error tipados (TD-04), `ValidationPipe` global (TD-05), suite Playwright para los 12 casos de integración.
- **Cierre:** invitación a la demo en vivo — `pnpm docker:dev` y recorrido login → mapa de calor → reportar → moderar → agrupar → bitácora de campo → cerrar caso → Dashboard filtrado por fecha.

---

## Preguntas frecuentes que podrían hacer (preparar respuesta corta)

- **"¿Por qué el código de obra no es `OBRA-2026-001` sino `O-26-0000001`?"** → Es el estándar vigente pedido por el Product Owner; la documentación vieja quedó desactualizada y ya se corrigió.
- **"¿Por qué no validan que los reportes agrupados compartan el mismo hexágono H3?"** → Es intencional: el backoffice sugiere por proximidad física, no por igualdad de celda, porque un mismo problema real puede caer en dos celdas H3 distintas cerca de un borde. El moderador humano decide.
- **"¿Qué pasa si dos técnicos cierran el mismo caso a la vez?"** → Mismo mecanismo de bloqueo pesimista que protege `accept_report`; no está en el alcance de HU-14 duplicar esa prueba, pero el patrón ya está validado y es reusable.
