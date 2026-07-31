# App BackOffice — Ojo Camba

Panel de moderacion y administracion para la plataforma Ojo Camba. Acceso exclusivo para usuarios con rol `moderador` o `admin`.

## Rutas

| Ruta | Pagina | Descripcion |
|------|--------|-------------|
| `/login` | LoginPage | Pantalla de acceso. Solo permite ingreso a moderadores y admin. |
| `/` | DashboardPage | Estadisticas generales: pendientes, aceptados hoy, casos activos, dispositivos baneados. |
| `/revisar` | RevisarPage | Bandeja de reportes pendientes agrupados por zona H3. Aceptar, rechazar y agrupar en Casos de Obra. |
| `/casos` | CasosPage | Lista de todos los Casos de Obra registrados con paginacion. |
| `/grupos/:id` | CasoDetallePage | Detalle de un Caso de Obra: datos, timeline de actualizaciones y formulario para agregar nuevas. |
| `/usuarios` | UsuariosPage | Lista de usuarios registrados y gestion de baneo de dispositivos. |

## Flujo de moderacion

### 1. Revision de reportes (CU-06, CU-07)

El moderador abre `/revisar` y ve los reportes pendientes agrupados por su hexagono H3 resolucion 11 (radio ~8 m). Esta agrupacion permite detectar duplicados del mismo problema.

### 2. Aceptar un reporte

Al aceptar un reporte individual, el backend crea automaticamente un `GrupoReporte` (Caso de Obra) con codigo unico `OBRA-AAAA-NNN` y asigna el reporte a ese grupo. El estado cambia a "Aceptado".

```
POST /admin/reports/:id/accept
Body: { moderador_id, categoria_id? }
```

### 3. Agrupar varios reportes (CU-08, HU-04)

Cuando el moderador detecta varios reportes del mismo problema (mismo H3), los selecciona y crea un Caso de Obra que los agrupa a todos. El backend valida que compartan el mismo `h3_res_11`.

```
POST /admin/groups
Body: { report_ids, creado_por_usuario_id }
```

### 4. Rechazar reportes

Reportes que son spam, duplicados claros o fotos inapropiadas se rechazan. El estado cambia a "Rechazado".

```
POST /admin/reports/:id/reject
```

### 5. Seguimiento de casos

Desde `/grupos/:id`, el moderador puede:
- Ver la bitacora de actualizaciones (timeline)
- Agregar nuevas actualizaciones con comentario, cambio de estado, fecha estimada y recursos

```
POST /admin/groups/:id/updates
Body: { usuario_id, comentario, estado_nuevo?, recursos_solicitados?, fecha_estimada_fin? }
```

## Estados de un reporte

```
Reportado → Aceptado → ValidacionEnCampo → EnTrabajo → Finalizado
         → Rechazado (fin)
```

## Permisos

- Solo usuarios con rol `moderador` o `admin` pueden acceder
- El `AuthGuard` valida el token JWT contra `POST /auth/validate` y verifica los roles
- Las rutas protegidas redirigen a `/login` si no hay sesion valida

## Variables de entorno

| Variable | Default | Descripcion |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | URL del API Gateway Principal |

## Endpoints consumidos

| Metodo | Ruta | Uso |
|--------|------|-----|
| `POST` | `/auth/login` | Iniciar sesion |
| `POST` | `/auth/validate` | Validar token JWT + obtener roles |
| `GET` | `/admin/dashboard` | Estadisticas del dashboard |
| `GET` | `/admin/reports/pending` | Lista de reportes pendientes |
| `POST` | `/admin/reports/:id/accept` | Aceptar un reporte |
| `POST` | `/admin/reports/:id/reject` | Rechazar un reporte |
| `POST` | `/admin/groups` | Crear Caso de Obra (agrupar reportes) |
| `GET` | `/admin/groups` | Listar todos los casos |
| `GET` | `/admin/groups/:id` | Detalle de un caso |
| `GET` | `/admin/groups/:id/timeline` | Bitacora de actualizaciones |
| `POST` | `/admin/groups/:id/updates` | Agregar actualizacion a un caso |
| `POST` | `/admin/devices/ban` | Banear un dispositivo |
| `GET` | `/admin/devices` | Listar dispositivos (baneados) |
| `GET` | `/auth/users` | Listar usuarios registrados |
| `GET` | `/prediccion/comparativa` | Panel de decision: observado y estimado por zona H3 |
| `GET` | `/prediccion/alertas` | Alertas de capacidad (solo coordinador) |
| `POST` | `/prediccion/decisiones` | Registrar la decision sobre una recomendacion |
| `GET` | `/prediccion/decisiones` | Historial de decisiones con precision retrospectiva |

## Panel de decision (`/prediccion`, ISSUE-32)

Cuatro secciones: resumen ejecutivo (maximo tres alertas criticas), actual vs.
prediccion con mapa H3 filtrable, capacidad y acciones, e historial con la
precision retrospectiva de cada decision.

- **Lo observado y lo estimado no se mezclan.** Cada cifra lleva su etiqueta de
  origen, su periodo y —del lado estimado— la version de modelo y dataset. En el
  mapa lo estimado va ademas con borde punteado: el color solo no alcanza.
- **Quien ve que.** El coordinador decide; la autoridad municipal consulta el
  agregado y no recibe la seccion de capacidad y acciones. Lo comprueba el
  gateway (403), no solo el menu.
- **Decidir no mueve cuadrillas**: registra que se recomendo, que se resolvio,
  con que motivo, quien y cuando.
- En escritorio las secciones se ven a la vez; en movil son pestanas. Se elige
  en JavaScript (`useEsEscritorio`) y no con clases: con `hidden lg:block` el
  panel se montaria dos veces, con dos instancias de Leaflet.
- La pagina se carga diferida (`React.lazy`): leaflet y h3-js pesan ~180 kB y
  solo los descarga quien entra al panel.
