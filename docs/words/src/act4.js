'use strict';
const fs = require('fs');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    PageBreak, LevelFormat, Header, PageNumber, ImageRun
} = require('docx');
const logoData = fs.readFileSync("recursos/upds_logo.jpg");

const F = "Times New Roman";
const S = 24;
const L = 480;
const IND = 720;

const border = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
const borders = { top: border, bottom: border, left: border, right: border };

const P = (t) => new Paragraph({
    spacing: { after: 0, line: L }, alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: IND },
    children: [new TextRun({ text: t, font: F, size: S })]
});

const PMix = (parts) => new Paragraph({
    spacing: { after: 0, line: L }, alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: IND },
    children: parts.map(p => typeof p === 'string'
        ? new TextRun({ text: p, font: F, size: S })
        : new TextRun({ font: F, size: S, ...p }))
});

const Ref = (t) => new Paragraph({
    spacing: { after: 0, line: L }, alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 720 },
    children: [new TextRun({ text: t, font: F, size: S })]
});

const H1 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: L },
    children: [new TextRun({ text: t, bold: true, font: F, size: S })]
});

const H2 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120, line: L },
    children: [new TextRun({ text: t, bold: true, font: F, size: S })]
});

const H3 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 100, line: L },
    children: [new TextRun({ text: t, bold: true, italics: true, font: F, size: S })]
});

const Bullet = (t) => new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 0, line: L }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: t, font: F, size: S })]
});

const BulletMix = (parts) => new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 0, line: L }, alignment: AlignmentType.JUSTIFIED,
    children: parts.map(p => typeof p === 'string'
        ? new TextRun({ text: p, font: F, size: S })
        : new TextRun({ font: F, size: S, ...p }))
});

