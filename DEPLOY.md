# Desarrollo y Despliegue — Ojo Camba

## Desarrollo Local

```bash
# Instalar dependencias de todo el monorepo
pnpm install

# Levantar PostgreSQL + MinIO (infra local)
pnpm docker:up

# Detener infra local
pnpm docker:down

# Iniciar todos los servicios backend en modo watch (requiere infra activa)
pnpm dev

# En otra terminal, verificar que todo responde
pnpm ping
```

---

## Despliegue en Coolify

### Prerrequisitos

- PostgreSQL 16 + PostGIS (servicio Coolify o externo)
- MinIO (servicio Coolify o externo)
- Repositorio Git conectado a Coolify
- Rama a desplegar configurada

### Servicios a desplegar

| # | Servicio | Dockerfile | ¿Expone HTTP? | Público |
|---|---|---|:---:|:---:|
| 1 | `ms-auth` | `docker/prod/Dockerfile.ms-auth` | ❌ (TCP) | ❌ |
| 2 | `ms-register` | `docker/prod/Dockerfile.ms-register` | ❌ (TCP) | ❌ |
| 3 | `ms-admin` | `docker/prod/Dockerfile.ms-admin` | ❌ (TCP) | ❌ |
| 4 | `ms-gamify` | `docker/prod/Dockerfile.ms-gamify` | ❌ (TCP) | ❌ |
| 5 | `gateway-principal` | `docker/prod/Dockerfile.gateway-principal` | ✅ (3000) | ✅ |
| 6 | `gateway-status` | `docker/prod/Dockerfile.gateway-status` | ✅ (3005) | ✅ |
| 7 | `app-reporte` | `docker/prod/Dockerfile.app-reporte` | ✅ (80) | ✅ |
| 8 | `app-backoffice` | `docker/prod/Dockerfile.app-backoffice` | ✅ (80) | ✅ |
| 9 | `app-tecnico` | `docker/prod/Dockerfile.app-tecnico` | ✅ (80) | ✅ |
| 10 | `app-status` | `docker/prod/Dockerfile.app-status` | ✅ (80) | ✅ |

### Variables de entorno por servicio — Backend

| Variable | gw-principal | gw-status | ms-auth | ms-register | ms-admin | ms-gamify |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `PORT` | ✅ (3000) | ✅ (3005) | — | — | — | — |
| `TCP_PORT` | — | — | ✅ (3001) | ✅ (3002) | ✅ (3003) | ✅ (3004) |
| `MS_AUTH_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_AUTH_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_REGISTER_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_REGISTER_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_ADMIN_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_ADMIN_PORT` | ✅ | ✅ | — | — | — | — |
| `MS_GAMIFY_HOST` | ✅ | ✅ | — | — | — | — |
| `MS_GAMIFY_PORT` | ✅ | ✅ | — | — | — | — |
| `DATABASE_URL` | — | — | ✅ | ✅ | ✅ | ✅ |
| `JWT_SECRET` | — | — | ✅ | — | — | — |
| `JWT_EXPIRES_IN` | — | — | ✅ | — | — | — |
| `MINIO_ENDPOINT` | — | — | — | ✅ | — | — |
| `MINIO_PORT` | — | — | — | ✅ | — | — |
| `MINIO_ACCESS_KEY` | — | — | — | ✅ | — | — |
| `MINIO_SECRET_KEY` | — | — | — | ✅ | — | — |
| `MINIO_BUCKET` | — | — | — | ✅ | — | — |

### Variables de entorno — Frontend (build args)

| Variable | app-reporte | app-backoffice | app-tecnico | app-status |
|---|:---:|:---:|:---:|:---:|
| `VITE_API_URL` | ✅ | ✅ | ✅ | ✅ |

### Paso a paso (configuración en Coolify)

