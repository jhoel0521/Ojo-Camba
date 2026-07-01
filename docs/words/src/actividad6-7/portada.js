const path = require('path');
const { P, H1, H2, PageBreakP, Blank, LogoImg, F, S, L } = require('./helpers');
const { Paragraph, TextRun, AlignmentType } = require('docx');

const CenterP = (text, opts = {}) => new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { line: L, after: opts.after ?? 0 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, font: F, size: opts.size || S })],
});

const LOGO = path.join(__dirname, '..', '..', 'recursos', 'upds_logo.jpg');

const portada = [
    Blank(),
    LogoImg(LOGO, 130),
    CenterP("UNIVERSIDAD PRIVADA DOMINGO SAVIO", { bold: true, size: 28 }),
    CenterP("INGENIERÍA DE SISTEMAS", { size: 24 }),
    CenterP("PROYECTO INTEGRADOR DE CARRERA", { size: 24 }),
    Blank(),
    CenterP("Actividades 6 y 7", { bold: true, size: 28 }),
    CenterP("Sprint 2: Módulos de Negocio y Procesamiento de Datos", { bold: true, size: 26 }),
    CenterP("Sprint 3: Dashboard de Soporte Decisional e Integración Final", { bold: true, size: 26 }),
    Blank(),
    CenterP("Sistema Ojo Camba — Plataforma Ciudadana de Reporte Urbano", { italics: true, size: 24 }),
    Blank(), Blank(),
    CenterP("ASIGNATURA:", { bold: true }),
    CenterP("Sistemas de Información II"),
    CenterP("DOCENTE:", { bold: true }),
    CenterP("Ing. Jimmy Nataniel Requena Llorentty"),
    CenterP("ESTUDIANTES:", { bold: true }),
    CenterP("Gerson Alvarado Alvarado — Product Owner"),
    CenterP("Jhoel Alvaro Cruz Zurita — Scrum Master"),
    CenterP("Jonathan River Arrieta Cortez — Developer"),
    CenterP("Alexis Santiváñez Parraga — Developer"),
    Blank(),
    CenterP("Santa Cruz de la Sierra, Bolivia — 30 de junio de 2026"),
    PageBreakP(),
];

const resumen = [
    H1("Resumen Ejecutivo"),
    P("Este informe documenta la ejecución conjunta del Sprint 2 y el Sprint 3 del proyecto integrador Ojo Camba, correspondientes a las Actividades 6 y 7 de la asignatura Sistemas de Información II, desarrolladas entre el 8 y el 30 de junio de 2026 bajo un calendario institucional comprimido respecto del cronograma original del Acta de Constitución (Actividad 4). Ambas entregas se unifican en un solo documento porque comparten al equipo, la base de código y el principio de continuidad: el Sprint 2 construye los módulos de negocio que el Sprint 3 consume para alimentar el tablero gerencial."),
    P("El Sprint 2 completa la arquitectura en capas (controladores, servicios y repositorios) sobre los microservicios ms-register y ms-admin, con CRUD funcionales para Reportes, Casos de Obra (GrupoReporte), Dispositivos y Usuarios —paginados y validados mediante Data Transfer Objects de class-validator— y siete consultas SQL avanzadas con JOIN, GROUP BY, HAVING y subconsultas que alimentan los reportes gerenciales. El borrado físico fue descartado deliberadamente en favor de una máquina de estados (Reportado → Aceptado / Rechazado → … → Finalizado) que preserva la trazabilidad pública, principio fundacional de una plataforma de transparencia ciudadana. El Sprint 3 culmina el sistema con un Dashboard de soporte a la decisión: ocho indicadores clave visualizados en cuatro tipos de gráfico mediante la librería Recharts (barras, pastel, dona y radial), con filtro dinámico de rango de fechas sobre el endpoint GET /admin/dashboard/kpis, verificado con capturas reales del sistema en ejecución. Se documentaron doce casos de prueba de integración cubriendo autenticación, CRUD y dashboard, y la colección Postman se amplió a 34 endpoints documentados. Ambos sprints cierran con Burndown chart, Sprint Review y Retrospectiva."),
    new Paragraph({
        spacing: { line: L }, alignment: AlignmentType.LEFT, indent: { firstLine: 720 },
        children: [
            new TextRun({ text: "Palabras clave: ", italics: true, font: F, size: S }),
            new TextRun({ text: "Sprint 2, Sprint 3, arquitectura en capas, CRUD, SQL avanzado, Postman, Dashboard, Recharts, KPI, Scrum, Ojo Camba.", font: F, size: S }),
        ],
    }),
    PageBreakP(),
];

