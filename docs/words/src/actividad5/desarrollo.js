'use strict';
const {
    P, PMix, H1, H2, H3, Bullet, BulletMix, PageBreakP, Blank, Img,
    Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType,
    hc, bc, run, NAVY, Paragraph,
} = require('./helpers');

// ── Tabla helper local ───────────────────────────────────────────────────────
const mkTable = (widths, rows) => new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows,
});

// ── Paso 1: Stack ejecutado ──────────────────────────────────────────────────
const paso1 = [
    H2('Paso 1: Stack Tecnológico Ejecutado en el Sprint 1'),
    P('A diferencia de la Actividad 4 donde el stack fue planificado, en el Sprint 1 el equipo ' +
      'implementó efectivamente los siguientes componentes tecnológicos. La Tabla 1 detalla ' +
      'el stack final ejecutado con sus versiones verificadas en el repositorio.'),
    new Paragraph({ children: [run('Tabla 1', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Stack tecnológico ejecutado — Sprint 1', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([1600, 1400, 2800, 3560], [
        new TableRow({ tableHeader: true, children: [hc('Capa', 1600), hc('Tecnología', 1400), hc('Función', 2800), hc('Archivo de referencia', 3560)] }),
        new TableRow({ children: [bc('Backend', 1600, { bold: true }), bc('NestJS + TypeScript', 1400), bc('Microservicios TCP: ms-auth, ms-register, ms-admin, gateway-principal', 2800), bc('backend/ms-auth/src/main.ts', 3560)] }),
        new TableRow({ children: [bc('Base de datos', 1600, { bold: true }), bc('PostgreSQL + H3', 1400), bc('Tablas relacionales + indexación hexagonal geoespacial en resoluciones 8, 11 y 13', 2800), bc('docker/dev/docker-compose.yml', 3560)] }),
        new TableRow({ children: [bc('Almacenamiento', 1600, { bold: true }), bc('SeaweedFS (S3)', 1400), bc('Imágenes de reportes en base64 → almacenadas como objetos S3-compatible', 2800), bc('docker/dev/docker-compose.yml : servicio seaweedfs', 3560)] }),
        new TableRow({ children: [bc('Auth', 1600, { bold: true }), bc('JWT + bcryptjs', 1400), bc('Access token 7 días, refresh token 30 días, hash con saltRounds = 10', 2800), bc('backend/ms-auth/src/auth.service.ts', 3560)] }),
        new TableRow({ children: [bc('CI/CD', 1600, { bold: true }), bc('GitHub Actions', 1400), bc('Pipeline lint → build en push a dev y PR hacia main; pnpm v9 + Node 22', 2800), bc('.github/workflows/ci.yml', 3560)] }),
        new TableRow({ children: [bc('Frontend', 1600, { bold: true }), bc('Vite + React PWA', 1400), bc('app-reporte (5173), app-backoffice (5174), app-tecnico (5175)', 2800), bc('docker/dev/docker-compose.yml: servicios frontend', 3560)] }),
        new TableRow({ children: [bc('E2E', 1600, { bold: true }), bc('Playwright v1.61', 1400), bc('Test automatizado: ciudadano crea reporte → moderador acepta en backoffice', 2800), bc('e2e/tests/reporte-y-aceptar.spec.ts', 3560)] }),
    ]),
    P('Nota. Versiones verificadas en pnpm-lock.yaml del repositorio a la fecha del Sprint Review (7 jul 2026).'),
    PageBreakP(),
];

// ── Paso 2: Base de datos ────────────────────────────────────────────────────
const paso2 = [
    H2('Paso 2: Diseño e Implementación de la Base de Datos'),
    P('El modelo de datos fue implementado mediante entidades TypeORM con sincronización ' +
      'automática (synchronize: true en entorno de desarrollo). Las tablas se distribuyen ' +
      'entre dos namespaces lógicos: autenticación (ms-auth) y operaciones (ms-register / ms-admin). ' +
      'La Tabla 2 describe las tablas implementadas con sus columnas clave y archivos de referencia.'),
    new Paragraph({ children: [run('Tabla 2', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Tablas de la base de datos implementadas en PostgreSQL — Sprint 1', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([1200, 3600, 4560], [
        new TableRow({ tableHeader: true, children: [hc('Tabla', 1200), hc('Columnas principales', 3600), hc('Archivo entidad', 4560)] }),
        new TableRow({ children: [bc('usuarios', 1200, { bold: true }), bc('id (PK), nombre varchar(255), email varchar(255) UNIQUE, password_hash varchar(255) nullable, puntos int default 0, nivel_id int nullable, creado_en timestamp', 3600), bc('backend/ms-auth/src/entities/usuario.entity.ts', 4560)] }),
        new TableRow({ children: [bc('roles', 1200, { bold: true }), bc('id (PK), nombre varchar(100) — valores: ciudadano | moderador | tecnico | admin', 3600), bc('backend/ms-auth/src/entities/rol.entity.ts', 4560)] }),
        new TableRow({ children: [bc('usuario_roles', 1200, { bold: true }), bc('usuario_id (FK → usuarios), rol_id (FK → roles) — relación many-to-many', 3600), bc('backend/ms-auth/src/entities/usuario-rol.entity.ts', 4560)] }),
        new TableRow({ children: [bc('refresh_tokens', 1200, { bold: true }), bc('id (PK), usuario_id (FK CASCADE), token varchar(255) UNIQUE, expires_at timestamp, revoked boolean default false, creado_en timestamp', 3600), bc('backend/ms-auth/src/entities/refresh-token.entity.ts', 4560)] }),
        new TableRow({ children: [bc('reportes', 1200, { bold: true }), bc('id (PK), device_id varchar(255), usuario_id int nullable, categoria_id int, grupo_id int nullable, lat/lng decimal(10,7), h3_res_8/11/13 varchar(15), estado varchar(50) default "Reportado", gravedad varchar(20) default "Media", url_imagen varchar(500), creado_en timestamp', 3600), bc('libs/common/src/entities/reporte.entity.ts', 4560)] }),
        new TableRow({ children: [bc('dispositivos', 1200, { bold: true }), bc('device_id varchar(255) PK, is_banned boolean, motivo_ban text nullable, ultimo_uso timestamp', 3600), bc('libs/common/src/entities/dispositivo.entity.ts', 4560)] }),
        new TableRow({ children: [bc('grupo_reportes', 1200, { bold: true }), bc('id (PK), codigo_obra varchar UNIQUE, estado_actual varchar, fecha_estimada_fin date nullable, creado_por_usuario_id int, categoria_id int nullable, creado_en timestamp', 3600), bc('libs/common/src/entities/grupo-reporte.entity.ts', 4560)] }),
        new TableRow({ children: [bc('actualizacion_casos', 1200, { bold: true }), bc('id (PK), reporte_id/grupo_id int nullable, usuario_id int, estado_nuevo varchar, comentario text, recursos_solicitados text nullable, fecha_estimada_fin date nullable, lat/lng_actualizada decimal nullable, url_imagen text nullable, creado_en timestamp', 3600), bc('libs/common/src/entities/actualizacion-caso.entity.ts', 4560)] }),
    ]),
    P('Nota. La columna password_hash admite null para soportar autenticación futura mediante OAuth. Los campos h3_res_X se calculan en el servicio ms-register usando la función h3_lat_lng_to_cell() del paquete h3-js antes de persistir el reporte.'),
    ...Img('F8.png', 14, 'Figura 8. Estructura de tablas de la base de datos PostgreSQL verificada con psql — Sprint 1.'),
    ...Img('F2.1.png', 14, 'Figura 2.1. Vista del esquema relacional de entidades implementadas en el Sprint 1.'),
    ...Img('F2.2.png', 14, 'Figura 2.2. Resultado de sincronización TypeORM: tablas creadas automáticamente en la base de datos.'),
    PageBreakP(),
];

// ── Paso 3: Datos de prueba ──────────────────────────────────────────────────
const paso3 = [
    H2('Paso 3: Datos de Prueba'),
    P('El archivo backend/ms-register/src/seed.ts genera 25 grupos de obras con aproximadamente ' +
      '105 reportes distribuidos en ubicaciones reales de Santa Cruz de la Sierra. Los estados ' +
      'incluyen Finalizado, EnTrabajo, Reportado y Aceptado, cubriendo todos los casos de la ' +
      'máquina de estados del sistema.'),
    P('Adicionalmente, backend/ms-auth/src/seed.ts crea el usuario admin@ojocamba.bo ' +
      '(contraseña: admin123) con roles admin y moderador asignados mediante la tabla ' +
      'usuario_roles. Este usuario es utilizado por el test Playwright para ejecutar el flujo ' +
      'de moderación en la suite E2E.'),
    P('Las coordenadas de los reportes de prueba corresponden a zonas de alta densidad urbana ' +
      'de Santa Cruz (latitud -17.xx, longitud -63.xx), permitiendo que el mapa de calor H3 ' +
      'muestre hexágonos poblados en la resolución 8 durante la Sprint Review.'),
    PageBreakP(),
];

// ── Paso 4: Autenticación JWT ────────────────────────────────────────────────
const paso4 = [
    H2('Paso 4: Módulo de Autenticación JWT (ms-auth)'),
    P('El microservicio ms-auth implementa el ciclo completo de autenticación: registro de ' +
      'usuarios, login con credenciales, emisión de tokens JWT, renovación mediante refresh ' +
      'token y logout con revocación. La Tabla 3 describe los endpoints RPC implementados ' +
      'en auth.controller.ts y expuestos al API Gateway.'),
    new Paragraph({ children: [run('Tabla 3', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Endpoints del microservicio ms-auth expuestos por el gateway (puerto 3000)', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([1800, 1200, 2000, 4360], [
        new TableRow({ tableHeader: true, children: [hc('Endpoint REST', 1800), hc('Método', 1200), hc('Patrón TCP', 2000), hc('Descripción', 4360)] }),
        new TableRow({ children: [bc('/auth/register', 1800), bc('POST', 1200, { center: true }), bc('AUTH.REGISTER', 2000), bc('Crea usuario, hashea contraseña con bcrypt(10), asigna rol ciudadano, retorna access_token + refresh_token', 4360)] }),
        new TableRow({ children: [bc('/auth/login', 1800), bc('POST', 1200, { center: true }), bc('AUTH.LOGIN', 2000), bc('Valida email + bcrypt.compare(password, hash), emite nuevos tokens', 4360)] }),
        new TableRow({ children: [bc('/auth/refresh', 1800), bc('POST', 1200, { center: true }), bc('AUTH.REFRESH', 2000), bc('Verifica refresh_token en BD (no revocado, no expirado), emite nuevo access_token', 4360)] }),
        new TableRow({ children: [bc('/auth/logout', 1800), bc('POST', 1200, { center: true }), bc('AUTH.LOGOUT', 2000), bc('Marca todos los refresh_tokens del usuario como revoked = true', 4360)] }),
        new TableRow({ children: [bc('/auth/validate', 1800), bc('POST', 1200, { center: true }), bc('AUTH.VALIDATE_TOKEN', 2000), bc('Verifica firma JWT, retorna payload con user_id y roles', 4360)] }),
        new TableRow({ children: [bc('/auth/profile/:id', 1800), bc('GET', 1200, { center: true }), bc('AUTH.GET_PROFILE', 2000), bc('Retorna nombre, email y roles del usuario', 4360)] }),
    ]),
    P('Nota. Los tokens se emiten con jwtService.sign({ sub: usuario.id }) donde sub es el ' +
      'identificador estándar (RFC 7519, 2015). El archivo de configuración auth.module.ts ' +
      'lee JWT_SECRET y JWT_EXPIRES_IN desde variables de entorno mediante @nestjs/config.'),
    PageBreakP(),
];

// ── Paso 5: Sistema de roles ─────────────────────────────────────────────────
const paso5 = [
    H2('Paso 5: Sistema de Roles'),
    P('Los cuatro roles del sistema fueron establecidos mediante un seed inicial que inserta ' +
      'las filas en la tabla roles y las asociaciones en usuario_roles. La entidad UsuarioRol ' +
      '(backend/ms-auth/src/entities/usuario-rol.entity.ts) implementa la relación many-to-many ' +
      'con columnas usuario_id y rol_id. La Tabla 4 describe los roles y su alcance funcional.'),
    new Paragraph({ children: [run('Tabla 4', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Roles implementados en la tabla roles de PostgreSQL', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([1600, 1800, 5960], [
        new TableRow({ tableHeader: true, children: [hc('Rol', 1600), hc('Interfaz', 1800), hc('Acciones permitidas', 5960)] }),
        new TableRow({ children: [bc('ciudadano', 1600, { bold: true }), bc('app-reporte (5173)', 1800), bc('Registrar reporte con foto y GPS (HU-02); ver mapa de calor hexagonal (HU-01); compartir reporte en redes (HU-05)', 5960)] }),
        new TableRow({ children: [bc('moderador', 1600, { bold: true }), bc('app-backoffice (5174)', 1800), bc('Ver bandeja de reportes pendientes (HU-06); aceptar/rechazar reporte ciudadano (HU-07); agrupar reportes en Caso de Obra (HU-08); banear dispositivo infractor (HU-09)', 5960)] }),
        new TableRow({ children: [bc('tecnico', 1600, { bold: true }), bc('app-tecnico (5175)', 1800), bc('Ver casos asignados en campo; actualizar bitácora (ActualizacionCaso); cambiar estado del caso a EnTrabajo o Finalizado', 5960)] }),
        new TableRow({ children: [bc('admin', 1600, { bold: true }), bc('app-backoffice (5174)', 1800), bc('Todo lo del moderador + gestión de usuarios; auditoría de bitácoras; acceso al dashboard DSS con métricas de velocidad del equipo', 5960)] }),
    ]),
    P('Nota. La cuenta admin@ojocamba.bo tiene asignados simultáneamente los roles admin y ' +
      'moderador (dos filas en usuario_roles). El seed de ms-auth la crea en la inicialización ' +
      'del módulo mediante OnModuleInit.'),
    PageBreakP(),
];

// ── Paso 6: CI/CD ────────────────────────────────────────────────────────────
const paso6 = [
    H2('Paso 6: Pipeline de Integración Continua (GitHub Actions)'),
    P('El archivo .github/workflows/ci.yml define el pipeline CI del proyecto. Se ejecuta ' +
      'automáticamente en cada push a la rama dev y en cada Pull Request hacia main. El flujo ' +
      'de trabajo de ramas sigue el patrón feature/HU-XX → dev → main. Cada historia se ' +
      'desarrolla en su propia rama, se valida con el pipeline y se fusiona mediante PR.'),
    new Paragraph({ children: [run('Tabla 5', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Etapas del pipeline GitHub Actions (.github/workflows/ci.yml)', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([1200, 1800, 6360], [
        new TableRow({ tableHeader: true, children: [hc('Job', 1200), hc('Trigger', 1800), hc('Pasos', 6360)] }),
        new TableRow({ children: [bc('lint', 1200, { bold: true }), bc('push dev / PR→main', 1800), bc('(1) checkout@v4 → (2) pnpm/action-setup@v4 v9 → (3) setup-node@v4 Node 22 con cache pnpm → (4) pnpm install --frozen-lockfile → (5) pnpm lint', 6360)] }),
        new TableRow({ children: [bc('build', 1200, { bold: true }), bc('needs: lint', 1800), bc('(1) checkout@v4 → (2) pnpm/action-setup@v4 v9 → (3) setup-node@v4 Node 22 con cache pnpm → (4) pnpm install --frozen-lockfile → (5) pnpm build', 6360)] }),
    ]),
    P('Nota. El job test está comentado en el pipeline actual (# test:) hasta que los tests ' +
      'unitarios alcancen cobertura mínima establecida en la Definition of Done del Sprint 2. ' +
      'La evidencia del pipeline aparece en la pestaña Actions del repositorio ' +
      'github.com/jhoel0521/Ojo-Camba.'),
    ...Img('F6.png', 14, 'Figura 6. Pipeline GitHub Actions con los jobs lint y build ejecutados exitosamente en la rama dev.'),
    PageBreakP(),
];

// ── Paso 7: Sprint Review ────────────────────────────────────────────────────
const paso7 = [
    H2('Paso 7: Sprint Review — 7 de Julio de 2026'),
    P('La Sprint Review del Sprint 1 se realizó el 7 de julio de 2026 con la participación ' +
      'del Product Owner (PO), el Scrum Master y los tres desarrolladores del equipo. Se ' +
      'demostraron en vivo las seis Historias de Usuario comprometidas, alcanzando el 100% ' +
      'del Sprint Backlog. La velocidad real del Sprint 1 fue de 26 Story Points (SP).'),
    new Paragraph({ children: [run('Tabla 6', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Resultados de la Sprint Review del Sprint 1 (7 jul 2026)', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([800, 3200, 1200, 4160], [
        new TableRow({ tableHeader: true, children: [hc('HU', 800), hc('Historia de Usuario', 3200), hc('SP', 1200), hc('Evidencia demostrada', 4160)] }),
        new TableRow({ children: [bc('HU-01', 800, { bold: true }), bc('Como ciudadano, quiero ver un mapa de calor H3 de los reportes activos', 3200), bc('5', 1200, { center: true }), bc('Hexágonos visibles en resolución 8 sobre Santa Cruz de la Sierra; colores por densidad', 4160)] }),
        new TableRow({ children: [bc('HU-02', 800, { bold: true }), bc('Como ciudadano, quiero registrar un reporte con foto y GPS', 3200), bc('8', 1200, { center: true }), bc('Formulario app-reporte → POST /reportes → imagen en SeaweedFS → reporte visible en backoffice', 4160)] }),
        new TableRow({ children: [bc('HU-06', 800, { bold: true }), bc('Como moderador, quiero ver la bandeja de reportes pendientes de validación', 3200), bc('3', 1200, { center: true }), bc('GET /admin/reports/pending filtra estado Reportado; paginado y ordenado por hexágono H3', 4160)] }),
        new TableRow({ children: [bc('HU-07', 800, { bold: true }), bc('Como moderador, quiero aceptar o rechazar un reporte ciudadano', 3200), bc('3', 1200, { center: true }), bc('POST /admin/reports/:id/accept → crea GrupoReporte; POST /admin/reports/:id/reject → cambia estado a Rechazado', 4160)] }),
        new TableRow({ children: [bc('HU-08', 800, { bold: true }), bc('Como moderador, quiero agrupar reportes en un Caso de Obra', 3200), bc('5', 1200, { center: true }), bc('POST /admin/groups con array report_ids → genera codigo_obra único; reportes vinculados con grupo_id', 4160)] }),
        new TableRow({ children: [bc('HU-09', 800, { bold: true }), bc('Como moderador, quiero banear un dispositivo infractor', 3200), bc('2', 1200, { center: true }), bc('POST /admin/devices/ban → is_banned = true en tabla dispositivos; reportes futuros del device_id bloqueados', 4160)] }),
        new TableRow({ children: [
            bc('Total', 800, { bold: true }),
            bc('6 HU completadas / 6 comprometidas = 100%', 3200, { bold: true }),
            bc('26', 1200, { center: true, bold: true }),
            bc('Velocidad real del Sprint 1: 26 SP. Referencia para planificación del Sprint 2.', 4160),
        ]}),
    ]),
    ...Img('F1.png', 14, 'Figura 1. Mapa de calor H3 en resolución 8 sobre Santa Cruz de la Sierra — HU-01 demostrada en Sprint Review.'),
    ...Img('F2.png', 14, 'Figura 2. Formulario de reporte ciudadano con foto y GPS en app-reporte — HU-02.'),
    ...Img('F3.png', 14, 'Figura 3. Bandeja de reportes pendientes de validación en app-backoffice — HU-06.'),
    ...Img('F4.png', 14, 'Figura 4. Panel de aceptación/rechazo de reporte ciudadano — HU-07.'),
    ...Img('F5.png', 14, 'Figura 5. Vista de grupos (Casos de Obra) creados por el moderador — HU-08.'),
    PageBreakP(),
];

// ── Paso 8: Prueba E2E ───────────────────────────────────────────────────────
const paso8 = [
    H2('Paso 8: Prueba End-to-End con Playwright'),
    P('El test e2e/tests/reporte-y-aceptar.spec.ts valida el flujo de negocio crítico ' +
      'del Sprint 1: un ciudadano crea un reporte anónimo en app-reporte y un moderador ' +
      'lo acepta individualmente desde app-backoffice. El test usa dos contextos de navegador ' +
      'para simular los dos actores del sistema simultáneamente.'),
    new Paragraph({ children: [run('Tabla 7', { bold: true })], alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ children: [run('Pasos del test Playwright — reporte-y-aceptar.spec.ts', { italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    mkTable([800, 3400, 5160], [
        new TableRow({ tableHeader: true, children: [hc('#', 800), hc('Acción', 3400), hc('Verificación (expect)', 5160)] }),
        new TableRow({ children: [bc('1', 800, { center: true }), bc('Navegador ciudadano abre localhost:5173; Playwright inyecta geolocalización Santa Cruz (lat -17.7833, lng -63.1821)', 3400), bc('Página de app-reporte carga sin errores de consola', 5160)] }),
        new TableRow({ children: [bc('2', 800, { center: true }), bc('Ciudadano selecciona categoría y adjunta imagen PNG; hace clic en "Enviar reporte"', 3400), bc('Interceptor de red confirma POST /reportes con status 201; imagen en base64 enviada', 5160)] }),
        new TableRow({ children: [bc('3', 800, { center: true }), bc('Navegador moderador abre localhost:5174; login con admin@ojocamba.bo / admin123', 3400), bc('Página de backoffice redirige al dashboard tras login exitoso', 5160)] }),
        new TableRow({ children: [bc('4', 800, { center: true }), bc('Moderador navega a bandeja de pendientes; localiza el reporte recién creado', 3400), bc('GET /admin/reports/pending retorna al menos 1 reporte en estado Reportado', 5160)] }),
        new TableRow({ children: [bc('5', 800, { center: true }), bc('Moderador hace clic en "Aceptar" en el reporte del ciudadano', 3400), bc('POST /admin/reports/:id/accept retorna status 201; reporte desaparece de bandeja de pendientes', 5160)] }),
    ]),
    P('El test se ejecuta con: cd e2e && npx playwright test. La configuración en ' +
      'e2e/playwright.config.ts define webServers que levantan automáticamente app-reporte ' +
      '(puerto 5173) y app-backoffice (puerto 5174) como procesos previos al inicio de la suite.'),
    ...Img('F7.png', 14, 'Figura 7. Reporte HTML de Playwright mostrando el test reporte-y-aceptar.spec.ts en estado PASSED.'),
    PageBreakP(),
];

module.exports = [
    H1('Desarrollo'),
    ...paso1,
    ...paso2,
    ...paso3,
    ...paso4,
    ...paso5,
    ...paso6,
    ...paso7,
    ...paso8,
];
