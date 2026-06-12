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

| App | Descripción |
|---|---|
| app-reporte | Ciudadanos: reportar + mapa de calor |
| app-backoffice | Administradores: moderar, agrupar reportes |
| app-tecnico | Técnicos en campo: bitácora, avances |
| app-status | Health check público |

## Prerrequisitos

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose

## Inicio rápido

```bash
# Instalar dependencias de todo el monorepo
pnpm install

# Levantar stack completo de desarrollo (PostgreSQL, MinIO y todos los servicios)
pnpm docker:dev

# Desarrollar un servicio específico en local
pnpm --filter @ojo-camba/gateway-principal dev
pnpm --filter @ojo-camba/ms-auth dev
pnpm --filter @ojo-camba/app-reporte dev
```

## Comandos útiles

```bash
# Build todos los backends
pnpm build:backend

# Build todos los frontends
pnpm build:frontend

# Docker producción
pnpm docker:prod:build
```

## Almacenamiento

- **PostgreSQL 16 + PostGIS** — base de datos relacional con soporte geoespacial
- **MinIO** — object storage para imágenes de reportes (compatible S3)
  - Consola: http://localhost:9001
  - API: http://localhost:9000
