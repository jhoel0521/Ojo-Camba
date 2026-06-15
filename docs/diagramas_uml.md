# Diagramas UML 2.5 — Ojo Camba

**Descripción:** Colección de los cinco diagramas UML 2.5 obligatorios del sistema Ojo Camba: Clases, Casos de Uso, Actividades (con swimlanes), Secuencia y Despliegue.

---

## 1. Diagrama de Clases

```mermaid
classDiagram
    class Usuario {
        +int id
        +String nombre
        +String email
        +String passwordHash
        +int puntos
        +int nivelId
        +Timestamp creadoEn
    }
    class Rol {
        +int id
        +String nombre
    }
    class UsuarioRoles {
        +int usuarioId
        +int rolId
    }
    class Nivel {
        +int id
        +String nombre
        +int puntosRequeridos
        +String urlSticker
    }
    class Dispositivo {
        +String deviceId
        +boolean isBanned
        +String motivoBan
        +Timestamp ultimoUso
    }
    class Categoria {
        +int id
        +String nombre
        +String icono
    }
    class Reporte {
        +int id
        +String deviceId
        +int usuarioId
        +int categoriaId
        +int grupoId
        +decimal lat
        +decimal lng
        +String h3Res8
        +String h3Res11
        +String h3Res13
        +EstadoReporte estado
        +Gravedad gravedad
        +String urlImagen
        +Timestamp creadoEn
    }
    class GruposReportes {
        +int id
        +String codigoObra
        +EstadoReporte estadoActual
        +Date fechaEstimadaFin
        +int creadoPorUsuarioId
        +Timestamp creadoEn
    }
    class ActualizacionesCaso {
        +int id
        +int reporteId
        +int grupoId
        +int usuarioId
        +EstadoReporte estadoNuevo
        +String comentario
        +String recursosSolicitados
        +Date fechaEstimadaFin
        +decimal latActualizada
        +decimal lngActualizada
        +String urlImagen
        +Timestamp creadoEn
    }
    class EstadoReporte {
        <<enumeration>>
        Reportado
        Aceptado
        Rechazado
        ValidacionEnCampo
        EnTrabajo
        Finalizado
    }
    class Gravedad {
        <<enumeration>>
        Baja
        Media
        Alta
        Emergencia
    }

    Nivel "1" --> "0..*" Usuario : alcanza
    Usuario "1" --> "0..*" UsuarioRoles : tiene
    Rol "1" --> "0..*" UsuarioRoles : asignado a
    Dispositivo "1" --> "0..*" Reporte : genera
    Usuario "0..1" --> "0..*" Reporte : registra
    Categoria "1" --> "0..*" Reporte : clasifica
    GruposReportes "1" --> "0..*" Reporte : agrupa
    Usuario "1" --> "0..*" GruposReportes : crea
    Reporte "0..1" --> "0..*" ActualizacionesCaso : actualiza
    GruposReportes "0..1" --> "0..*" ActualizacionesCaso : actualiza
    Usuario "1" --> "0..*" ActualizacionesCaso : registra
    Reporte ..> EstadoReporte : usa
    Reporte ..> Gravedad : usa
    GruposReportes ..> EstadoReporte : usa
    ActualizacionesCaso ..> EstadoReporte : usa
```

---

## 2. Diagrama de Casos de Uso

```mermaid
graph TD
    C(["👤 Ciudadano"])
    M(["👤 Moderador / Admin"])
    T(["👤 Técnico en Campo"])
    P(["👤 Usuario Público"])

    subgraph Sistema_Ojo_Camba["Sistema Ojo Camba"]
        CU01["CU-01: Visualizar mapa de calor"]
        CU02["CU-02: Registrar reporte urbano"]
        CU03["CU-03: Crear cuenta de usuario"]
        CU04["CU-04: Consultar bitácora del reporte"]
        CU05["CU-05: Compartir estado del reporte"]

        CU06["CU-06: Ver bandeja de reportes"]
        CU07["CU-07: Cambiar estado del reporte"]
        CU08["CU-08: Agrupar en Caso de Obra"]
        CU09["CU-09: Banear DeviceID"]

        CU10["CU-10: Ver reportes cercanos por H3"]
        CU11["CU-11: Crear Caso de Obra en campo"]
        CU12["CU-12: Registrar actualización en bitácora"]
        CU13["CU-13: Corregir coordenadas GPS"]
        CU14["CU-14: Cambiar estado del Caso de Obra"]

        CU15["CU-15: Ver estado de microservicios"]
    end

    C --> CU01
    C --> CU02
    C --> CU03
    C --> CU04
    C --> CU05

    M --> CU06
    M --> CU07
    M --> CU08
    M --> CU09

    T --> CU10
    T --> CU11
    T --> CU12
    T --> CU13
    T --> CU14

    P --> CU15
```

