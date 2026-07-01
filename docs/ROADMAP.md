# Road to MVP — Ojo Camba

**Descripción:** Hoja de ruta hacia el Producto Mínimo Viable (MVP) de la plataforma Ojo Camba. Organizada en cinco fases secuenciales con issues trazables por área de responsabilidad (Docs, DevOps, Backend, Frontend, QA).

**Nota de diseño (2026-06-30):** la agrupación de reportes en un Caso de Obra (HU-04, ISSUE-12) es una **sugerencia por proximidad física, no una restricción estricta por celda H3**. El backoffice sugiere reportes cercanos y el moderador decide; un mismo problema real puede caer en dos celdas H3 distintas si está cerca de un borde de hexágono, así que el sistema permite agrupar reportes de celdas distintas cuando el humano lo confirma.

---

## Fase 0: Modelado y Documentación

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-01 | Docs | Redactar Historias de Usuario en formato Gherkin (HU-01 a HU-06) con criterios de aceptación. | ✅ |
| ISSUE-02 | Docs | Diseñar Diagrama Entidad-Relación (ERD) de la base de datos. | ✅ |
| ISSUE-03 | Docs | Crear diagramas UML 2.5 obligatorios (Clases, Casos de Uso, Actividades con *swimlanes*, Secuencia y Despliegue). | ✅ |
| ISSUE-04 | Docs | Elaborar y aplicar la guía de entrevista municipal (Paso 3 y 4). | ✅ Cerrado (2026-07-01) — Paso 3 completado en `docs/guia_entrevista.md`. Paso 4 (aplicación de campo) descoped del ciclo académico: requiere trabajo de campo institucional con la alcaldía, fuera del alcance técnico del MVP. Movido a backlog post-entrega. |

---

## Fase 1: Infraestructura y Despliegue

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-05 | DevOps | Configurar entorno pre-producción (*Staged Area*). | ✅ |
| ISSUE-06 | DevOps | Desplegar base de datos PostgreSQL con extensiones PostGIS y h3-pg. | ✅ |
| ISSUE-07 | DevOps | Configurar clúster Docker y servidor Object Storage (MinIO/SeaweedFS) para persistencia de imágenes. | ✅ |

---

## Fase 2: Desarrollo Core y Lógica

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-09 | Backend | Crear API Gateway Principal y API Gateway de Status (Protocolo TCP). | ✅ |
| ISSUE-10 | Backend | Implementar Microservicio Auth. | ✅ |
| ISSUE-11 | Backend | Implementar Microservicio Registro Reporte (Generación H3 res 8, 11, 13 y subida a MinIO). | ✅ |
| ISSUE-12 | Backend | Implementar Microservicio Reportes Admin (Agrupación / Casos de Obra). | ✅ (incluye subida de fotos de bitácora a S3 y endpoint de casos cercanos) |
| ISSUE-13 | Backend | Implementar Microservicio Status Ping (Ping cada 60s). | ✅ |
| — | Backend | Microservicio Gamificación (puntos, niveles, HU-06). | ✅ |

---

## Fase 3: Interfaces de Usuario

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-14 | Frontend | Desarrollar App de Reporte PWA (Ciudadano: captura GPS, fotos y autenticación). | ✅ |
| ISSUE-15 | Frontend | Desarrollar App Backoffice (Dashboard, moderación y validación de duplicados). | ✅ |
| ISSUE-16 | Frontend | Desarrollar App de Técnicos (Bitácora diaria, corrección GPS en terreno). | ✅ (foto de avance, cambio de estado y casos cercanos completados 2026-06-30) |
| ISSUE-17 | Frontend | Desarrollar App pública de Status (Indicadores visuales en tiempo real). | ✅ |

---

## Fase 4: Pruebas y Aseguramiento de Calidad

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-18 | QA | Validar cumplimiento de propiedades transaccionales ACID en la base de datos. | ✅ Unit test + test e2e de concurrencia en `accept_report` (bloqueo pesimista) |
| ISSUE-19 | QA | Ejecutar Testing de precisión del índice espacial (coincidencia de coordenadas en polígonos H3). | ✅ Unit tests en ms-register verifican que el punto cae dentro del polígono H3 |
| ISSUE-20 | QA | Validar métricas de *uptime* y disponibilidad para el Gateway de Status. | ✅ Unit test de agregación de ping cubre la lógica Operativo/Interrupción. Pendiente como mejora futura: métricas históricas de uptime (%) — no implementadas. |
| ISSUE-21 | QA | Realizar Testing E2E (End-to-End) de la creación y agrupamiento de un "Caso de Obra". | ✅ `e2e/tests/reporte-y-aceptar.spec.ts` cubre creación, agrupamiento por cercanía y fusión a obra existente |

Adicionalmente: cobertura de unit tests (Jest) en los 5 microservicios con lógica de negocio (`ms-register`, `ms-admin`, `ms-gamify`, `ms-auth`, `gateway-status`), corriendo en CI y en un hook real de pre-commit (Husky).

---

## Fase 5: Backlog cerrado

| Issue | Área | Título | Estado |
|-------|------|--------|--------|
| ISSUE-25 | Frontend | Implementar CU-05 — Compartir estado del reporte (share link + sticker dinámico). | ✅ Cerrado (2026-07-01) — Criterios mínimos implementados: botón "Compartir" con `navigator.share()` (título, texto y URL) en `ReporteDetailPage` y `GroupReportePage`, con fallback a `navigator.clipboard` cuando Web Share no está disponible. Ambas rutas son públicas (sin autenticación). El criterio "completo" (endpoint `og-image` dinámico + meta tags OG) queda descoped a backlog post-MVP por ser mejora visual, no bloqueante. |

Con este cierre no quedan issues abiertos en el repositorio.

---

## Trazabilidad Issues ↔ Historias de Usuario

| Issue | HU relacionada |
|-------|----------------|
| ISSUE-01 | HU-01 a HU-06 |
| ISSUE-11 | HU-01 (Registro de Reporte) |
| ISSUE-12 | HU-04 (Caso de Obra), HU-05 (Bitácora) |
| ISSUE-13 | HU-03 (Monitoreo) |
| ISSUE-14 | HU-01, HU-02 |
| ISSUE-15 | HU-04 |
| ISSUE-16 | HU-05 |
| ISSUE-17 | HU-03 |
| ISSUE-10 | HU-06 (Gamificación requiere Auth) |
