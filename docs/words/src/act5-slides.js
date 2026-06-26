'use strict';
const PptxGenJS = require('pptxgenjs');
const fs   = require('fs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9'; // 10 × 5.625 pulgadas

const C = {
    navy:   '0E2841',
    orange: 'E97132',
    white:  'FFFFFF',
    dark:   '1F1F1F',
    mid:    'D6E4F0',
    grey:   'F4F4F4',
    green:  '1E7E34',
    code:   '2D2D2D',
};
const FT = 'Aptos Display';
const FB = 'Aptos';

const IMG = path.join(__dirname, 'actividad5', 'IMG');
const hasImg = (f) => fs.existsSync(path.join(IMG, f));
const imgPath = (f) => path.join(IMG, f);

// ── Masters ───────────────────────────────────────────────────────────────────
pptx.defineSlideMaster({
    title: 'COVER',
    background: { color: C.navy },
    objects: [
        { rect: { x: 0, y: 4.75, w: '100%', h: 0.875, fill: { color: C.orange } } },
    ],
});
pptx.defineSlideMaster({
    title: 'CONTENT',
    background: { color: C.white },
    objects: [
        { rect: { x: 0, y: 0,    w: '100%', h: 1.05, fill: { color: C.navy } } },
        { rect: { x: 0, y: 5.33, w: '100%', h: 0.295, fill: { color: C.orange } } },
    ],
});
pptx.defineSlideMaster({
    title: 'DARK',
    background: { color: C.navy },
    objects: [
        { rect: { x: 0, y: 5.33, w: '100%', h: 0.295, fill: { color: C.orange } } },
    ],
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const logoMat = (sl) => {
    sl.addShape('rect', { x: 4.05, y: 0.18, w: 1.9, h: 1.2,
        fill: { color: C.white }, line: { color: C.white } });
    sl.addImage({ path: 'recursos/upds_logo.jpg', x: 4.15, y: 0.25, w: 1.6, h: 1.05 });
};

const addTitle = (sl, txt) =>
    sl.addText(txt, { x: 0.3, y: 0.1, w: 9.0, h: 0.85,
        fontSize: 22, bold: true, color: C.white, fontFace: FT, valign: 'middle' });

const mkTable = (sl, headers, rows, opts = {}) => {
    const hRow = headers.map(h => ({
        text: h,
        options: { bold: true, color: C.white, fill: C.navy, fontSize: opts.hSize || 10,
            fontFace: FB, align: 'center', valign: 'middle' }
    }));
    const dRows = rows.map((r, ri) => r.map((c, ci) => ({
        text: String(c),
        options: { fontSize: opts.size || 9, fontFace: FB,
            fill: ri % 2 === 0 ? C.white : C.mid, color: C.dark,
            valign: 'middle', align: opts.align?.[ci] || 'left' }
    })));
    sl.addTable([hRow, ...dRows], {
        x: opts.x ?? 0.3, y: opts.y ?? 1.2, w: opts.w ?? 9.4,
        border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
        rowH: opts.rowH || 0.28,
        colW: opts.colW,
    });
};

const bullet = (sl, items, opts = {}) => {
    const lines = items.map(t => ({ text: t, options: { bullet: { type: 'bullet' }, paraSpaceBefore: 4 } }));
    sl.addText(lines, {
        x: opts.x ?? 0.4, y: opts.y ?? 1.2, w: opts.w ?? 9.2, h: opts.h ?? 3.8,
        fontSize: opts.sz ?? 13, fontFace: FB, color: C.dark, valign: 'top',
    });
};

const addImg = (sl, file, x, y, w, h) => {
    if (hasImg(file)) sl.addImage({ path: imgPath(file), x, y, w, h });
    else sl.addText(`[${file}]`, { x, y, w, h, color: 'FF0000', fontSize: 10, align: 'center', valign: 'middle' });
};

// ── Número de diapositiva (footer) ───────────────────────────────────────────
let slideN = 0;
const footerNum = (sl) => {
    slideN++;
    sl.addText(String(slideN), {
        x: 9.55, y: 5.3, w: 0.4, h: 0.3,
        fontSize: 9, color: C.white, fontFace: FB, align: 'right',
    });
};

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — PORTADA
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoMat(sl);
    footerNum(sl);

    sl.addText('Actividad 5', { x: 0.5, y: 1.45, w: 9, h: 0.45,
        align: 'center', color: C.orange, fontSize: 14, bold: true, fontFace: FB });
    sl.addText('Implementación del Núcleo Técnico\nSprint 1 — 24 jun · 7 jul 2026', {
        x: 0.5, y: 1.85, w: 9, h: 1.3,
        align: 'center', color: C.white, fontSize: 28, bold: true, fontFace: FT });
    sl.addText('Sistema Ojo Camba — Plataforma Ciudadana de Reporte Urbano\nSanta Cruz de la Sierra, Bolivia', {
        x: 0.5, y: 3.18, w: 9, h: 0.85,
        align: 'center', color: 'B0C4DE', fontSize: 13, italics: true, fontFace: FB });
    sl.addText(
        'Jhoel Cruz · Jonathan Arrieta · Gerson Alvarado · Alexis Santiváñez\n' +
        'Docente: Ing. Jimmy Nataniel Requena Llorentty  |  Sistemas de Información II  |  Julio 2026',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82,
            align: 'center', color: C.white, fontSize: 11, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Agenda');
    footerNum(sl);

    const items = [
        ['01', 'Stack tecnológico ejecutado'],
        ['02', 'Base de datos relacional + H3'],
        ['03', 'Módulo de autenticación JWT (ms-auth)'],
        ['04', 'Sistema de roles — RBAC'],
        ['05', 'Pipeline GitHub Actions CI/CD'],
        ['06', 'Sprint Review — 6 HU · 26 SP'],
        ['07', 'Prueba E2E Playwright'],
        ['08', 'Conclusiones'],
    ];
    items.forEach(([n, txt], i) => {
        const y = 1.2 + i * 0.5;
        sl.addShape('rect', { x: 0.35, y, w: 0.48, h: 0.36,
            fill: { color: C.orange }, line: { color: C.orange } });
        sl.addText(n, { x: 0.35, y, w: 0.48, h: 0.36,
            align: 'center', valign: 'middle', fontSize: 12, bold: true, color: C.white, fontFace: FB });
        sl.addText(txt, { x: 0.92, y: y + 0.02, w: 8.7, h: 0.33,
            fontSize: 14, color: C.dark, fontFace: FB, valign: 'middle' });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — STACK TECNOLÓGICO
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Stack Tecnológico — Sprint 1');
    footerNum(sl);

    mkTable(sl,
        ['Capa', 'Tecnología', 'Puerto / Versión', 'Archivo clave'],
        [
            ['Backend',        'NestJS + TypeScript',       '3000–3003 TCP',   'backend/*/src/main.ts'],
            ['Base de datos',  'PostgreSQL + H3',           '5432 Docker',     'docker/dev/docker-compose.yml'],
            ['Almacenamiento', 'SeaweedFS S3',              '9010 → :8333',    'docker/dev/docker-compose.yml'],
            ['Autenticación',  'JWT (7d) + bcryptjs 10r',  'ms-auth :3001',   'backend/ms-auth/src/auth.service.ts'],
            ['CI/CD',          'GitHub Actions pnpm v9',   'lint → build',    '.github/workflows/ci.yml'],
            ['Frontend',       'Vite + React PWA',          '5173 · 5174',     'docker/dev/docker-compose.yml'],
            ['E2E',            'Playwright v1.61',          'CI / local',      'e2e/tests/reporte-y-aceptar.spec.ts'],
        ],
        {
            y: 1.15, colW: [1.5, 2.2, 1.6, 4.1],
            align: ['left','left','center','left'], rowH: 0.44,
        }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Base de Datos Relacional — PostgreSQL + H3');
    footerNum(sl);

    mkTable(sl,
        ['Tabla', 'Columnas clave', 'Entidad TypeORM'],
        [
            ['usuarios',          'id · nombre · email · password_hash · puntos · nivel_id',              'usuario.entity.ts (ms-auth)'],
            ['roles',             'id · nombre (ciudadano | moderador | tecnico | admin)',                  'rol.entity.ts (ms-auth)'],
            ['usuario_roles',     'usuario_id FK · rol_id FK  (many-to-many)',                             'usuario-rol.entity.ts (ms-auth)'],
            ['refresh_tokens',    'id · usuario_id FK · token UNIQUE · expires_at · revoked',             'refresh-token.entity.ts (ms-auth)'],
            ['reportes',          'id · device_id · lat/lng · h3_res_8/11/13 · estado · url_imagen',      'reporte.entity.ts (libs/common)'],
            ['dispositivos',      'device_id PK · is_banned · motivo_ban · ultimo_uso',                   'dispositivo.entity.ts (libs/common)'],
            ['grupo_reportes',    'id · codigo_obra UNIQUE · estado_actual · creado_por_usuario_id',      'grupo-reporte.entity.ts (libs/common)'],
            ['actualizacion_casos','id · grupo_id FK · usuario_id · estado_nuevo · comentario · lat/lng', 'actualizacion-caso.entity.ts (libs/common)'],
        ],
        { y: 1.15, rowH: 0.38, size: 8, hSize: 9,
          colW: [1.6, 4.8, 3.0],
          align: ['left','left','left'] }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — BASE DE DATOS (captura)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Captura — Tablas en PostgreSQL (psql \\d)');
    footerNum(sl);

    if (hasImg('F8.png')) {
        sl.addImage({ path: imgPath('F8.png'), x: 0.4, y: 1.15, w: 5.9, h: 4.1 });
    }
    if (hasImg('F2.2.png')) {
        sl.addImage({ path: imgPath('F2.2.png'), x: 6.4, y: 1.15, w: 3.3, h: 4.1 });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — AUTENTICACIÓN JWT
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Módulo de Autenticación JWT — ms-auth');
    footerNum(sl);

    // Izquierda: flujo
    const flow = [
        { text: '① POST /auth/register', opts: { bold: true } },
        { text: '   bcrypt.hash(password, 10) → password_hash', opts: {} },
        { text: '   rol ciudadano asignado automáticamente', opts: {} },
        { text: '   → access_token (7d) + refresh_token (30d)', opts: { color: C.green } },
        { text: '' },
        { text: '② POST /auth/login', opts: { bold: true } },
        { text: '   bcrypt.compare(password, hash)', opts: {} },
        { text: '   → nuevos tokens emitidos', opts: { color: C.green } },
        { text: '' },
        { text: '③ POST /auth/refresh', opts: { bold: true } },
        { text: '   verifica token en BD: !revoked && !expirado', opts: {} },
        { text: '   → nuevo access_token', opts: { color: C.green } },
        { text: '' },
        { text: '④ POST /auth/logout', opts: { bold: true } },
        { text: '   refresh_tokens.revoked = true para usuario', opts: {} },
    ].map(item => ({
        text: item.text || '',
        options: {
            fontSize: 11, fontFace: 'Courier New',
            color: item.opts?.color || C.dark,
            bold: item.opts?.bold || false,
            paraSpaceBefore: 2,
        },
    }));

    sl.addText(flow, { x: 0.3, y: 1.15, w: 5.6, h: 4.1, valign: 'top' });

    // Derecha: tabla endpoints
    mkTable(sl,
        ['Endpoint', 'Método'],
        [
            ['/auth/register',  'POST'],
            ['/auth/login',     'POST'],
            ['/auth/refresh',   'POST'],
            ['/auth/logout',    'POST'],
            ['/auth/validate',  'POST'],
            ['/auth/profile/:id','GET'],
            ['/auth/users',     'GET'],
        ],
        { x: 6.1, y: 1.15, w: 3.6, colW: [2.7, 0.9],
          align: ['left', 'center'], rowH: 0.38, size: 10 }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — SISTEMA DE ROLES
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sistema de Roles — RBAC (4 roles)');
    footerNum(sl);

    mkTable(sl,
        ['Rol', 'Interfaz', 'HU asociadas', 'Acciones principales'],
        [
            ['ciudadano',  'app-reporte :5173',    'HU-01, HU-02, HU-05',       'Registrar reporte · Ver mapa H3 · Compartir'],
            ['moderador',  'app-backoffice :5174',  'HU-06, HU-07, HU-08, HU-09','Bandeja · Aceptar/Rechazar · Agrupar · Banear'],
            ['tecnico',    'app-tecnico :5175',     'HU-10 a HU-14',             'Ver casos · Bitácora · Cerrar Caso de Obra'],
            ['admin',      'app-backoffice :5174',  'HU-03, HU-18, HU-19, HU-23','Dashboard DSS · Gestionar usuarios · Auditoría'],
        ],
        { y: 1.25, rowH: 0.68, colW: [1.3, 2.0, 2.2, 3.9],
          align: ['center','left','left','left'] }
    );

    sl.addShape('rect', { x: 0.3, y: 4.65, w: 9.4, h: 0.55,
        fill: { color: C.mid }, line: { color: C.mid } });
    sl.addText(
        '📋  Tabla: usuario_roles (usuario_id FK, rol_id FK)  |  ' +
        'Entidad: usuario-rol.entity.ts  |  ' +
        'Relación: many-to-many — un usuario puede tener múltiples roles',
        { x: 0.35, y: 4.68, w: 9.3, h: 0.48,
          fontSize: 9.5, color: C.dark, fontFace: FB, valign: 'middle' }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — CI/CD
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Pipeline GitHub Actions — .github/workflows/ci.yml');
    footerNum(sl);

    // Diagrama de flujo en texto
    const flowItems = [
        { text: 'push a dev  /  PR → main', opts: { bold: true, fontSize: 13 } },
        { text: '          ↓', opts: { fontSize: 13 } },
        { text: 'JOB: lint  (ubuntu-latest)', opts: { bold: true, fontSize: 13, color: C.navy } },
        { text: '  pnpm install --frozen-lockfile', opts: { fontSize: 11, fontFace: 'Courier New' } },
        { text: '  pnpm lint', opts: { fontSize: 11, fontFace: 'Courier New' } },
        { text: '          ↓  (needs: lint)', opts: { fontSize: 13 } },
        { text: 'JOB: build  (ubuntu-latest)', opts: { bold: true, fontSize: 13, color: C.navy } },
        { text: '  pnpm install --frozen-lockfile', opts: { fontSize: 11, fontFace: 'Courier New' } },
        { text: '  pnpm build', opts: { fontSize: 11, fontFace: 'Courier New' } },
        { text: '          ↓', opts: { fontSize: 13 } },
        { text: '✅  Build exitoso → rama lista para PR', opts: { bold: true, fontSize: 13, color: C.green } },
    ].map(i => ({ text: i.text, options: { ...i.opts, paraSpaceBefore: 6, color: i.opts.color || C.dark } }));

    sl.addText(flowItems, { x: 0.4, y: 1.18, w: 5.4, h: 4.1, valign: 'top' });

    if (hasImg('F6.png')) {
        sl.addImage({ path: imgPath('F6.png'), x: 5.9, y: 1.15, w: 3.85, h: 4.1 });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — SPRINT REVIEW
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sprint Review — 7 jul 2026  ·  6 HU · 26 SP  ·  100%');
    footerNum(sl);

    mkTable(sl,
        ['HU', 'Historia', 'SP', 'Evidencia demostrada'],
        [
            ['HU-01', 'Mapa de calor H3 en tiempo real',       '5', 'Hexágonos resolución 8 sobre Santa Cruz'],
            ['HU-02', 'Registrar reporte con foto + GPS',      '8', 'POST /reportes → imagen en SeaweedFS → backoffice'],
            ['HU-06', 'Bandeja de reportes pendientes',        '3', 'GET /admin/reports/pending filtra estado Reportado'],
            ['HU-07', 'Aceptar / rechazar reporte',           '3', 'POST accept → crea GrupoReporte · POST reject'],
            ['HU-08', 'Agrupar reportes en Caso de Obra',     '5', 'POST /admin/groups → codigo_obra UNIQUE generado'],
            ['HU-09', 'Banear dispositivo infractor',          '2', 'POST /admin/devices/ban → is_banned = true'],
            ['TOTAL', '6 / 6 HU · 100% Sprint Backlog',      '26', 'Velocidad real Sprint 1 → base para Sprint 2'],
        ],
        {
            y: 1.2, rowH: 0.44, colW: [0.75, 3.3, 0.55, 4.8],
            align: ['center', 'left', 'center', 'left'], size: 10,
        }
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — CAPTURAS SPRINT REVIEW (mapa + reporte)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sprint Review — Evidencia Visual (HU-01 y HU-02)');
    footerNum(sl);

    addImg(sl, 'F1.png', 0.3, 1.15, 4.65, 4.0);
    sl.addText('Figura 1 — Mapa de calor H3 · HU-01', {
        x: 0.3, y: 5.15, w: 4.65, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });

    addImg(sl, 'F2.png', 5.1, 1.15, 4.6, 4.0);
    sl.addText('Figura 2 — Formulario reporte ciudadano · HU-02', {
        x: 5.1, y: 5.15, w: 4.6, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — CAPTURAS SPRINT REVIEW (bandeja + aceptar)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sprint Review — Evidencia Visual (HU-06 y HU-07)');
    footerNum(sl);

    addImg(sl, 'F3.png', 0.3, 1.15, 4.65, 4.0);
    sl.addText('Figura 3 — Bandeja pendientes · HU-06', {
        x: 0.3, y: 5.15, w: 4.65, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });

    addImg(sl, 'F4.png', 5.1, 1.15, 4.6, 4.0);
    sl.addText('Figura 4 — Aceptar / rechazar reporte · HU-07', {
        x: 5.1, y: 5.15, w: 4.6, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — CAPTURAS SPRINT REVIEW (grupos + banear)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sprint Review — Evidencia Visual (HU-08 y HU-09)');
    footerNum(sl);

    addImg(sl, 'F5.png', 0.3, 1.15, 9.4, 4.0);
    sl.addText('Figura 5 — Grupos / Casos de Obra · HU-08  |  Figura panel banear dispositivo · HU-09', {
        x: 0.3, y: 5.15, w: 9.4, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — PLAYWRIGHT E2E
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Prueba E2E — Playwright · reporte-y-aceptar.spec.ts');
    footerNum(sl);

    bullet(sl, [
        'Dos contextos de navegador simultáneos: ciudadano (app-reporte :5173) y moderador (app-backoffice :5174)',
        'Geolocalización inyectada: Santa Cruz de la Sierra (lat -17.7833, lng -63.1821)',
        'Credenciales del seed: admin@ojocamba.bo / admin123',
        'Flujo completo: ciudadano crea reporte anónimo → moderador lo acepta individualmente',
        'Ejecutar: cd e2e && npx playwright test   |   Reporte: npx playwright show-report',
    ], { y: 1.18, h: 2.2, sz: 12 });

    addImg(sl, 'F7.png', 0.3, 3.45, 9.4, 1.8);
    sl.addText('Figura 7 — Resultado Playwright: test PASSED', {
        x: 0.3, y: 5.2, w: 9.4, h: 0.2, fontSize: 8, color: '555555', italics: true, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — COLECCIÓN POSTMAN
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Colección Postman — API Gateway (localhost:3000)');
    footerNum(sl);

    mkTable(sl,
        ['Grupo', 'Endpoint', 'Método', 'Propósito'],
        [
            ['Auth',    'POST /auth/login',                'POST', 'Login → guarda access_token automáticamente'],
            ['Auth',    'POST /auth/register',             'POST', 'Nuevo usuario → rol ciudadano asignado'],
            ['Auth',    'POST /auth/refresh',              'POST', 'Renovar access_token con refresh_token'],
            ['Reportes','POST /reportes',                  'POST', 'Crear reporte con device_id, lat/lng, imagen_base64'],
            ['Reportes','GET /reportes/heatmap?resolution=8','GET','Hexágonos H3 con conteo de reportes'],
            ['Admin',   'GET /admin/reports/pending',      'GET',  'Bandeja de reportes en estado Reportado'],
            ['Admin',   'POST /admin/reports/:id/accept',  'POST', 'Aceptar reporte → crea Caso de Obra'],
            ['Admin',   'POST /admin/devices/ban',         'POST', 'Banear dispositivo por device_id'],
        ],
        { y: 1.2, rowH: 0.42, colW: [1.0, 3.1, 0.85, 4.45],
          align: ['center','left','center','left'], size: 9.5 }
    );

    if (hasImg('F9.png')) {
        // mini preview en esquina inferior derecha
        sl.addImage({ path: imgPath('F9.png'), x: 6.8, y: 3.85, w: 2.85, h: 1.35 });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — CONCLUSIONES
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'DARK' });
    footerNum(sl);

    sl.addText('Conclusiones', { x: 0.4, y: 0.3, w: 9.2, h: 0.7,
        fontSize: 26, bold: true, color: C.white, fontFace: FT });

    const items = [
        ['🏗️', 'Arquitectura de microservicios NestJS + TCP permite escalar ms-auth, ms-register y ms-admin de forma independiente'],
        ['🔐', 'bcryptjs (saltRounds = 10) + refresh tokens revocables cumplen NIST SP 800-63B para almacenamiento seguro de contraseñas'],
        ['🌐', 'Indexación H3 en 3 resoluciones (8, 11, 13) calculada al persistir cada reporte — mapa de calor sin joins costosos'],
        ['✅', 'Playwright E2E valida el flujo ciudadano → moderador end-to-end; 6/6 HU demostradas el 7 jul 2026 con 26 SP de velocidad'],
    ];

    items.forEach(([emoji, txt], i) => {
        const y = 1.1 + i * 1.0;
        sl.addShape('rect', { x: 0.3, y, w: 9.4, h: 0.82,
            fill: { color: '142A40' }, line: { color: C.orange, pt: 1 } });
        sl.addText(`${emoji}  ${txt}`, { x: 0.45, y: y + 0.04, w: 9.1, h: 0.72,
            fontSize: 12.5, color: C.white, fontFace: FB, valign: 'middle' });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 16 — CIERRE
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoMat(sl);
    footerNum(sl);

    sl.addText('Sprint 2 — 8 · 21 jul 2026', {
        x: 0.5, y: 1.5, w: 9, h: 0.5,
        align: 'center', color: C.orange, fontSize: 14, bold: true, fontFace: FB });
    sl.addText('Sistema de notificaciones push\nApp Técnicos + Dashboard DSS\nPruebas de integración con cobertura mínima', {
        x: 0.5, y: 2.0, w: 9, h: 1.6,
        align: 'center', color: C.white, fontSize: 20, fontFace: FT });
    sl.addText('¡Gracias!', {
        x: 0.5, y: 3.7, w: 9, h: 0.7,
        align: 'center', color: C.white, fontSize: 32, bold: true, fontFace: FT });
    sl.addText(
        'Repositorio: github.com/jhoel0521/Ojo-Camba  |  Postman: docs/words/postman/OjoCamba_API.postman_collection.json',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82,
            align: 'center', color: 'B0C4DE', fontSize: 9, fontFace: FB });
}

// ── Generar archivo ───────────────────────────────────────────────────────────
const outPath = 'out/Ojo_Camba_Actividad5_Slides.pptx';
pptx.writeFile({ fileName: outPath })
    .then(() => console.log(`OK — ${outPath} generado (${slideN} diapositivas)`))
    .catch(err => { console.error('Error:', err.message); process.exit(1); });
