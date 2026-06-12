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
