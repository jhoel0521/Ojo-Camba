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
- Stack de infra levantado (`docker-compose.infra.yml`) con PostgreSQL 16 + PostGIS y MinIO. La
  extensión `h3-pg` es opcional: la aplicación calcula las celdas con `h3-js`.
- Repositorio Git conectado a Coolify
- Rama a desplegar configurada (`main`)

### Servicios a desplegar

| # | Servicio | Dockerfile | ¿Expone HTTP? | Público |
|---|----------|-----------|:---:|:---:|
| 1 | `ms-auth` | `docker/prod/Dockerfile.ms-auth` | ❌ (TCP :3001) | ❌ |
| 2 | `ms-register` | `docker/prod/Dockerfile.ms-register` | ❌ (TCP :3002) | ❌ |
| 3 | `ms-admin` | `docker/prod/Dockerfile.ms-admin` | ❌ (TCP :3003) | ❌ |
| 4 | `ms-gamify` | `docker/prod/Dockerfile.ms-gamify` | ❌ (TCP :3004) | ❌ |
| 5 | `ms-ia` | `docker/prod/Dockerfile.ms-ia` | ❌ (TCP :3006) | ❌ |
| 6 | `gateway-principal` | `docker/prod/Dockerfile.gateway-principal` | ✅ (3000) | ✅ |
| 7 | `gateway-status` | `docker/prod/Dockerfile.gateway-status` | ✅ (3005) | ✅ |
| 8 | `app-reporte` | `docker/prod/Dockerfile.app-reporte` | ✅ (80) | ✅ |
| 9 | `app-backoffice` | `docker/prod/Dockerfile.app-backoffice` | ✅ (80) | ✅ |
| 10 | `app-tecnico` | `docker/prod/Dockerfile.app-tecnico` | ✅ (80) | ✅ |
| 11 | `app-status` | `docker/prod/Dockerfile.app-status` | ✅ (80) | ✅ |

### Variables de entorno — Backend

