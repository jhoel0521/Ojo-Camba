'use strict';
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';

const C = {
    navy: '0E2841',
    orange: 'E97132',
    white: 'FFFFFF',
    dark: '1F1F1F',
    mid: 'D6E4F0',
    grey: 'F4F4F4',
    green: '1E7E34',
    code: '2D2D2D',
};
const FT = 'Aptos Display';
const FB = 'Aptos';

const IMG = path.join(__dirname, 'actividad6-7', 'IMG');
const hasImg = (f) => fs.existsSync(path.join(IMG, f));
const imgPath = (f) => path.join(IMG, f);

// ── Masters ───────────────────────────────────────────────────────────────────
pptx.defineSlideMaster({
    title: 'COVER',
    background: { color: C.navy },
    objects: [{ rect: { x: 0, y: 4.75, w: '100%', h: 0.875, fill: { color: C.orange } } }],
});
pptx.defineSlideMaster({
    title: 'CONTENT',
    background: { color: C.white },
    objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 1.05, fill: { color: C.navy } } },
        { rect: { x: 0, y: 5.33, w: '100%', h: 0.295, fill: { color: C.orange } } },
    ],
});
pptx.defineSlideMaster({
    title: 'DARK',
    background: { color: C.navy },
    objects: [{ rect: { x: 0, y: 5.33, w: '100%', h: 0.295, fill: { color: C.orange } } }],
});

// ── Helpers (mismo patrón que act5-slides.js) ──────────────────────────────────
const logoMat = (sl) => {
    sl.addShape('rect', { x: 4.05, y: 0.18, w: 1.9, h: 1.2, fill: { color: C.white }, line: { color: C.white } });
    sl.addImage({ path: 'recursos/upds_logo.jpg', x: 4.15, y: 0.25, w: 1.6, h: 1.05 });
};

const addTitle = (sl, txt) =>
    sl.addText(txt, {
        x: 0.3, y: 0.1, w: 9.0, h: 0.85,
        fontSize: 20, bold: true, color: C.white, fontFace: FT, valign: 'middle',
    });

const mkTable = (sl, headers, rows, opts = {}) => {
    const hRow = headers.map((h) => ({
        text: h,
        options: {
            bold: true, color: C.white, fill: C.navy, fontSize: opts.hSize || 10,
            fontFace: FB, align: 'center', valign: 'middle',
        },
    }));
    const dRows = rows.map((r, ri) =>
        r.map((c, ci) => ({
            text: String(c),
            options: {
                fontSize: opts.size || 9, fontFace: FB,
                fill: ri % 2 === 0 ? C.white : C.mid, color: C.dark,
                valign: 'middle', align: opts.align?.[ci] || 'left',
            },
        })),
    );
    sl.addTable([hRow, ...dRows], {
        x: opts.x ?? 0.3, y: opts.y ?? 1.2, w: opts.w ?? 9.4,
        border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
        rowH: opts.rowH || 0.28,
        colW: opts.colW,
    });
};

const bullet = (sl, items, opts = {}) => {
    const lines = items.map((t) => ({ text: t, options: { bullet: { type: 'bullet' }, paraSpaceBefore: 4, breakLine: true } }));
    sl.addText(lines, {
        x: opts.x ?? 0.4, y: opts.y ?? 1.2, w: opts.w ?? 9.2, h: opts.h ?? 3.8,
        fontSize: opts.sz ?? 13, fontFace: FB, color: C.dark, valign: 'top',
    });
};

const addImg = (sl, file, x, y, w, h) => {
    if (hasImg(file)) sl.addImage({ path: imgPath(file), x, y, w, h });
    else sl.addText(`[${file}]`, { x, y, w, h, color: 'FF0000', fontSize: 10, align: 'center', valign: 'middle' });
};

