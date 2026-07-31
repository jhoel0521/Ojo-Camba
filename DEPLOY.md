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
| 5 | `ms-ia` | `docker/prod/Dockerfile.ms-ia` | ❌ (TCP) | ❌ |
| 6 | `ms-prediccion` | `docker/prod/Dockerfile.ms-prediccion` | ❌ (HTTP interno) | ❌ |
| 7 | `gateway-principal` | `docker/prod/Dockerfile.gateway-principal` | ✅ (3000) | ✅ |
| 8 | `gateway-status` | `docker/prod/Dockerfile.gateway-status` | ✅ (3005) | ✅ |
| 9 | `app-reporte` | `docker/prod/Dockerfile.app-reporte` | ✅ (80) | ✅ |
| 10 | `app-backoffice` | `docker/prod/Dockerfile.app-backoffice` | ✅ (80) | ✅ |
| 11 | `app-tecnico` | `docker/prod/Dockerfile.app-tecnico` | ✅ (80) | ✅ |
| 12 | `app-status` | `docker/prod/Dockerfile.app-status` | ✅ (80) | ✅ |

`ms-prediccion` (ISSUE-31) habla HTTP y no el TCP de Nest —es Python, el pipeline de Machine Learning vive en pandas y scikit-learn—, pero **no lleva dominio público**: se llega sólo desde `gateway-principal`, que es donde se comprueban los roles. Necesita dos volúmenes persistentes, `/app/modelos` y `/app/datos`: sin ellos cada redeploy borra el modelo entrenado y el servicio responde 409 hasta que IT vuelva a entrenar a mano. El entrenamiento **no** corre al arrancar, a propósito (ver `backend/ms-prediccion/README.md`).

### Variables de entorno por servicio — Backend

| Variable | gw-principal | gw-status | ms-auth | ms-register | ms-admin | ms-gamify | ms-ia | ms-prediccion |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `PORT` | ✅ (3000) | ✅ (3005) | — | — | — | — | — | — |
| `TCP_PORT` | — | — | ✅ (3001) | ✅ (3002) | ✅ (3003) | ✅ (3004) | ✅ (3006) | — |
| `MS_AUTH_HOST` | ✅ | ✅ | — | — | — | ✅ | — | — |
| `MS_AUTH_PORT` | ✅ | ✅ | — | — | — | ✅ | — | — |
| `MS_REGISTER_HOST` | ✅ | ✅ | — | — | — | — | ✅ | — |
| `MS_REGISTER_PORT` | ✅ | ✅ | — | — | — | — | ✅ | — |
| `MS_ADMIN_HOST` | ✅ | ✅ | — | — | — | — | ✅ | — |
| `MS_ADMIN_PORT` | ✅ | ✅ | — | — | — | — | ✅ | — |
| `MS_GAMIFY_HOST` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `MS_GAMIFY_PORT` | ✅ | ✅ | — | — | ✅ | — | — | — |
| `MS_IA_HOST` | ✅ | ✅ | — | — | — | — | — | — |
| `MS_IA_PORT` | ✅ | ✅ | — | — | — | — | — | — |
| `MS_PREDICCION_HOST` | ✅ | — | — | — | — | — | — | — |
| `MS_PREDICCION_PORT` | ✅ | — | — | — | — | — | — | — |
| `DATABASE_URL` | — | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (psycopg) |
| `JWT_SECRET` | — | — | ✅ | — | — | — | — | — |
| `JWT_EXPIRES_IN` | — | — | ✅ | — | — | — | — | — |
| `S3_ENDPOINT` | — | — | — | ✅ | ✅ | — | — | — |
| `S3_ACCESS_KEY` | — | — | — | ✅ | ✅ | — | — | — |
| `S3_SECRET_KEY` | — | — | — | ✅ | ✅ | — | — | — |
| `S3_BUCKET` | — | — | — | ✅ | ✅ | — | — | — |
| `PUNTOS_POR_REPORTE_ACEPTADO` | — | — | — | — | — | ✅ (def. 10) | — | — |
| `AI_CONFIG_ENCRYPTION_KEY` | — | — | — | — | — | — | ✅ | — |