---

## 3. Diagrama de Actividades — Registro de Reporte (con Swimlanes)

```mermaid
flowchart TD
    Start([Inicio]) --> A1

    subgraph Ciudadano["🧑 Ciudadano"]
        A1[Abre la app y activa GPS]
        A2[Toma fotografía del problema]
        A3[Selecciona categoría]
        A4[Confirma el envío]
        A9[Recibe confirmación en pantalla]
    end

    subgraph App_PWA["📱 App Reporte PWA"]
        B1[Captura DeviceID automáticamente]
        B2[Construye payload: imagen, lat, lng, categoría]
        B3[Envía POST al API Gateway]
        B8[Muestra estado Reportado al ciudadano]
    end

    subgraph MS_Register["⚙️ MS Registro NestJS"]
        C1[Recibe payload via TCP]
        C2{¿Imagen válida?}
        C3[Sube imagen a MinIO]
        C4[Calcula H3 res 8, 11, 13]
        C5[Persiste reporte en PostgreSQL]
        C6[Estado inicial: Reportado]
        C7[Retorna ID y URL de imagen]
        CErr[Retorna error al Gateway]
    end

    A1 --> A2 --> A3 --> A4
    A4 --> B1 --> B2 --> B3
    B3 --> C1 --> C2
    C2 -- No --> CErr --> B8
    C2 -- Sí --> C3 --> C4 --> C5 --> C6 --> C7
    C7 --> B8 --> A9
    A9 --> End([Fin])
```

---

## 4. Diagrama de Secuencia — Flujo de Registro de Reporte (HU-01)

```mermaid
sequenceDiagram
    actor Ciudadano
    participant App as App Reporte (PWA)
    participant GW as API Gateway Principal
    participant MS as MS Registro (NestJS)
    participant MinIO
    participant DB as PostgreSQL

    Ciudadano->>App: Toma foto y activa GPS
    App->>App: Captura DeviceID automáticamente
    App->>GW: POST /reportes {imagen, lat, lng, categoria, deviceId}
    GW->>MS: TCP: cmd=registrar_reporte {payload}

    MS->>MinIO: PUT /bucket/imagenes/{uuid}
    MinIO-->>MS: URL persistente de la imagen

    MS->>MS: calcularH3(lat, lng) → res 8, 11, 13

    MS->>DB: INSERT INTO reportes (device_id, lat, lng, h3_res_8, h3_res_11, h3_res_13, url_imagen, estado='Reportado')
    DB-->>MS: reporte.id

    MS-->>GW: { id, estado: "Reportado", url_imagen }
    GW-->>App: HTTP 201 Created { id, estado, url_imagen }
    App-->>Ciudadano: Pantalla de confirmación con estado "Reportado"
```

---

## 5. Diagrama de Despliegue

```mermaid
graph TD
    subgraph Cliente["Cliente (Navegador / Dispositivo)"]
        PWA["App Reporte PWA"]
        BackOffice["App Backoffice"]
        AppTec["App Técnicos"]
        AppStatus["App Status"]
    end

    subgraph Docker_Cluster["Clúster Docker — Ojo Camba Network"]
        subgraph Gateways["API Gateways (HTTP)"]
            GWP["gateway-principal\n:3000"]
            GWS["gateway-status\n:3001"]
        end

        subgraph Microservicios["Microservicios NestJS (TCP interno)"]
            MSAuth["ms-auth\nTCP :4001"]
            MSReg["ms-register\nTCP :4002"]
            MSAdmin["ms-admin\nTCP :4003"]
            MSGamify["ms-gamify\nTCP :4004"]
        end

        subgraph Almacenamiento["Persistencia"]
            PG["PostgreSQL 16\n+ PostGIS\n+ h3-pg\n:5432"]
            MINIO["MinIO\nObject Storage\n:9000"]
        end
    end

    PWA -->|HTTPS| GWP
    BackOffice -->|HTTPS| GWP
    AppTec -->|HTTPS| GWP
    AppStatus -->|HTTPS| GWS

    GWP -.->|TCP| MSAuth
    GWP -.->|TCP| MSReg
    GWP -.->|TCP| MSAdmin
    GWP -.->|TCP| MSGamify

    GWS -.->|Ping TCP 60s| MSAuth
    GWS -.->|Ping TCP 60s| MSReg
    GWS -.->|Ping TCP 60s| MSAdmin
    GWS -.->|Ping TCP 60s| MSGamify

    MSReg -->|PUT imagen| MINIO
    MSAuth --> PG
    MSReg --> PG
    MSAdmin --> PG
    MSGamify --> PG
```