const intro = [
    H1("Introducción"),
    P("El proyecto integrador Ojo Camba completó en la Actividad 5 (Sprint 1) su núcleo técnico: autenticación JWT con bcryptjs, el sistema de roles y los tres microservicios fundacionales (ms-auth, ms-register, ms-admin) comunicados por transporte TCP detrás de un API Gateway NestJS. Las Actividades 6 y 7 —Sprint 2 y Sprint 3 respectivamente— se documentan en un único informe por la misma razón que llevó a unificar las Actividades 2 y 3 del portafolio UML: comparten equipo, base de código y, sobre todo, una relación de dependencia directa. El Sprint 2 construye los módulos de negocio (CRUD completos, consultas SQL gerenciales, validaciones y documentación de API) que el Sprint 3 consume para alimentar el Dashboard de soporte a la decisión, sin el cual los datos operacionales nunca se transforman en información para la toma de decisiones gerenciales."),
    P("Conforme a los plazos institucionales de la plataforma académica, el Sprint 2 se ejecutó entre el 8 y el 29 de junio de 2026, y el Sprint 3 se ejecutó como un sprint corto de integración y cierre entre el 27 y el 30 de junio de 2026, traslapando su arranque con la recta final del Sprint 2. Esta compresión respecto del cronograma trimestral original (Acta de Constitución, Actividad 4) es una adaptación ágil legítima: gran parte de la capa de cálculo de indicadores para el Dashboard reside en el mismo microservicio (ms-admin) que los módulos de moderación del Sprint 2, por lo que el equipo decidió desarrollarla de forma incremental en paralelo y reservar el cierre del Sprint 3 para la capa de visualización, los filtros dinámicos, las pruebas de integración y la preparación de la demo final."),
    P("Este informe documenta nueve evidencias técnicas directas: la arquitectura en capas aplicada a los microservicios ms-register y ms-admin, los CRUD de las cuatro entidades de negocio principales, siete consultas SQL avanzadas para reportes gerenciales, la colección Postman ampliada a 34 endpoints, las validaciones con Data Transfer Objects, el Burndown chart de ambos sprints, el Dashboard con ocho indicadores en cuatro tipos de gráfico con filtro dinámico de fechas —verificado con capturas de pantalla reales del sistema en ejecución—, doce casos de prueba de integración documentados, y la Definition of Ready con criterios de aceptación Given/When/Then para los casos de implementación centrales de ambos sprints."),
    PageBreakP(),
];

