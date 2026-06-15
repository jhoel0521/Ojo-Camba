# Road to MVP — Ojo Camba

**Descripción:** Hoja de ruta hacia el Producto Mínimo Viable (MVP) de la plataforma Ojo Camba. Organizada en cinco fases secuenciales con issues trazables por área de responsabilidad (Docs, DevOps, Backend, Frontend, QA).

---

## Fase 0: Modelado y Documentación

| Issue | Área | Título |
|-------|------|--------|
| ISSUE-01 | Docs | Redactar Historias de Usuario en formato Gherkin (HU-01 a HU-06) con criterios de aceptación. |
| ISSUE-02 | Docs | Diseñar Diagrama Entidad-Relación (ERD) de la base de datos. |
| ISSUE-03 | Docs | Crear diagramas UML 2.5 obligatorios (Clases, Casos de Uso, Actividades con *swimlanes*, Secuencia y Despliegue). |
| ISSUE-04 | Docs | Elaborar y aplicar la guía de entrevista municipal (Paso 3 y 4). |

---

## Fase 1: Infraestructura y Despliegue

| Issue | Área | Título |
|-------|------|--------|
| ISSUE-05 | DevOps | Configurar entorno pre-producción (*Staged Area*). |
| ISSUE-06 | DevOps | Desplegar base de datos PostgreSQL con extensiones PostGIS y h3-pg. |
| ISSUE-07 | DevOps | Configurar clúster Docker y servidor Object Storage (MinIO) para persistencia de imágenes. |

---

## Fase 2: Desarrollo Core y Lógica

| Issue | Área | Título |
|-------|------|--------|
| ISSUE-09 | Backend | Crear API Gateway Principal y API Gateway de Status (Protocolo TCP). |
| ISSUE-10 | Backend | Implementar Microservicio Auth. |
| ISSUE-11 | Backend | Implementar Microservicio Registro Reporte (Generación H3 res 8, 11, 13 y subida a MinIO). |
| ISSUE-12 | Backend | Implementar Microservicio Reportes Admin (Agrupación / Casos de Obra). |
| ISSUE-13 | Backend | Implementar Microservicio Status Ping (Ping cada 60s). |

---

## Fase 3: Interfaces de Usuario

| Issue | Área | Título |
|-------|------|--------|
| ISSUE-14 | Frontend | Desarrollar App de Reporte PWA (Ciudadano: captura GPS, fotos y autenticación). |
| ISSUE-15 | Frontend | Desarrollar App Backoffice (Dashboard, moderación y validación de duplicados). |
| ISSUE-16 | Frontend | Desarrollar App de Técnicos (Bitácora diaria, corrección GPS en terreno). |
| ISSUE-17 | Frontend | Desarrollar App pública de Status (Indicadores visuales en tiempo real). |

---

## Fase 4: Pruebas y Aseguramiento de Calidad

| Issue | Área | Título |
|-------|------|--------|
| ISSUE-18 | QA | Validar cumplimiento de propiedades transaccionales ACID en la base de datos. |
| ISSUE-19 | QA | Ejecutar Testing de precisión del índice espacial (coincidencia de coordenadas en polígonos H3). |
| ISSUE-20 | QA | Validar métricas de *uptime* y disponibilidad para el Gateway de Status. |
| ISSUE-21 | QA | Realizar Testing E2E (End-to-End) de la creación y agrupamiento de un "Caso de Obra". |

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