`MS_PREDICCION_HOST`/`MS_PREDICCION_PORT` siguen el mismo par que el resto de los microservicios; el gateway construye la URL interna (`http://ms-prediccion:3007` en Coolify) porque `ms-prediccion` es el único que habla HTTP en vez de TCP. El `DATABASE_URL` de `ms-prediccion` lleva el driver en el esquema porque lo consume SQLAlchemy: `postgresql+psycopg://usuario:clave@host:5432/ojocamba`.

`AI_CONFIG_ENCRYPTION_KEY` es una clave maestra estable de 32 bytes para cifrar las credenciales configurables de Groq, Gemini, DeepSeek y OpenAI. Generarla una sola vez con `openssl rand -hex 32`, guardarla como secreto del servicio `ms-ia` y ejecutar `pnpm db:migrate` antes de desplegar esta versión.

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
   - `ms-prediccion`: `GET /health` → espera 200. Devuelve `modelo_entrenado: false` mientras nadie haya entrenado, y eso **no** es un fallo: el servicio está sano, sólo todavía no puede pronosticar.

### Watch Paths — Redeploy automático

Coolify redeploya **solo** los servicios cuyos archivos cambiaron.

| Servicio | Watch Paths |
|---|---|
| `ms-auth` | `backend/ms-auth/**` `libs/common/**` `scripts/db-migrate.mjs` `scripts/prod-db-fresh.mjs` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-auth` |
| `ms-register` | `backend/ms-register/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-register` |
| `ms-admin` | `backend/ms-admin/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-admin` |
| `ms-gamify` | `backend/ms-gamify/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-gamify` |
| `ms-ia` | `backend/ms-ia/**` `libs/common/**` `tsconfig.base.json` `pnpm-workspace.yaml` `docker/prod/Dockerfile.ms-ia` |
| `ms-prediccion` | `backend/ms-prediccion/**` `docker/prod/Dockerfile.ms-prediccion` |
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
  S3_ENDPOINT=<s3-host>
  S3_ACCESS_KEY=<access-key>
  S3_SECRET_KEY=<secret-key>
  S3_BUCKET=reportes
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
  MS_GAMIFY_HOST=<host-interno-coolify>
  MS_GAMIFY_PORT=3004
  MS_IA_HOST=<host-interno-coolify>
  MS_IA_PORT=3006
  S3_ENDPOINT=<s3-host>
  S3_ACCESS_KEY=<access-key>
  S3_SECRET_KEY=<secret-key>
  S3_BUCKET=reportes
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
  MS_AUTH_HOST=<host-interno-coolify>
  MS_AUTH_PORT=3001
  PUNTOS_POR_REPORTE_ACEPTADO=10
Watch Paths:
  backend/ms-gamify/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-gamify
```

#### `ms-ia`

```
Tipo:         Dockerfile
Dockerfile:   docker/prod/Dockerfile.ms-ia
Build context: /
Port:         (vacío — TCP interno)
Health check: (ninguno)
Env vars:
  TCP_PORT=3006
  DATABASE_URL=postgresql://user:pass@host:5432/ojocamba
  AI_CONFIG_ENCRYPTION_KEY=<openssl-rand-hex-32>
  MS_ADMIN_HOST=<host-interno-coolify>
  MS_ADMIN_PORT=3003
  MS_REGISTER_HOST=<host-interno-coolify>
  MS_REGISTER_PORT=3002
Watch Paths:
  backend/ms-ia/**  libs/common/**  tsconfig.base.json  pnpm-workspace.yaml  docker/prod/Dockerfile.ms-ia
```

Ejecutá `pnpm db:migrate` una vez antes de iniciar `ms-ia`; las API keys se cargan después desde **Backoffice → IA y respaldos**, no desde variables de entorno.

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
  DATABASE_URL=postgresql://<user>:<pass>@<host-interno-coolify>:5432/ojocamba
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

> `gateway-status` ahora persiste cada ping en la tabla `ping_log` (historico de uptime, ISSUE-20). La tabla se crea sola: igual que `ms-auth`/`ms-register`/`ms-admin`/`ms-gamify`, el contenedor corre `node scripts/db-migrate.mjs` (migraciones TypeORM de `libs/common/src/migrations`) antes de arrancar la app — no requiere ningun paso manual.

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

### Reinicio limpio de base de datos en producción

`pnpm prod:db:fresh` es el equivalente protegido de `php artisan migrate:fresh` cuando se
ejecuta desde el checkout raíz del repositorio. La imagen de ejecución de `ms-auth` no incluye
`pnpm`; dentro de su terminal de Coolify se ejecuta el script con `node`.
Elimina **todo** el schema `public`, restaura las extensiones y aplica las migraciones; no carga
usuarios, reportes ni imágenes demo. El sistema calcula H3 con `h3-js` y almacena las celdas
como texto; `h3-pg` no es requisito para este reset. PostgreSQL debe tener PostGIS disponible.

Antes de ejecutarlo, activá mantenimiento y verificá un backup restaurable de PostgreSQL. El
comando exige la base esperada, un identificador de backup y una confirmación explícita:

```bash
# Revisión sin cambios
DATABASE_URL='<url-de-produccion>' pnpm prod:db:fresh -- --database=ojocamba --dry-run

# Ejecución real desde el checkout raíz: sólo desde una terminal de mantenimiento autorizada
NODE_ENV=production DATABASE_URL='<url-de-produccion>' PROD_DB_BACKUP_ID='<backup-verificado>' PROD_DB_FRESH_CONFIRM=DELETE_ALL_PRODUCTION_DATA pnpm prod:db:fresh -- --database=ojocamba
```

Después de desplegar la imagen que contiene este cambio, desde la terminal del contenedor
`ms-auth` en Coolify usá el mismo procedimiento sin `pnpm`:

```bash
# Revisión sin cambios dentro del contenedor ms-auth
DATABASE_URL='<url-de-produccion>' node scripts/prod-db-fresh.mjs --database=ojocamba --dry-run

# Ejecución real dentro del contenedor ms-auth
NODE_ENV=production DATABASE_URL='<url-de-produccion>' PROD_DB_BACKUP_ID='<backup-verificado>' PROD_DB_FRESH_CONFIRM=DELETE_ALL_PRODUCTION_DATA node scripts/prod-db-fresh.mjs --database=ojocamba
```

Después del reinicio, creá el administrador inicial sin usar los seeds demo. Cargá las variables
`BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` como secretos de
Coolify y ejecutá una única vez:

```bash
NODE_ENV=production BOOTSTRAP_ADMIN_CONFIRM=CREATE_INITIAL_ADMIN pnpm prod:db:bootstrap
```

Si se ejecuta desde la terminal del contenedor `ms-auth` ya desplegado, usá
`node dist/bootstrap-production.js` con las mismas variables de entorno.

Conservá el mismo `AI_CONFIG_ENCRYPTION_KEY` y cargá los proveedores desde **Backoffice → IA y
respaldos**. El reset de PostgreSQL no borra objetos en MinIO: limpiá el bucket `reportes` sólo
después de tener su backup y confirmar que es exclusivo de esta aplicación.

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

# PWA: los archivos de control se revalidan; los assets con hash son inmutables.
curl -I https://admin.ojocamba.bo/sw.js
# → Cache-Control: no-cache, no-store, must-revalidate
curl -I https://admin.ojocamba.bo/registerSW.js
# → Cache-Control: no-cache, no-store, must-revalidate
curl -I https://admin.ojocamba.bo/assets/<archivo-con-hash>.js
# → Cache-Control: public, immutable
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