let slideN = 0;
const footerNum = (sl) => {
    slideN++;
    sl.addText(String(slideN), { x: 9.55, y: 5.3, w: 0.4, h: 0.3, fontSize: 9, color: C.white, fontFace: FB, align: 'right' });
};

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — PORTADA
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoMat(sl);
    footerNum(sl);

    sl.addText('Actividades 6 y 7', {
        x: 0.5, y: 1.4, w: 9, h: 0.45, align: 'center', color: C.orange, fontSize: 14, bold: true, fontFace: FB,
    });
    sl.addText('Sprint 2: Módulos de Negocio\nSprint 3: Dashboard de Soporte Decisional', {
        x: 0.5, y: 1.8, w: 9, h: 1.3, align: 'center', color: C.white, fontSize: 26, bold: true, fontFace: FT,
    });
    sl.addText('Sistema Ojo Camba — Plataforma Ciudadana de Reporte Urbano\nSanta Cruz de la Sierra, Bolivia · 8-30 de junio de 2026', {
        x: 0.5, y: 3.15, w: 9, h: 0.85, align: 'center', color: 'B0C4DE', fontSize: 13, italics: true, fontFace: FB,
    });
    sl.addText(
        'Gerson Alvarado (PO) · Jhoel Cruz (SM) · Jonathan Arrieta (Dev) · Alexis Santiváñez (Dev)\n' +
            'Docente: Ing. Jimmy Nataniel Requena Llorentty  |  Sistemas de Información II  |  Julio 2026',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82, align: 'center', color: C.white, fontSize: 11, fontFace: FB },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Agenda');
    footerNum(sl);

    const items = [
        ['01', 'Arquitectura en capas y CRUD de negocio'],
        ['02', 'Consultas SQL avanzadas (JOIN · GROUP BY · HAVING)'],
        ['03', 'Validaciones DTO y colección Postman'],
        ['04', 'Burndown y Retrospectiva — Sprint 2'],
        ['05', 'Dashboard de soporte a la decisión (8 KPIs)'],
        ['06', 'Filtro dinámico de fecha — demo en vivo'],
        ['07', 'Casos de prueba y Definition of Ready'],
        ['08', 'Conclusiones y próximos pasos'],
    ];
    items.forEach(([n, txt], i) => {
        const y = 1.2 + i * 0.5;
        sl.addShape('rect', { x: 0.35, y, w: 0.48, h: 0.36, fill: { color: C.orange }, line: { color: C.orange } });
        sl.addText(n, { x: 0.35, y, w: 0.48, h: 0.36, align: 'center', valign: 'middle', fontSize: 12, bold: true, color: C.white, fontFace: FB });
        sl.addText(txt, { x: 0.92, y: y + 0.02, w: 8.7, h: 0.33, fontSize: 14, color: C.dark, fontFace: FB, valign: 'middle' });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — ARQUITECTURA EN CAPAS
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Arquitectura en Capas — ms-register y ms-admin');
    footerNum(sl);

    mkTable(
        sl,
        ['Capa', 'Responsabilidad', 'Archivo(s)'],
        [
            ['Controllers', 'Traducen HTTP/TCP a llamadas de método', 'gateway-principal, ms-register, ms-admin *.controller.ts'],
            ['Services', 'Reglas de negocio, transacciones, QueryBuilder', 'register.service.ts, admin.service.ts'],
            ['Repositories', 'Mapeo objeto-relacional (Repository<T>)', 'libs/common/src/entities/*.entity.ts'],
            ['DTOs', 'Contratos de entrada validados (class-validator)', 'ms-register/ms-admin/src/dto/*'],
        ],
        { y: 1.2, rowH: 0.65, colW: [1.6, 4.0, 3.8], align: ['left', 'left', 'left'], size: 10 },
    );
    sl.addShape('rect', { x: 0.3, y: 4.35, w: 9.4, h: 0.7, fill: { color: C.mid }, line: { color: C.mid } });
    sl.addText(
        'Decisión de diseño: máquina de estados (EstadoReporte) en vez de borrado lógico — preserva historial y trazabilidad pública',
        { x: 0.35, y: 4.4, w: 9.3, h: 0.6, fontSize: 10.5, color: C.dark, fontFace: FB, valign: 'middle', italics: true },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — CRUD DE ENTIDADES
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'CRUD de Entidades de Negocio — Mapeo a Endpoints');
    footerNum(sl);

    mkTable(
        sl,
        ['Entidad', 'Create', 'Read (list)', 'Update / Delete lógico'],
        [
            ['Reportes', 'POST /reportes', 'GET /reportes?page=', 'POST /admin/reports/:id/accept, /reject'],
            ['Casos de Obra', 'POST /admin/groups', 'GET /admin/groups?estado=', 'POST /admin/groups/:id/updates'],
            ['Dispositivos', '(alta automática)', 'GET /admin/devices?banned_only=', 'POST /admin/devices/ban, /unban'],
            ['Usuarios', 'POST /auth/register', 'GET /auth/users?page=', 'POST /auth/logout'],
        ],
        { y: 1.2, rowH: 0.62, colW: [1.7, 2.3, 2.5, 2.9], align: ['left', 'left', 'left', 'left'], size: 9.5 },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — SQL AVANZADO
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Consultas SQL Avanzadas — 7 Consultas, JOIN + GROUP BY + HAVING');
    footerNum(sl);

    const code = [
        '-- Consulta 6: dispositivos con alta tasa de rechazo (HAVING)',
        'SELECT d.device_id, COUNT(r.id) AS total_reportes,',
        "  COUNT(r.id) FILTER (WHERE r.estado = 'Rechazado') AS rechazados",
        'FROM dispositivos d JOIN reportes r ON r.device_id = d.device_id',
        'GROUP BY d.device_id',
        "HAVING COUNT(r.id) FILTER (WHERE r.estado = 'Rechazado') >= 3;",
    ].map((t) => ({ text: t, options: { fontSize: 12, fontFace: 'Courier New', color: C.white, paraSpaceBefore: 2, breakLine: true } }));

    sl.addShape('rect', { x: 0.3, y: 1.2, w: 9.4, h: 2.3, fill: { color: C.code }, line: { color: C.code } });
    sl.addText(code, { x: 0.5, y: 1.35, w: 9.0, h: 2.1, valign: 'top' });

    bullet(
        sl,
        [
            'Consultas 1-5: alimentan endpoints reales hoy (heatmap, KPIs, listado paginado)',
            'Consultas 6-7 (mostrada arriba): análisis complementario ejecutable en psql, con HAVING y subconsulta',
            'TypeORM QueryBuilder genera el SQL de forma programática y con seguridad de tipos',
        ],
        { y: 3.7, h: 1.5, sz: 12 },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — POSTMAN Y DTOs
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Colección Postman (34 endpoints) y Validación con DTOs');
    footerNum(sl);

    mkTable(
        sl,
        ['Carpeta', 'Endpoints', 'Incorporados en Sprint 2/3'],
        [
            ['Auth', '7', 'Sin cambios'],
            ['Reportes', '7', 'Sin cambios'],
            ['Admin (Moderación)', '17', '+4: nearby, unban, groups/:id/reports, dashboard/kpis con filtro'],
            ['Gamificación', '3', 'Carpeta nueva: award, stats, levels'],
            ['Total', '34', '27 → 34 endpoints'],
        ],
        { y: 1.2, rowH: 0.45, colW: [2.6, 1.4, 5.4], align: ['left', 'center', 'left'], size: 10 },
    );
    sl.addShape('rect', { x: 0.3, y: 3.75, w: 9.4, h: 1.35, fill: { color: C.mid }, line: { color: C.mid } });
    sl.addText(
        'CreateGroupDto: report_ids mínimo 2 (ArrayMinSize)  |  UpdateCaseDto: campos opcionales explícitos\n' +
            'BanDeviceDto: motivo opcional  |  Guard clauses en servicio: cardinalidad, existencia, transición de estado válida, bloqueo pesimista',
        { x: 0.4, y: 3.85, w: 9.2, h: 1.15, fontSize: 11, color: C.dark, fontFace: FB, valign: 'middle' },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — BURNDOWN SPRINT 2
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Burndown y Retrospectiva — Sprint 2 (27 SP · 100%)');
    footerNum(sl);

    mkTable(
        sl,
        ['Qué funcionó', 'Qué mejorar', 'Acción concreta'],
        [
            ['Reutilizar codigo_obra evitó lógica duplicada', 'Dependencia no documentada causó bloqueo día 4', 'Extraer a método compartido (TD-01 cerrado)'],
            ['Paginación uniforme en los 4 CRUD', 'sendRpc() despacha por subcadena de texto', 'TD-04: códigos de error tipados'],
            ['Máquina de estados coherente con transparencia', 'Cobertura de tests limitada a unit tests', 'Priorizar tabla de pruebas de integración en Sprint 3'],
        ],
        { y: 1.2, rowH: 0.85, colW: [3.1, 3.1, 3.2], align: ['left', 'left', 'left'], size: 9.5 },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — DASHBOARD KPIs (tabla)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Dashboard — 8 Indicadores en 4 Tipos de Gráfico');
    footerNum(sl);

    mkTable(
        sl,
        ['Indicador', 'Tipo', 'Filtrable'],
        [
            ['pendientes / aceptados_hoy / casos_activos / dispositivos_baneados', 'Contadores', 'No (tiempo real)'],
            ['reportes_por_mes', 'BarChart', 'Sí'],
            ['por_categoria', 'PieChart', 'Sí'],
            ['casos_por_estado', 'PieChart (dona)', 'Sí'],
            ['tasa_resolucion', 'RadialBarChart', 'Sí (derivada)'],
        ],
        { y: 1.2, rowH: 0.5, colW: [5.4, 2.4, 1.6], align: ['left', 'center', 'center'], size: 10 },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — DASHBOARD SIN FILTRO (captura real)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Dashboard en vivo — Sin filtro de fecha');
    footerNum(sl);

    addImg(sl, 'dashboard-general.png', 2.23, 1.15, 5.55, 3.9);
    sl.addText('Captura real (Playwright) — 160 Casos de Obra activos, tasa de resolución 89%', {
        x: 0.3, y: 5.08, w: 9.4, h: 0.2, fontSize: 9, color: '555555', italics: true, fontFace: FB, align: 'center',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — DASHBOARD CON FILTRO (comparación)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Dashboard en vivo — Filtro 01/06/2026 al 30/06/2026');
    footerNum(sl);

    addImg(sl, 'dashboard-filtro-fecha.png', 2.23, 1.15, 5.55, 3.9);
    sl.addText('Tasa de resolución baja de 89% a 25%: el filtro recalcula sobre el subconjunto, no solo redibuja', {
        x: 0.3, y: 5.08, w: 9.4, h: 0.2, fontSize: 9, color: '555555', italics: true, fontFace: FB, align: 'center',
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — CASOS DE PRUEBA
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Casos de Prueba de Integración — 12/12 PASS');
    footerNum(sl);

    mkTable(
        sl,
        ['#', 'Módulo', 'Escenario', 'Resultado'],
        [
            ['4', 'Reportes', 'Doble accept() simultáneo sobre el mismo reporte', 'Solo el 1º resuelve 201; bloqueo pesimista'],
            ['5', 'Casos de Obra', 'createGroup con 1 solo reporte', '400 "Se necesitan al menos 2 reportes"'],
            ['10', 'Dashboard', 'GET /dashboard/kpis sin filtro', '8 campos, tasa_resolucion=89%'],
            ['11', 'Dashboard', 'GET /dashboard/kpis?desde=&hasta=', 'Series acotadas, tasa_resolucion=25%'],
            ['12', 'Dashboard', 'Cambiar "Desde" en la UI', '4 gráficos se redibujan sin recargar'],
        ],
        { y: 1.2, rowH: 0.58, colW: [0.5, 1.6, 4.3, 3.0], align: ['center', 'left', 'left', 'left'], size: 9.5 },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — DEFINITION OF READY (Gherkin)
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Definition of Ready — Criterios Given/When/Then');
    footerNum(sl);

    const gherkin = [
        'HU-18 — Filtro de fecha recalcula la tasa de resolución',
        '',
        'DADO QUE el Dashboard sin filtro reporta 89% de tasa de resolución,',
        'CUANDO el administrador aplica el filtro Desde=01/06/2026, Hasta=30/06/2026,',
        'ENTONCES los indicadores se recalculan solo sobre ese rango',
        '(259 reportes en junio, tasa de resolución 25%),',
        'Y los 4 contadores en tiempo real permanecen sin cambio.',
    ].map((t, i) => ({
        text: t,
        options: {
            fontSize: i === 0 ? 14 : 13, fontFace: i === 0 ? FT : FB, bold: i === 0 || /^(DADO|CUANDO|ENTONCES|Y )/.test(t),
            color: C.dark, paraSpaceBefore: i === 0 ? 0 : 6, breakLine: true,
        },
    }));

    sl.addShape('rect', { x: 0.3, y: 1.2, w: 9.4, h: 3.6, fill: { color: C.mid }, line: { color: C.orange, pt: 1 } });
    sl.addText(gherkin, { x: 0.55, y: 1.4, w: 8.9, h: 3.3, valign: 'top' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 13 — BURNDOWN SPRINT 3 Y VELOCIDAD
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Burndown Sprint 3 (7 SP · 100%) y Velocidad del Proyecto');
    footerNum(sl);

    mkTable(
        sl,
        ['Sprint', 'SP comprometidos', 'SP completados', '% cumplido'],
        [
            ['Sprint 1', '26', '26', '100%'],
            ['Sprint 2', '27', '27', '100%'],
            ['Sprint 3', '7', '7', '100%'],
        ],
        { y: 1.25, rowH: 0.5, colW: [2.35, 2.35, 2.35, 2.35], align: ['center', 'center', 'center', 'center'], size: 11 },
    );

    sl.addShape('rect', { x: 0.3, y: 3.3, w: 9.4, h: 1.7, fill: { color: C.mid }, line: { color: C.mid } });
    sl.addText(
        '21 historias de usuario · 60 SP completados de 73 SP del Product Backlog\n' +
            'Flujo de demo continuo: login → mapa de calor → reportar → moderar → agrupar → bitácora → cerrar caso → Dashboard filtrado',
        { x: 0.4, y: 3.4, w: 9.2, h: 1.5, fontSize: 12, color: C.dark, fontFace: FB, valign: 'middle' },
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 14 — CONCLUSIONES
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'DARK' });
    footerNum(sl);

    sl.addText('Conclusiones', { x: 0.4, y: 0.3, w: 9.2, h: 0.7, fontSize: 26, bold: true, color: C.white, fontFace: FT });

    const items = [
        ['🏗️', 'La arquitectura en capas del Sprint 1 escaló sin fricción a 4 CRUD y al Dashboard, reutilizando las mismas entidades TypeORM'],
        ['🔒', 'El bloqueo pesimista de fila resuelve la doble aceptación concurrente de un reporte — verificado con un test real, no simulado'],
        ['📊', 'El filtro de fechas del Dashboard se implementó de verdad durante esta revisión, en vez de dejar el documento describiendo algo que no existía'],
        ['✅', '12/12 casos de prueba PASS y 5 criterios Given/When/Then verificados contra datos reales del sistema'],
    ];

    items.forEach(([emoji, txt], i) => {
        const y = 1.1 + i * 1.0;
        sl.addShape('rect', { x: 0.3, y, w: 9.4, h: 0.82, fill: { color: '142A40' }, line: { color: C.orange, pt: 1 } });
        sl.addText(`${emoji}  ${txt}`, { x: 0.45, y: y + 0.04, w: 9.1, h: 0.72, fontSize: 12, color: C.white, fontFace: FB, valign: 'middle' });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 15 — CIERRE
// ═══════════════════════════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoMat(sl);
    footerNum(sl);

    sl.addText('Próxima iteración — Actividad 8', {
        x: 0.5, y: 1.5, w: 9, h: 0.5, align: 'center', color: C.orange, fontSize: 14, bold: true, fontFace: FB,
    });
    sl.addText('Códigos de error tipados (TD-04)\nValidationPipe global (TD-05)\nSuite Playwright para los 12 casos de integración', {
        x: 0.5, y: 2.0, w: 9, h: 1.6, align: 'center', color: C.white, fontSize: 18, fontFace: FT,
    });
    sl.addText('¡Gracias!', { x: 0.5, y: 3.7, w: 9, h: 0.7, align: 'center', color: C.white, fontSize: 32, bold: true, fontFace: FT });
    sl.addText(
        'Repositorio: github.com/jhoel0521/Ojo-Camba  |  Demo: pnpm docker:dev → http://localhost:5174/dashboard',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82, align: 'center', color: 'B0C4DE', fontSize: 9, fontFace: FB },
    );
}

// ── Generar archivo ───────────────────────────────────────────────────────────
const outPath = 'out/Ojo_Camba_Actividad6-7_Slides.pptx';
pptx
    .writeFile({ fileName: outPath })
    .then(() => console.log(`OK — ${outPath} generado (${slideN} diapositivas)`))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    });
