# Desarrollo y Despliegue — Ojo Camba

## Desarrollo Local

```bash
# Levantar infraestructura (PostgreSQL + MinIO)
docker compose -f docker/dev/docker-compose.yml up -d

# Detener
docker compose -f docker/dev/docker-compose.yml down

# o con pnpm
pnpm docker:dev
pnpm docker:down
```

---

## Despliegue en Coolify

### Prerrequisitos

- Servidor con Coolify instalado
- Stack de infra levantado (`docker-compose.infra.yml`) con PostgreSQL 16 + PostGIS + h3-pg y MinIO
- Repositorio Git conectado a Coolify
- Rama a desplegar configurada (`main`)

### Servicios a desplegar

| # | Servicio | Dockerfile | ¿Expone HTTP? | Público |
|---|----------|-----------|:---:|:---:|
| 1 | `ms-auth` | `docker/prod/Dockerfile.ms-auth` | ❌ (TCP :3001) | ❌ |
| 2 | `ms-register` | `docker/prod/Dockerfile.ms-register` | ❌ (TCP :3002) | ❌ |
| 3 | `ms-admin` | `docker/prod/Dockerfile.ms-admin` | ❌ (TCP :3003) | ❌ |
| 4 | `ms-gamify` | `docker/prod/Dockerfile.ms-gamify` | ❌ (TCP :3004) | ❌ |
| 5 | `gateway-principal` | `docker/prod/Dockerfile.gateway-principal` | ✅ (3000) | ✅ |
| 6 | `gateway-status` | `docker/prod/Dockerfile.gateway-status` | ✅ (3005) | ✅ |
| 7 | `app-reporte` | `docker/prod/Dockerfile.app-reporte` | ✅ (80) | ✅ |
| 8 | `app-backoffice` | `docker/prod/Dockerfile.app-backoffice` | ✅ (80) | ✅ |
| 9 | `app-tecnico` | `docker/prod/Dockerfile.app-tecnico` | ✅ (80) | ✅ |
| 10 | `app-status` | `docker/prod/Dockerfile.app-status` | ✅ (80) | ✅ |

### Variables de entorno — Backend

| Variable | gateway-principal | gateway-status | ms-auth | ms-register | ms-admin | ms-gamify |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| `PORT` | 3000 | 3005 | — | — | — | — |
| `TCP_PORT` | — | — | 3001 | 3002 | 3003 | 3004 |
| `DATABASE_URL` | — | — | ✅ | ✅ | ✅ | ✅ |
| `JWT_SECRET` | — | — | ✅ | — | — | — |
| `JWT_EXPIRES_IN` | — | — | ✅ | — | — | — |
| `MS_AUTH_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_AUTH_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_REGISTER_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_REGISTER_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_ADMIN_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_ADMIN_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_GAMIFY_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_GAMIFY_PORT` | ✅ | ✅ | — | — | — | — |
| `MINIO_ENDPOINT` | — | — | — | ✅ | — | — |
| `MINIO_PORT` | — | — | — | ✅ | — | — |
| `MINIO_USE_SSL` | — | — | — | ✅ | — | — |
| `MINIO_ACCESS_KEY` | — | — | — | ✅ | — | — |
| `MINIO_SECRET_KEY` | — | — | — | ✅ | — | — |
| `MINIO_BUCKET` | — | — | — | ✅ | — | — |

### Variables de entorno — Frontend (Build Args)

| Variable | app-reporte | app-backoffice | app-tecnico | app-status |
|----------|:---:|:---:|:---:|:---:|
| `VITE_API_URL` | ✅ | ✅ | ✅ | — |
| `VITE_STATUS_URL` | — | — | — | ✅ |

> `VITE_*` son **Build Args** — se hornean en el JS estático en tiempo de build. Configurarlos como Build Variables en Coolify, no como Environment Variables de runtime.

### Paso a paso por servicio (configuración en Coolify)

1. Coolify → New Resource → **Application → Dockerfile**
2. Repository: repo Git de Ojo Camba
3. Branch: `main`
4. Dockerfile path: `docker/prod/Dockerfile.<nombre>`
5. Build context: raíz del repo (`.`)
6. Port: según tabla (3000 / 3005 / 80; microservicios sin puerto HTTP)
7. Environment variables / Build args: según tablas de arriba
8. Health check: `GET /` → 200 (solo servicios que exponen HTTP)

