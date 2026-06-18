# AGENTS.md — Ojo Camba

## Qué es Ojo Camba

Plataforma de reportes ciudadanos de infraestructura urbana para Santa Cruz de la Sierra, Bolivia. Microservicios NestJS + React PWA con PostgreSQL/PostGIS y MinIO.

## Stack

| Capa | Tecnología |
|------|-----------|
| Monorepo | pnpm workspaces |
| Backend | NestJS 11 (microservicios TCP) |
| Frontend | React 18 + Vite 6 + Tailwind v4 |
| BD | PostgreSQL 16 + PostGIS + h3-pg |
| Objetos | MinIO (S3-compatible) |
| PWA | vite-plugin-pwa + Workbox |

## Estructura

```
libs/common/     → tipos, enums, entidades, TCP patterns compartidos
backend/         → 6 servicios: 2 gateways HTTP + 4 microservicios TCP
frontend/        → 4 apps PWA: reporte, backoffice, técnico, status
docker/          → Dockerfiles dev/prod + compose
docs/            → documentación del proyecto
.agents/         → skills y reglas del proyecto (no se commitea)
```

## Skills activas del proyecto

| Skill | Cuándo usarla |
|-------|---------------|
| **anillos-design-system** | SIEMPRE al crear UI |
| **app-reporte** | Al tocar `frontend/app-reporte/` |
| **project-conventions** | SIEMPRE al hacer cambios |

Ver `.agents/skills/` para las reglas completas y `.agents/SKILLS_GUIDE.md` para guía de uso.

## Principios de diseño

- **Sistema Anillos**: Paleta tropical cruceña, tipografía Piraí Sans, radios 36px
- **Mobile-first**: Todo se diseña para 375-428px primero
- **Cámara + GPS**: Obligatorios en app-reporte
- **TCP interno**: Microservicios se comunican por TCP, no HTTP

## Antes de cada commit

```bash
pnpm pre-commit   # format + lint + build (10 servicios)
```

## Flujo de issues

1. Rama `issue/ISSUE-XX-descripcion` desde `dev`
2. Implementar + tests
3. PR a `dev`, merge con `--merge`
4. Cerrar issue mencionando commits

## Documentación relevante

| Archivo | Contenido |
|---------|-----------|
| `docs/ROADMAP.md` | Road to MVP, 21 issues, 5 fases |
| `docs/backlog.md` | Historias de usuario con Gherkin |
| `docs/casos_de_uso.md` | 15 casos de uso por actor |
| `docs/modelo_datos.md` | Esquema DBML + ERD |
| `docs/arquitectura.md` | Diagrama de arquitectura + endpoints HTTP |
| `docs/DESIGN.md` | Sistema de diseño Anillos completo |
| `DEPLOY.md` | Desarrollo local + despliegue en Coolify |
