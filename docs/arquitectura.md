# Arquitectura del Sistema: Ojo Camba

**Descripción:** Este documento detalla la arquitectura de software del sistema Ojo Camba. Define la separación de responsabilidades entre las aplicaciones cliente (Frontends), la capa de enrutamiento (API Gateways), los microservicios backend basados en NestJS y la capa de persistencia de datos (PostgreSQL + MinIO). La comunicación interna prioriza el protocolo TCP para garantizar baja latencia y alto rendimiento.

## Diagrama de Arquitectura General

```mermaid
graph TD
    subgraph Frontends
        AppReporte[App de Reporte y Mapa de Calor]
        AppBackOffice[App BackOffice Administradores]
        AppTecnico[App Técnicos en Campo]
        AppStatus[App Status / Health Check]
    end

    subgraph API Gateways
        GW_Principal[API Gateway Principal]
        GW_Status[API Gateway Status]
    end

    AppReporte -->|HTTP/REST| GW_Principal
    AppBackOffice -->|HTTP/REST| GW_Principal
    AppTecnico -->|HTTP/REST| GW_Principal
    AppStatus -->|HTTP/REST| GW_Status

    subgraph Microservicios NestJS
        MS_Auth[MS Auth & Users]
        MS_Register[MS Registro de Reportes]
        MS_Admin[MS Admin & Moderación]
        MS_Gamify[MS Gamificación & Logros]
    end

    GW_Principal -.->|TCP| MS_Auth
    GW_Principal -.->|TCP| MS_Register
    GW_Principal -.->|TCP| MS_Admin
    GW_Principal -.->|TCP| MS_Gamify
    
    GW_Status -.->|Ping TCP| MS_Auth
    GW_Status -.->|Ping TCP| MS_Register
    GW_Status -.->|Ping TCP| MS_Admin
    GW_Status -.->|Ping TCP| MS_Gamify

    subgraph Almacenamiento
        DB[(PostgreSQL + PostGIS)]
        MinIO[(MinIO Object Storage)]
    end

    MS_Register -->|Sube Imagen| MinIO
    MS_Register -->|CRUD H3| DB
    MS_Auth --> DB
    MS_Admin --> DB
    MS_Gamify --> DB
```

## Endpoints HTTP — Gateway Principal (puerto 3000)

| Método | Ruta | Microservicio | Patrón TCP |
|--------|------|--------------|------------|
| `POST` | `/auth/register` | ms-auth | `auth.register` |
| `POST` | `/auth/login` | ms-auth | `auth.login` |
| `POST` | `/auth/refresh` | ms-auth | `auth.refresh` |
| `POST` | `/auth/logout` | ms-auth | `auth.logout` |
| `POST` | `/auth/validate` | ms-auth | `auth.validate_token` |
| `GET`  | `/auth/profile/:id` | ms-auth | `auth.get_profile` |
| `POST` | `/reportes` | ms-register | `register.create_report` |
| `GET`  | `/reportes` | ms-register | `register.list_reports` |
| `GET`  | `/reportes/heatmap` | ms-register | `register.get_heatmap` |
| `GET`  | `/reportes/heatmap-detailed` | ms-register | `register.get_heatmap_detailed` |
| `POST` | `/reportes/vincular` | ms-register | `register.vincular_device` — body: `{ usuario_id, device_id }` |
| `GET`  | `/reportes/:id` | ms-register | `register.get_report` |
| `GET`  | `/admin/reports/pending` | ms-admin | `admin.list_pending` |
| `POST` | `/admin/reports/:id/accept` | ms-admin | `admin.accept_report` |
| `POST` | `/admin/reports/:id/reject` | ms-admin | `admin.reject_report` |
| `POST` | `/admin/groups` | ms-admin | `admin.create_group` |
| `POST` | `/admin/groups/:id/updates` | ms-admin | `admin.update_case` |
| `POST` | `/admin/devices/ban` | ms-admin | `admin.ban_device` |
| `GET`  | `/admin/groups` | ms-admin | `admin.list_groups` |
| `GET`  | `/admin/groups/heatmap` | ms-admin | `admin.get_groups_heatmap` |
| `GET`  | `/admin/groups/by-cell` | ms-admin | `admin.list_groups_by_cell` |
| `GET`  | `/admin/groups/:id` | ms-admin | `admin.get_group` |
| `GET`  | `/admin/groups/:id/timeline` | ms-admin | `admin.get_case_timeline` |
| `GET`  | `/admin/dashboard` | ms-admin | `admin.dashboard` |
| `GET`  | `/admin/devices` | ms-admin | `admin.list_devices` |
| `GET`  | `/auth/users` | ms-auth | `auth.list_users` |
| `POST` | `/gamify/award` | ms-gamify | `gamify.award_points` |
| `GET`  | `/gamify/stats/:id` | ms-gamify | `gamify.get_user_stats` |
| `GET`  | `/gamify/levels` | ms-gamify | `gamify.get_levels` |
| `GET`  | `/health` | — | — |
