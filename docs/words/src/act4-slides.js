'use strict';
const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9'; // 10 × 5.625 pulgadas

const C = {
    navy:   '0E2841',
    blue:   '156082',
    blue2:  '0E4C96',
    blue3:  '0A3060',
    orange: 'E97132',
    white:  'FFFFFF',
    dark:   '1F1F1F',
    light:  'E8E8E8',
    mid:    'D6E4F0',
};
const FT = 'Aptos Display';
const FB = 'Aptos';

// ── Masters ──────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────
const logoWithMat = (sl) => {
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

// ── Datos 23 HU ──────────────────────────────────────────
const backlogAll = [
    ['CU-01','Visualizar mapa de calor H3 en tiempo real','Ciudadano','5'],
    ['CU-02','Registrar reporte urbano con foto y GPS','Ciudadano','5'],
    ['CU-03','Crear cuenta vinculada a DeviceID','Ciudadano','3'],
    ['CU-04','Consultar bitácora pública del reporte','Ciudadano','3'],
    ['CU-05','Compartir reporte en redes sociales','Ciudadano','2'],
    ['CU-06','Ver bandeja de reportes pendientes','Moderador','3'],
    ['CU-07','Aceptar / rechazar reporte','Moderador','3'],
    ['CU-08','Agrupar reportes en Caso de Obra','Moderador','8'],
    ['CU-09','Banear DeviceID spammer','Moderador','2'],
    ['CU-10','Ver Casos de Obra cercanos (técnico)','Técnico','5'],
    ['CU-11','Agrupar reportes en terreno','Técnico','5'],
    ['CU-12','Registrar bitácora de obra diaria','Técnico','5'],
    ['CU-13','Corregir coordenadas GPS del reporte','Técnico','2'],
    ['CU-14','Cerrar Caso de Obra como Finalizado','Técnico','3'],
    ['CU-15','Consultar estado de microservicios','Auditor','2'],
    ['CU-16 ★','Cerrar sesión de forma segura','Usuario','1'],
    ['CU-17 ★','Consultar perfil y estadísticas','Usuario','2'],
    ['CU-18 ★','Dashboard con métricas clave','Moderador','3'],
    ['CU-19 ★','Gestionar usuarios registrados','Admin','3'],
    ['CU-20 ★','Vincular dispositivo a cuenta','Usuario','2'],
    ['CU-21 ★','Consultar mis reportes con estado','Usuario','2'],
    ['CU-22 ★','Renovar sesión — refresh token 30 días','Usuario','2'],
    ['CU-23 ★','Historial de dispositivos baneados','Admin','2'],
];

// ── Datos Planning Poker 23 CU ────────────────────────────
const pokerAll = [
    ['CU-01','Mapa de calor H3','5','5','5','5','5'],
    ['CU-02','Registrar reporte (foto+GPS+H3)','5','8','5','5','5'],
    ['CU-03','Crear cuenta + DeviceID','3','3','3','3','3'],
    ['CU-04','Consultar bitácora pública','3','3','3','2','3'],
    ['CU-05','Compartir en redes sociales','2','2','2','2','2'],
    ['CU-06','Bandeja reportes pendientes','3','3','3','3','3'],
    ['CU-07','Aceptar / rechazar reporte','3','3','3','3','3'],
    ['CU-08 ✦','Agrupar en Caso de Obra','8','5','8','13','8'],
    ['CU-09','Banear DeviceID por spam','2','2','2','2','2'],
    ['CU-10','Casos cercanos (técnico)','5','5','5','5','5'],
    ['CU-11','Agrupar en terreno','5','5','5','5','5'],
    ['CU-12','Registrar bitácora de obra','5','5','3','5','5'],
    ['CU-13','Corregir coordenadas GPS','2','2','2','2','2'],
    ['CU-14','Cerrar Caso de Obra','3','3','3','3','3'],
    ['CU-15','Status de microservicios','2','2','2','2','2'],
    ['CU-16','Cerrar sesión (logout)','1','1','1','1','1'],
    ['CU-17','Perfil y estadísticas','2','2','2','2','2'],
    ['CU-18','Dashboard de métricas','3','3','3','3','3'],
    ['CU-19','Gestionar usuarios','3','3','3','3','3'],
    ['CU-20','Vincular dispositivo a cuenta','2','2','2','2','2'],
    ['CU-21','Mis reportes con estado','2','2','2','2','2'],
    ['CU-22','Refresh token 30 días','2','2','2','2','2'],
    ['CU-23','Historial dispositivos baneados','2','2','2','2','2'],
];

const pokerHdrs  = ['CU','Historia (resumen)','Jhoel','Jonathan','Gerson','Alexis','SP'];
const pokerCols  = [0.75, 3.5, 0.78, 0.85, 0.78, 0.78, 0.72];
const pokerAlign = ['center','left','center','center','center','center','center'];

const backlogHdrs = ['CU','Historia de Usuario','Actor','SP'];
const backlogCols = [0.85, 5.4, 1.6, 0.55];
const backlogAlign = ['center','left','center','center'];

// ═══════════════════════════════════════════════════════════
// SLIDE 1 — PORTADA
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoWithMat(sl);

    sl.addText('Actividad 4', { x: 0.5, y: 1.45, w: 9, h: 0.45,
        align: 'center', color: C.orange, fontSize: 14, bold: true, fontFace: FB });
    sl.addText('Configuración del Entorno Ágil Scrum\nSprint 0 — Proyecto Integrador Ojo Camba', {
        x: 0.5, y: 1.85, w: 9, h: 1.3,
        align: 'center', color: C.white, fontSize: 30, bold: true, fontFace: FT });
    sl.addText('Sistema Geoespacial de Soporte a la Decisión\npara la Gestión de Problemas Urbanos en Santa Cruz de la Sierra', {
        x: 0.5, y: 3.18, w: 9, h: 0.85,
        align: 'center', color: 'B0C4DE', fontSize: 13, italics: true, fontFace: FB });
    sl.addText(
        'Jhoel Cruz · Jonathan Arrieta · Gerson Alvarado · Alexis Santiváñez\n' +
        'Docente: Ing. Jimmy Nataniel Requena Llorentty  |  Sistemas de Información II  |  Junio 2026',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82,
            align: 'center', color: C.white, fontSize: 11, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 2 — AGENDA
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Agenda');
    const items = [
        ['01','Equipo Scrum — Roles y Responsabilidades'],
        ['02','Product Backlog — 23 Historias de Usuario (1/2 y 2/2)'],
        ['03','Estimación Planning Poker — Fibonacci (1/2 y 2/2)'],
        ['04','Priorización MoSCoW'],
        ['05','Sprint Backlog — Sprint 1 (26 SP)'],
        ['06','Definition of Done — 6 Criterios'],
        ['07','Métricas: Scrum · Calidad · DORA'],
        ['08','Cronograma Gantt por Semana'],
        ['09','Stack Tecnológico · Acta de Constitución'],
        ['10','Conclusiones · Referencias · Cierre'],
    ];
    sl.addText(
        items.map(([n, t]) => [
            { text: `${n}  `, options: { bold: true, color: C.orange } },
            { text: t + '\n' }
        ]).flat(),
        { x: 1.0, y: 1.15, w: 8.2, h: 4.0,
            fontSize: 14, fontFace: FB, color: C.dark, paraSpaceAfter: 3 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 3 — EQUIPO SCRUM
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Equipo Scrum — Roles y Responsabilidades');
    mkTable(sl,
        ['Rol', 'Nombre', 'Responsabilidades Clave'],
        [
            ['Product Owner','Gerson Alvarado Alvarado',  'Dueño del Product Backlog. Prioriza 23 HU. Valida criterios de aceptación. Aprueba Done.'],
            ['Scrum Master', 'Jhoel Alvaro Cruz Zurita',  'Facilita los 5 eventos Scrum. Elimina impedimentos. Mantiene Trello y Burndown Chart.'],
            ['Developer',    'Jonathan River Arrieta Cortez','Implementa ms-admin, ms-register. Participa en code review cruzado.'],
            ['Developer',    'Alexis Santiváñez Parraga', 'Desarrolla frontends React PWA. Pruebas unitarias. Integración MinIO.'],
        ],
        { colW: [1.6, 2.5, 5.3], y: 1.5, rowH: 0.72, size: 11 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 4 — PRODUCT BACKLOG 1/2 (CU-01 a CU-12)
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Product Backlog — 23 HU (1/2): CU-01 a CU-12');
    mkTable(sl, backlogHdrs, backlogAll.slice(0, 12),
        { colW: backlogCols, align: backlogAlign, y: 1.15, rowH: 0.3, size: 10 });
    sl.addText('Total Product Backlog: 23 HU · 73 SP  |  ★ = HU identificadas en código fuente',
        { x: 0.3, y: 5.25, w: 9.4, h: 0.2, fontSize: 8, italics: true, color: '888888', fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 5 — PRODUCT BACKLOG 2/2 (CU-13 a CU-23)
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Product Backlog — 23 HU (2/2): CU-13 a CU-23');
    mkTable(sl, backlogHdrs, backlogAll.slice(12),
        { colW: backlogCols, align: backlogAlign, y: 1.15, rowH: 0.3, size: 10 });
    sl.addText('★ CU-16 a CU-23: funcionalidades identificadas en el código fuente, no documentadas en el portafolio UML previo',
        { x: 0.3, y: 5.25, w: 9.4, h: 0.2, fontSize: 8, italics: true, color: '888888', fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 6 — PLANNING POKER 1/2 (CU-01 a CU-12)
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Planning Poker — Fibonacci (1/2): CU-01 a CU-12');
    mkTable(sl, pokerHdrs, pokerAll.slice(0, 12),
        { colW: pokerCols, align: pokerAlign, y: 1.15, rowH: 0.3, size: 9.5 });
    sl.addText('Escala Fibonacci: 1 · 2 · 3 · 5 · 8 · 13 · 21  |  Herramienta: planningpoker.live',
        { x: 0.3, y: 5.25, w: 9.4, h: 0.2, fontSize: 8, italics: true, color: '888888', fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 7 — PLANNING POKER 2/2 (CU-13 a CU-23)
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Planning Poker — Fibonacci (2/2): CU-13 a CU-23');
    mkTable(sl, pokerHdrs, pokerAll.slice(12),
        { colW: pokerCols, align: pokerAlign, y: 1.15, rowH: 0.3, size: 9.5 });
    sl.addText('✦ CU-08 requirió 2 rondas de votación (rango 5–13). Consenso en 8 SP tras excluir control de concurrencia como tarea técnica separada (TD-01).',
        { x: 0.3, y: 5.25, w: 9.4, h: 0.22, fontSize: 8, italics: true, color: '555555', fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 8 — MoSCoW
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Priorización MoSCoW — 23 HU');
    mkTable(sl,
        ['Nivel', 'Criterio de Priorización', 'Historias Asignadas', 'SP'],
        [
            ['Must Have',   'Sin esto el sistema no puede demostrar su propuesta de valor mínima.',      'CU-01, CU-02, CU-06, CU-07, CU-08, CU-09, CU-14, CU-18', '34'],
            ['Should Have', 'Importantes pero no bloquean el flujo central. Sprint 2 o antes si hay tiempo.','CU-03, CU-04, CU-10, CU-12, CU-16, CU-17, CU-19, CU-20, CU-21, CU-22', '27'],
            ['Could Have',  'Deseables si hay capacidad. Sprint 3 o postergar.',                          'CU-05, CU-11, CU-13, CU-15, CU-23', '12'],
            ["Won't Have",  'Fuera del alcance de este semestre.',                                        'Gamificación completa, integración WhatsApp Business, modelo ML predictivo', '—'],
        ],
        { colW: [1.5, 3.1, 3.6, 0.6], y: 1.5, rowH: 0.72, size: 10 }
    );
    sl.addText('Total: 23 HU · 73 SP  |  Sprint 1 compromete 26 SP (35 %)  |  Sprints 2–3 cubren 47 SP restantes',
        { x: 0.3, y: 5.25, w: 9.4, h: 0.2, fontSize: 9, bold: true, color: C.navy, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 9 — SPRINT BACKLOG
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Sprint Backlog — Sprint 1 · 26 Story Points');
    sl.addText(
        'Sprint Goal: "Lograr que un ciudadano pueda registrar un reporte urbano con foto y ubicación GPS, y que ese reporte aparezca correctamente georreferenciado como un hexágono coloreado en el mapa de calor de Ojo Camba."',
        { x: 0.3, y: 1.1, w: 9.4, h: 0.65,
            fontSize: 10.5, italics: true, color: C.navy, fontFace: FB,
            fill: 'EEF4FB', border: { type: 'solid', pt: 1, color: C.blue } }
    );
    mkTable(sl,
        ['CU', 'Historia de Usuario', 'SP', 'Responsable', 'Estado'],
        [
            ['CU-09','Banear DeviceID spammer',           '2','Alexis Santiváñez','To Do'],
            ['CU-07','Aceptar / rechazar reporte',        '3','Jonathan Arrieta', 'To Do'],
            ['CU-06','Bandeja de reportes pendientes',    '3','Jonathan Arrieta', 'To Do'],
            ['CU-02','Registrar reporte (foto+GPS+H3)',   '5','Jhoel Cruz',        'To Do'],
            ['CU-01','Visualizar mapa de calor H3',       '5','Alexis Santiváñez','To Do'],
            ['CU-08','Agrupar reportes en Caso de Obra', '8','Gerson Alvarado',   'To Do'],
            ['','TOTAL','26','',''],
        ],
        { colW: [0.7, 3.8, 0.55, 2.3, 1.35], y: 1.82, size: 10 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 10 — DEFINITION OF DONE
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Definition of Done — 6 Criterios Verificables');
    mkTable(sl,
        ['N°', 'Criterio de Terminado', 'Cómo se verifica'],
        [
            ['1','Código versionado en GitHub; rama feature/CU-XX fusionada a main mediante PR aprobado','Enlace al PR en tarjeta Trello'],
            ['2','Pruebas unitarias básicas escritas y pasando para toda lógica nueva','Badge CI verde en el PR'],
            ['3','Código revisado y aprobado por al menos un compañero antes de fusionar','Aprobación visible en el PR de GitHub'],
            ['4','Funcionalidad demostrada en vivo al Product Owner antes de mover a Done','Checkbox marcado por el PO en Sprint Review'],
            ['5','Sin errores de linter; build de producción exitoso (eslint + build)','GitHub Actions pipeline en verde'],
            ['6','Documentación mínima actualizada (README o comentario en Trello)','Enlace a documentación modificada'],
        ],
        { colW: [0.4, 5.6, 3.4], y: 1.15, rowH: 0.62, size: 10 }
    );
    sl.addText('"El casi terminado no cuenta para la velocidad del Sprint."',
        { x: 0.3, y: 5.22, w: 9.4, h: 0.22, fontSize: 9.5, italics: true, bold: true, color: C.orange, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 11 — MÉTRICAS
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Métricas del Proyecto — 3 Capas');

    const block = (label, color, items, x) => {
        sl.addShape('rect', { x, y: 1.15, w: 3.0, h: 0.38, fill: { color }, line: { color } });
        sl.addText(label, { x, y: 1.15, w: 3.0, h: 0.38,
            align: 'center', color: C.white, fontSize: 11, bold: true, fontFace: FT });
        sl.addText(items.map(i => '• ' + i).join('\n'), {
            x, y: 1.57, w: 3.0, h: 3.65, fontSize: 9.5, fontFace: FB, color: C.dark,
            valign: 'top', fill: 'F5F8FD', border: { type: 'solid', pt: 0.5, color: 'CCCCCC' } });
    };

    block('Scrum (Proceso)', C.blue, [
        'Velocidad: SP entregados / sprint',
        'Sprint Goal success rate → 100 %',
        'Burndown chart → actualización diaria',
        'WIP limit → máx. 2 tarjetas / persona',
        'Tasa DoD rechazo: S1 <20%, S2 <15%',
    ], 0.3);

    block('Calidad del Sistema', C.blue2, [
        'Uptime microservicios ≥ 99 %',
        'Precisión H3: 100 % (100 coords)',
        'Respuesta /heatmap < 3 s',
        'ACID: 0 inconsistencias (10 tx)',
        'Cobertura E2E Playwright ≥ 80 %',
    ], 3.5);

    block('DORA (Ingeniería)', C.blue3, [
        'Deployment Frequency ≥ 1/semana',
        'Lead Time for Changes < 24 h',
        'Change Failure Rate < 15 %',
        'MTTR < 1 hora',
    ], 6.7);
}

// ═══════════════════════════════════════════════════════════
// SLIDE 12 — GANTT
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Cronograma Gantt — 3 Sprints × 2 Semanas = 6 Semanas');

    const COL_L = 2.9;
    const COL_W = 1.08;
    const sprintColors = [C.blue, C.blue, C.blue2, C.blue2, C.blue3, C.blue3];

    const ganttActivities = [
        { label: 'Sprint 0 — Configuración Scrum',        weeks: [1,0,0,0,0,0] },
        { label: 'Infraestructura Docker + MinIO + DB',    weeks: [1,0,0,0,0,0] },
        { label: 'ms-auth + ms-register (H3 índices)',     weeks: [1,1,0,0,0,0] },
        { label: 'App Reporte PWA + Mapa de Calor H3',     weeks: [1,1,0,0,0,0] },
        { label: 'ms-admin (moderación / Casos de Obra)',  weeks: [0,0,1,1,0,0] },
        { label: 'App BackOffice (moderador)',             weeks: [0,0,1,1,0,0] },
        { label: 'App Técnicos en Campo',                  weeks: [0,0,0,0,1,1] },
        { label: 'Dashboard DSS + Score Prioridad',        weeks: [0,0,0,0,1,1] },
        { label: 'QA: H3 + ACID + E2E Playwright',         weeks: [0,0,0,0,1,1] },
        { label: 'Sprint Reviews / Retrospectivas',        weeks: [0,1,0,1,0,1] },
        { label: 'MVP Demo Final',                         weeks: [0,0,0,0,0,1] },
    ];

    const sprintRow = [
        { text: 'Actividad / Entregable', options: { bold: true, color: C.white, fill: C.navy, fontSize: 10, fontFace: FB, align: 'center', valign: 'middle' } },
        { text: 'Sprint 1', options: { bold: true, color: C.white, fill: C.blue,  fontSize: 10, fontFace: FB, align: 'center', valign: 'middle' } },
        { text: '',         options: { fill: C.blue  } },
        { text: 'Sprint 2', options: { bold: true, color: C.white, fill: C.blue2, fontSize: 10, fontFace: FB, align: 'center', valign: 'middle' } },
        { text: '',         options: { fill: C.blue2 } },
        { text: 'Sprint 3 — MVP', options: { bold: true, color: C.white, fill: C.blue3, fontSize: 10, fontFace: FB, align: 'center', valign: 'middle' } },
        { text: '',         options: { fill: C.blue3 } },
    ];

    const weekRow = [
        { text: 'Semana →', options: { bold: true, color: C.white, fill: C.navy, fontSize: 9.5, fontFace: FB, align: 'center', valign: 'middle' } },
        ...['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'].map((s, i) => ({
            text: s, options: { bold: true, color: C.white, fill: sprintColors[i], fontSize: 9.5, fontFace: FB, align: 'center', valign: 'middle' }
        }))
    ];

    const dataRows = ganttActivities.map(({ label, weeks }) => [
        { text: label, options: { fontSize: 9, fontFace: FB, color: C.dark, valign: 'middle' } },
        ...weeks.map((on, wi) => ({
            text: on ? '█' : '',
            options: { fill: on ? sprintColors[wi] : C.light, color: on ? sprintColors[wi] : C.light, align: 'center', fontSize: 10 }
        }))
    ]);

    sl.addTable([sprintRow, weekRow, ...dataRows], {
        x: 0.28, y: 1.15, w: 9.43,
        colW: [COL_L, COL_W, COL_W, COL_W, COL_W, COL_W, COL_W],
        border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
        rowH: 0.33,
    });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 13 — STACK TECNOLÓGICO
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Stack Tecnológico por Capa');
    mkTable(sl,
        ['Capa', 'Tecnología y Justificación'],
        [
            ['Frontend',      'React (PWA) — apps de Reporte, BackOffice, Técnicos y Status. Instalable sin tienda en Android/iOS.'],
            ['Backend',       'NestJS — microservicios ms-auth, ms-register, ms-admin, ms-gamify, ms-status. Comunicación interna TCP.'],
            ['Base de datos', 'PostgreSQL 16 con PostGIS (geometría espacial) y h3-pg (indexación H3 nativa en SQL).'],
            ['Almacenamiento','MinIO (API S3-compatible) — fotografías de reportes con URLs firmadas sin exponer el almacenamiento.'],
            ['Infraestructura','Cluster Docker en servidor cloud. API Gateways NestJS como única entrada HTTP pública.'],
            ['CI/CD',         'GitHub Actions — linting, pruebas unitarias y build en cada Pull Request a la rama main.'],
            ['Gestión Scrum', 'Trello (7 columnas) + planningpoker.live para estimación colaborativa remota.'],
        ],
        { colW: [1.8, 7.6], y: 1.3, rowH: 0.55, size: 10 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 14 — ACTA DE CONSTITUCIÓN
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Acta de Constitución del Proyecto');
    mkTable(sl,
        ['Sprint', 'Duración', 'Sprint Goal', 'Entregable Principal'],
        [
            ['Sprint 1','2 sem.','Ciudadano registra reporte con foto y GPS visible como hexágono en mapa de calor.','ms-register + App Reporte + Mapa H3'],
            ['Sprint 2','2 sem.','Moderador valida, acepta y agrupa reportes en Casos de Obra.','ms-admin + App BackOffice + notificaciones'],
            ['Sprint 3','2 sem.','Técnico cierra Caso de Obra; Dashboard DSS muestra Score de Prioridad.','App Técnicos + Score h3-pg + Dashboard'],
        ],
        { colW: [0.85, 0.85, 3.9, 3.8], y: 1.15, rowH: 0.75, size: 10 }
    );
    sl.addText('Usuarios objetivo: Ciudadanos · Moderadores · Técnicos de campo · Autoridades municipales · Auditores externos', {
        x: 0.3, y: 3.48, w: 9.4, h: 0.32, fontSize: 10, bold: true, color: C.navy, fontFace: FB });
    sl.addText(
        'Problema: Santa Cruz genera denuncias ciudadanas dispersas en redes sociales sin geolocalización precisa ni trazabilidad.\n' +
        'Solución: Ojo Camba sistematiza reportes con índice H3 de Uber, creando un DSS para gestión municipal transparente.',
        { x: 0.3, y: 3.84, w: 9.4, h: 0.8, fontSize: 10, fontFace: FB, color: C.dark,
            fill: 'F0F4FA', border: { type: 'solid', pt: 0.5, color: 'CCCCCC' } });
    mkTable(sl,
        ['Rol', 'Nombre', 'Firma'],
        [
            ['Product Owner','Gerson Alvarado Alvarado','_______________________'],
            ['Scrum Master', 'Jhoel Alvaro Cruz Zurita','_______________________'],
            ['Developer',    'Jonathan River Arrieta Cortez','_______________________'],
            ['Developer',    'Alexis Santiváñez Parraga','_______________________'],
        ],
        { colW: [1.5, 3.6, 4.3], y: 4.7, rowH: 0.25, size: 8 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 15 — CONCLUSIONES
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Conclusiones');
    sl.addText([
        { text: '01  ', options: { bold: true, color: C.orange } },
        { text: 'El Product Backlog de 23 HU (15 del portafolio UML + 8 del código fuente) supera el umbral de 20+ HU de la rúbrica y garantiza cobertura completa del sistema.\n\n' },
        { text: '02  ', options: { bold: true, color: C.orange } },
        { text: 'El Planning Poker sobre las 23 HU reveló supuestos técnicos implícitos (CU-02 integración MinIO, CU-08 control de concurrencia) que, de no explicitarse, habrían generado retrasos en el Sprint 1.\n\n' },
        { text: '03  ', options: { bold: true, color: C.orange } },
        { text: 'El marco de 3 capas de métricas (Scrum + Calidad + DORA) permite al equipo inspeccionar y adaptar proceso, calidad de software y eficiencia de entrega en cada Retrospectiva.\n\n' },
        { text: '04  ', options: { bold: true, color: C.orange } },
        { text: 'Alineación con ODS 8 (Trabajo decente), ODS 9 (Innovación e infraestructura) y ODS 17 (Alianzas multisectoriales: GAM + juntas vecinales + Civic Tech).' },
    ], { x: 0.8, y: 1.15, w: 8.8, h: 4.0, fontSize: 13, fontFace: FB, color: C.dark, paraSpaceAfter: 4 });
}

// ═══════════════════════════════════════════════════════════
// SLIDE 16 — REFERENCIAS
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'CONTENT' });
    addTitle(sl, 'Referencias — APA 7ª Edición');
    const refs = [
        'Cohn, M. (2005). Agile estimating and planning. Prentice Hall.',
        'Forsgren, N., Humble, J., & Kim, G. (2018). Accelerate: The science of lean software and DevOps. IT Revolution Press.',
        'Naciones Unidas. (2015). Transformar nuestro mundo: la Agenda 2030 para el Desarrollo Sostenible. https://sdgs.un.org/2030agenda',
        'Open Government Partnership (OGP). (2023). Civic technology and open government: A global review. OGP Secretariat. https://www.opengovpartnership.org/',
        'Popa, C. (2017). Adoption of MoSCoW prioritisation in practice. Journal of Information Technology & Software Engineering, 7(3), 195–203. https://doi.org/10.4172/2165-7866.1000195',
        'Schwaber, K., & Sutherland, J. (2020). La guía de Scrum: La guía definitiva de Scrum — Las reglas del juego. Scrum.org. https://scrumguides.org/',
        'Uber Engineering. (2018). H3: Uber\'s hexagonal hierarchical spatial index. Uber Technologies. https://www.uber.com/blog/h3/',
    ];
    sl.addText(
        refs.map((r, i) => [
            { text: `${i + 1}.  `, options: { bold: true, color: C.navy } },
            { text: r + '\n\n' }
        ]).flat(),
        { x: 0.5, y: 1.15, w: 9.1, h: 4.1, fontSize: 10.5, fontFace: FB, color: C.dark,
            paraSpaceAfter: 2, indent: 30 }
    );
}

// ═══════════════════════════════════════════════════════════
// SLIDE 17 — CIERRE
// ═══════════════════════════════════════════════════════════
{
    const sl = pptx.addSlide({ masterName: 'COVER' });
    logoWithMat(sl);

    sl.addText('¡Gracias!', { x: 0.5, y: 1.75, w: 9, h: 1.1,
        align: 'center', color: C.white, fontSize: 54, bold: true, fontFace: FT });
    sl.addText('¿Preguntas?', { x: 0.5, y: 2.8, w: 9, h: 0.6,
        align: 'center', color: C.orange, fontSize: 22, fontFace: FB });
    sl.addText('Repositorio: github.com/jhoel0521/Ojo-Camba', {
        x: 0.3, y: 3.7, w: 9.4, h: 0.45,
        align: 'center', color: 'B0C4DE', fontSize: 12, fontFace: FB });
    sl.addText(
        'Jhoel Cruz · Jonathan Arrieta · Gerson Alvarado · Alexis Santiváñez\n' +
        'Docente: Ing. Jimmy Nataniel Requena Llorentty  |  Junio 2026',
        { x: 0.3, y: 4.77, w: 9.4, h: 0.82,
            align: 'center', color: C.white, fontSize: 11, fontFace: FB });
}

// ═══════════════════════════════════════════════════════════
// GENERAR ARCHIVO
// ═══════════════════════════════════════════════════════════
pptx.writeFile({ fileName: 'out/Ojo_Camba_Actividad4_Slides.pptx' })
    .then(() => console.log('OK — out/Ojo_Camba_Actividad4_Slides.pptx generado (17 slides)'))
    .catch(e => console.error('ERROR:', e));