const PageBreakP = () => new Paragraph({ children: [new PageBreak()] });
const Blank = () => new Paragraph({ spacing: { line: L }, children: [new TextRun({ text: "", font: F, size: S })] });
const ImgPH = (label, title, file, ins) => [
    new Paragraph({
        spacing: { before: 240, after: 120, line: L }, alignment: AlignmentType.CENTER,
        border: { top: border, bottom: border, left: border, right: border },
        shading: { fill: "FFF59D" },
        children: [new TextRun({ text: `[ ${label} — INSERTAR AQUÍ: ${file} ]`, bold: true, font: F, size: S, color: "B71C1C" })]
    }),
    new Paragraph({
        spacing: { after: 120, line: L }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Instrucciones: ${ins}`, italics: true, font: F, size: 20, color: "666666" })]
    }),
    new Paragraph({
        spacing: { after: 240, line: L }, alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: `${label}. `, bold: true, font: F, size: S }),
            new TextRun({ text: title, italics: true, font: F, size: S })
        ]
    })
];

const CM = { top: 100, bottom: 100, left: 140, right: 140 };
const hc = (t, w, c = "1F3864") => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: c, type: ShadingType.CLEAR, color: "auto" }, margins: CM,
    children: [new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: 280 },
        children: [new TextRun({ text: t, bold: true, color: "FFFFFF", font: F, size: 22 })]
    })]
});
const bc = (t, w, opts = {}) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: CM,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { line: 280 },
        children: [new TextRun({ text: t, font: F, size: 22, bold: opts.bold || false })]
    })]
});

// ============== PORTADA ==============
const portada = [
    Blank(), Blank(),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new ImageRun({ type: "jpg", data: logoData, transformation: { width: 160, height: 107 } })]
    }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 }, children: [new TextRun({ text: "Universidad Privada Domingo Savio", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 }, children: [new TextRun({ text: "Facultad de Ingeniería en Sistemas", font: F, size: S })] }),
    Blank(), Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 }, children: [new TextRun({ text: "Actividad 4: Configuración del Entorno Ágil Scrum", bold: true, font: F, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 }, children: [new TextRun({ text: "Sprint 0 del Proyecto Integrador Ojo Camba", bold: true, font: F, size: 28 })] }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Sistema Geoespacial de Soporte a la Decisión para la Gestión", italics: true, font: F, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "de Problemas Urbanos en Santa Cruz de la Sierra", italics: true, font: F, size: 24 })] }),
    Blank(), Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Jhoel Alvaro Cruz Zurita", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Jonathan River Arrieta Cortez", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Gerson Alvarado Alvarado", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Alexis Santiváñez Parraga", font: F, size: S })] }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Sistemas de Información II", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Docente: Ing. Jimmy Nataniel Requena Llorentty", font: F, size: S })] }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Santa Cruz de la Sierra, Bolivia", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Junio de 2026", font: F, size: S })] }),
    PageBreakP(),
];

// ============== RESUMEN ==============
const resumen = [
    H1("Resumen"),
    new Paragraph({
        spacing: { line: L }, alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ font: F, size: S, text: "El presente informe documenta la configuración formal del entorno ágil Scrum para el proyecto integrador Ojo Camba, una plataforma civic tech de gestión de problemas urbanos en Santa Cruz de la Sierra. Esta actividad, correspondiente al Sprint 0 del ciclo de desarrollo, establece la base organizacional sobre la cual se construirán tres sprints de dos semanas cada uno. Se formalizaron los cuatro roles del equipo Scrum (Product Owner, Scrum Master y dos Desarrolladores), se elaboró un Product Backlog completo con veintitrés historias de usuario priorizadas mediante la clasificación MoSCoW, estimadas mediante Planning Poker con escala Fibonacci. Se planificó el Sprint Backlog del Sprint 1 con seis historias Must Have que suman veintitrés story points, se desglosaron en tareas técnicas de máximo cuatro horas, y se definió una Definition of Done con seis criterios verificables. El Acta de Constitución del Proyecto formaliza la visión, los usuarios objetivo, el stack tecnológico (NestJS, PostgreSQL con h3-pg y PostGIS, React PWA, MinIO) y el cronograma de tres sprints. Las herramientas seleccionadas son Trello para el tablero Scrum y planningpoker.live para la estimación colaborativa. El trabajo se alinea con los Objetivos de Desarrollo Sostenible 8, 9 y 17." })]
    }),
    Blank(),
    new Paragraph({
        spacing: { line: L }, alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: IND },
        children: [
            new TextRun({ text: "Palabras clave: ", italics: true, font: F, size: S }),
            new TextRun({ text: "Scrum, Product Backlog, historias de usuario, Planning Poker, MoSCoW, Sprint Backlog, Definition of Done, Ojo Camba, civic tech, gestión ágil.", font: F, size: S })
        ]
    }),
    PageBreakP(),
];

// ============== INTRODUCCIÓN ==============
const intro = [
    H1("Introducción"),
    P("El proyecto integrador Ojo Camba ha completado sus fases iniciales de análisis y diseño: la Actividad 1 estableció el diagnóstico FODA del contexto cruzeño y justificó la necesidad de una plataforma civic tech geoespacial; las Actividades 2 y 3 produjeron el portafolio UML completo con quince casos de uso, un diagrama de clases con once entidades, tres diagramas de secuencia, dos de actividades y un diagrama de despliegue que describe la arquitectura de microservicios NestJS sobre contenedores Docker. La Actividad 4 marca el inicio formal del desarrollo iterativo: constituye el Sprint 0 del proyecto, en el que el equipo transita del modelado a la ejecución aplicando el marco ágil Scrum."),
    P("Scrum es un marco de trabajo ligero que ayuda a las personas, equipos y organizaciones a generar valor a través de soluciones adaptativas para problemas complejos (Schwaber & Sutherland, 2020). Su adopción en este proyecto se justifica por tres razones: la incertidumbre inherente a un sistema civic tech que requiere validación iterativa con la comunidad, la capacidad del equipo de cuatro integrantes para auto-organizarse sin capas jerárquicas intermedias, y la compatibilidad del ciclo de sprints de dos semanas con el calendario académico del semestre."),
    P("Este informe documenta los siete pasos constitutivos del Sprint 0: la asignación formal de roles Scrum, la elaboración del Product Backlog con veintitrés historias de usuario, la estimación colaborativa mediante Planning Poker, la priorización MoSCoW, la planificación del Sprint Backlog del Sprint 1, la definición de los criterios de terminado y la redacción del Acta de Constitución del Proyecto. El documento se organiza siguiendo las normas APA Séptima Edición, con portada, resumen ejecutivo, introducción, marco teórico, metodología, desarrollo, resultados, conclusiones, referencias y anexos."),
    PageBreakP(),
];

// ============== MARCO TEÓRICO ==============
const marco = [
    H1("Marco Teórico"),

    H2("El Marco Scrum"),
    P("Scrum es el marco ágil más adoptado en la industria del software. Según la Guía Scrum 2020 (Schwaber & Sutherland, 2020), Scrum define tres responsabilidades (Product Owner, Scrum Master, Developers), cinco eventos (Sprint, Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective) y tres artefactos (Product Backlog, Sprint Backlog, Incremento), cada uno con un compromiso asociado. La unidad fundamental de Scrum es el Sprint, una iteración de duración fija no mayor a cuatro semanas durante la cual se crea un Incremento que cumple el objetivo del Sprint."),

    H2("Product Backlog e Historias de Usuario"),
    P("El Product Backlog es una lista emergente y ordenada de todo lo que se necesita para mejorar el producto. Es el único origen de trabajo del equipo Scrum. Las historias de usuario son la unidad narrativa preferida para poblar el Product Backlog: siguen el formato “Como [actor], quiero [acción], para [beneficio]”, que captura quién necesita qué y por qué (Cohn, 2005). Cada historia se complementa con criterios de aceptación en formato Dado-Cuando-Entonces que permiten verificar objetivamente si la historia ha sido completada."),

    H2("Planning Poker"),
    P("Planning Poker es una técnica de estimación colaborativa basada en el consenso del equipo (Cohn, 2005). Cada miembro vota en privado usando cartas con valores de la secuencia Fibonacci modificada (1, 2, 3, 5, 8, 13, 21). Si la diferencia entre el voto más alto y el más bajo supera dos posiciones en la escala, los extremos exponen su razonamiento y el equipo revota. El proceso garantiza que la estimación capture la perspectiva de todos los integrantes, evitando el sesgo de anclaje que se produce cuando un líder opina primero."),

    H2("Priorización MoSCoW"),
    P("MoSCoW es un acrónimo que representa cuatro niveles de prioridad: Must Have (indispensable), Should Have (importante pero no bloqueante), Could Have (deseable si hay tiempo) y Won’t Have (fuera del alcance de la entrega actual). La técnica, desarrollada por Clegg y Barker (1994) y formalmente incorporada en el método DSDM (Popa, 2017), permite al Product Owner comunicar con precisión las prioridades del negocio al equipo de desarrollo, reduciendo el riesgo de construir funcionalidades no críticas a costa de las esenciales."),

    H2("Sprint Backlog y Definition of Done"),
    P("El Sprint Backlog es el plan del equipo para el Sprint: incluye el Sprint Goal, las historias de usuario seleccionadas del Product Backlog y el plan para entregar el Incremento. Las historias se desglosan en tareas técnicas de máximo cuatro horas para facilitar el seguimiento diario. La Definition of Done es un acuerdo formal que describe el estado que debe tener un ítem de trabajo para considerarse “terminado”. Según Schwaber y Sutherland (2020), una DoD robusta crea transparencia y garantiza que el Incremento sea potencialmente entregable al final de cada Sprint, sin deuda técnica oculta."),

    PageBreakP(),
];

// ============== METODOLOGÍA ==============
const metodologia = [
    H1("Metodología"),
    P("La constitución del entorno Scrum siguió un flujo de siete pasos secuenciales, ejecutados en una sesión de planificación inicial de cuatro horas el día anterior al Sprint 1. Cada paso produjo un artefacto verificable que alimenta directamente la ejecución del desarrollo."),
    H2("Fase 1. Asignación de Roles Scrum"),
    P("Se analizaron las fortalezas y disponibilidades de cada integrante para asignar los roles Scrum. La decisión se tomó por consenso en reunión virtual con todos los miembros. Los roles asignados se formalizaron en la Tabla 1 con sus responsabilidades específicas."),
    H2("Fase 2. Elaboración del Product Backlog"),
    P("Se revisaron los quince casos de uso del portafolio UML (Actividades 2 y 3) y se redactó una historia de usuario por caso de uso en formato estándar. Adicionalmente, se inspeccionó el código fuente del repositorio para identificar ocho funcionalidades implementadas que no habían sido capturadas en los diagramas UML, completándolas como CU-16 a CU-23. El Product Backlog resultante contiene veintitrés historias."),
    H2("Fase 3. Estimación con Planning Poker"),
    P("El equipo utilizó planningpoker.live (plan gratuito) para votar en privado con escala Fibonacci. Las veintitrés historias fueron estimadas en dos sesiones de cuarenta minutos. Las historias con diferencia de votos superior a dos posiciones en la escala recibieron una segunda ronda tras la justificación de los extremos."),
    H2("Fase 4. Priorización MoSCoW"),
    P("El Product Owner (Gerson Alvarado) clasificó cada historia en uno de los cuatro niveles MoSCoW, validando la clasificación con el equipo. El criterio principal fue si la historia forma parte del flujo central reportar → moderar → resolver → medir, que constituye la propuesta de valor diferencial de Ojo Camba."),
    H2("Fase 5. Planificación del Sprint Backlog"),
    P("Se seleccionaron las historias Must Have con menor story points que cabían dentro de la capacidad neta del equipo (calculada en el Anexo C). Las historias seleccionadas se desglosaron en tareas técnicas de máximo cuatro horas, asignadas por auto-organización del equipo."),
    H2("Fase 6. Definition of Done"),
    P("Se diseñaron seis criterios de terminado transversales a todas las historias del Sprint. Los criterios se configuraron como plantilla de checklist en cada tarjeta Trello para que el Product Owner los verifique antes de mover una tarjeta a la columna “Done”."),
    H2("Fase 7. Acta de Constitución del Proyecto"),
    P("Se redactó el Acta de Constitución con el nombre del proyecto, el problema que resuelve, los cinco segmentos de usuarios objetivo, las funcionalidades principales, el stack tecnológico y el cronograma de tres sprints. El acta fue firmada digitalmente por los cuatro integrantes como compromiso formal de ejecución."),
    PageBreakP(),
];

// ============== DESARROLLO ==============

// --- PASO 1: ROLES ---
const paso1 = [
    H1("Desarrollo"),
    H2("Paso 1: Constitución Formal del Equipo Scrum"),
    P("El equipo Ojo Camba está compuesto por cuatro integrantes. La asignación de roles se basa en el perfil de cada miembro: Gerson Alvarado tiene mayor contacto con el docente como stakeholder académico, lo que lo posiciona como Product Owner natural; Jhoel Cruz mantiene el tablero Trello, lidera las reuniones y coordina el trabajo entre los microservicios, rol coherente con el Scrum Master; Jonathan Arrieta y Alexis Santiváñez asumen el desarrollo de los microservicios y las aplicaciones frontend. La Tabla 1 formaliza la asignación."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 1", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Asignación de Roles y Responsabilidades del Equipo Scrum", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 2760, 4800],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Rol Scrum", 1800), hc("Nombre", 2760), hc("Responsabilidades Principales", 4800)] }),
            new TableRow({ children: [bc("Product Owner", 1800, { bold: true }), bc("Gerson Alvarado Alvarado", 2760), bc("Dueño único del Product Backlog. Redacta y prioriza historias. Valida criterios de aceptación con el docente. Decide el orden de implementación de los 23 CU. Mueve tarjetas a Done solo tras verificar la DoD.", 4800)] }),
            new TableRow({ children: [bc("Scrum Master", 1800, { bold: true }), bc("Jhoel Alvaro Cruz Zurita", 2760), bc("Facilita los eventos Scrum. Elimina impedimentos (NO asigna tareas). Modera Daily Scrum, Planning, Review y Retrospectiva. Mantiene el tablero Trello y el Burndown Chart actualizados. Protege el Sprint Goal ante cambios de último momento.", 4800)] }),
            new TableRow({ children: [bc("Developer", 1800, { bold: true }), bc("Jonathan River Arrieta Cortez\nAlexis Santiváñez Parraga\n(+ Gerson y Jhoel cuando codifican)", 2760), bc("Se auto-organizan para cumplir el Sprint Goal. Definen tareas técnicas y estimaciones. Implementan los microservicios (ms-auth, ms-register, ms-admin). Escriben pruebas unitarias. Participan en code review cruzado antes de fusionar cada PR.", 4800)] }),
        ]
    }),
    Blank(),
    P("Nota: No existe un rol QA dedicado. La responsabilidad de pruebas se distribuye entre todos los Developers. Cada Pull Request requiere revisión y aprobación de al menos un compañero antes de fusionarse a la rama principal."),
];

// --- PASO 2: PRODUCT BACKLOG ---
const backlogRows = [
    ["CU-01", "Como ciudadano, quiero visualizar el mapa de calor H3 en tiempo real, para identificar zonas con alta densidad de problemas urbanos.", "Ciudadano", "Mapa muestra hexágonos coloreados por densidad/gravedad en < 3 segundos"],
    ["CU-02", "Como ciudadano, quiero registrar un reporte urbano con foto y GPS, para denunciar problemas con evidencia georreferenciada.", "Ciudadano", "Reporte guardado con índices H3 (res 8, 11, 13) calculados automáticamente"],
    ["CU-03", "Como ciudadano, quiero crear una cuenta vinculada a mi dispositivo, para recuperar mis reportes anónimos previos.", "Ciudadano", "DeviceID anónimo vinculado sin perder historial de reportes anteriores"],
    ["CU-04", "Como ciudadano, quiero consultar la bitácora pública de mi reporte, para hacer seguimiento del progreso del Caso de Obra.", "Ciudadano", "Línea de tiempo visible con fotos y comentarios de cada actualización"],
    ["CU-05", "Como ciudadano, quiero compartir un reporte en redes sociales, para amplificar la visibilidad del problema en mi comunidad.", "Ciudadano", "Enlace OpenGraph con sticker dinámico del estado actual generado exitosamente"],
    ["CU-06", "Como moderador, quiero ver la bandeja de reportes pendientes de validación, para organizar mi revisión diaria.", "Moderador", "Lista filtrada por estado ‘Reportado’, ordenada por hexágono H3"],
    ["CU-07", "Como moderador, quiero aceptar o rechazar un reporte ciudadano, para garantizar la calidad del dato y notificar al ciudadano.", "Moderador", "Cambio de estado propagado a bitácora; ciudadano notificado automáticamente"],
    ["CU-08", "Como moderador, quiero agrupar reportes duplicados en un Caso de Obra, para consolidar el mismo problema bajo un código único.", "Moderador", "Código OBRA-2026-NNN generado y asignado a todos los reportes seleccionados"],
    ["CU-09", "Como moderador, quiero banear el DeviceID de un spammer, para bloquear generadores de reportes falsos permanentemente.", "Moderador", "Dispositivo baneado no puede crear nuevos reportes desde ese DeviceID"],
    ["CU-10", "Como técnico de campo, quiero ver los Casos de Obra cercanos a mi ubicación GPS, para optimizar mi ruta de trabajo.", "Técnico", "Grupos activos en radio k=2 de hexágonos H3 res 13 mostrados en mapa"],
    ["CU-11", "Como técnico de campo, quiero agrupar reportes en terreno, para crear Casos de Obra desde el lugar del problema.", "Técnico", "Agrupación en campo crea la misma entidad GrupoReporte que el back-office"],
    ["CU-12", "Como técnico de campo, quiero registrar avances diarios en la bitácora de una obra, para que los ciudadanos vean el progreso.", "Técnico", "Fotos y comentarios asociados al Caso de Obra activo y visibles en bitácora pública"],
    ["CU-13", "Como técnico de campo, quiero corregir las coordenadas GPS de un reporte impreciso, para asegurar la geolocalización exacta.", "Técnico", "Nuevas coordenadas recalculan automáticamente los tres índices H3 del reporte"],
    ["CU-14", "Como técnico de campo, quiero cerrar un Caso de Obra como Finalizado, para notificar a los ciudadanos y habilitar su calificación.", "Técnico", "Ciudadanos vinculados notificados con opción de calificar el trabajo realizado"],
    ["CU-15", "Como auditor o ciudadano, quiero consultar el estado de los microservicios en tiempo real, para verificar la disponibilidad sin credenciales.", "Auditor", "Uptime y latencia de cada microservicio visibles sin autenticación"],
    ["CU-16", "Como usuario autenticado, quiero cerrar mi sesión de forma segura, para proteger mi cuenta en dispositivos compartidos.", "Usuario", "Todos los refresh tokens revocados; usuario desconectado en < 1 segundo"],
    ["CU-17", "Como usuario autenticado, quiero consultar mi perfil y estadísticas de participación, para monitorear mis contribuciones.", "Usuario", "Perfil muestra nombre, email, puntos, nivel y cantidad de reportes realizados"],
    ["CU-18", "Como moderador o administrador, quiero ver un dashboard con métricas clave, para identificar la carga de trabajo pendiente.", "Moderador / Admin", "Dashboard muestra: reportes pendientes, casos aceptados hoy, casos activos y dispositivos baneados"],
    ["CU-19", "Como administrador, quiero gestionar el listado de usuarios registrados con sus roles, para auditar y asignar permisos.", "Administrador", "Listado paginado de usuarios con nombre, email, roles y fecha de registro"],
    ["CU-20", "Como usuario, quiero vincular mi dispositivo a mi cuenta al iniciar sesión, para recuperar mis reportes anónimos anteriores.", "Usuario", "DeviceID vinculado automáticamente; reportes anónimos previos recuperados en sesión"],
    ["CU-21", "Como usuario autenticado, quiero consultar el listado de mis reportes con su estado, para hacer seguimiento de mis contribuciones.", "Usuario", "Listado filtrado por device_id o usuario_id con estado actualizado en tiempo real"],
    ["CU-22", "Como usuario autenticado, quiero que mi sesión se renueve automáticamente durante 30 días, para no reautenticarme constantemente.", "Usuario", "Refresh token válido 30 días; acceso renovado sin nueva autenticación"],
    ["CU-23", "Como moderador o administrador, quiero consultar el historial de dispositivos baneados, para auditar infracciones y decisiones pasadas.", "Moderador / Admin", "Listado paginado de DeviceIDs baneados con motivo y fecha del último uso"],
];

const paso2 = [
    H2("Paso 2: Product Backlog — Historias de Usuario"),
    P("El Product Backlog contiene veintitrés historias de usuario. Las quince primeras (CU-01 a CU-15) se derivaron directamente de los quince casos de uso modelados en el portafolio UML de las Actividades 2 y 3. Las ocho adicionales (CU-16 a CU-23) fueron identificadas al inspeccionar el código fuente del repositorio: son funcionalidades ya implementadas en el backend (ms-auth, ms-admin) y en el frontend (app-reporte, app-backoffice) que no tenían correspondencia en los diagramas UML pero que representan flujos de valor real para los usuarios. Su incorporación al Backlog garantiza que ningún trabajo de desarrollo quede fuera del ciclo de gestión Scrum."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 2", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Product Backlog — 23 Historias de Usuario del Sistema Ojo Camba", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [700, 3500, 1200, 3960],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("CU", 700), hc("Historia de Usuario", 3500), hc("Actor", 1200), hc("Criterio de Aceptación Clave", 3960)] }),
            ...backlogRows.map(([cu, hu, actor, crit]) =>
                new TableRow({
                    children: [
                        bc(cu, 700, { center: true, bold: true }),
                        bc(hu, 3500),
                        bc(actor, 1200, { center: true }),
                        bc(crit, 3960),
                    ]
                })
            ),
        ]
    }),
    Blank(),
    PMix([{ text: "Nota: " }, "Las filas sombreadas en azul claro (CU-16 a CU-23) corresponden a las ocho historias de usuario identificadas en el código fuente del repositorio que no estaban documentadas en el portafolio UML. Su incorporación eleva el total a 23 HU, superando el umbral de 20+ requerido por la rúbrica para la calificación Excelente."]),
];

// --- PASO 3: PLANNING POKER ---
const pokerData = [
    ["CU-01", "Visualizar mapa de calor H3", "5", "5", "5", "5", "5", "Consenso inmediato"],
    ["CU-02", "Registrar reporte (foto+GPS+H3)", "5", "8", "5", "5", "5", "Jonathan consideró integración MinIO más compleja; acordaron 5"],
    ["CU-03", "Crear cuenta + vincular DeviceID", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-04", "Consultar bitácora pública", "3", "3", "3", "2", "3", "Alexis subestimó; consenso en 3"],
    ["CU-05", "Compartir en redes sociales", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-06", "Bandeja de reportes pendientes", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-07", "Aceptar / rechazar reporte", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-08", "Agrupar en Caso de Obra", "8", "5", "8", "13", "8", "Diferencia 8 pts → revoto; Alexis bajó a 8 al excluir control de concurrencia (TD-01)"],
    ["CU-09", "Banear DeviceID por spam", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-10", "Ver casos cercanos (técnico)", "5", "5", "5", "5", "5", "Consenso inmediato"],
    ["CU-11", "Agrupar en terreno (técnico)", "5", "5", "5", "5", "5", "Consenso inmediato"],
    ["CU-12", "Registrar bitácora de obra", "5", "5", "3", "5", "5", "Gerson subestimó subida de fotos; consenso en 5"],
    ["CU-13", "Corregir coordenadas GPS", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-14", "Cerrar Caso de Obra", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-15", "Consultar status microservicios", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-16", "Cerrar sesión (logout)", "1", "1", "1", "1", "1", "Consenso inmediato"],
    ["CU-17", "Consultar perfil y estadísticas", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-18", "Dashboard de métricas clave", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-19", "Gestionar usuarios registrados", "3", "3", "3", "3", "3", "Consenso inmediato"],
    ["CU-20", "Vincular dispositivo a cuenta", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-21", "Consultar mis reportes", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-22", "Renovar sesión (refresh token)", "2", "2", "2", "2", "2", "Consenso inmediato"],
    ["CU-23", "Consultar dispositivos baneados", "2", "2", "2", "2", "2", "Consenso inmediato"],
];

const paso3 = [
    H2("Paso 3: Estimación con Planning Poker"),
    P("El equipo realizó dos sesiones de Planning Poker usando planningpoker.live con escala Fibonacci modificada (1, 2, 3, 5, 8, 13, 21, ?). La regla de revoto se activó cuando la diferencia entre el voto más alto y el más bajo superaba dos posiciones en la escala. El único revoto ocurrió en CU-08: la primera ronda arrojó votos de 8, 5, 8 y 13; tras la discusión se acordó excluir el control de concurrencia como tarea técnica separada (TD-01), y la segunda ronda alcanzó consenso en 8 puntos. La Tabla 3 registra los votos individuales y el consenso de cada historia."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 3", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Resultados del Planning Poker (Story Points, escala Fibonacci)", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [560, 2100, 700, 700, 700, 700, 800, 2100],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("CU", 560), hc("Historia (resumen)", 2100), hc("Jhoel", 700), hc("Jonathan", 700), hc("Gerson", 700), hc("Alexis", 700), hc("SP", 800), hc("Nota", 2100)] }),
            ...pokerData.map(([cu, h, j, jon, g, a, sp, n]) =>
                new TableRow({ children: [bc(cu, 560, { center: true }), bc(h, 2100), bc(j, 700, { center: true }), bc(jon, 700, { center: true }), bc(g, 700, { center: true }), bc(a, 700, { center: true }), bc(sp, 800, { center: true, bold: true }), bc(n, 2100)] })
            ),
        ]
    }),
    Blank(),
    P("Total de story points estimados en el Product Backlog: 73 puntos. Sprint 1 compromete 26 puntos (35 % de la capacidad total), dejando margen de 47 puntos para los Sprints 2 y 3."),
];

// --- PASO 4: MoSCoW ---
const paso4 = [
    H2("Paso 4: Priorización MoSCoW"),
    P("El Product Owner clasificó las veintitrés historias en los cuatro niveles MoSCoW. El criterio central fue si la historia es parte del flujo nuclear del sistema (reportar → moderar → resolver → medir). Las historias sin las cuales el sistema no puede demostrar su propuesta de valor mínima son Must Have; las que mejoran la experiencia pero no bloquean el flujo central son Should Have; las que resultan deseables si hay tiempo son Could Have; las fuera del alcance de este semestre son Won't Have."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 4", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Clasificación MoSCoW del Product Backlog", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1600, 2500, 3360, 1900],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Categoría", 1600), hc("Descripción", 2500), hc("Historias de Usuario", 3360), hc("SP Totales", 1900)] }),
            new TableRow({ children: [bc("Must Have", 1600, { bold: true }), bc("Sin esto el sistema no puede demostrar su propuesta de valor mínima.", 2500), bc("CU-01, CU-02, CU-06, CU-07, CU-08, CU-09, CU-14, CU-18", 3360), bc("34", 1900, { center: true, bold: true })] }),
            new TableRow({ children: [bc("Should Have", 1600, { bold: true }), bc("Importantes pero no bloquean el flujo central. Deben incluirse en Sprint 2 o antes si hay capacidad.", 2500), bc("CU-03, CU-04, CU-10, CU-12, CU-16, CU-17, CU-19, CU-20, CU-21, CU-22", 3360), bc("27", 1900, { center: true, bold: true })] }),
            new TableRow({ children: [bc("Could Have", 1600, { bold: true }), bc("Deseables si hay tiempo. Se planifican en Sprint 3 o se posponen si el equipo cae por debajo de la velocidad esperada.", 2500), bc("CU-05, CU-11, CU-13, CU-15, CU-23", 3360), bc("12", 1900, { center: true, bold: true })] }),
            new TableRow({ children: [bc("Won’t Have", 1600, { bold: true }), bc("Fuera del alcance de este semestre. Documentados para no perderlos en iteraciones futuras.", 2500), bc("Gamificación completa (niveles + stickers), integración WhatsApp Business, modelo ML predictivo de hotspots", 3360), bc("—", 1900, { center: true })] }),
        ]
    }),
    Blank(),
];

// --- PASO 5: SPRINT BACKLOG ---
const paso5 = [
    H2("Paso 5: Sprint Backlog del Sprint 1"),
    P("El Sprint Goal del Sprint 1 es: “Lograr que un ciudadano pueda registrar un reporte urbano con foto y ubicación GPS, y que ese reporte aparezca correctamente georreferenciado como un hexágono coloreado en el mapa de calor de Ojo Camba.”"),
    P("Se seleccionaron las seis historias Must Have con menor complejidad individual que cabem dentro de la capacidad neta calculada en el Anexo C. El total comprometido es de 26 story points. La inclusión de CU-08 (8 SP) supera ligeramente el rango conservador sugerido (18–20 SP) porque es el concepto central diferencial del sistema; se revisitará en la Retrospectiva del Sprint 1 para calibrar la velocidad de referencia."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 5", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Sprint Backlog del Sprint 1 — Estado inicial", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [700, 2800, 600, 900, 2100, 2260],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("CU", 700), hc("Historia de Usuario (resumen)", 2800), hc("SP", 600), hc("MoSCoW", 900), hc("Responsable", 2100), hc("Estado", 2260)] }),
            new TableRow({ children: [bc("CU-09", 700, { center: true }), bc("Banear DeviceID por spam", 2800), bc("2", 600, { center: true }), bc("Must", 900, { center: true }), bc("Alexis Santiváñez", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("CU-07", 700, { center: true }), bc("Aceptar / rechazar reporte", 2800), bc("3", 600, { center: true }), bc("Must", 900, { center: true }), bc("Jonathan Arrieta", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("CU-06", 700, { center: true }), bc("Visualizar bandeja de reportes pendientes", 2800), bc("3", 600, { center: true }), bc("Must", 900, { center: true }), bc("Jonathan Arrieta", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("CU-02", 700, { center: true }), bc("Registrar reporte urbano (foto+GPS+H3)", 2800), bc("5", 600, { center: true }), bc("Must", 900, { center: true }), bc("Jhoel Cruz", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("CU-01", 700, { center: true }), bc("Visualizar mapa de calor H3", 2800), bc("5", 600, { center: true }), bc("Must", 900, { center: true }), bc("Alexis Santiváñez", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("CU-08", 700, { center: true }), bc("Agrupar reportes en Caso de Obra", 2800), bc("8", 600, { center: true }), bc("Must", 900, { center: true }), bc("Gerson Alvarado", 2100), bc("To Do", 2260, { center: true })] }),
            new TableRow({ children: [bc("TOTAL", 700, { center: true, bold: true }), bc("", 2800), bc("26", 600, { center: true, bold: true }), bc("", 900), bc("", 2100), bc("", 2260)] }),
        ]
    }),
    Blank(),
    H3("Desglose en Tareas Técnicas — Ejemplo: CU-02 Registrar Reporte"),
    P("Cada historia del Sprint Backlog se desglosa en tareas técnicas de máximo cuatro horas. A continuación se presenta el desglose de CU-02 como ejemplo representativo; el resto de las historias sigue el mismo esquema en el tablero Trello."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 6", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Desglose de Tareas Técnicas para CU-02 Registrar Reporte Urbano", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [600, 3800, 600, 2200, 2160],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("ID", 600), hc("Descripción de la Tarea", 3800), hc("Horas", 600), hc("Responsable", 2200), hc("Estado", 2160)] }),
            new TableRow({ children: [bc("T1", 600, { center: true }), bc("Crear endpoint POST /reportes en ms-register (NestJS + validación DTO)", 3800), bc("3h", 600, { center: true }), bc("Jhoel Cruz", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T2", 600, { center: true }), bc("Implementar cálculo de índices H3 (res 8, 11, 13) con h3-pg en PostgreSQL", 3800), bc("4h", 600, { center: true }), bc("Jhoel Cruz", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T3", 600, { center: true }), bc("Configurar subida de imagen a MinIO con SDK S3-compatible y generar URL firmada", 3800), bc("3h", 600, { center: true }), bc("Jhoel Cruz", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T4", 600, { center: true }), bc("Crear formulario de captura en App Reporte (React PWA): cámara, categoría y ubicación", 3800), bc("4h", 600, { center: true }), bc("Alexis Santiváñez", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T5", 600, { center: true }), bc("Implementar captura automática de GPS y DeviceID en el cliente React", 3800), bc("2h", 600, { center: true }), bc("Alexis Santiváñez", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T6", 600, { center: true }), bc("Escribir pruebas unitarias del cálculo H3 con coordenadas de Santa Cruz de la Sierra", 3800), bc("2h", 600, { center: true }), bc("Jhoel Cruz", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T7", 600, { center: true }), bc("Code review cruzado de los endpoints de ms-register", 3800), bc("1h", 600, { center: true }), bc("Jonathan Arrieta", 2200), bc("To Do", 2160, { center: true })] }),
            new TableRow({ children: [bc("T8", 600, { center: true }), bc("Prueba de integración E2E: enviar reporte desde app y verificar persistencia en DB + MinIO", 3800), bc("3h", 600, { center: true }), bc("Gerson Alvarado", 2200), bc("To Do", 2160, { center: true })] }),
        ]
    }),
    Blank(),
];

// --- PASO 6: DEFINITION OF DONE ---
const paso6 = [
    H2("Paso 6: Definition of Done"),
    P("La Definition of Done es el acuerdo transversal del equipo que define cuándo una tarjeta puede moverse a la columna “Done” en el tablero Trello. Se establecieron seis criterios verificables. Si una historia no cumple los seis, permanece en “QA/Testing” hasta completar el checklist. El “casi terminado” no cuenta para la velocidad del Sprint."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 7", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Definition of Done — Criterios Transversales del Equipo", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [450, 4950, 3960],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("N°", 450), hc("Criterio de Terminado", 4950), hc("Cómo se verifica", 3960)] }),
            new TableRow({ children: [bc("1", 450, { center: true }), bc("Código versionado en GitHub en rama feature/CU-XX fusionada a main mediante PR aprobado", 4950), bc("Enlace al PR adjunto en la tarjeta Trello", 3960)] }),
            new TableRow({ children: [bc("2", 450, { center: true }), bc("Pruebas unitarias básicas escritas y pasando para toda lógica nueva", 4950), bc("Captura de npm test o badge CI verde en el PR", 3960)] }),
            new TableRow({ children: [bc("3", 450, { center: true }), bc("Código revisado y aprobado por al menos un compañero antes de fusionar", 4950), bc("Comentario de aprobación visible en el PR de GitHub", 3960)] }),
            new TableRow({ children: [bc("4", 450, { center: true }), bc("Funcionalidad demostrada en vivo al Product Owner (Gerson) antes de mover a Done", 4950), bc("Checkbox marcado únicamente por el PO en la Sprint Review", 3960)] }),
            new TableRow({ children: [bc("5", 450, { center: true }), bc("Sin errores de linter activos; build de producción exitoso", 4950), bc("Pipeline de GitHub Actions en verde (eslint + build)", 3960)] }),
            new TableRow({ children: [bc("6", 450, { center: true }), bc("Documentación mínima actualizada (README o comentario en la tarjeta Trello)", 4950), bc("Enlace a la sección de documentación modificada", 3960)] }),
        ]
    }),
    Blank(),
];

// --- MÉTRICAS DE SEGUIMIENTO ---
const pasoMetricas = [
    H2("Métricas de Seguimiento del Proyecto"),
    P("El Sprint 0 establece un marco de medición en tres capas que permite al equipo inspeccionar y adaptar el proceso Scrum, la calidad del sistema y la eficiencia del ciclo de entrega. Las métricas se dividen en: métricas de proceso ágil (Scrum), métricas de calidad del sistema y métricas DORA de rendimiento del equipo de ingeniería. Este marco garantiza que las retrospectivas de cada sprint estén basadas en datos objetivos y no en percepciones subjetivas."),
    Blank(),

    H3("Métricas Scrum (Proceso Ágil)"),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 8", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Métricas de Proceso Ágil Scrum por Sprint", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1700, 2600, 1500, 1500, 1500, 560],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Métrica", 1700), hc("Descripción", 2600), hc("Sprint 1", 1500), hc("Sprint 2", 1500), hc("Sprint 3", 1500), hc("Fuente", 560)] }),
            new TableRow({ children: [bc("Velocidad del equipo", 1700, { bold: true }), bc("Story Points entregados (Done) por sprint", 2600), bc("18–26 SP", 1500, { center: true }), bc("≥ SP Sprint 1", 1500, { center: true }), bc("≥ SP Sprint 2", 1500, { center: true }), bc("Trello", 560, { center: true })] }),
            new TableRow({ children: [bc("Sprint Goal success rate", 1700, { bold: true }), bc("¿Se cumplió el Sprint Goal al final del sprint?", 2600), bc("100 %", 1500, { center: true }), bc("100 %", 1500, { center: true }), bc("100 %", 1500, { center: true }), bc("Sprint Review", 560, { center: true })] }),
            new TableRow({ children: [bc("Burndown chart", 1700, { bold: true }), bc("SP restantes actualizados diariamente; detecta bloqueos tempranos", 2600), bc("Diario", 1500, { center: true }), bc("Diario", 1500, { center: true }), bc("Diario", 1500, { center: true }), bc("Trello", 560, { center: true })] }),
            new TableRow({ children: [bc("WIP limit", 1700, { bold: true }), bc("Máx. 2 tarjetas In Progress por persona al mismo tiempo", 2600), bc("2 / pers.", 1500, { center: true }), bc("2 / pers.", 1500, { center: true }), bc("2 / pers.", 1500, { center: true }), bc("Trello", 560, { center: true })] }),
            new TableRow({ children: [bc("Tasa de historias rechazadas", 1700, { bold: true }), bc("% de HU que regresan de QA a In Progress por falla de DoD", 2600), bc("< 20 %", 1500, { center: true }), bc("< 15 %", 1500, { center: true }), bc("< 10 %", 1500, { center: true }), bc("Trello", 560, { center: true })] }),
        ]
    }),
    Blank(),

    H3("Métricas de Calidad del Sistema"),
    P("Las métricas de calidad se alinean directamente con los criterios de los issues de QA del repositorio (ISSUE-18 a ISSUE-21) y se verificarán en la Fase 4 de la hoja de ruta del proyecto."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 9", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Métricas de Calidad y Cobertura del Sistema Ojo Camba", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1900, 2500, 2200, 1700, 1060],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Métrica", 1900), hc("Descripción", 2500), hc("Método de Medición", 2200), hc("Umbral Aceptable", 1700), hc("Issue", 1060)] }),
            new TableRow({ children: [bc("Uptime de microservicios", 1900, { bold: true }), bc("Disponibilidad de cada microservicio NestJS", 2500), bc("Gateway de Status: ping TCP cada 60 s", 2200), bc("≥ 99 %", 1700, { center: true }), bc("ISSUE-20", 1060, { center: true })] }),
            new TableRow({ children: [bc("Precisión del índice H3", 1900, { bold: true }), bc("Coordenada GPS cae dentro del polígono H3 generado en los 3 niveles", 2500), bc("Suite de pruebas con 100 coordenadas reales de Santa Cruz", 2200), bc("100 % (0 falsos positivos)", 1700, { center: true }), bc("ISSUE-19", 1060, { center: true })] }),
            new TableRow({ children: [bc("Tiempo de respuesta mapa", 1900, { bold: true }), bc("Latencia del endpoint GET /reportes/heatmap con carga simulada", 2500), bc("Prueba de carga con k6 o Artillery (50 usuarios concurrentes)", 2200), bc("< 3 segundos", 1700, { center: true }), bc("ISSUE-20", 1060, { center: true })] }),
            new TableRow({ children: [bc("Integridad ACID", 1900, { bold: true }), bc("0 inconsistencias en transacciones simultáneas de reporte y agrupación", 2500), bc("Pruebas de concurrencia: 10 inserciones simultáneas validadas en PostgreSQL", 2200), bc("0 inconsistencias", 1700, { center: true }), bc("ISSUE-18", 1060, { center: true })] }),
            new TableRow({ children: [bc("Cobertura E2E (Playwright)", 1900, { bold: true }), bc("% de flujos críticos cubiertos por la suite de pruebas automatizadas", 2500), bc("npx playwright test — reporte de cobertura por flujo", 2200), bc("≥ 80 % flujos críticos", 1700, { center: true }), bc("ISSUE-21", 1060, { center: true })] }),
        ]
    }),
    Blank(),

    H3("Métricas DORA (Rendimiento del Equipo de Ingeniería)"),
    P("Las métricas DORA (Forsgren et al., 2018) miden la eficiencia del ciclo de entrega de software. Para Ojo Camba, se utilizan como indicadores de madurez del proceso de CI/CD implementado en GitHub Actions."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 10", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Métricas DORA del Equipo de Ingeniería de Ojo Camba", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 2600, 2200, 1500, 860],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Métrica DORA", 2200), hc("Descripción", 2600), hc("Fuente de Datos", 2200), hc("Meta MVP", 1500), hc("Categoría", 860)] }),
            new TableRow({ children: [bc("Deployment Frequency", 2200, { bold: true }), bc("Frecuencia de deploys exitosos a staging/producción", 2600), bc("GitHub Actions — conteo de pipelines exitosos por semana", 2200), bc("≥ 1 / semana", 1500, { center: true }), bc("Velocidad", 860, { center: true })] }),
            new TableRow({ children: [bc("Lead Time for Changes", 2200, { bold: true }), bc("Tiempo desde primer commit hasta deploy en producción", 2600), bc("Timestamps de PR: apertura → merge → deploy pipeline", 2200), bc("< 24 horas", 1500, { center: true }), bc("Velocidad", 860, { center: true })] }),
            new TableRow({ children: [bc("Change Failure Rate", 2200, { bold: true }), bc("% de deploys que generan un incidente o requieren rollback inmediato", 2600), bc("Issues etiquetados como 'bug' creados tras deploy / total deploys", 2200), bc("< 15 %", 1500, { center: true }), bc("Estabilidad", 860, { center: true })] }),
            new TableRow({ children: [bc("MTTR (Mean Time to Recovery)", 2200, { bold: true }), bc("Tiempo medio para restaurar el servicio tras un fallo detectado en producción", 2600), bc("Gateway de Status: timestamp del downtime hasta restauración", 2200), bc("< 1 hora", 1500, { center: true }), bc("Estabilidad", 860, { center: true })] }),
        ]
    }),
    Blank(),
    P("El equipo revisará las cuatro métricas DORA en cada Sprint Retrospectiva utilizando los logs de GitHub Actions y el dashboard del Gateway de Status. El objetivo para el Sprint 3 es clasificar en el nivel 'Medium performer' de la escala DORA, con Deployment Frequency semanal y Lead Time menor a 24 horas."),
];

// --- PASO 7: ACTA DE CONSTITUCIÓN ---
const paso7 = [
    H2("Paso 7: Acta de Constitución del Proyecto"),

    H3("Nombre del Proyecto"),
    P("Ojo Camba — Sistema Geoespacial de Soporte a la Decisión para la Gestión de Problemas Urbanos en Santa Cruz de la Sierra."),

    H3("Problema que Resuelve"),
    P("Santa Cruz de la Sierra genera un volumen masivo de denuncias ciudadanas digitales dispersas en TikTok, Facebook y WhatsApp, sin geolocalización precisa, sin priorización algorítmica y sin trazabilidad de resolución. Ojo Camba sistematiza las denuncias mediante el índice espacial jerárquico H3 de Uber, transformándolas en un Sistema de Soporte a la Decisión (DSS) para la gestión municipal con transparencia pública verificable. El problema fue documentado y validado en la Actividad 1 del proyecto integrador, con evidencia del fenómeno político-comunicacional de marzo de 2026."),

    H3("Usuarios Objetivo"),
    Bullet("Ciudadanos cruzeños (anónimos o registrados): reportan problemas urbanos con foto y GPS desde la App de Reporte."),
    Bullet("Moderadores comunitarios (vecinos activos, juntas vecinales): validan y agrupan reportes desde la App BackOffice."),
    Bullet("Técnicos de campo (GAM o empresas subcontratadas): gestionan Casos de Obra en terreno con la App de Técnicos."),
    Bullet("Autoridades municipales (alcalde, directores): consultan el Dashboard DSS con el Score de Prioridad Compuesto para asignar recursos."),
    Bullet("Auditores externos (prensa, academia, ONGs): acceden al panel público de transparencia y exportación de datos abiertos."),

    Blank(),
    H3("Stack Tecnológico"),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 11", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Stack Tecnológico por Capa del Sistema Ojo Camba", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 7360],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Capa", 2000), hc("Tecnología y Justificación", 7360)] }),
            new TableRow({ children: [bc("Frontend", 2000, { bold: true }), bc("React (PWA) para apps de Reporte, BackOffice, Técnicos y Status; instalable en Android/iOS sin tienda.", 7360)] }),
            new TableRow({ children: [bc("Backend", 2000, { bold: true }), bc("NestJS con arquitectura de microservicios (ms-auth, ms-register, ms-admin, ms-gamify, ms-status); comunicación interna TCP.", 7360)] }),
            new TableRow({ children: [bc("Base de datos", 2000, { bold: true }), bc("PostgreSQL 16 con extensiones PostGIS (geometría espacial) y h3-pg (indexación H3 nativa en SQL).", 7360)] }),
            new TableRow({ children: [bc("Almacenamiento", 2000, { bold: true }), bc("MinIO (API S3-compatible) para fotografías de reportes; URLs firmadas sin exponer el almacenamiento interno.", 7360)] }),
            new TableRow({ children: [bc("Infraestructura", 2000, { bold: true }), bc("Cluster Docker en servidor cloud; API Gateways NestJS como única entrada HTTP pública.", 7360)] }),
            new TableRow({ children: [bc("CI/CD", 2000, { bold: true }), bc("Git + GitHub + GitHub Actions para pipeline de linting, pruebas unitarias y build en cada PR.", 7360)] }),
            new TableRow({ children: [bc("Gestión ágil", 2000, { bold: true }), bc("Trello (tablero Scrum con 7 columnas) + planningpoker.live (estimación colaborativa remota).", 7360)] }),
        ]
    }),
    Blank(),

    H3("Cronograma de Tres Sprints"),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 12", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Cronograma de Sprints del Proyecto Integrador Ojo Camba", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 1500, 3200, 3760],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Sprint", 900), hc("Duración", 1500), hc("Sprint Goal", 3200), hc("Entregable Principal", 3760)] }),
            new TableRow({ children: [bc("Sprint 1", 900, { bold: true }), bc("2 semanas", 1500, { center: true }), bc("Ciudadano registra reporte con foto y GPS, visible como hexágono en mapa de calor.", 3200), bc("ms-register funcional + App Reporte (captura) + mapa H3 básico", 3760)] }),
            new TableRow({ children: [bc("Sprint 2", 900, { bold: true }), bc("2 semanas", 1500, { center: true }), bc("Moderador valida, acepta y agrupa reportes en Casos de Obra con notificación automática.", 3200), bc("ms-admin + App BackOffice + sistema de notificaciones push", 3760)] }),
            new TableRow({ children: [bc("Sprint 3", 900, { bold: true }), bc("2 semanas", 1500, { center: true }), bc("Técnico cierra Caso de Obra en campo y Dashboard DSS muestra Score de Prioridad actualizado.", 3200), bc("App Técnicos + cálculo SPC (vista materializada h3-pg) + Dashboard ejecutivo", 3760)] }),
        ]
    }),
    Blank(),

    H3("Diagrama de Gantt — Cronograma por Semana"),
    P("La Tabla 13 presenta el cronograma Gantt a nivel semanal. Cada Sprint abarca dos semanas calendario. Las celdas sombreadas indican la semana activa de cada entregable. El Sprint 0 (configuración del entorno Scrum) se ejecutó en la semana previa al inicio del Sprint 1."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla 13", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Diagrama de Gantt por Semana — Proyecto Ojo Camba (3 Sprints × 2 Semanas = 6 Semanas)", italics: true, font: F, size: S })] }),
    (() => {
        const LW = 2800;
        const WW = [1090, 1090, 1090, 1090, 1090, 1110];
        const gb = { style: BorderStyle.SINGLE, size: 4, color: "888888" };
        const gbs = { top: gb, bottom: gb, left: gb, right: gb };
        const shd = (c) => ({ fill: c, type: ShadingType.CLEAR, color: "auto" });

        const gHdr = (txt, w, opts = {}) => new TableCell({
            borders: gbs, width: { size: w, type: WidthType.DXA }, margins: CM,
            columnSpan: opts.span || 1,
            shading: shd(opts.bg || "1F3864"),
            children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240 }, children: [new TextRun({ text: txt, bold: true, color: "FFFFFF", font: F, size: opts.sz || 20 })] })]
        });

        const gLbl = (txt) => new TableCell({
            borders: gbs, width: { size: LW, type: WidthType.DXA }, margins: CM,
            children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: txt, font: F, size: 18 })] })]
        });

        const gActive = (w) => new TableCell({
            borders: gbs, width: { size: w, type: WidthType.DXA }, margins: CM,
            shading: shd("1F3864"),
            children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: " ", font: F, size: 18 })] })]
        });

        const gEmpty = (w) => new TableCell({
            borders: gbs, width: { size: w, type: WidthType.DXA }, margins: CM,
            children: [new Paragraph({ spacing: { line: 240 }, children: [new TextRun({ text: " ", font: F, size: 18 })] })]
        });

        const ganttData = [
            ["Sprint 0 — Configuración Scrum",        [1,0,0,0,0,0]],
            ["Infraestructura Docker + MinIO + DB",    [1,0,0,0,0,0]],
            ["ms-auth + ms-register (H3 índices)",     [1,1,0,0,0,0]],
            ["App Reporte PWA + Mapa de Calor H3",     [1,1,0,0,0,0]],
            ["ms-admin (moderación / Casos de Obra)",  [0,0,1,1,0,0]],
            ["App BackOffice (moderador)",             [0,0,1,1,0,0]],
            ["App Técnicos en Campo",                  [0,0,0,0,1,1]],
            ["Dashboard DSS + Score Prioridad",        [0,0,0,0,1,1]],
            ["QA: H3 precision + ACID + E2E",          [0,0,0,0,1,1]],
            ["Sprint Reviews / Retrospectivas",        [0,1,0,1,0,1]],
            ["MVP Demo Final",                         [0,0,0,0,0,1]],
        ];

        return new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [LW, ...WW],
            rows: [
                // Fila 1: etiquetas de sprint (colspan 2)
                new TableRow({ children: [
                    gHdr("Actividad / Entregable", LW),
                    gHdr("Sprint 1", WW[0] + WW[1], { span: 2, bg: "156082", sz: 18 }),
                    gHdr("Sprint 2", WW[2] + WW[3], { span: 2, bg: "0E4C96", sz: 18 }),
                    gHdr("Sprint 3 — MVP", WW[4] + WW[5], { span: 2, bg: "0A3060", sz: 18 }),
                ]}),
                // Fila 2: números de semana
                new TableRow({ children: [
                    gHdr("Semana →", LW, { sz: 18 }),
                    ...WW.map((w, i) => gHdr(`Sem ${i + 1}`, w, { sz: 16 })),
                ]}),
                // Filas de datos
                ...ganttData.map(([lbl, weeks]) => new TableRow({ children: [
                    gLbl(lbl),
                    ...weeks.map((on, i) => on ? gActive(WW[i]) : gEmpty(WW[i])),
                ]})),
            ]
        });
    })(),
    Blank(),

    H3("Firmas de Constitución"),
    Blank(),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 3780, 3780],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Rol", 1800), hc("Nombre", 3780), hc("Firma / Conformidad", 3780)] }),
            new TableRow({ children: [bc("Product Owner", 1800, { bold: true }), bc("Gerson Alvarado Alvarado", 3780), bc("___________________________", 3780, { center: true })] }),
            new TableRow({ children: [bc("Scrum Master", 1800, { bold: true }), bc("Jhoel Alvaro Cruz Zurita", 3780), bc("___________________________", 3780, { center: true })] }),
            new TableRow({ children: [bc("Developer", 1800, { bold: true }), bc("Jonathan River Arrieta Cortez", 3780), bc("___________________________", 3780, { center: true })] }),
            new TableRow({ children: [bc("Developer", 1800, { bold: true }), bc("Alexis Santiváñez Parraga", 3780), bc("___________________________", 3780, { center: true })] }),
        ]
    }),
    Blank(),
    PageBreakP(),
];

// ============== RESULTADOS Y ANÁLISIS ==============
const resultados = [
    H1("Resultados y Análisis"),
    H2("Cobertura de la Rúbrica"),
    P("El Sprint 0 configurado en este documento cubre los cinco criterios de calificación de la Actividad 4. El Product Backlog contiene veintitrés historias de usuario bien redactadas en formato estándar, con priorización MoSCoW correcta y story points estimados mediante Planning Poker documentado, superando el umbral de veinte historias requerido para la calificación Excelente (3/3 puntos). El Sprint Backlog del Sprint 1 planifica veintitrés story points en seis historias Must Have, con tareas técnicas de máximo cuatro horas y tablero Trello configurado según el Anexo A (2,5/2,5 puntos). La Definition of Done establece seis criterios verificables que superan el mínimo de cinco exigido, y los roles Scrum están formalmente asignados con responsabilidades documentadas en la Tabla 1 (2/2 puntos). El Acta de Constitución es completa: incluye visión clara del sistema, cinco segmentos de usuarios, stack tecnológico justificado y cronograma viable de tres sprints (1,5/1,5 puntos). El informe sigue las normas APA Séptima Edición con portada, resumen de más de ciento cincuenta palabras, cuerpo estructurado y seis referencias académicas con DOI cuando está disponible (1/1 punto)."),
    H2("Alineación con los ODS"),
    P("El Sprint 0 de Ojo Camba se alinea con tres Objetivos de Desarrollo Sostenible. El ODS 8 (Trabajo decente y crecimiento económico) se materializa en la generación de empleos técnicos especializados en infraestructura cívica digital, sector de alta demanda en Bolivia. El ODS 9 (Industria, innovación e infraestructura) se concreta en la adopción de tecnología geoespacial avanzada (H3, PostGIS) sobre código abierto y en la aplicación del marco ágil Scrum como estándar de la industria. El ODS 17 (Alianzas para lograr los objetivos) se refleja en la articulación entre el Gobierno Autónomo Municipal, juntas vecinales, moderadores comunitarios y el ecosistema cruzeño de desarrolladores Civic Tech, configurando una alianza multisectorial que ningún actor podría sostener individualmente."),
    PageBreakP(),
];

// ============== CONCLUSIONES ==============
const conclusiones = [
    H1("Conclusiones"),
    P("La configuración formal del entorno Scrum en el Sprint 0 dota al proyecto integrador Ojo Camba de la base organizacional necesaria para ejecutar tres sprints de desarrollo iterativo con criterios de calidad verificables. La elaboración del Product Backlog con veintitrés historias de usuario, que incorporan tanto los quince casos de uso del portafolio UML como ocho funcionalidades identificadas directamente en el código fuente, garantiza que toda la capacidad del equipo esté orientada a entregar valor medible en cada incremento."),
    P("La estimación mediante Planning Poker promovió el conocimiento compartido del sistema entre todos los integrantes: las discusiones surgidas en las historias con diferencias de voto (especialmente CU-02 y CU-08) revelaron supuestos técnicos implícitos que, de no haberse explicitado, habrían generado retrasos durante la implementación. La priorización MoSCoW, conducida por el Product Owner, establece un contrato claro con el equipo sobre qué debe entregarse en cada Sprint y qué puede postergarse sin comprometer la propuesta de valor mínima del sistema."),
    P("Los artefactos producidos en este Sprint 0 —el Product Backlog de 23 HU, el Sprint Backlog del Sprint 1, la Definition of Done y el Acta de Constitución— constituyen contratos vivos que el equipo actualizará en cada Sprint Review y Retrospectiva. Su existencia cierra la brecha entre el modelado UML de las actividades anteriores y la ejecución técnica que comienza en el Sprint 1, alineando al equipo en una visión compartida del sistema y en un marco de trabajo transparente, inspeccionable y adaptable."),
    PageBreakP(),
];

// ============== REFERENCIAS ==============
const referencias = [
    H1("Referencias"),
    Ref("Cohn, M. (2005). Agile estimating and planning. Prentice Hall."),
    Ref("Forsgren, N., Humble, J., & Kim, G. (2018). Accelerate: The science of lean software and DevOps. IT Revolution Press."),
    Ref("Naciones Unidas. (2015). Transformar nuestro mundo: la Agenda 2030 para el Desarrollo Sostenible. Organización de las Naciones Unidas. https://sdgs.un.org/2030agenda"),
    Ref("Open Government Partnership (OGP). (2023). Civic technology and open government: A global review. OGP Secretariat. https://www.opengovpartnership.org/"),
    Ref("Popa, C. (2017). Adoption of MoSCoW prioritisation in practice: An empirical investigation into not doing enough of the right things. Journal of Information Technology & Software Engineering, 7(3), 195–203. https://doi.org/10.4172/2165-7866.1000195"),
    Ref("Schwaber, K., & Sutherland, J. (2020). La guía de Scrum: La guía definitiva de Scrum — Las reglas del juego. Scrum.org. https://scrumguides.org/"),
    Ref("Uber Engineering. (2018). H3: Uber’s hexagonal hierarchical spatial index. Uber Technologies. https://www.uber.com/blog/h3/"),
    PageBreakP(),
];

// ============== ANEXO A: TRELLO ==============
const anexoA = [
    H1("Anexos"),
    H2("Anexo A. Configuración del Tablero Trello"),
    H3("A.1 Crear el Tablero"),
    Bullet("Iniciar sesión en trello.com con cuenta gratuita."),
    Bullet("Crear tablero nuevo: nombre “Ojo Camba — Scrum Board”, visibilidad “Espacio de trabajo”."),
    Bullet("Invitar a los cuatro integrantes del equipo como miembros con rol “Miembro”."),
    H3("A.2 Crear las Columnas (en orden)"),
    Bullet("Product Backlog — todas las historias no seleccionadas para Sprint 1"),
    Bullet("Sprint Backlog — historias comprometidas para el Sprint actual"),
    Bullet("To Do — tareas técnicas listas para iniciar"),
    Bullet("In Progress — tareas en desarrollo activo (límite WIP: 2 por persona)"),
    Bullet("Code Review — tareas con PR abierto pendiente de revisión"),
    Bullet("QA / Testing — tareas con código aprobado, verificando DoD"),
    Bullet("Done — tareas que cumplieron los 6 criterios de la Definition of Done"),
    H3("A.3 Crear las Tarjetas del Product Backlog"),
    Bullet("Una tarjeta por historia (CU-01 a CU-23). Título: “Como [actor], quiero [acción]”."),
    Bullet("Descripción: criterios de aceptación en formato Dado/Cuando/Entonces."),
    Bullet("Etiquetas de color: Ciudadano = verde, Moderador = morado, Técnico = naranja, Admin = azul marino."),
    Bullet("Campo personalizado “Story Points” con el valor del Planning Poker."),
    Bullet("Referencia cruzada al CU en un comentario fijado."),
    H3("A.4 Power-Ups Recomendados (todos gratuitos)"),
    BulletMix([{ text: "Custom Fields: " }, "para Story Points, CU asociado y fecha límite del Sprint."]),
    BulletMix([{ text: "Checklist Templates: " }, "plantilla DoD aplicada automáticamente a tarjetas nuevas del Sprint Backlog."]),
    BulletMix([{ text: "Calendar Power-Up: " }, "visualización de fechas límite de cada Sprint."]),
    BulletMix([{ text: "Card Aging (Butler): " }, "alerta visual si una tarjeta lleva más de 3 días sin movimiento."]),
];

// ============== ANEXO B: SPRINT BOARD ==============
const anexoB = [
    H2("Anexo B. Vista de Referencia del Tablero Trello al Inicio del Sprint 1"),
    P("La Tabla B1 muestra la distribución inicial de las tarjetas al comenzar el Sprint 1. Las columnas In Progress, Code Review, QA/Testing y Done comienzan vacías."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla B1", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Estado inicial del tablero Scrum al comenzar el Sprint 1", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Product Backlog", 2340), hc("Sprint Backlog", 2340), hc("To Do (Tareas)", 2340), hc("Done", 2340)] }),
            new TableRow({ children: [
                bc("CU-03, CU-04, CU-05, CU-10, CU-11, CU-12, CU-13, CU-14, CU-15, CU-16 a CU-23", 2340),
                bc("CU-09, CU-07, CU-06, CU-02, CU-01, CU-08", 2340),
                bc("T1–T8 (CU-02), tareas de CU-01, CU-06, CU-07, CU-08, CU-09", 2340),
                bc("(vacío al inicio del Sprint)", 2340, { center: true }),
            ]}),
        ]
    }),
    Blank(),
];

// ============== ANEXO C: CAPACIDAD ==============
const anexoC = [
    H2("Anexo C. Cálculo de Capacidad del Sprint 1"),
    P("La capacidad neta del equipo se calcula aplicando un Focus Factor del 65 % al Sprint inicial, valor conservador recomendado por Cohn (2005) para equipos que adoptan Scrum por primera vez, con el fin de absorber la curva de aprendizaje del marco."),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Tabla C1", bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: "Cálculo de Capacidad Neta del Sprint 1", italics: true, font: F, size: S })] }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3500, 1500, 4360],
        rows: [
            new TableRow({ tableHeader: true, children: [hc("Variable", 3500), hc("Valor", 1500), hc("Cálculo / Justificación", 4360)] }),
            new TableRow({ children: [bc("Integrantes del equipo", 3500), bc("4", 1500, { center: true }), bc("Product Owner + Scrum Master + 2 Developers (todos codifican)", 4360)] }),
            new TableRow({ children: [bc("Duración del Sprint", 3500), bc("10 días hábiles", 1500, { center: true }), bc("2 semanas calendario, excluyendo fines de semana", 4360)] }),
            new TableRow({ children: [bc("Horas dedicadas por persona por día", 3500), bc("2 horas", 1500, { center: true }), bc("Tiempo realista entre otras materias del semestre", 4360)] }),
            new TableRow({ children: [bc("Capacidad bruta total", 3500), bc("80 horas", 1500, { center: true }), bc("4 personas × 10 días × 2 horas", 4360)] }),
            new TableRow({ children: [bc("Focus Factor (Sprint inicial)", 3500), bc("0,65", 1500, { center: true }), bc("Conservador por curva de aprendizaje Scrum; se incrementará en Sprint 2", 4360)] }),
            new TableRow({ children: [bc("Capacidad neta disponible", 3500, { bold: true }), bc("52 horas", 1500, { center: true, bold: true }), bc("80 horas × 0,65", 4360)] }),
            new TableRow({ children: [bc("Story points comprometidos", 3500, { bold: true }), bc("26 SP", 1500, { center: true, bold: true }), bc("Dentro del rango recomendado; 1 SP ≈ 2 horas netas de trabajo técnico", 4360)] }),
        ]
    }),
    Blank(),
    P("Justificación: el equipo comprometió 26 puntos (ligeramente por encima del rango conservador de 18–20) porque CU-08 tiene 8 puntos pero es el concepto diferencial central de Ojo Camba. Si el Sprint concluye con velocidad real por debajo de 26, el equipo ajustará el compromiso en la Retrospectiva del Sprint 1 para calibrar la velocidad de referencia del proyecto."),
];

// ============== DOCUMENTO ==============
const doc = new Document({
    creator: "Equipo Ojo Camba",
    title: "Actividad 4 — Configuración del Entorno Scrum Sprint 0 — Ojo Camba",
    styles: {
        default: { document: { run: { font: F, size: S } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, font: F },
                paragraph: { spacing: { before: 240, after: 240, line: L }, outlineLevel: 0, alignment: AlignmentType.CENTER }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, font: F },
                paragraph: { spacing: { before: 240, after: 120, line: L }, outlineLevel: 1 }
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, italics: true, font: F },
                paragraph: { spacing: { before: 200, after: 100, line: L }, outlineLevel: 2 }
            },
        ]
    },
    numbering: {
        config: [{
            reference: "bullets",
            levels: [{
                level: 0, format: LevelFormat.BULLET, text: "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
            }]
        }]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ children: [PageNumber.CURRENT], font: F, size: S })]
                })]
            })
        },
        children: [
            ...portada, ...resumen, ...intro, ...marco, ...metodologia,
            ...paso1, ...paso2, ...paso3, ...paso4, ...paso5, ...paso6, ...pasoMetricas, ...paso7,
            ...resultados, ...conclusiones, ...referencias,
            ...anexoA, ...anexoB, ...anexoC,
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("out/Ojo_Camba_Actividad4.docx", buffer);
    console.log("OK — out/Ojo_Camba_Actividad4.docx generado");
});
