const path = require('path');
const {
    P, PMix, H1, H2, H3, Bullet, PageBreakP, Blank, TablaTitulo, hc, bc, rowT, Tbl, Fig, CodeBlock,
    F, S, L, borders, ShadingType,
} = require('./helpers');
const { Paragraph, TextRun, AlignmentType } = require('docx');

const IMG = path.join(__dirname, 'IMG');

const GherkinBlock = (titulo, texto) => [
    H3(titulo),
    new Paragraph({
        spacing: { after: 180, line: 300 },
        shading: { fill: "efebe4", type: ShadingType.CLEAR, color: "auto" },
        border: borders,
        indent: { left: 200, right: 200 },
        children: texto.split('\n').flatMap((ln, i) => {
            const isKeyword = /^(DADO QUE|Y|CUANDO|ENTONCES)/.test(ln);
            const run = new TextRun({ text: ln, font: F, size: S, bold: isKeyword, break: i === 0 ? 0 : 1 });
            return [run];
        }),
    }),
];

const desarrollo2 = [
    H1("Desarrollo — Parte II: Sprint 3 (Dashboard de Soporte Decisional e Integración Final)"),
    P('Sprint Goal: "Que el administrador visualice un Dashboard con ocho indicadores en cuatro tipos de gráfico, filtrable por rango de fechas, integrando todos los módulos construidos en los Sprints 1 y 2 para la demostración final." Período de ejecución: 27 al 30 de junio de 2026 (sprint corto de integración y cierre).'),

    H2("Paso 1: Librería de Gráficos"),
    P("La guía de la actividad admite Chart.js o, para proyectos React, Recharts con la misma validez. Ojo Camba adopta Recharts (^3.9.1, frontend/app-backoffice/package.json) por coherencia de paradigma: todo el frontend está construido con componentes funcionales React, y Recharts expone cada gráfico como un componente declarativo (<BarChart>, <PieChart>, <RadialBarChart>) que se re-renderiza automáticamente cuando cambia el estado, sin la manipulación imperativa del elemento <canvas> que exigiría Chart.js con chart.update(). La instalación se resume en una sola dependencia de npm, sin configuración adicional de build."),

    H2("Paso 2: KPIs Calculados desde el Backend"),
    P("Siguiendo el patrón sugerido por la guía de la actividad —un único endpoint que retorne todos los KPIs en una sola respuesta JSON, calculados con consultas SQL optimizadas— el sistema expone GET /admin/dashboard/kpis. El método getDashboardKpis() (admin.service.ts) combina cuatro contadores en tiempo real con cuatro agregaciones SQL, retornando ocho indicadores en una sola respuesta. La Tabla 9 los detalla."),
    ...TablaTitulo(9, "Indicadores retornados por GET /admin/dashboard/kpis"),
    Tbl([2200, 1400, 1800, 3960], [
        rowT([hc("Campo JSON", 2200), hc("Tipo", 1400), hc("¿Filtrable?", 1800), hc("Cálculo", 3960)]),
        rowT([bc("pendientes", 2200, { bold: true }), bc("contador", 1400, { center: true }), bc("No (tiempo real)", 1800, { center: true }), bc("COUNT(*) WHERE estado = Reportado", 3960)]),
        rowT([bc("aceptados_hoy", 2200, { bold: true }), bc("contador", 1400, { center: true }), bc("No (tiempo real)", 1800, { center: true }), bc("COUNT(*) WHERE estado = Aceptado AND creado_en >= hoy 00:00", 3960)]),
        rowT([bc("casos_activos", 2200, { bold: true }), bc("contador", 1400, { center: true }), bc("No (tiempo real)", 1800, { center: true }), bc("COUNT(*) WHERE estado_actual NOT IN (Rechazado, Finalizado)", 3960)]),
        rowT([bc("dispositivos_baneados", 2200, { bold: true }), bc("contador", 1400, { center: true }), bc("No (tiempo real)", 1800, { center: true }), bc("COUNT(*) WHERE is_banned = true", 3960)]),
        rowT([bc("reportes_por_mes", 2200, { bold: true }), bc("serie temporal", 1400, { center: true }), bc("Sí", 1800, { center: true }), bc("GROUP BY DATE_TRUNC(mes); BETWEEN :desde/:hasta si se provee, si no últimos 6 meses", 3960)]),
        rowT([bc("por_categoria", 2200, { bold: true }), bc("distribución", 1400, { center: true }), bc("Sí", 1800, { center: true }), bc("JOIN categorias + GROUP BY categoria_id, filtrado por rango si aplica", 3960)]),
        rowT([bc("casos_por_estado", 2200, { bold: true }), bc("distribución", 1400, { center: true }), bc("Sí", 1800, { center: true }), bc("GROUP BY estado_actual, filtrado por creado_en si aplica", 3960)]),
        rowT([bc("tasa_resolucion", 2200, { bold: true }), bc("tasa (%)", 1400, { center: true }), bc("Sí (derivada)", 1800, { center: true }), bc("Finalizados / total del conjunto filtrado × 100", 3960)]),
    ]),
    Blank(),
    P("Los cuatro contadores superiores se calculan siempre en tiempo real, sin importar el filtro de fecha aplicado: \"pendientes ahora\" o \"casos activos ahora\" pierde sentido si se acota a un rango histórico. Los cuatro indicadores restantes sí respetan el filtro desde/hasta cuando se provee (ver Paso 4). El detalle completo del método, con las siete consultas QueryBuilder y el helper resolveRango(), se reproduce en el Anexo A."),

    H2("Paso 3: Implementación de los Gráficos (Recharts)"),
    P("frontend/app-backoffice/src/pages/DashboardPage.tsx consume getDashboardKpis() y renderiza cuatro visualizaciones, cada una con su propio tipo de gráfico Recharts, satisfaciendo el requisito de 3 o más tipos distintos de la rúbrica:"),
    Bullet("Tarjetas de contadores (4 KPI en tiempo real): pendientes, aceptados hoy, casos activos, dispositivos baneados — con navegación al hacer clic."),
    Bullet("Gráfico de barras (BarChart): reportes por mes, eje X = mes, eje Y = total de reportes."),
    Bullet("Gráfico circular (PieChart): distribución de reportes por categoría, con etiquetas de porcentaje."),
    Bullet("Gráfico de dona (PieChart con innerRadius): Casos de Obra por estado, con leyenda lateral."),
    Bullet("Gráfico radial (RadialBarChart): tasa de resolución, mostrada como medidor circular de 0 a 100%."),
    Blank(),
    ...Fig(path.join(IMG, 'dashboard-general.png'), 500, "Figura 1",
        "Dashboard de app-backoffice sin filtro de fecha — vista general con los 4 KPI y los 4 tipos de gráfico Recharts.",
        "Captura de pantalla tomada con Playwright (chromium headless) contra el sistema en ejecución local, con datos reales del seed histórico de KPIs (backend/ms-register/src/seed.ts). Tasa de resolución global: 89% (160 Casos de Obra activos)."),

    H2("Paso 4: Filtros Dinámicos de Fecha"),
    P("Se incorporó un formulario con dos campos type=\"date\" (Desde / Hasta) sobre el Dashboard. Al cambiar cualquiera de los dos valores, React vuelve a invocar getDashboardKpis(desde, hasta), que arma la query string y dispara una nueva petición fetch al backend; Recharts redibuja los cuatro gráficos automáticamente al recibir el nuevo estado, sin necesidad de un chart.update() manual como en Chart.js. Un botón \"Limpiar filtro\" restablece la vista por defecto (últimos 6 meses / histórico completo)."),
    P("En el backend, getDashboardKpis(desde?, hasta?) resuelve el rango con el método auxiliar resolveRango(): si no se provee ningún límite, conserva el comportamiento original (últimos 6 meses para la serie temporal, histórico completo para el resto); si se provee al menos un límite, las tres consultas filtrables aplican BETWEEN :desde AND :hasta sobre creado_en, y la tasa de resolución se recalcula sobre el conjunto ya filtrado. Endpoint: GET /admin/dashboard/kpis?desde=2026-06-01&hasta=2026-06-30 (documentado en la colección Postman, Tabla 3). Código completo del método y de resolveRango() en el Anexo A."),
    ...Fig(path.join(IMG, 'dashboard-filtro-fecha.png'), 500, "Figura 2",
        "Dashboard de app-backoffice con el filtro de fecha aplicado (01/06/2026 – 30/06/2026).",
        "Misma sesión que la Figura 1, tras aplicar el rango; nótese que \"Reportes — últimos 6 meses\" cambia a \"Reportes — rango filtrado\", aparece el botón \"Limpiar filtro\", y la tasa de resolución baja de 89% a 25% al acotarse al subconjunto de Casos de Obra creados en junio de 2026 — evidencia de que el filtro recalcula, no solo redibuja."),

    H2("Paso 5: Pruebas de Integración"),
    P('Se documentan doce casos de prueba (mínimo exigido: diez), cubriendo autenticación, CRUD y Dashboard. Cada caso se verificó manualmente contra la lógica real de servicio antes de la demo, siguiendo la recomendación de la guía de la actividad de "probar el flujo completo antes de la demo"; los casos 4 a 9 ejercitan guard clauses explícitas del código (no decoradores de DTO), por lo que su resultado es determinista y reproducible. Los casos 11 y 12 se re-verificaron el 30 de junio de 2026 contra la implementación real del filtro desde/hasta (Paso 4).'),
    ...TablaTitulo(10, "Casos de prueba de integración — autenticación, CRUD y Dashboard"),
    Tbl([500, 2000, 2200, 2400, 2500, 2500, 900], [
        rowT([hc("#", 500), hc("Módulo", 2000), hc("Precondición", 2200), hc("Datos de entrada", 2400), hc("Resultado esperado", 2500), hc("Resultado obtenido", 2500), hc("Estado", 900)]),
        rowT([bc("1", 500, { center: true }), bc("Autenticación", 2000), bc("Usuario admin@ojocamba.bo existe (seed)", 2200), bc("POST /auth/login {email, password correctos}", 2400), bc("201 + access_token + refresh_token", 2500), bc("Token JWT recibido, firmado HS256", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("2", 500, { center: true }), bc("Autenticación", 2000), bc("Usuario admin@ojocamba.bo existe", 2200), bc("POST /auth/login {password incorrecta}", 2400), bc("401 Unauthorized", 2500), bc("bcrypt.compare() retorna false; UnauthorizedException", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("3", 500, { center: true }), bc("Autenticación", 2000), bc("Ninguna (email nuevo)", 2200), bc("POST /auth/register {email ya registrado}", 2400), bc("409 Conflict", 2500), bc('ConflictException "El email ya esta registrado"', 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("4", 500, { center: true }), bc("CRUD — Reportes", 2000), bc("Reporte existente en estado Reportado", 2200), bc("POST /admin/reports/:id/accept (dos solicitudes simultáneas)", 2400), bc("Solo la primera resuelve 201; la segunda recibe 400", 2500), bc("Bloqueo pesimista (lock: pessimistic_write) impide doble aceptación", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("5", 500, { center: true }), bc("CRUD — Casos de Obra", 2000), bc("report_ids = [1] (un solo reporte)", 2200), bc("POST /admin/groups {report_ids:[1]}", 2400), bc('400 BadRequest "Se necesitan al menos 2 reportes"', 2500), bc("Validación de cardinalidad en createGroup()", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("6", 500, { center: true }), bc("CRUD — Casos de Obra", 2000), bc("report_ids incluye un ID inexistente", 2200), bc("POST /admin/groups {report_ids:[1,9999]}", 2400), bc('400 BadRequest "Uno o mas reportes no existen"', 2500), bc("Verificación de cardinalidad contra el repositorio", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("7", 500, { center: true }), bc("CRUD — Casos de Obra", 2000), bc("Caso de Obra existente", 2200), bc('POST /admin/groups/:id/updates {estado_nuevo:"Inventado"}', 2400), bc('400 BadRequest "Estado invalido"', 2500), bc("Validación contra Object.values(EstadoReporte)", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("8", 500, { center: true }), bc("CRUD — Dispositivos", 2000), bc("device_id inexistente", 2200), bc('POST /admin/devices/ban {device_id:"no-existe"}', 2400), bc('404 NotFound "Dispositivo no encontrado"', 2500), bc("findOne() retorna null → NotFoundException", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("9", 500, { center: true }), bc("CRUD — Reportes", 2000), bc("20+ reportes pendientes en BD (seed)", 2200), bc("GET /admin/reports/pending?page=1&limit=5", 2400), bc("200 + data.length ≤ 5, total = conteo real", 2500), bc("skip/take aplicados; total vía findAndCount", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("10", 500, { center: true }), bc("Dashboard", 2000), bc("Reportes y Casos de Obra de prueba cargados", 2200), bc("GET /admin/dashboard/kpis (sin filtro)", 2400), bc("200 + 8 campos (4 contadores + 4 agregaciones)", 2500), bc("Respuesta incluye reportes_por_mes, por_categoria, casos_por_estado, tasa_resolucion=89%, rango_aplicado=null", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("11", 500, { center: true }), bc("Dashboard", 2000), bc("Igual al caso 10", 2200), bc("GET /admin/dashboard/kpis?desde=2026-06-01&hasta=2026-06-30", 2400), bc("200 + series acotadas al rango; contadores sin cambio", 2500), bc("rango_aplicado refleja el filtro; reportes_por_mes solo incluye junio 2026 (259 reportes); tasa_resolucion baja a 25%", 2500), bc("PASS", 900, { center: true, bold: true })]),
        rowT([bc("12", 500, { center: true }), bc("Dashboard", 2000), bc("Dashboard cargado en el navegador", 2200), bc('Cambiar el campo "Desde" en la UI', 2400), bc("Los 4 gráficos se redibujan sin recargar la página", 2500), bc("useCallback(load,[desde,hasta]) dispara nuevo fetch; Recharts re-renderiza (Figura 2)", 2500), bc("PASS", 900, { center: true, bold: true })]),
    ]),
    Blank(),

    H2("Definition of Ready y Criterios de Aceptación (Sprint 2 y 3)"),
    P("Por pedido explícito de validación para esta entrega, los siguientes casos de implementación centrales de ambos sprints se documentan con criterios de aceptación en formato Gherkin (DADO QUE / CUANDO / ENTONCES), verificados contra datos y comportamiento reales del sistema — no genéricos — como Definition of Ready retroactiva de cada historia."),

    ...GherkinBlock(
        "HU-08 / HU-11 — Creación de Caso de Obra (cardinalidad mínima)",
        "DADO QUE el moderador selecciona un único reporte pendiente (report_ids = [1]),\nCUANDO ejecuta la acción POST /admin/groups,\nENTONCES el sistema responde 400 BadRequest con el mensaje \"Se necesitan al menos 2 reportes\"\nY no se crea ningún registro en grupos_reportes.",
    ),
    ...GherkinBlock(
        "HU-07 — Aceptación concurrente de un mismo reporte (atomicidad)",
        "DADO QUE un reporte existe en estado \"Reportado\",\nCUANDO dos moderadores distintos ejecutan POST /admin/reports/:id/accept al mismo tiempo,\nENTONCES solo la primera solicitud en adquirir el bloqueo de fila (pessimistic_write) transiciona el reporte a \"Aceptado\" y crea un Caso de Obra,\nY la segunda solicitud recibe 400 BadRequest \"Solo se pueden aceptar reportes en estado Reportado\", sin crear un segundo grupo ni duplicar puntos de gamificación.",
    ),
    ...GherkinBlock(
        "HU-14 — Cierre de Caso de Obra con cascada de estado",
        'DADO QUE un Caso de Obra "O-26-0000160" está en estado "EnTrabajo" con 3 reportes asociados,\nCUANDO el técnico registra una actualización con estado_nuevo = "Finalizado",\nENTONCES el Caso de Obra y sus 3 reportes asociados cambian a estado "Finalizado" en la misma operación,\nY la transición queda registrada en actualizaciones_caso con marca de tiempo.',
    ),
    ...GherkinBlock(
        "HU-18 — Filtro de fecha del Dashboard recalcula la tasa de resolución",
        "DADO QUE el Dashboard sin filtro reporta 160 Casos de Obra activos y una tasa de resolución del 89%,\nCUANDO el administrador aplica el filtro Desde=01/06/2026, Hasta=30/06/2026,\nENTONCES los indicadores reportes_por_mes, por_categoria, casos_por_estado y tasa_resolucion se recalculan solo sobre los Casos de Obra creados en ese rango (259 reportes en junio, tasa de resolución 25%),\nY los 4 contadores en tiempo real (pendientes, aceptados_hoy, casos_activos, dispositivos_baneados) permanecen sin cambio, por ser indicadores de estado actual y no históricos.\n(Ver Figura 1 vs. Figura 2 para la evidencia visual de este escenario.)",
    ),
    ...GherkinBlock(
        "HU-19 — Validación de transición de estado inválida",
        'DADO QUE un Caso de Obra existe y está activo,\nCUANDO el técnico envía POST /admin/groups/:id/updates con estado_nuevo = "Inventado" (valor fuera del enum EstadoReporte),\nENTONCES el sistema responde 400 BadRequest con el listado de estados válidos,\nY no se persiste el cambio de estado en el Caso de Obra ni en sus reportes asociados.',
    ),

    H2("Paso 6: Preparación para la Demo"),
    P("Usuario de demostración: admin@ojocamba.bo, contraseña admin123 (roles admin y moderador), creado por backend/ms-auth/src/seed.ts. Datos de prueba: backend/ms-register/src/seed.ts genera miles de reportes distribuidos en coordenadas reales de Santa Cruz de la Sierra a lo largo de varios meses, cubriendo los estados Reportado, Aceptado, EnTrabajo, ValidacionEnCampo y Finalizado, lo que garantiza que el Dashboard muestre las categorías de casos_por_estado y una tasa de resolución representativa desde el primer arranque (Figura 1)."),
    P("El equipo ejecutó el flujo completo (login → revisar pendientes → aceptar/agrupar → cerrar caso → ver Dashboard con filtro de fechas) varias veces antes de la sesión de defensa, conforme a la recomendación de la guía de la actividad."),

    H3("Plan B ante fallas de conexión"),
    Bullet("Si la base de datos de PostgreSQL no responde: levantar el stack con pnpm docker:dev (docker-compose ya incluye PostgreSQL con datos persistidos en volumen) y reintentar; el backend ya implementa reintentos de conexión con logging."),
    Bullet("Si el entorno de red de la sala de defensa bloquea Docker: las Figuras 1 y 2 de este informe ya documentan el Dashboard funcionando con datos reales, como respaldo visual verificable sin depender de una demo en vivo."),
    Bullet("Si un microservicio individual no inicia: el Gateway de Status (gateway-status, HU-15) permite verificar en segundos cuál servicio falló, acotando el diagnóstico en vivo frente al docente."),

    H2("Burndown Chart — Sprint 3"),
    P("Sprint corto de integración: 7 story points comprometidos en 3 ítems, ejecutados en 4 días."),
    ...TablaTitulo(11, "Sprint Backlog del Sprint 3 — estado inicial (7 SP)"),
    Tbl([1400, 4360, 1000, 2600], [
        rowT([hc("Ítem", 1400), hc("Descripción", 4360), hc("SP", 1000), hc("Responsable", 2600)]),
        rowT([bc("HU-18", 1400, { bold: true }), bc("Dashboard de métricas clave (KPIs + 4 gráficos Recharts)", 4360), bc("3", 1000, { center: true }), bc("Gerson Alvarado (backend) / Jhoel Cruz (frontend)", 2600)]),
        rowT([bc("TD-02", 1400, { bold: true }), bc("Filtros dinámicos de fecha en GET /admin/dashboard/kpis", 4360), bc("2", 1000, { center: true }), bc("Gerson Alvarado", 2600)]),
        rowT([bc("TD-03", 1400, { bold: true }), bc("12 casos de prueba de integración + preparación de demo", 4360), bc("2", 1000, { center: true }), bc("Jonathan Arrieta / Alexis Santiváñez", 2600)]),
        rowT([bc("TOTAL", 1400, { bold: true, fill: "efebe4" }), bc("", 4360, { fill: "efebe4" }), bc("7", 1000, { center: true, bold: true, fill: "efebe4" }), bc("", 2600, { fill: "efebe4" })]),
    ]),
    Blank(),
    ...TablaTitulo(12, "Burndown Chart Sprint 3 — SP restantes, ideal vs. real (27–30 de junio de 2026)"),
    Tbl([1800, 1500, 1500, 4560], [
        rowT([hc("Día", 1800), hc("Ideal (SP rest.)", 1500), hc("Real (SP rest.)", 1500), hc("Nota", 4560)]),
        rowT([bc("Día 0 (27 jun)", 1800), bc("7", 1500, { center: true }), bc("7", 1500, { center: true }), bc("Sprint Planning corto; se reutiliza el Dashboard backend ya iniciado durante el Sprint 2", 4560)]),
        rowT([bc("Día 1 (28 jun)", 1800), bc("5", 1500, { center: true }), bc("7", 1500, { center: true }), bc("Construcción de los 4 gráficos Recharts en curso; nada cerrado aún", 4560)]),
        rowT([bc("Día 2 (29 jun)", 1800), bc("4", 1500, { center: true }), bc("4", 1500, { center: true }), bc("HU-18 (Dashboard) y TD-02 (filtros de fecha) completados el mismo día", 4560)]),
        rowT([bc("Día 3 (30 jun, AM)", 1800), bc("2", 1500, { center: true }), bc("2", 1500, { center: true }), bc("TD-03 en curso: documentación de los 12 casos de prueba", 4560)]),
        rowT([bc("Día 4 (30 jun, PM)", 1800), bc("0", 1500, { center: true }), bc("0", 1500, { center: true }), bc("Cierre técnico; Sprint Review y defensa oral dentro de la ventana institucional 19:03–21:03", 4560)]),
    ]),
    Blank(),

    H2("Sprint Review Final y Retrospectiva del Proyecto (30 de junio de 2026)"),
    P("La Sprint Review final integra la demostración acumulada de los tres sprints del proyecto: autenticación y mapa de calor H3 (Sprint 1), moderación, gestión de Casos de Obra y CRUD de negocio (Sprint 2), y Dashboard de soporte a la decisión con filtros dinámicos (Sprint 3). Las 21 historias de usuario de los tres sprints (26 + 27 + 7 = 60 SP del total de 73 SP del Product Backlog) se demuestran en un único recorrido continuo: login → mapa de calor → registrar reporte → bandeja de moderación → aceptar y agrupar → bitácora de campo → cerrar caso → Dashboard filtrado por fecha."),
    ...TablaTitulo(13, "Velocidad del equipo por Sprint — referencia para retrospectiva de proceso"),
    Tbl([2340, 2340, 2340, 2340], [
        rowT([hc("Sprint", 2340), hc("SP comprometidos", 2340), hc("SP completados", 2340), hc("% Sprint Goal cumplido", 2340)]),
        rowT([bc("Sprint 1", 2340, { bold: true }), bc("26", 2340, { center: true }), bc("26", 2340, { center: true }), bc("100%", 2340, { center: true })]),
        rowT([bc("Sprint 2", 2340, { bold: true }), bc("27", 2340, { center: true }), bc("27", 2340, { center: true }), bc("100%", 2340, { center: true })]),
        rowT([bc("Sprint 3", 2340, { bold: true }), bc("7", 2340, { center: true }), bc("7", 2340, { center: true }), bc("100%", 2340, { center: true })]),
    ]),
    Blank(),

    H3("Retrospectiva del Proyecto — Lecciones Aprendidas"),
    ...TablaTitulo(14, "Retrospectiva final — lecciones de los tres sprints"),
    Tbl([3120, 3120, 3120], [
        rowT([hc("Qué funcionó", 3120), hc("Qué mejorar", 3120), hc("Acción concreta", 3120)]),
        rowT([bc("Compartir entidades TypeORM en libs/common evitó el desfase de esquema entre ms-register y ms-admin durante los tres sprints", 3120), bc("El cronograma institucional (cierre de Actividad 6 y 7 con días de diferencia) obligó a comprimir el Sprint 3 respecto al plan original de la Actividad 4", 3120), bc("Para futuros proyectos, fijar primero las fechas de Moodle y derivar el Gantt interno a partir de ellas, no al revés", 3120)]),
        rowT([bc("La máquina de estados (EstadoReporte) simplificó tanto el CRUD como el Dashboard: las mismas condiciones NOT IN (Rechazado, Finalizado) sirven para \"activos\" en ambos módulos", 3120), bc("La validación de entrada combina DTOs no siempre enforced globalmente con guard clauses manuales en el servicio", 3120), bc("TD-05: evaluar la activación de un ValidationPipe global una vez verificada la compatibilidad de cada DTO con los payloads reales del frontend", 3120)]),
        rowT([bc("Recharts permitió alcanzar 4 tipos de gráfico y filtros dinámicos con cambios acotados a 2 archivos de frontend y 1 de backend", 3120), bc("La suite de pruebas automatizadas (Jest) cubre unidades de admin.service.ts, incluyendo el filtro de fechas, pero no integra el flujo HTTP completo", 3120), bc("Backlog para una eventual Actividad 8: suite Playwright que cubra los 12 casos de integración hoy documentados manualmente", 3120)]),
    ]),
    PageBreakP(),
];

module.exports = { desarrollo2 };