### Watch Paths — Disparo de Redeploy Automático

Si modificás un archivo, Coolify redeploya **solo** los servicios afectados.

| Servicio | Watch Paths |
|----------|------------|
| `ms-auth` | `backend/ms-auth/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-auth` |
| `ms-register` | `backend/ms-register/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-register` |
| `ms-admin` | `backend/ms-admin/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-admin` |
| `ms-gamify` | `backend/ms-gamify/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-gamify` |
| `gateway-principal` | `backend/gateway-principal/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.gateway-principal` |
| `gateway-status` | `backend/gateway-status/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.gateway-status` |
| `app-reporte` | `frontend/app-reporte/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`docker/prod/Dockerfile.app-reporte` |
| `app-backoffice` | `frontend/app-backoffice/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`docker/prod/Dockerfile.app-backoffice` |
| `app-tecnico` | `frontend/app-tecnico/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`docker/prod/Dockerfile.app-tecnico` |
| `app-status` | `frontend/app-status/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`docker/prod/Dockerfile.app-status` |

**Ejemplo:** Cambiás `frontend/app-reporte/src/App.tsx` → solo app-reporte redeploya.  
**Ejemplo:** Modificás `backend/ms-auth/src/auth.service.ts` → solo ms-auth redeploya.  
**Ejemplo:** Cambiás `libs/common/src/index.ts` → los 6 servicios backend redeployan.  
**Ejemplo:** Modificás `docker/prod/Dockerfile.ms-register` → solo ms-register redeploya.

### Config por Servicio — Copia y Pega en Coolify

#### `ms-auth`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.ms-auth
Port:        (ninguno — solo TCP)
Health:      (ninguno — contenedor alive)
Env vars:
  TCP_PORT=3001
  DATABASE_URL=postgresql://ojocamba:<password>@<pg-host>:5432/ojocamba
  JWT_SECRET=<secret>
  JWT_EXPIRES_IN=7d
Watch Paths:
  backend/ms-auth/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.ms-auth
```

#### `ms-register`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.ms-register
Port:        (ninguno — solo TCP)
Health:      (ninguno — contenedor alive)
Env vars:
  TCP_PORT=3002
  DATABASE_URL=postgresql://ojocamba:<password>@<pg-host>:5432/ojocamba
  MINIO_ENDPOINT=<minio-host>
  MINIO_PORT=9000
  MINIO_USE_SSL=false
  MINIO_ACCESS_KEY=<minio-user>
  MINIO_SECRET_KEY=<minio-password>
  MINIO_BUCKET=reportes
Watch Paths:
  backend/ms-register/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.ms-register
```

#### `ms-admin`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.ms-admin
Port:        (ninguno — solo TCP)
Health:      (ninguno — contenedor alive)
Env vars:
  TCP_PORT=3003
  DATABASE_URL=postgresql://ojocamba:<password>@<pg-host>:5432/ojocamba
Watch Paths:
  backend/ms-admin/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.ms-admin
```

#### `ms-gamify`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.ms-gamify
Port:        (ninguno — solo TCP)
Health:      (ninguno — contenedor alive)
Env vars:
  TCP_PORT=3004
  DATABASE_URL=postgresql://ojocamba:<password>@<pg-host>:5432/ojocamba
Watch Paths:
  backend/ms-gamify/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.ms-gamify
```

#### `gateway-principal`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.gateway-principal
Port:        3000
Health:      GET / → 200
Dominio:     api.ojocamba.com
Env vars:
  PORT=3000
  MS_AUTH_HOST=<ip-o-host-ms-auth>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<ip-o-host-ms-register>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<ip-o-host-ms-admin>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<ip-o-host-ms-gamify>
  MS_GAMIFY_PORT=3004
Watch Paths:
  backend/gateway-principal/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.gateway-principal
```

#### `gateway-status`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.gateway-status
Port:        3005
Health:      GET / → 200
Dominio:     status-api.ojocamba.com
Env vars:
  PORT=3005
  MS_AUTH_HOST=<ip-o-host-ms-auth>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<ip-o-host-ms-register>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<ip-o-host-ms-admin>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<ip-o-host-ms-gamify>
  MS_GAMIFY_PORT=3004
Watch Paths:
  backend/gateway-status/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.gateway-status
```

#### `app-reporte`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.app-reporte
Port:        80
Health:      GET / → 200
Dominio:     reporte.ojocamba.com
Build args:
  VITE_API_URL=https://api.ojocamba.com