1. Coolify → **New Service → Dockerfile**
2. Repository: tu repo Git
3. Branch: `main` (o la rama de producción)
4. Dockerfile path: `docker/prod/Dockerfile.<nombre>`
5. Build context: **raíz del repo** (campo "Build Context" = `/`)
6. Port: según tabla (3000, 3005, 80, o vacío para servicios TCP)
7. Environment variables: según tablas de arriba
8. Health check:
   - Gateways: `GET /health` → espera 200
   - Frontends: `GET /` → espera 200
   - Microservicios TCP: sin health check HTTP (Coolify usa container alive)

### Watch Paths — Redeploy automático

Coolify redeploya **solo** los servicios cuyos archivos cambiaron.

| Servicio | Watch Paths |
|---|---|
| `ms-auth` | `backend/ms-auth/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-auth` |
| `ms-register` | `backend/ms-register/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-register` |
| `ms-admin` | `backend/ms-admin/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-admin` |
| `ms-gamify` | `backend/ms-gamify/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-gamify` |
| `gateway-principal` | `backend/gateway-principal/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.gateway-principal` |
| `gateway-status` | `backend/gateway-status/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.gateway-status` |
| `app-reporte` | `frontend/app-reporte/**` `pnpm-workspace.yaml` `docker/prod/Dockerfile.app-reporte` `docker/prod/nginx.conf` |
| `app-backoffice` | `frontend/app-backoffice/**` `pnpm-workspace.yaml` `docker/prod/Dockerfile.app-backoffice` `docker/prod/nginx.conf` |
| `app-tecnico` | `frontend/app-tecnico/**` `pnpm-workspace.yaml` `docker/prod/Dockerfile.app-tecnico` `docker/prod/nginx.conf` |
| `app-status` | `frontend/app-status/**` `pnpm-workspace.yaml` `docker/prod/Dockerfile.app-status` `docker/prod/nginx.conf` |

**Ejemplo:** Cambiás `frontend/app-reporte/src/App.tsx` → solo `app-reporte` redeploya.  
**Ejemplo:** Modificás `libs/common/src/patterns/tcp-patterns.ts` → los 6 servicios backend redeployan.  
**Ejemplo:** Cambiás `docker/prod/nginx.conf` → los 4 frontends redeployan.

---

### Config por servicio — Copia y pega en Coolify

#### `ms-auth`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.ms-auth
Build context: /
Port:         (vacío — TCP interno)
Health check: (ninguno)
Env vars:
  TCP_PORT=3001
  DATABASE_URL=postgresql://user:pass@host:5432/ojocamba
  JWT_SECRET=<secreto-seguro>
  JWT_EXPIRES_IN=7d
Watch Paths:
  backend/ms-auth/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-auth
```

#### `ms-register`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.ms-register
Build context: /
Port:         (vacío — TCP interno)
Health check: (ninguno)
Env vars:
  TCP_PORT=3002
  DATABASE_URL=postgresql://user:pass@host:5432/ojocamba
  MINIO_ENDPOINT=<minio-host>
  MINIO_PORT=9000
  MINIO_USE_SSL=true
  MINIO_ACCESS_KEY=<access-key>
  MINIO_SECRET_KEY=<secret-key>
  MINIO_BUCKET=reportes
Watch Paths:
  backend/ms-register/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-register
```

#### `ms-admin`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.ms-admin
Build context: /
Port:         (vacío — TCP interno)
Health check: (ninguno)
Env vars:
  TCP_PORT=3003
  DATABASE_URL=postgresql://user:pass@host:5432/ojocamba
Watch Paths:
  backend/ms-admin/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-admin
```

#### `ms-gamify`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.ms-gamify
Build context: /
Port:         (vacío — TCP interno)
Health check: (ninguno)
Env vars:
  TCP_PORT=3004
  DATABASE_URL=postgresql://user:pass@host:5432/ojocamba
Watch Paths:
  backend/ms-gamify/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-gamify
```

