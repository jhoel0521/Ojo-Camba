# Ojo Camba

Plataforma ciudadana de reporte de infraestructura urbana para Santa Cruz de la Sierra.

## Arquitectura

Monorepo pnpm con microservicios NestJS comunicados por TCP y frontends React PWA.

```
backend/          NestJS — 2 API Gateways + 4 Microservicios TCP
frontend/         React PWA — 4 aplicaciones cliente
libs/common/      Tipos TypeScript compartidos (enums, patrones TCP)
docker/dev/       Stack de desarrollo (PostgreSQL+PostGIS, MinIO, servicios)
docker/prod/      Stack de producción (multi-stage builds)
```

### Servicios backend

| Servicio | Tipo | Puerto |
|---|---|---|
| gateway-principal | HTTP (Fastify) | 3000 |
| gateway-status | HTTP (Fastify) | 3005 |
| ms-auth | TCP | 3001 |
| ms-register | TCP | 3002 |
| ms-admin | TCP | 3003 |
| ms-gamify | TCP | 3004 |

### Aplicaciones frontend

| App | Descripción | Puerto dev |
|---|---|---|
| app-reporte | Ciudadanos: reportar + mapa de calor | http://localhost:5173 |
| app-backoffice | Administradores: moderar, agrupar reportes | http://localhost:5174 |
| app-tecnico | Técnicos en campo: bitácora, avances | http://localhost:5175 |
| app-status | Health check público | http://localhost:5176 |

## Prerrequisitos

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose

## Inicio rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar infraestructura (PostgreSQL + MinIO)
pnpm docker:up

# 3. Arrancar todos los servicios en modo dev
pnpm dev

# 4. Verificar que todo esté corriendo
pnpm health
```

## Comandos útiles

```bash
# Solo backend o solo frontend
pnpm dev:backend
pnpm dev:frontend

# Builds
pnpm build:backend
pnpm build:frontend

# Verificar servicios
pnpm health

# CI / reset completo: mata todo, arranca, verifica, mata todo
pnpm dev:check
```

## Almacenamiento

- **PostgreSQL 16 + PostGIS** — base de datos relacional con soporte geoespacial
- **MinIO** — object storage para imágenes de reportes (compatible S3)
  - Consola: http://localhost:9001
  - API: http://localhost:9000