| Variable | gateway-principal | gateway-status | ms-auth | ms-register | ms-admin | ms-gamify | ms-ia |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `PORT_GT_P` | 3000 | — | — | — | — | — | — |
| `PORT_GT_S` | — | 3005 | — | — | — | — | — |
| `TCP_PORT` | — | — | 3001 | 3002 | 3003 | 3004 | 3006 |
| `DATABASE_URL` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `JWT_SECRET` | — | — | ✅ | — | — | — | — |
| `JWT_EXPIRES_IN` | — | — | ✅ | — | — | — | — |
| `MS_AUTH_HOST` | ✅ | ✅ | — | — | — | — | — |
| `MS_AUTH_PORT` | ✅ | ✅ | — | — | — | — | — |
| `MS_REGISTER_HOST` | ✅ | ✅ | — | — | — | — | ✅ |
| `MS_REGISTER_PORT` | ✅ | ✅ | — | — | — | — | ✅ |
| `MS_ADMIN_HOST` | ✅ | ✅ | — | — | — | — | ✅ |
| `MS_ADMIN_PORT` | ✅ | ✅ | — | — | — | — | ✅ |
| `MS_GAMIFY_HOST` | ✅ | ✅ | — | — | — | — | — |
| `MS_GAMIFY_PORT` | ✅ | ✅ | — | — | — | — | — |
| `MS_IA_HOST` | ✅ | ✅ | — | — | — | — | — |
| `MS_IA_PORT` | ✅ | ✅ | — | — | — | — | — |
| `S3_ENDPOINT` | — | — | — | ✅ | — | — | — |
| `S3_ACCESS_KEY` | — | — | — | ✅ | — | — | — |
| `S3_SECRET_KEY` | — | — | — | ✅ | — | — | — |
| `S3_BUCKET` | — | — | — | ✅ | — | — | — |
| `GROQ_API_KEY` | — | — | — | — | — | — | ✅ |
| `GROQ_MODEL` | — | — | — | — | — | — | ✅ |
| `GROQ_BASE_URL` | — | — | — | — | — | — | ✅ |
| `AI_CONFIG_ENCRYPTION_KEY` | — | — | — | — | — | — | ✅ |

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
| `ms-auth` | `backend/ms-auth/**`<br>`libs/**`<br>`scripts/db-migrate.mjs`<br>`scripts/prod-db-fresh.mjs`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-auth` |
| `ms-register` | `backend/ms-register/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-register` |
| `ms-admin` | `backend/ms-admin/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-admin` |
| `ms-gamify` | `backend/ms-gamify/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-gamify` |
| `ms-ia` | `backend/ms-ia/**`<br>`libs/**`<br>`package.json`<br>`pnpm-lock.yaml`<br>`tsconfig.base.json`<br>`docker/prod/Dockerfile.ms-ia` |
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
  S3_ENDPOINT=http://<seaweedfs-host>:8333
  S3_ACCESS_KEY=<access-key>
  S3_SECRET_KEY=<secret-key>
  S3_BUCKET=reportes
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

#### `ms-ia`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.ms-ia
Port:        (ninguno — solo TCP)
Health:      (ninguno — contenedor alive)
Env vars:
  TCP_PORT=3006
  MS_ADMIN_HOST=<ip-o-host-ms-admin>
  MS_ADMIN_PORT=3003
  MS_REGISTER_HOST=<ip-o-host-ms-register>
  MS_REGISTER_PORT=3002
  DATABASE_URL=postgresql://<usuario>:<clave>@<host>:5432/<base>
  AI_CONFIG_ENCRYPTION_KEY=<openssl-rand-hex-32>
  # GROQ_API_KEY es solo compatibilidad inicial; luego las claves se gestionan en Backoffice.
  GROQ_API_KEY=<clave-groq>
  GROQ_MODEL=llama-3.3-70b-versatile
  GROQ_BASE_URL=https://api.groq.com/openai/v1
Watch Paths:
  backend/ms-ia/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.ms-ia
```

> `ms-ia` requiere `DATABASE_URL` para leer proveedores, prioridades y credenciales cifradas. Ejecutá `pnpm db:migrate` una vez antes del despliegue para crear `ai_provider_configs`. `AI_CONFIG_ENCRYPTION_KEY` es una clave maestra estable de 32 bytes (generar con `openssl rand -hex 32`): no se cambia desde la UI ni se debe perder.

#### `gateway-principal`

```
Tipo:        Dockerfile
Dockerfile:  docker/prod/Dockerfile.gateway-principal
Port:        3000
Health:      GET / → 200
Dominio:     api.ojocamba.com
Env vars:
  PORT_GT_P=3000
  MS_AUTH_HOST=<ip-o-host-ms-auth>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<ip-o-host-ms-register>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<ip-o-host-ms-admin>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<ip-o-host-ms-gamify>
  MS_GAMIFY_PORT=3004
  MS_IA_HOST=<ip-o-host-ms-ia>
  MS_IA_PORT=3006
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
  PORT_GT_S=3005
  DATABASE_URL=postgresql://<user>:<pass>@<host-db>:5432/ojocamba
  MS_AUTH_HOST=<ip-o-host-ms-auth>
  MS_AUTH_PORT=3001
  MS_REGISTER_HOST=<ip-o-host-ms-register>
  MS_REGISTER_PORT=3002
  MS_ADMIN_HOST=<ip-o-host-ms-admin>
  MS_ADMIN_PORT=3003
  MS_GAMIFY_HOST=<ip-o-host-ms-gamify>
  MS_GAMIFY_PORT=3004
  MS_IA_HOST=<ip-o-host-ms-ia>
  MS_IA_PORT=3006
Watch Paths:
  backend/gateway-status/**  libs/**  package.json  pnpm-lock.yaml  tsconfig.base.json  docker/prod/Dockerfile.gateway-status
```

> La tabla `ping_log` (historico de uptime, ISSUE-20) se crea sola en el arranque: el contenedor corre `node scripts/db-migrate.mjs` (migraciones TypeORM) antes de levantar la app, igual que en `ms-auth`/`ms-register`/`ms-admin`/`ms-gamify`. No requiere ningun paso manual.

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
6. `ms-ia` (depende de `ms-admin` y `ms-register` ya arriba)
7. `gateway-principal`
8. `gateway-status`
9. `app-reporte` `app-backoffice` `app-tecnico` `app-status` (cualquier orden)

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
| `reportes`, `categorias` | ms-register | ms-admin, ms-gamify, ms-prediccion |
| `grupos_reportes`, `actualizaciones_caso` | ms-admin | ms-register, ms-prediccion |
| `cuadrillas`, `configuracion_operativa` | ms-admin | ms-prediccion |
| `decisiones_recomendacion` | ms-admin | — |
| puntos, nivel_id en `usuarios` | ms-gamify | — |

`ms-prediccion` solo **lee** vía SQLAlchemy las tablas listadas; no crea ni modifica ninguna. `decisiones_recomendacion` es la evidencia de las decisiones del coordinador sobre las recomendaciones (ISSUE-32), la crea `ms-admin` por TCP.

### Fase 2 — Crecimiento

Si PostgreSQL se vuelve cuello de botella:

- Migrar a proveedor externo: Neon, Supabase, AWS RDS con PostGIS
- Misma estructura de tablas. Solo cambia `DATABASE_URL` en cada microservicio
- Agregar réplica de lectura para consultas del mapa de calor (ms-register)

### SeaweedFS

Una instancia SeaweedFS es suficiente para el MVP. Si el volumen de imagenes crece:

- Escalar SeaweedFS horizontalmente (modo cluster con volume servers)
- O migrar a cualquier S3 compatible (AWS S3, Cloudflare R2)
- Solo cambia `S3_ENDPOINT` en ms-register. Cero cambio de codigo.

Las imagenes se sirven via el gateway (`GET /api/reportes/{id}/imagen`). SeaweedFS nunca recibe trafico publico.
## Servicio `ms-prediccion` (ISSUE-31)

El servicio de predicción se despliega con `docker/prod/Dockerfile.ms-prediccion`, usando el contexto raíz del repositorio (`.`). Escucha HTTP interno en el puerto `3007` y **no expone puerto hacia afuera** (igual que los microservicios TCP): solamente `gateway-principal` lo alcanza. El gateway configura `MS_PREDICCION_HOST`/`MS_PREDICCION_PORT` (mismo par que el resto de los microservicios) y arma la URL interna `http://host:port`.

Variables requeridas:

```text
DATABASE_URL=postgresql+psycopg://<usuario>:<clave>@<host>:5432/<base>
```

El puerto va fijo en `3007`: la imagen de producción arranca uvicorn con `--port 3007` en el CMD. En ejecución local fuera del contenedor el servicio lee `PUERTO` (defecto `3007`). No existe `PORT` ni `TCP_PORT` como en los microservicios de Nest.

El `DATABASE_URL` también acepta el formato `postgresql://` sin driver (igual que los servicios Nest): el servicio lo normaliza a `+psycopg` automáticamente.

En Coolify crear dos volúmenes persistentes:

```text
/app/modelos
/app/datos
```

Sin esos volúmenes, un redeploy elimina el modelo entrenado y el servicio responderá `409` hasta que se vuelva a entrenar. El servicio no entrena automáticamente al arrancar.