#### `gateway-principal`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.gateway-principal
Build context: /
Port:         3000
Health check: GET /health → 200
Env vars:
  PORT=3000
  MS_AUTH_HOST=<host-interno-coolify>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<host-interno-coolify>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<host-interno-coolify>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<host-interno-coolify>
  MS_GAMIFY_PORT=3004
Watch Paths:
  backend/gateway-principal/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.gateway-principal
```

#### `gateway-status`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.gateway-status
Build context: /
Port:         3005
Health check: GET /health → 200
Env vars:
  PORT=3005
  MS_AUTH_HOST=<host-interno-coolify>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<host-interno-coolify>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<host-interno-coolify>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<host-interno-coolify>
  MS_GAMIFY_PORT=3004
Watch Paths:
  backend/gateway-status/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.gateway-status
```

#### `app-reporte`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.app-reporte
Build context: /
Port:         80
Health check: GET / → 200
Build Args:
  VITE_API_URL=https://api.ojocamba.bo
Watch Paths:
  frontend/app-reporte/**  pnpm-workspace.yaml  docker/prod/Dockerfile.app-reporte  docker/prod/nginx.conf
```

#### `app-backoffice`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.app-backoffice
Build context: /
Port:         80
Health check: GET / → 200
Build Args:
  VITE_API_URL=https://api.ojocamba.bo
Watch Paths:
  frontend/app-backoffice/**  pnpm-workspace.yaml  docker/prod/Dockerfile.app-backoffice  docker/prod/nginx.conf
```

#### `app-tecnico`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.app-tecnico
Build context: /
Port:         80
Health check: GET / → 200
Build Args:
  VITE_API_URL=https://api.ojocamba.bo
Watch Paths:
  frontend/app-tecnico/**  pnpm-workspace.yaml  docker/prod/Dockerfile.app-tecnico  docker/prod/nginx.conf
```

#### `app-status`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.app-status
Build context: /
Port:         80
Health check: GET / → 200
Build Args:
  VITE_API_URL=https://api.ojocamba.bo
Watch Paths:
  frontend/app-status/**  pnpm-workspace.yaml  docker/prod/Dockerfile.app-status  docker/prod/nginx.conf
```

---

### Orden de despliegue

1. PostgreSQL + PostGIS
2. MinIO
3. `ms-auth` `ms-register` `ms-admin` `ms-gamify` (cualquier orden)
4. `gateway-principal` `gateway-status` (después de los MS)
5. `app-reporte` `app-backoffice` `app-tecnico` `app-status` (cualquier orden)

### Verificación post-deploy

```bash
# Gateway principal
curl https://api.ojocamba.bo/health
# → {"status":"ok","service":"gateway-principal","timestamp":"..."}

# Gateway status + estado de microservicios
curl https://status.ojocamba.bo/health
# → {"status":"ok","service":"gateway-status","timestamp":"..."}

curl https://status.ojocamba.bo/status
# → {"status":"ok","services":[{"name":"ms-auth","status":"ok","latencyMs":2},...]}

# Frontends
curl https://ojocamba.bo           # → HTML (app-reporte)
curl https://admin.ojocamba.bo     # → HTML (app-backoffice)
curl https://tecnico.ojocamba.bo   # → HTML (app-tecnico)
curl https://status.ojocamba.bo    # → HTML (app-status)
```

---

## Notas sobre la red interna de Coolify

Los microservicios TCP **no exponen puertos al exterior**. Se comunican dentro de la red privada de Coolify usando el nombre del servicio como hostname.

En Coolify, el hostname de cada servicio en la red interna suele ser el nombre del servicio (ej: `ms-auth`). Confirmar en Coolify → Service → **Internal Hostname** y usar ese valor en `MS_AUTH_HOST`, etc.

## Calidad de código

```bash
# Antes de cada commit
pnpm pre-commit
# → format + lint + build (backend + frontend)

# Por separado
pnpm format        # Prettier
pnpm lint          # ESLint
pnpm build         # Compila todo
```