const marco = [
    H1("Marco Teórico"),
    H2("Arquitectura en Capas y el Patrón Repository"),
    P("La arquitectura en capas (layered architecture) separa un sistema en particiones horizontales con responsabilidades distintas: la capa de presentación recibe las solicitudes externas, la capa de lógica de negocio aplica las reglas del dominio, y la capa de acceso a datos encapsula la persistencia (Pressman & Maxim, 2020). En NestJS, esta separación se materializa mediante el trío Controller–Service–Repository: el controlador traduce el protocolo de transporte (HTTP o TCP) a llamadas de método, el servicio concentra las reglas de negocio y la orquestación transaccional, y el repositorio (provisto por TypeORM mediante @InjectRepository()) abstrae las sentencias SQL detrás de una interfaz orientada a objetos. Fowler (2002) describe este último como el patrón Repository: media entre el dominio y la capa de mapeo de datos comportándose como una colección de objetos en memoria, lo que permite sustituir o probar la persistencia sin alterar la lógica de negocio."),
    H2("CRUD, Paginación y Borrado Lógico frente a Máquinas de Estado"),
    P("El acrónimo CRUD (Create, Read, Update, Delete) resume las cuatro operaciones elementales sobre una entidad persistente. Larman (2004) recomienda exponer la operación de lectura masiva con paginación (parámetros page y limit que se traducen en cláusulas SQL OFFSET/LIMIT) para acotar el volumen de datos transferido en sistemas con crecimiento no acotado. La práctica del borrado lógico —marcar un registro como inactivo en lugar de eliminarlo físicamente— es una convención común cuando el dominio no exige preservar el historial completo. Sin embargo, Fowler (2002) señala que cuando el dominio sí requiere ese historial, el patrón correcto es una máquina de estados explícita: cada transición queda registrada y es auditable, en lugar de colapsarse en un único indicador booleano activo/inactivo."),
    H2("SQL Avanzado: JOIN, GROUP BY, HAVING y Subconsultas"),
    P("Las consultas de agregación combinan el álgebra relacional con funciones de resumen. La cláusula JOIN combina filas de dos o más tablas según una condición de coincidencia; GROUP BY particiona el conjunto de resultados en grupos sobre los que se aplican funciones de agregación (COUNT, SUM, AVG); HAVING filtra esos grupos después de calculada la agregación —a diferencia de WHERE, que filtra filas individuales antes de agrupar—; y una subconsulta anida una sentencia SELECT dentro de otra para comparar cada grupo contra un valor derivado del propio conjunto de datos, como un promedio general (Elmasri & Navathe, 2017). TypeORM expone el QueryBuilder como una API fluida que genera estas cláusulas de forma programática (createQueryBuilder().innerJoin().groupBy().having()), preservando la seguridad de tipos de TypeScript sin sacrificar el control fino sobre el SQL generado."),
    H2("Validación de Datos con Data Transfer Objects"),
    P("Un Data Transfer Object (DTO) es una clase cuyo único propósito es transportar datos entre procesos o capas, reduciendo el número de llamadas remotas al agrupar varios valores en un solo objeto serializable (Fowler, 2002). La librería class-validator adjunta a cada propiedad del DTO decoradores declarativos (@IsString, @IsInt, @Min, @Max, @IsNotEmpty, @IsOptional) que describen las reglas de negocio mínimas —tipo de dato, rango y obligatoriedad— directamente en el contrato de la API. Cuando una solicitud incumple una regla, NestJS captura la excepción y a través de su filtro de excepciones global devuelve un envoltorio JSON consistente para todos los endpoints ({statusCode, message, error}), lo que cumple el mismo objetivo que un formato estandarizado de errores: que el cliente nunca deba interpretar dos formas distintas de fallo."),
    H2("Documentación de Contratos de API con Postman"),
    P("Una interfaz REST (Representational State Transfer) expone recursos identificados por URL y manipulados mediante los verbos HTTP estándar, de forma uniforme y sin estado entre solicitudes (Fielding, 2000). Documentar exhaustivamente cada endpoint —método, URL, cuerpo de ejemplo y respuesta esperada— constituye el contrato que permite a un equipo frontend o a un integrador externo consumir la API sin inspeccionar el código fuente del backend. Postman formaliza ese contrato como una Collection exportable en JSON, versionable junto al código en el repositorio, con variables de colección que encadenan solicitudes (por ejemplo, propagar el access_token obtenido en login hacia las solicitudes protegidas subsecuentes)."),
    H2("Sistemas de Soporte a la Decisión y Diseño de Dashboards"),
    P("Un Sistema de Soporte a la Decisión (DSS) es una aplicación interactiva basada en computador que ayuda a quienes toman decisiones a utilizar datos y modelos para resolver problemas no estructurados o semiestructurados (Power, 2002). El Dashboard es la interfaz característica de un DSS: condensa los indicadores clave de desempeño (KPI) más importantes en una única pantalla visual. Few (2006) establece tres principios para un Dashboard eficaz: mostrar la información esencial de un vistazo sin necesidad de desplazamiento ni navegación adicional, organizar los indicadores según su importancia relativa para la decisión que apoyan, y elegir el tipo de gráfico —barras para comparar categorías, líneas para tendencias temporales, circular o dona para proporciones de un todo— según la naturaleza del dato, no según la preferencia estética del diseñador."),
    H2("Librerías de Visualización de Datos: Recharts y Chart.js"),
    P("Chart.js es una librería de gráficos basada en el elemento HTML5 canvas, ampliamente usada en aplicaciones que renderizan vistas del lado del servidor o con JavaScript vainilla. Para aplicaciones React, el ecosistema ofrece como alternativa nativa Recharts, una librería de gráficos construida con componentes SVG declarativos que se integran al árbol de React como cualquier otro componente, reaccionando automáticamente a los cambios de estado sin manipulación manual del DOM. Ambas opciones son explícitamente equivalentes para los fines de este proyecto: Ojo Camba, al estar construido íntegramente sobre React, adopta Recharts para mantener un único paradigma declarativo en todo el frontend."),
    H2("Pruebas de Integración"),
    P("Mientras la prueba unitaria verifica un componente aislado, la prueba de integración verifica que dos o más componentes —por ejemplo, un controlador HTTP, un microservicio TCP y la base de datos— colaboran correctamente al ensamblarse (Sommerville, 2016). Una tabla de casos de prueba documenta, por cada escenario, la precondición del sistema, los datos de entrada, el resultado esperado según la especificación, el resultado realmente observado y un veredicto binario (PASS/FAIL), lo que convierte una verificación manual en evidencia objetiva y reproducible para la Sprint Review."),
    H2("Burndown Chart y Ceremonias Scrum"),
    P("El Burndown chart traza, día a día, los story points restantes del Sprint Backlog frente a una línea ideal de avance lineal, permitiendo detectar visualmente desviaciones y bloqueos antes de que comprometan el Sprint Goal (Schwaber & Sutherland, 2020). Su lectura combinada con la Sprint Review (demostración del incremento al Product Owner) y la Retrospectiva (inspección del propio proceso de trabajo) cierra el ciclo de inspección y adaptación que distingue a Scrum de una simple lista de tareas con fecha límite."),
    H2("Definition of Ready y Criterios de Aceptación Given/When/Then"),
    P("La Definition of Ready (DoR) es el conjunto de condiciones que un elemento del Product Backlog debe cumplir antes de poder ser aceptado en un Sprint: requisitos claros, dependencias resueltas y, sobre todo, criterios de aceptación verificables (Rubin, 2012). El formato Gherkin (DADO QUE / CUANDO / ENTONCES) expresa esos criterios como escenarios concretos y ejecutables: precondición del sistema, acción disparada y resultado observable, sin ambigüedad de interpretación entre el equipo de desarrollo y el Product Owner. A diferencia de una descripción narrativa, un escenario Gherkin puede automatizarse directamente como prueba de aceptación, cerrando la brecha entre la especificación funcional y la verificación técnica."),
    PageBreakP(),
];

module.exports = { portada, resumen, intro, marco };
