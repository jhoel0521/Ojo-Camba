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

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Road to MVP — fases e issues ISSUE-01..21 |
| [docs/arquitectura.md](docs/arquitectura.md) | Diagrama de arquitectura general (Mermaid) |
| [docs/backlog.md](docs/backlog.md) | Historias de Usuario HU-01..06 con criterios de aceptación y escenarios Gherkin |
| [docs/casos_de_uso.md](docs/casos_de_uso.md) | Casos de uso CU-01..15 por actor |
| [docs/modelo_datos.md](docs/modelo_datos.md) | ERD visual + esquema DBML de la base de datos |
| [docs/diagramas_uml.md](docs/diagramas_uml.md) | Diagramas UML 2.5: Clases, Casos de Uso, Actividades, Secuencia y Despliegue |
| [docs/guia_entrevista.md](docs/guia_entrevista.md) | Guía de entrevista municipal (Paso 3 ✅ / Paso 4 ⏳) |
| [DEPLOY.md](DEPLOY.md) | Instrucciones de despliegue en producción |

## Prerrequisitos

- Node.js >= 22
- pnpm >= 9
- Docker + Docker Compose

## Inicio rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Compilar librería compartida (requerido antes de arrancar servicios)
pnpm build:libs

# 3. Copiar variables de entorno para cada servicio
cp backend/ms-auth/.env.example       backend/ms-auth/.env
cp backend/ms-register/.env.example   backend/ms-register/.env
cp backend/ms-admin/.env.example      backend/ms-admin/.env
cp backend/ms-gamify/.env.example     backend/ms-gamify/.env
cp backend/gateway-principal/.env.example backend/gateway-principal/.env
cp backend/gateway-status/.env.example    backend/gateway-status/.env

# 4. Levantar infraestructura (PostgreSQL + SeaweedFS)
pnpm docker:up

# 5. Arrancar todos los servicios en modo dev
pnpm dev

# 6. Verificar que todo esté corriendo
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
- **SeaweedFS** — object storage para imágenes de reportes (API compatible S3)
  - S3 API: http://localhost:8333