Watch Paths:
  frontend/app-reporte/**  package.json  pnpm-lock.yaml  docker/prod/Dockerfile.app-reporte
```

#### `app-backoffice`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.app-backoffice
Port:        80
Health:      GET / → 200
Dominio:     admin.ojocamba.com
Build args:
  VITE_API_URL=https://api.ojocamba.com
Watch Paths:
  frontend/app-backoffice/**  package.json  pnpm-lock.yaml  docker/prod/Dockerfile.app-backoffice
```

#### `app-tecnico`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.app-tecnico
Port:        80
Health:      GET / → 200
Dominio:     tecnico.ojocamba.com
Build args:
  VITE_API_URL=https://api.ojocamba.com
Watch Paths:
  frontend/app-tecnico/**  package.json  pnpm-lock.yaml  docker/prod/Dockerfile.app-tecnico
```

#### `app-status`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.app-status
Port:        80
Health:      GET / → 200
Dominio:     status.ojocamba.com
Build args:
  VITE_STATUS_URL=https://status-api.ojocamba.com
Watch Paths:
  frontend/app-status/**  package.json  pnpm-lock.yaml  docker/prod/Dockerfile.app-status
```

### Orden de despliegue

1. Stack infra (`docker-compose.infra.yml`) → PostgreSQL + MinIO
2. `ms-auth`
3. `ms-register`
4. `ms-admin`
5. `ms-gamify`
6. `gateway-principal`
7. `gateway-status`
8. `app-reporte` `app-backoffice` `app-tecnico` `app-status` (cualquier orden)

### Verificación post-deploy

```bash
# Gateway principal
curl https://api.ojocamba.com
# → {"status":"ok","service":"gateway-principal"}

curl https://api.ojocamba.com/auth/check
# → {"status":"ok","service":"ms-auth"}

curl https://api.ojocamba.com/reportes/check
# → {"status":"ok","service":"ms-register"}

curl https://api.ojocamba.com/admin/check
# → {"status":"ok","service":"ms-admin"}

# Gateway de status
curl https://status-api.ojocamba.com
# → JSON con estado de cada microservicio

# Frontends
curl https://reporte.ojocamba.com
# → HTML (app-reporte)

curl https://admin.ojocamba.com
# → HTML (app-backoffice)

curl https://tecnico.ojocamba.com
# → HTML (app-tecnico)

curl https://status.ojocamba.com
# → HTML (app-status)
```

---

## Estrategia de Base de Datos

### Fase 1 — MVP (1 servidor PostgreSQL + PostGIS + h3-pg)

Una sola instancia PostgreSQL con todas las tablas en el schema `public`:

```
ojocamba (base de datos)
└── schema public
    ├── usuarios, roles, niveles, dispositivos
    ├── categorias, reportes
    ├── grupos_reportes, actualizaciones_caso
    └── (índices H3 res 8, 11, 13)
```

**Ventaja:** Cero complejidad para el MVP. PostgreSQL 16 soporta decenas de miles de reportes sin problema. Los índices H3 permiten consultas geoespaciales en microsegundos.

### Ownership de Datos

Cada microservicio es dueño de sus entidades. Solo ese servicio las crea/modifica/elimina.

| Entidad | Dueño (escribe) | Lectores |
|---------|:---:|----------|
| `usuarios`, `roles`, `niveles` | ms-auth | ms-gamify, ms-admin |
| `dispositivos` | ms-auth | ms-register |
| `reportes`, `categorias` | ms-register | ms-admin, ms-gamify |
| `grupos_reportes`, `actualizaciones_caso` | ms-admin | ms-register |
| puntos, nivel_id en `usuarios` | ms-gamify | — |

### Fase 2 — Crecimiento

Si PostgreSQL se vuelve cuello de botella:

- Migrar a proveedor externo: Neon, Supabase, AWS RDS con PostGIS
- Misma estructura de tablas. Solo cambia `DATABASE_URL` en cada microservicio
- Agregar réplica de lectura para consultas del mapa de calor (ms-register)

### MinIO

Una instancia MinIO es suficiente para el MVP. Si el volumen de imágenes crece:

- Escalar MinIO horizontalmente (modo distribuido)
- O migrar a S3 compatible (AWS S3, Cloudflare R2)
- Solo cambia `MINIO_ENDPOINT` en ms-register. Cero cambio de código.
