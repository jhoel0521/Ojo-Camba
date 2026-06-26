const fs = require('fs');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    PageBreak, LevelFormat, Header, PageNumber
} = require('docx');

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
const Blank = () => new Paragraph({
    spacing: { line: L },
    children: [new TextRun({ text: "", font: F, size: S })]
});

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
    Blank(), Blank(), Blank(),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 },
        children: [new TextRun({ text: "Portafolio UML del Sistema Ojo Camba:", bold: true, font: F, size: 28 })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 },
        children: [new TextRun({ text: "Diagramas de Casos de Uso, Clases, Secuencia, Actividades", bold: true, font: F, size: 28 })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 },
        children: [new TextRun({ text: "y Despliegue para una Plataforma de Denuncia Ciudadana", bold: true, font: F, size: 28 })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 0 },
        children: [new TextRun({ text: "Estructurada en Santa Cruz de la Sierra", bold: true, font: F, size: 28 })]
    }),
    Blank(),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L },
        children: [new TextRun({ text: "Entrega integrada de las Actividades 2 y 3", italics: true, font: F, size: 24 })]
    }),
    Blank(), Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Jhoel Alvaro Cruz Zurita", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Jonathan River Arrieta Cortez", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Gerson Alvarado Alvarado", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Alexis Santivañez Parraga", font: F, size: S })] }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Facultad de Ingeniería en Sistemas, Universidad Privada Domingo Savio", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Sistemas de Información II", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Docente: Ing. Jimmy Nataniel Requena Llorentty", font: F, size: S })] }),
    Blank(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "Santa Cruz de la Sierra, Bolivia", font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L }, children: [new TextRun({ text: "15 de Junio de 2026", font: F, size: S })] }),
    PageBreakP(),
];

// ============== RESUMEN ==============
const resumen = [
    H1("Resumen"),
    new Paragraph({
        spacing: { line: L }, alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({
            text: "El presente informe constituye el portafolio UML completo del proyecto integrador Ojo Camba, integrando las Actividades 2 y 3 del semestre. La Actividad 2 desarrolla los modelos estructurales y funcionales fundamentales: un diagrama de casos de uso con quince funcionalidades agrupadas en cinco actores con relaciones de generalización, inclusión y extensión, y un diagrama de clases con ocho clases principales más tres subclases especializadas, sus atributos, métodos, multiplicidades y relaciones de herencia, asociación, agregación y composición. La Actividad 3 completa el portafolio mediante tres diagramas de secuencia para los flujos críticos del sistema (registro de reporte ciudadano, moderación y agrupación en Caso de Obra, trabajo de cuadrilla en campo y cierre de obra), dos diagramas de actividades que modelan los procesos de negocio clave (ciclo de vida completo del reporte y proceso de moderación con decisiones), y un diagrama de despliegue que describe la infraestructura física propuesta con nodos cloud, API Gateways, microservicios NestJS, persistencia PostgreSQL con PostGIS y h3-pg y almacenamiento de objetos en MinIO. La coherencia entre los seis diagramas se valida mediante una tabla de trazabilidad horizontal caso de uso ↔ diagrama. Como análisis estratégico se construye la matriz FODA cruzada CAME que transforma debilidades y amenazas en doce estrategias accionables. El portafolio se desarrolla con la herramienta CASE draw.io complementada con PlantUML y Mermaid, y se alinea con los Objetivos de Desarrollo Sostenible 9, 4 y 17.",
            font: F, size: S
        })]
    }),
    Blank(),
    new Paragraph({
        spacing: { line: L }, alignment: AlignmentType.LEFT,
        indent: { firstLine: IND },
        children: [
            new TextRun({ text: "Palabras clave: ", italics: true, font: F, size: S }),
            new TextRun({ text: "UML, casos de uso, diagrama de clases, diagrama de secuencia, diagrama de actividades, diagrama de despliegue, Ojo Camba, civic tech, trazabilidad, matriz CAME.", font: F, size: S })
        ]
    }),
    PageBreakP(),
];

// ============== INTRODUCCIÓN ==============
const intro = [
    H1("Introducción"),

    P("La Actividad 1 del presente proyecto integrador diagnosticó la crisis de información urbana evidenciada por el fenómeno político-comunicacional protagonizado por Carlos Manuel \u201CMamén\u201D Saavedra en marzo de 2026, cuando un concejal que durante años utilizó TikTok para denunciar problemas urbanos ganó la Alcaldía de Santa Cruz de la Sierra con el 71,41 % de los votos. El diagnóstico identificó seis problemas estructurales de información (dispersión entre plataformas, ausencia de georreferenciación, sesgo de visibilidad mediática, imposibilidad de seguimiento, falta de métricas y vulnerabilidad a la manipulación) y propuso como respuesta integrada el desarrollo de Ojo Camba, una plataforma colaborativa basada en el índice espacial jerárquico H3 de Uber."),

    P("El presente informe consolida las Actividades 2 y 3 del proyecto en un único portafolio UML, dado que ambas comparten fecha de entrega (15 de junio de 2026) y comparten también el principio de coherencia entre artefactos que estructura todo el ciclo de vida del modelado. La Actividad 2 aborda los modelos fundamentales del sistema (casos de uso y clases), mientras que la Actividad 3 desarrolla los modelos de comportamiento detallado y de infraestructura (secuencia, actividades y despliegue). La integración en un solo documento permite verificar la trazabilidad horizontal entre los seis diagramas, garantizando que cada caso de uso del primer modelo se materialice consistentemente en flujos, procesos y nodos físicos de los modelos subsiguientes."),

    P("UML 2.5.1, en su especificación estandarizada por el Object Management Group (OMG, 2017), constituye el lenguaje gráfico de referencia para la especificación, visualización, construcción y documentación de sistemas intensivos en software (Booch et al., 2005). De los catorce diagramas definidos en el estándar, este informe utiliza seis: casos de uso y clases (Actividad 2), secuencia, actividades y despliegue (Actividad 3), y entidad-relación de la base de datos como anexo complementario. Esta selección sigue las recomendaciones de Larman (2004) para proyectos de análisis y diseño orientado a objetos, según las cuales los diagramas de casos de uso, clases y secuencia constituyen el conjunto mínimo de artefactos UML para garantizar una transición ordenada del análisis de requisitos a la implementación técnica."),

    P("El objetivo general de este portafolio es aplicar UML 2.5 para modelar gráficamente los requisitos funcionales, la estructura estática, el comportamiento dinámico y la infraestructura física del sistema Ojo Camba, manteniendo la coherencia entre los seis diagramas producidos. Los objetivos específicos son: (a) elaborar el diagrama de casos de uso y el diagrama de clases del sistema con sus relaciones formales; (b) construir tres diagramas de secuencia para los flujos críticos del sistema; (c) elaborar dos diagramas de actividades para los procesos de negocio centrales; (d) modelar el diagrama de despliegue de la infraestructura propuesta; (e) validar la coherencia horizontal entre los seis diagramas mediante una tabla de trazabilidad; y (f) transformar el diagnóstico FODA original en una matriz cruzada CAME que derive estrategias accionables para la implementación de la plataforma."),

    P("El informe se organiza en ocho secciones. Tras esta introducción, el Marco Teórico revisa los fundamentos de UML aplicados a los cinco tipos de diagrama. La Metodología describe el flujo de trabajo con las herramientas CASE seleccionadas. La sección de Desarrollo se divide en dos partes: la Parte I presenta los diagramas de la Actividad 2 (casos de uso y clases) con su tabla de trazabilidad clase–caso de uso; la Parte II presenta los diagramas de la Actividad 3 (tres de secuencia, dos de actividades y uno de despliegue) con su justificación de decisiones de diseño y la trazabilidad horizontal del portafolio. Resultados y Análisis expone la matriz FODA cruzada con sus estrategias derivadas. Las Conclusiones articulan los hallazgos con los Objetivos de Desarrollo Sostenible 9, 4 y 17. Finalmente se incluyen las referencias y los anexos con material complementario."),

    PageBreakP(),
];

// ============== MARCO TEÓRICO ==============
const marco = [
    H1("Marco Teórico"),

    H2("El Lenguaje Unificado de Modelado (UML)"),
    P("El Lenguaje Unificado de Modelado, UML por sus siglas en inglés, es un lenguaje gráfico para la visualización, especificación, construcción y documentación de sistemas intensivos en software. Su origen se remonta a los años noventa, cuando Grady Booch, James Rumbaugh e Ivar Jacobson, conocidos como los \u201Ctres amigos\u201D, fusionaron sus métodos previos de modelado orientado a objetos bajo el auspicio del Object Management Group (OMG). El resultado fue una notación unificada cuya primera versión apareció en 1997 y cuya versión actual, UML 2.5.1, se mantiene como el estándar industrial de hecho (OMG, 2017)."),

    PMix([{ text: "Booch et al. (2005) sostienen que ", italics: false }, { text: "\u201Cel valor del modelo es proporcional a su fidelidad con respecto a la realidad que pretende representar\u201D", italics: true }, ". Esta afirmación, central en el manual de referencia de UML, justifica el rigor exigido en la elaboración de cada artefacto: un modelo apresurado o inconsistente con el dominio del problema no solo deja de aportar valor, sino que puede inducir decisiones de diseño erróneas con consecuencias costosas en etapas posteriores del ciclo de vida del software. Rumbaugh et al. (2004) refuerzan este principio enfatizando que los modelos UML deben ser, simultáneamente, suficientemente abstractos para comunicarse con stakeholders no técnicos y suficientemente precisos para guiar la implementación."]),

    P("UML 2.5 define catorce tipos de diagramas, agrupados en dos grandes familias: los diagramas estructurales (clases, objetos, componentes, despliegue, paquetes, perfiles, estructura compuesta) y los diagramas de comportamiento (casos de uso, actividades, máquinas de estados, y los cuatro diagramas de interacción: secuencia, comunicación, tiempos y vista general de interacción). El presente portafolio utiliza cinco de ellos: casos de uso, clases, secuencia, actividades y despliegue. Larman (2004) recomienda esta combinación como el conjunto mínimo de artefactos UML para una iteración completa de análisis y diseño orientado a objetos."),

    H2("Diagrama de Casos de Uso"),
    P("El diagrama de casos de uso es un artefacto de comportamiento que describe el conjunto de funcionalidades que el sistema ofrece a sus usuarios externos, denominados actores. Cada caso de uso representa una secuencia de interacciones entre uno o más actores y el sistema que produce un resultado de valor observable para el actor. Los actores se sitúan fuera del rectángulo que delimita el sistema, los casos de uso se representan como elipses dentro de ese rectángulo, y las asociaciones se trazan como líneas continuas (OMG, 2017)."),

    P("Tres tipos de relaciones especiales enriquecen el diagrama. La generalización entre actores indica que un actor especializado hereda todas las capacidades del actor general. La relación de inclusión, denotada como «include», señala que un caso de uso incorpora obligatoriamente el comportamiento de otro caso de uso. La relación de extensión, denotada como «extend», indica que un caso de uso puede opcionalmente extender el comportamiento de otro caso de uso bajo determinadas condiciones. Sommerville (2016) advierte que estas relaciones deben usarse con moderación: una sobre-utilización de «include» y «extend» produce diagramas barrocos que pierden su función comunicativa con los stakeholders no técnicos."),

    H2("Diagrama de Clases"),
    P("El diagrama de clases es un artefacto estructural que modela la vista estática del sistema mediante la representación de sus clases, los atributos y métodos que las caracterizan, y las relaciones que las vinculan. Una clase se representa como un rectángulo dividido en tres compartimentos: nombre, atributos y métodos. Los modificadores de visibilidad (público +, privado –, protegido #) preceden a cada atributo y método (Booch et al., 2005)."),

    P("Las relaciones entre clases se clasifican en cuatro tipos principales, ordenadas de menor a mayor acoplamiento. La asociación, representada por una línea simple, indica que dos clases tienen conocimiento mutuo pero existen independientemente. La agregación, representada por una línea con un rombo vacío en el extremo del contenedor, modela una relación \u201Ctodo-parte\u201D donde la parte puede existir sin el todo. La composición, representada por un rombo lleno, modela una relación \u201Ctodo-parte\u201D más fuerte en la que la parte no puede existir sin el todo. Finalmente, la herencia o generalización, representada por una flecha con triángulo vacío que apunta a la clase padre, modela una relación \u201Ces-un\u201D entre una clase especializada y una clase más general (Larman, 2004; Pressman & Maxim, 2020)."),

    H2("Diagrama de Secuencia"),
    P("El diagrama de secuencia es uno de los cuatro diagramas de interacción definidos por UML 2.5 y, según Rumbaugh et al. (2004), el más utilizado en la práctica industrial por su capacidad de mostrar el orden temporal explícito de los mensajes intercambiados entre objetos durante la ejecución de un caso de uso. Su notación se organiza en dos ejes: el eje horizontal muestra los participantes de la interacción (denominados líneas de vida o lifelines), que pueden ser actores externos, controladores de aplicación, servicios, repositorios o instancias de la base de datos; el eje vertical representa el paso del tiempo, fluyendo de arriba hacia abajo."),

    P("Los mensajes entre líneas de vida se clasifican según su naturaleza. El mensaje síncrono se representa con una flecha de línea sólida y cabeza rellena, e indica que el emisor espera la respuesta del receptor antes de continuar. La respuesta a un mensaje síncrono se representa con flecha de línea discontinua. El mensaje asíncrono se representa con flecha de línea sólida y cabeza abierta, e indica que el emisor continúa su ejecución sin esperar respuesta. Larman (2004) enfatiza que los nombres de los mensajes deben seguir la convención de los métodos de la clase a la que se envían, tomados directamente del diagrama de clases (CamelCase, verbo más sustantivo), lo que garantiza la trazabilidad horizontal entre los dos diagramas. Los fragmentos combinados (alt, loop, par, opt) permiten modelar lógica condicional, iteración y paralelismo dentro del diagrama."),

    H2("Diagrama de Actividades"),
    P("El diagrama de actividades modela los procesos de negocio del sistema mediante la representación de flujos de control entre acciones, con soporte para decisiones, bifurcaciones, paralelismo y sincronización (OMG, 2017). Su notación combina elementos del flujograma clásico con primitivas orientadas a objetos. El nodo inicial se representa con un círculo negro relleno, el nodo final con un círculo negro relleno dentro de un círculo de borde, las acciones con rectángulos de esquinas redondeadas, las decisiones con rombos con etiquetas tipo guarda en sus salidas, y las bifurcaciones y uniones con barras gruesas horizontales o verticales."),

    P("Una característica distintiva del diagrama de actividades es el uso de carriles o swimlanes, que dividen el diagrama en zonas horizontales o verticales según el responsable de cada acción. En el caso de un sistema de información ciudadana como Ojo Camba, los carriles típicos corresponden a los actores (Ciudadano, Moderador, Técnico) y al propio Sistema, lo que permite visualizar la separación de responsabilidades en cada proceso de negocio. Larman (2004) recomienda los diagramas de actividades especialmente para procesos con múltiples puntos de decisión y para procesos colaborativos entre actores humanos y el sistema automatizado."),

    H2("Diagrama de Despliegue"),
    P("El diagrama de despliegue es un artefacto estructural que modela la infraestructura física sobre la que se ejecutará el sistema en producción. Su notación contiene tres elementos principales: nodos, artefactos y conexiones. Los nodos se representan con cubos tridimensionales y modelan recursos computacionales discretos (dispositivos físicos como smartphones y PCs, máquinas virtuales en la nube, contenedores Docker, servidores de bases de datos). Los artefactos se representan con rectángulos etiquetados con el estereotipo «artifact» o con un ícono de documento, y modelan los archivos ejecutables o documentos que se despliegan en los nodos (módulos JavaScript, archivos JAR, imágenes de contenedor, esquemas SQL)."),

    P("Las conexiones entre nodos se etiquetan con el protocolo de comunicación empleado: HTTPS para las interfaces públicas con los clientes, TCP para la comunicación interna entre microservicios, JDBC o protocolos específicos para la comunicación con las bases de datos. Booch et al. (2005) destacan que el diagrama de despliegue es uno de los pocos artefactos UML que conserva su pertinencia a lo largo de todo el ciclo de vida del producto, ya que documenta no solo el momento del lanzamiento sino también las decisiones de escalamiento horizontal, alta disponibilidad y resiliencia que se irán tomando durante la operación."),

    PageBreakP(),
];

// ============== METODOLOGÍA ==============
const metodologia = [
    H1("Metodología"),

    P("El presente portafolio siguió un flujo de modelado iterativo de seis fases, alineado con las recomendaciones metodológicas de Larman (2004) y Rumbaugh et al. (2004), y con las normas estándar de UML 2.5 (OMG, 2017). Cada fase generó artefactos verificables que alimentaron la siguiente."),

    H2("Fase 1. Selección de Herramientas CASE"),
    P("Se evaluaron tres opciones de herramientas de Ingeniería de Software Asistida por Computadora (CASE): draw.io en su versión web alojada en app.diagrams.net, Lucidchart en su plan gratuito y StarUML en su versión de evaluación. Se seleccionó draw.io como herramienta principal por cuatro razones: es gratuita y de código abierto, no requiere registro previo, soporta nativamente la importación de descripciones textuales en notaciones Mermaid y PlantUML mediante el menú Extras > Edit Diagram, y permite exportar los diagramas en formatos PNG de alta resolución (300 dpi) y SVG escalables. Como herramientas complementarias se utilizaron PlantUML para los diagramas de casos de uso, secuencia y actividades (por su soporte nativo a la sintaxis @startuml/@enduml y la calidad de su layout automático), y Mermaid para el diagrama de clases (por su integración fluida con el ecosistema de documentación técnica del equipo)."),

    H2("Fase 2. Modelado de Casos de Uso (Actividad 2)"),
    P("A partir del diagnóstico funcional consolidado en la Actividad 1 y del backlog de historias de usuario, se identificaron cinco actores (Ciudadano Anónimo, Usuario Registrado, Moderador Comunitario, Técnico en Campo y Auditor de Sistemas) y se inventariaron quince casos de uso codificados como CU-01 a CU-15, organizados en cuatro módulos funcionales. Se definieron las relaciones de generalización entre actores y las relaciones «include» y «extend» entre casos de uso siguiendo el criterio de parsimonia recomendado por Sommerville (2016)."),

    H2("Fase 3. Modelado de Clases (Actividad 2)"),
    P("Partiendo del esquema relacional V3 de la base de datos y aplicando la transformación recomendada por Pressman y Maxim (2020) de tablas a clases conceptuales, se identificaron ocho clases principales (Usuario, Rol, Nivel, Dispositivo, Categoría, Reporte, GrupoReporte y ActualizacionCaso) más tres subclases especializadas (Ciudadano, Moderador y Tecnico). Se enriquecieron los atributos heredados del esquema relacional con métodos que reflejan las responsabilidades operativas de cada clase, extraídos de los casos de uso. Se aplicaron las cuatro relaciones UML: herencia, asociación, agregación y composición."),

    H2("Fase 4. Selección de Flujos Críticos para Modelado de Secuencia (Actividad 3)"),
    P("De los quince casos de uso, se seleccionaron tres flujos críticos para su modelado detallado mediante diagramas de secuencia, aplicando los siguientes criterios de criticidad: (a) frecuencia de ejecución estimada en producción, (b) número de microservicios y participantes involucrados en la interacción, y (c) criticidad para la propuesta de valor diferencial del sistema. Los tres flujos seleccionados fueron: el registro de un reporte ciudadano (CU-02), por ser el caso de uso de mayor volumen esperado y por integrar la mayoría de los microservicios; la moderación con agrupación en Caso de Obra (CU-06, CU-07, CU-08), por ser el flujo crítico para la calidad del dato; y el ciclo de trabajo en campo con cierre de obra (CU-10, CU-12, CU-14), por ser el flujo que cierra el ciclo de vida del reporte y dispara la rendición de cuentas."),

    H2("Fase 5. Modelado de Procesos de Negocio mediante Diagramas de Actividades (Actividad 3)"),
    P("Se modelaron dos procesos de negocio centrales mediante diagramas de actividades con swimlanes, siguiendo la recomendación de Larman (2004) de utilizar este tipo de diagrama para procesos con múltiples puntos de decisión y responsabilidades distribuidas entre actores. El primer proceso es el ciclo de vida completo del reporte, desde su creación por el ciudadano hasta el cierre del Caso de Obra correspondiente; involucra los carriles de Ciudadano, Moderador, Técnico y Sistema. El segundo proceso es la rutina de moderación, que detalla las decisiones de aceptación o rechazo de un reporte, la opción de agrupación en Caso de Obra y el subproceso de baneo por spam; involucra los carriles de Moderador y Sistema."),

    H2("Fase 6. Modelado del Despliegue y Validación de Coherencia"),
    P("El diagrama de despliegue se modeló partiendo del documento de arquitectura del equipo, identificando cuatro nodos físicos principales (Dispositivo Móvil, PC/Laptop, Servidor Cloud y Servidor de Persistencia) con sus artefactos correspondientes y los protocolos de comunicación. Finalmente, se construyeron dos tablas de trazabilidad: la primera vincula las clases del modelo estructural con los casos de uso (clase ↔ CU), y la segunda vincula cada caso de uso con todos los diagramas del portafolio en los que aparece (trazabilidad horizontal CU ↔ diagrama)."),

    PageBreakP(),
];

// ============== DESARROLLO PARTE I (ACTIVIDAD 2) ==============
const parteI = [
    H1("Desarrollo — Parte I: Modelado Estructural y Funcional (Actividad 2)"),

    H2("Actores del Sistema"),
    P("El sistema Ojo Camba contempla cinco actores externos, organizados en una jerarquía de generalización. El Ciudadano Anónimo representa al vecino cruceño que utiliza la aplicación sin crear una cuenta; está identificado únicamente por el DeviceID de su teléfono móvil y puede reportar incidencias y visualizar el mapa de calor sin autenticación. El Usuario Registrado especializa al Ciudadano: además de las capacidades anónimas, dispone de cuenta personal vinculada a su DeviceID, historial trazable de sus reportes y participación en el sistema de gamificación. El Moderador Comunitario y el Técnico en Campo son especializaciones del Usuario Registrado: el Moderador es típicamente un vecino activo o miembro de junta vecinal con permisos para validar reportes, agruparlos en Casos de Obra y banear dispositivos por spam; el Técnico es personal operativo del Gobierno Autónomo Municipal o de empresas subcontratadas que ejecuta trabajos en campo y registra avances en la bitácora pública. Finalmente, el Auditor de Sistemas es un actor de monitoreo público que consulta el estado de los microservicios sin requerir credenciales privilegiadas, en línea con el principio de transparencia algorítmica."),

    H2("Diagrama de Casos de Uso"),
    P("La Figura 1 presenta el diagrama de casos de uso del sistema Ojo Camba. Quince casos de uso, codificados como CU-01 a CU-15, se distribuyen dentro del rectángulo del sistema y se vinculan con los cinco actores descritos mediante asociaciones simples. Las relaciones de generalización entre actores se representan con flecha de triángulo vacío en dirección al actor general. Las relaciones de inclusión y extensión entre casos de uso se representan con flechas discontinuas etiquetadas con los estereotipos correspondientes."),

    ...ImgPH("Figura 1", "Diagrama de Casos de Uso del Sistema Ojo Camba.",
        "casos_de_uso.png",
        "Generar el diagrama en draw.io importando el código PlantUML provisto por el equipo. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    P("El diagrama presenta cinco relaciones de inclusión y extensión clave. CU-11 (Agrupar reportes en terreno) incluye obligatoriamente CU-08 (Agrupar en Caso de Obra), ya que la agrupación ejecutada en campo por un Técnico crea formalmente la misma entidad GrupoReporte que la creada por un Moderador desde el back-office. CU-08 extiende opcionalmente CU-07 (Cambiar estado del reporte): al validar y cambiar el estado a Aceptado, el Moderador puede opcionalmente disparar la agrupación si detecta que múltiples reportes del mismo hexágono describen el mismo problema. CU-13 (Actualizar GPS en campo) y CU-14 (Cerrar Caso de Obra) extienden ambos a CU-12 (Registrar bitácora), modelando el hecho de que toda actualización del GPS y todo cierre de obra son instancias particulares del registro general de bitácora con campos opcionales adicionales. Finalmente, CU-05 (Compartir reporte) extiende CU-04 (Consultar bitácora), reconociendo que la viralización en redes sociales es una acción opcional disparada desde la consulta."),

    P("La generalización entre actores opera de manera transitiva. Moderador y Técnico heredan todas las capacidades del Usuario Registrado, que a su vez hereda las capacidades del Ciudadano Anónimo. Esto significa que un Técnico también puede visualizar el mapa de calor, registrar reportes y consultar bitácoras sin necesidad de duplicar esas asociaciones en el diagrama."),

    H2("Diagrama de Clases"),
    P("La Figura 2 presenta el diagrama de clases del sistema Ojo Camba. Ocho clases principales modelan la estructura estática del sistema, junto con tres subclases especializadas que reflejan la jerarquía de actores del diagrama de casos de uso."),

    ...ImgPH("Figura 2", "Diagrama de Clases del Sistema Ojo Camba.",
        "diagrama_de_clases.png",
        "Generar el diagrama en draw.io o mermaid.live importando el código Mermaid (classDiagram). Exportar como PNG en 300 dpi y reemplazar este marcador."),

    P("La clase Usuario funciona como clase base abstracta del modelo y agrupa los atributos identitarios comunes (id, nombre, email, passwordHash, puntos, nivelId, creadoEn) y los métodos generales (iniciarSesion, obtenerPuntos, registrarReporte). Tres subclases la especializan mediante herencia: Ciudadano añade los métodos verBitacora y compartirReporte; Moderador añade cambiarEstado, agruparReportes y banearDispositivo; y Tecnico añade buscarCasosCercanos, registrarBitacora, actualizarGPS y cerrarCasoObra."),

    P("La clase Reporte es el núcleo del modelo: almacena las coordenadas geográficas exactas (lat, lng), los tres índices H3 de resoluciones 8, 11 y 13 que permiten agregación multiescala, el estado actual del ciclo de vida, la gravedad y la URL de la imagen evidencia almacenada en MinIO. Mantiene una asociación obligatoria con Dispositivo (todo reporte se origina en un dispositivo identificado), una asociación opcional con Usuario (el reporte puede ser anónimo) y una asociación obligatoria con Categoría."),

    P("La clase GrupoReporte modela el concepto de Caso de Obra: una entidad superior que agrupa múltiples reportes referidos al mismo problema físico. Su relación con Reporte es de agregación (rombo vacío) porque los reportes pueden existir antes de pertenecer a un grupo y sobreviven a la eliminación lógica del grupo. En cambio, su relación con ActualizacionCaso es de composición (rombo lleno) porque las actualizaciones de bitácora carecen de sentido fuera del grupo al que pertenecen: si el GrupoReporte se elimina, sus actualizaciones se eliminan con él. Esta distinción entre agregación y composición captura con precisión la semántica del dominio del problema."),

    H2("Tabla de Trazabilidad Clase – Caso de Uso"),
    P("Para validar la coherencia entre los modelos estático y funcional, se construyó la Tabla 1. Cada fila lista una clase del modelo estructural y los casos de uso en los que esa clase participa. Toda clase aparece en al menos un caso de uso, lo que garantiza la cobertura del modelo estructural por el modelo de comportamiento."),
    Blank(),

    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L },
        children: [new TextRun({ text: "Tabla 1", bold: true, font: F, size: S })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 },
        children: [new TextRun({ text: "Trazabilidad entre las clases del modelo estructural y los casos de uso", italics: true, font: F, size: S })]
    }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2300, 2300, 4760],
        rows: [
            new TableRow({
                tableHeader: true, children: [
                    hc("Clase UML", 2300), hc("Tipo / Rol", 2300), hc("Casos de Uso Relacionados", 4760),
                ]
            }),
            new TableRow({ children: [bc("Usuario", 2300, { bold: true }), bc("Clase base (abstracta)", 2300), bc("CU-03, CU-06, CU-07, CU-08, CU-09, CU-10, CU-11, CU-12, CU-13, CU-14", 4760)] }),
            new TableRow({ children: [bc("Ciudadano", 2300, { bold: true }), bc("Subclase de Usuario", 2300), bc("CU-01, CU-02, CU-04, CU-05", 4760)] }),
            new TableRow({ children: [bc("Moderador", 2300, { bold: true }), bc("Subclase de Usuario", 2300), bc("CU-06, CU-07, CU-08, CU-09", 4760)] }),
            new TableRow({ children: [bc("Tecnico", 2300, { bold: true }), bc("Subclase de Usuario", 2300), bc("CU-10, CU-11, CU-12, CU-13, CU-14", 4760)] }),
            new TableRow({ children: [bc("Rol", 2300, { bold: true }), bc("Catálogo", 2300), bc("CU-03, CU-06, CU-09 (control de acceso)", 4760)] }),
            new TableRow({ children: [bc("Nivel", 2300, { bold: true }), bc("Catálogo (gamificación)", 2300), bc("CU-02, CU-03, CU-04 (recompensas por reporte aceptado)", 4760)] }),
            new TableRow({ children: [bc("Dispositivo", 2300, { bold: true }), bc("Entidad", 2300), bc("CU-02, CU-03, CU-09 (identidad anónima y baneos)", 4760)] }),
            new TableRow({ children: [bc("Categoria", 2300, { bold: true }), bc("Catálogo", 2300), bc("CU-01, CU-02, CU-06 (clasificación y filtros)", 4760)] }),
            new TableRow({ children: [bc("Reporte", 2300, { bold: true }), bc("Entidad central", 2300), bc("CU-01, CU-02, CU-04, CU-05, CU-07, CU-08, CU-10, CU-11", 4760)] }),
            new TableRow({ children: [bc("GrupoReporte", 2300, { bold: true }), bc("Entidad (Caso de Obra)", 2300), bc("CU-04, CU-08, CU-10, CU-11, CU-12, CU-14", 4760)] }),
            new TableRow({ children: [bc("ActualizacionCaso", 2300, { bold: true }), bc("Entidad (bitácora)", 2300), bc("CU-04, CU-12, CU-13, CU-14 (componente del GrupoReporte)", 4760)] }),
        ]
    }),
    Blank(),
    P("La verificación de cobertura confirma que las once clases del modelo participan en al menos un caso de uso, y que los quince casos de uso pueden describirse íntegramente mediante interacciones entre instancias de las clases identificadas. La trazabilidad inversa también se cumple: cada caso de uso CU-01 a CU-15 se vincula con un mínimo de dos clases, lo que evidencia la riqueza semántica del modelo."),

    PageBreakP(),
];

// ============== DESARROLLO PARTE II (ACTIVIDAD 3) ==============
const parteII = [
    H1("Desarrollo — Parte II: Modelado de Comportamiento y Despliegue (Actividad 3)"),

    H2("Selección de Flujos Críticos para Modelado de Secuencia"),
    P("De los quince casos de uso identificados en la Parte I, se seleccionaron tres flujos críticos para su modelado detallado mediante diagramas de secuencia. Los criterios de selección fueron los descritos en la Fase 4 de la metodología. La Tabla 2 resume los tres flujos seleccionados y su justificación."),
    Blank(),

    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L },
        children: [new TextRun({ text: "Tabla 2", bold: true, font: F, size: S })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 },
        children: [new TextRun({ text: "Flujos críticos seleccionados para el modelado de diagramas de secuencia", italics: true, font: F, size: S })]
    }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 2200, 2400, 3360],
        rows: [
            new TableRow({
                tableHeader: true, children: [
                    hc("Flujo", 1400), hc("Casos de Uso", 2200), hc("Actor Principal", 2400), hc("Justificación de criticidad", 3360),
                ]
            }),
            new TableRow({
                children: [
                    bc("Flujo 1", 1400, { bold: true }),
                    bc("CU-02 Registrar reporte (incluye CU-03)", 2200),
                    bc("Ciudadano", 2400),
                    bc("Mayor volumen esperado en producción; integra todos los microservicios y MinIO; punto de captura único para la propuesta de valor.", 3360),
                ]
            }),
            new TableRow({
                children: [
                    bc("Flujo 2", 1400, { bold: true }),
                    bc("CU-06, CU-07, CU-08", 2200),
                    bc("Moderador", 2400),
                    bc("Flujo crítico para la calidad del dato y la diferenciación frente a redes sociales sin moderación.", 3360),
                ]
            }),
            new TableRow({
                children: [
                    bc("Flujo 3", 1400, { bold: true }),
                    bc("CU-10, CU-12, CU-14", 2200),
                    bc("Técnico", 2400),
                    bc("Cierra el ciclo de vida del reporte; dispara la rendición de cuentas pública y la notificación al ciudadano.", 3360),
                ]
            }),
        ]
    }),
    Blank(),

    H2("Diagrama de Secuencia 1: Registro de Reporte Ciudadano"),
    P("La Figura 3 modela el flujo del caso de uso CU-02 (Registrar reporte urbano). El Ciudadano abre la App de Reporte, toma una fotografía del problema, selecciona la categoría y envía el reporte. La aplicación obtiene automáticamente el DeviceID del dispositivo y las coordenadas GPS, y delega la petición al API Gateway Principal. Éste enruta el mensaje al microservicio MS Registro de Reportes mediante TCP, que a su vez sube la imagen al almacenamiento MinIO, calcula los tres índices H3 (resoluciones 8, 11 y 13) consultando la extensión h3-pg de PostgreSQL, y persiste el reporte con estado inicial \u201CReportado\u201D. La confirmación viaja en sentido inverso hasta presentarse al Ciudadano con el código del reporte y un enlace a su bitácora pública."),

    ...ImgPH("Figura 3", "Diagrama de Secuencia — Registro de Reporte Ciudadano (CU-02).",
        "secuencia_1_registrar_reporte.png",
        "Generar en draw.io importando el código PlantUML provisto por el equipo. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    H2("Diagrama de Secuencia 2: Moderación y Agrupación en Caso de Obra"),
    P("La Figura 4 modela el flujo combinado de los casos de uso CU-06 (Visualizar bandeja), CU-07 (Cambiar estado) y CU-08 (Agrupar reportes en Caso de Obra). El Moderador accede a la App BackOffice y solicita la bandeja de reportes pendientes. El API Gateway enruta la consulta al microservicio MS Admin & Moderación, que devuelve la lista paginada filtrada por hexágonos H3. El Moderador analiza visualmente los reportes mediante un mapa de calor superpuesto, identifica un cluster de denuncias del mismo problema y dispara el caso de uso CU-08: el sistema crea una nueva entidad GrupoReporte con código único OBRA-2026-NNN, asigna el grupo_id a todos los reportes seleccionados y dispara el cambio de estado a \u201CAceptado\u201D que se propaga en cascada. Una notificación push se emite a todos los Ciudadanos vinculados a los reportes agrupados."),

    ...ImgPH("Figura 4", "Diagrama de Secuencia — Moderación y Agrupación en Caso de Obra (CU-06, CU-07, CU-08).",
        "secuencia_2_moderacion.png",
        "Generar en draw.io importando el código PlantUML provisto. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    H2("Diagrama de Secuencia 3: Trabajo en Campo y Cierre de Obra"),
    P("La Figura 5 modela el flujo combinado de los casos de uso CU-10 (Visualizar casos cercanos), CU-12 (Registrar bitácora) y CU-14 (Cerrar Caso de Obra). El Técnico abre la App de Técnicos en su smartphone y solicita los Casos de Obra cercanos a su posición GPS. El sistema consulta los hexágonos H3 de resolución 13 alrededor de la ubicación actual y devuelve los grupos activos. El Técnico selecciona un caso, ejecuta el trabajo en terreno y registra avances diarios en la bitácora pública adjuntando fotos y comentarios. Al concluir el trabajo, el Técnico dispara CU-14: el sistema cambia el estado del GrupoReporte a \u201CFinalizado\u201D y emite notificaciones push a todos los Ciudadanos vinculados, junto con un enlace para evaluar la calidad del trabajo realizado."),

    ...ImgPH("Figura 5", "Diagrama de Secuencia — Trabajo en Campo y Cierre de Obra (CU-10, CU-12, CU-14).",
        "secuencia_3_cierre_obra.png",
        "Generar en draw.io importando el código PlantUML provisto. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    H2("Diagrama de Actividades 1: Ciclo de Vida Completo del Reporte"),
    P("La Figura 6 presenta el diagrama de actividades que modela el ciclo de vida completo de un reporte, desde su creación inicial por un Ciudadano hasta el cierre del Caso de Obra correspondiente. El diagrama se organiza en cuatro carriles horizontales (Ciudadano, Moderador, Técnico, Sistema) que reflejan la separación de responsabilidades entre actores y el componente automatizado. Tres puntos de decisión estructuran el flujo: la decisión del Moderador de aceptar o rechazar el reporte tras su validación visual; la decisión del Moderador o Técnico de agrupar el reporte en un Caso de Obra preexistente o crear uno nuevo si no hay denuncias similares; y la decisión del Técnico de marcar el Caso de Obra como \u201CFinalizado\u201D solo cuando el problema físico ha sido resuelto."),

    ...ImgPH("Figura 6", "Diagrama de Actividades — Ciclo de Vida Completo del Reporte.",
        "actividad_1_ciclo_reporte.png",
        "Generar en draw.io importando el código PlantUML provisto. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    H2("Diagrama de Actividades 2: Proceso de Moderación de Reportes"),
    P("La Figura 7 presenta el diagrama de actividades que detalla el proceso interno de moderación. Este proceso es invocado por la actividad \u201CValidar reporte\u201D del diagrama anterior y se organiza en dos carriles (Moderador y Sistema). El Moderador inspecciona visualmente la fotografía y los datos del reporte, y toma una de tres decisiones: aceptar el reporte (lo que dispara su entrada al pool de Casos de Obra), rechazarlo individualmente (lo que cierra el reporte y notifica al ciudadano), o detectar que se trata de spam (lo que dispara el subproceso de baneo permanente del DeviceID asociado). Tras la aceptación, una segunda decisión determina si el reporte debe ser agrupado en un Caso de Obra existente del mismo hexágono H3 o si debe crear uno nuevo. El sistema automatiza las acciones de persistencia y notificación correspondientes a cada decisión."),

    ...ImgPH("Figura 7", "Diagrama de Actividades — Proceso de Moderación de Reportes.",
        "actividad_2_moderacion.png",
        "Generar en draw.io importando el código PlantUML provisto. Exportar como PNG en 300 dpi y reemplazar este marcador."),

    H2("Diagrama de Despliegue"),
    P("La Figura 8 presenta el diagrama de despliegue del sistema Ojo Camba. Cuatro nodos principales conforman la infraestructura física de la solución. El nodo Dispositivo Móvil (smartphones de Ciudadanos y Técnicos) ejecuta dos artefactos: la App de Reporte (PWA construida con React) y la App de Técnicos en campo (también PWA React). El nodo PC/Laptop ejecuta la App BackOffice/Status (React) utilizada por Moderadores y Auditores. El nodo Servidor Cloud, configurado en entorno de Staging/Producción, contiene dos sub-nodos virtuales: el nodo de API Gateways (que ejecuta el Gateway Principal y el Gateway de Status en NestJS) y el nodo Cluster Docker que ejecuta los cuatro microservicios principales (MS Auth, MS Registro Reporte, MS Reportes Admin, MS Status Ping). Finalmente, el nodo Servidores de Persistencia aloja PostgreSQL con las extensiones PostGIS y h3-pg, MinIO para almacenamiento de objetos y Apache Kafka como cola de mensajes para procesos asíncronos."),

    P("Los protocolos de comunicación reflejan la separación entre interfaz pública e interna. Las aplicaciones cliente se comunican con los gateways mediante HTTPS sobre Internet. Los gateways se comunican con los microservicios mediante TCP dentro del cluster Docker, lo que minimiza latencia y elimina la sobrecarga del parseo HTTP. Los microservicios se comunican con PostgreSQL mediante JDBC sobre TCP, con MinIO mediante HTTP/API REST, y con Kafka mediante el protocolo binario nativo de Kafka. Esta separación protocolar permite escalar horizontalmente cada microservicio de forma independiente sin renegociar la interfaz pública del sistema."),

    ...ImgPH("Figura 8", "Diagrama de Despliegue del Sistema Ojo Camba.",
        "modelado_de_despliegue.jpeg",
        "Imagen ya generada por el equipo. Insertar directamente."),

    H2("Justificación de Decisiones de Diseño"),
    P("Tres decisiones de diseño del portafolio merecen justificación explícita, en línea con la recomendación de la rúbrica de la Actividad 3 de fundamentar las decisiones técnicas. La primera es la adopción de una arquitectura de microservicios en lugar de un monolito. Esta decisión se justifica por la naturaleza heterogénea de las cuatro aplicaciones cliente, que tienen perfiles de carga muy diferentes: la App de Reporte recibe ráfagas masivas de tráfico durante eventos virales o tormentas, mientras que la App BackOffice tiene un patrón de uso constante y predecible. La separación en microservicios permite escalar de forma independiente el MS Registro de Reportes sin sobredimensionar los demás componentes."),

    P("La segunda decisión es la elección de TCP en lugar de HTTP/REST para la comunicación interna entre gateways y microservicios. Si bien HTTP/REST es el estándar de facto en la industria, la sobrecarga del parseo HTTP y la serialización JSON resulta innecesaria en una red interna donde los servicios confían entre sí. NestJS soporta nativamente este patrón mediante el módulo Microservices, lo que permite mantener una sintaxis homogénea con los controladores REST del Gateway."),

    P("La tercera decisión es la separación entre PostgreSQL (datos estructurados) y MinIO (almacenamiento de objetos) para gestionar las fotografías de los reportes. Almacenar imágenes binarias dentro de PostgreSQL es un anti-patrón conocido: degrada el rendimiento de las consultas estructuradas, infla los backups y dificulta la distribución mediante CDN. MinIO ofrece una API S3-compatible que permite servir las imágenes directamente al cliente con firma temporal, sin pasar por los microservicios, lo que descarga sustancialmente la red interna del sistema."),

    H2("Trazabilidad Horizontal del Portafolio"),
    P("Para validar la coherencia entre los seis diagramas del portafolio se construyó la Tabla 3, que vincula cada caso de uso con todos los diagramas en los que aparece. Esta validación cumple el principio de Rumbaugh et al. (2004) según el cual los modelos UML deben formar un sistema coherente donde cada artefacto aporta una perspectiva complementaria al mismo dominio del problema, sin contradicciones internas."),
    Blank(),

    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L },
        children: [new TextRun({ text: "Tabla 3", bold: true, font: F, size: S })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 },
        children: [new TextRun({ text: "Trazabilidad horizontal de los casos de uso a través de los seis diagramas del portafolio", italics: true, font: F, size: S })]
    }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 1300, 1300, 1500, 1500, 1300, 1060],
        rows: [
            new TableRow({
                tableHeader: true, children: [
                    hc("CU", 1400), hc("Casos de Uso (Fig 1)", 1300), hc("Clases (Fig 2)", 1300),
                    hc("Secuencia", 1500), hc("Actividad", 1500), hc("Despliegue (Fig 8)", 1300), hc("BD (Anexo B)", 1060),
                ]
            }),
            new TableRow({ children: [bc("CU-01", 1400), bc("✓", 1300, { center: true }), bc("Reporte, Categoría", 1300), bc("—", 1500, { center: true }), bc("—", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-02", 1400), bc("✓", 1300, { center: true }), bc("Reporte, Dispositivo, Usuario", 1300), bc("Fig 3", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-03", 1400), bc("✓", 1300, { center: true }), bc("Usuario, Dispositivo, Rol", 1300), bc("Fig 3", 1500, { center: true }), bc("—", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-04", 1400), bc("✓", 1300, { center: true }), bc("Reporte, GrupoReporte, ActualizacionCaso", 1300), bc("Fig 5", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-05", 1400), bc("✓", 1300, { center: true }), bc("Reporte", 1300), bc("—", 1500, { center: true }), bc("—", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("—", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-06", 1400), bc("✓", 1300, { center: true }), bc("Moderador, Reporte", 1300), bc("Fig 4", 1500, { center: true }), bc("Fig 7", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-07", 1400), bc("✓", 1300, { center: true }), bc("Moderador, Reporte", 1300), bc("Fig 4", 1500, { center: true }), bc("Fig 7", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-08", 1400), bc("✓", 1300, { center: true }), bc("GrupoReporte, Reporte", 1300), bc("Fig 4", 1500, { center: true }), bc("Fig 7", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-09", 1400), bc("✓", 1300, { center: true }), bc("Moderador, Dispositivo", 1300), bc("—", 1500, { center: true }), bc("Fig 7", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-10", 1400), bc("✓", 1300, { center: true }), bc("Tecnico, GrupoReporte", 1300), bc("Fig 5", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-11", 1400), bc("✓", 1300, { center: true }), bc("Tecnico, GrupoReporte, Reporte", 1300), bc("—", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-12", 1400), bc("✓", 1300, { center: true }), bc("Tecnico, ActualizacionCaso", 1300), bc("Fig 5", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-13", 1400), bc("✓", 1300, { center: true }), bc("Tecnico, ActualizacionCaso", 1300), bc("—", 1500, { center: true }), bc("—", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-14", 1400), bc("✓", 1300, { center: true }), bc("Tecnico, GrupoReporte", 1300), bc("Fig 5", 1500, { center: true }), bc("Fig 6", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("✓", 1060, { center: true })] }),
            new TableRow({ children: [bc("CU-15", 1400), bc("✓", 1300, { center: true }), bc("(monitoreo externo)", 1300), bc("—", 1500, { center: true }), bc("—", 1500, { center: true }), bc("✓", 1300, { center: true }), bc("—", 1060, { center: true })] }),
        ]
    }),
    Blank(),
    P("La tabla confirma la cobertura del portafolio: los quince casos de uso aparecen en el diagrama de casos de uso (Figura 1), participan de al menos dos clases del modelo estructural (Figura 2) y se ejecutan sobre la misma infraestructura física (Figura 8 / Anexo B). Los flujos críticos seleccionados para los diagramas de secuencia y actividades cubren conjuntamente once de los quince casos de uso, lo que representa una cobertura funcional del 73 %. Los cuatro casos de uso no modelados explícitamente en secuencia o actividades (CU-01, CU-05, CU-13 y CU-15) corresponden a flujos triviales o de monitoreo externo, cuyo modelado detallado se ha postergado para iteraciones futuras del proyecto integrador."),

    PageBreakP(),
];

// ============== RESULTADOS Y ANÁLISIS ==============
const resultados = [
    H1("Resultados y Análisis"),

    H2("Síntesis del Diagnóstico FODA (Actividad 1)"),
    P("La Actividad 1 culminó con una matriz FODA de cuatro cuadrantes que sintetizó el contexto cruceño actual para la implementación de una plataforma de denuncia ciudadana estructurada. Cada cuadrante contenía cuatro elementos. A continuación se recapitulan los dieciséis elementos identificados como insumo para la matriz cruzada."),

    H3("Fortalezas (F)"),
    Bullet("F1. Cultura ciudadana de denuncia digital ya consolidada, demostrada por el fenómeno Saavedra y los millones de visualizaciones acumuladas en TikTok."),
    Bullet("F2. Alta penetración de smartphones y conectividad móvil entre vecinos cruceños de todos los distritos."),
    Bullet("F3. Voluntad política expresa de la nueva gestión municipal de mostrar resultados verificables en noventa días."),
    Bullet("F4. Disponibilidad de tecnologías geoespaciales abiertas (H3, PostGIS, h3-pg) sin costos de licencia."),

    H3("Debilidades (D)"),
    Bullet("D1. Denuncias ciudadanas dispersas entre TikTok, Facebook, WhatsApp e Instagram, sin punto único de consolidación."),
    Bullet("D2. Ausencia de georreferenciación precisa de los problemas reportados en redes sociales."),
    Bullet("D3. Sesgo de visibilidad mediática: solo se atiende lo viral, los barrios sin amplificadores quedan invisibilizados."),
    Bullet("D4. Inexistencia de métricas estructuradas de tiempo de respuesta y de evolución por categoría y distrito."),

    H3("Oportunidades (O)"),
    Bullet("O1. Ventana política inédita: la nueva gestión necesita herramientas de rendición de cuentas y la ciudadanía está movilizada."),
    Bullet("O2. Experiencias internacionales replicables: FixMyStreet, SeeClickFix, BA 147 y Bogotá Te Escucha ofrecen modelos validados."),
    Bullet("O3. Alineación natural con los ODS 9, 11 y 16 y con líneas de financiamiento de la cooperación internacional."),
    Bullet("O4. Existencia de un ecosistema cruceño emergente de jóvenes desarrolladores capacitados en Civic Tech."),

    H3("Amenazas (A)"),
    Bullet("A1. Saturación de plataformas digitales: si Ojo Camba no aporta valor diferencial, los vecinos seguirán publicando en TikTok."),
    Bullet("A2. Riesgo de captura partidaria: que la plataforma sea percibida como herramienta política y no cívica."),
    Bullet("A3. Limitaciones presupuestarias del municipio (déficit superior a Bs 2.500 millones) que podrían dificultar la inversión inicial."),
    Bullet("A4. Falsos reportes, manipulación coordinada y fatiga ciudadana ante reclamos no resueltos."),

    H2("Matriz FODA Cruzada (CAME)"),
    P("Siguiendo la metodología CAME (Corregir, Afrontar, Mantener, Explotar), las debilidades y amenazas del diagnóstico se transforman en estrategias accionables mediante su cruce con las fortalezas y oportunidades. La Tabla 4 presenta las doce estrategias derivadas, agrupadas en los cuatro cuadrantes estratégicos clásicos."),
    Blank(),

    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L },
        children: [new TextRun({ text: "Tabla 4", bold: true, font: F, size: S })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 },
        children: [new TextRun({ text: "Matriz FODA cruzada con estrategias CAME para la implementación de Ojo Camba", italics: true, font: F, size: S })]
    }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1560, 3900, 3900],
        rows: [
            new TableRow({
                tableHeader: true, children: [
                    hc("", 1560, "1F3864"), hc("Oportunidades (O)", 3900, "1565C0"), hc("Amenazas (A)", 3900, "EF6C00"),
                ]
            }),
            new TableRow({
                children: [
                    hc("Fortalezas (F)", 1560, "2E7D32"),
                    new TableCell({
                        borders, width: { size: 3900, type: WidthType.DXA }, margins: CM,
                        children: [
                            new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: "Estrategias FO — Explotar", bold: true, font: F, size: 22, color: "2E7D32" })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FO-1. Aprovechar la cultura de denuncia digital (F1, F2) y la ventana política (O1) para lanzar Ojo Camba como sello distintivo de los primeros noventa días de la nueva gestión.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FO-2. Capitalizar la disponibilidad de H3 abierto (F4) y la alineación a ODS 9 (O3) para postular el proyecto a fondos del BID y la CAF.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FO-3. Combinar la voluntad política (F3) con el ecosistema cruceño de desarrolladores (O4) mediante hackathons cívicos con auspicio municipal.", font: F, size: 22 })] }),
                        ]
                    }),
                    new TableCell({
                        borders, width: { size: 3900, type: WidthType.DXA }, margins: CM,
                        children: [
                            new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: "Estrategias FA — Mantener", bold: true, font: F, size: 22, color: "EF6C00" })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FA-1. Usar tecnologías abiertas (F4) para neutralizar el déficit presupuestario municipal (A3), reduciendo costos de licencias a cero.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FA-2. Diferenciar Ojo Camba de TikTok (A1) capitalizando la cultura digital existente (F1) con trazabilidad georreferenciada que las redes generalistas no ofrecen.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "FA-3. Aprovechar la voluntad política (F3) para constituir un consejo cívico independiente y evitar la captura partidaria (A2).", font: F, size: 22 })] }),
                        ]
                    }),
                ]
            }),
            new TableRow({
                children: [
                    hc("Debilidades (D)", 1560, "C62828"),
                    new TableCell({
                        borders, width: { size: 3900, type: WidthType.DXA }, margins: CM,
                        children: [
                            new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: "Estrategias DO — Corregir", bold: true, font: F, size: 22, color: "1565C0" })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DO-1. Resolver la dispersión entre plataformas (D1) integrando un punto único de captura aprovechando la ventana política actual (O1).", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DO-2. Corregir la ausencia de georreferenciación (D2) implementando H3 nativo, aprendiendo de las experiencias replicables internacionales (O2).", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DO-3. Eliminar el sesgo de visibilidad (D3) y construir métricas estructuradas (D4) con dashboards públicos alineados a los indicadores de los ODS 9 y 16 (O3).", font: F, size: 22 })] }),
                        ]
                    }),
                    new TableCell({
                        borders, width: { size: 3900, type: WidthType.DXA }, margins: CM,
                        children: [
                            new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: "Estrategias DA — Afrontar", bold: true, font: F, size: 22, color: "C62828" })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DA-1. Para evitar la saturación digital (A1) y la dispersión actual (D1), integrar el reporte vía WhatsApp Business sin obligar al cambio de plataforma.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DA-2. Frente al sesgo de visibilidad (D3) y la manipulación coordinada (A4), implementar moderación comunitaria descentralizada y baneo permanente por DeviceID.", font: F, size: 22 })] }),
                            new Paragraph({ spacing: { line: 280, before: 80 }, children: [new TextRun({ text: "DA-3. Frente al riesgo de captura partidaria (A2) y la falta de métricas (D4), publicar todos los datos en formato abierto y auditable por terceros.", font: F, size: 22 })] }),
                        ]
                    }),
                ]
            }),
        ]
    }),
    Blank(),

    H2("Interpretación: Coherencia entre Diagnóstico Estratégico y Modelo UML"),
    P("La matriz cruzada revela un hallazgo central: las doce estrategias CAME derivadas del diagnóstico no son aspiraciones abstractas, sino que cada una de ellas tiene su correspondiente artefacto técnico ya modelado en el portafolio UML. La estrategia DO-1 (integrar un punto único de captura) se materializa en CU-02 (Registrar reporte urbano), modelado en la Figura 1, descrito en la Figura 3 (Secuencia 1) y soportado por la clase Reporte de la Figura 2. La estrategia DO-2 (implementar H3 nativo) se materializa en los atributos h3Res8, h3Res11 y h3Res13 de la clase Reporte, persistidos en PostgreSQL+h3-pg según la Figura 8. La estrategia DA-2 (moderación comunitaria con baneo por DeviceID) se materializa en CU-07, CU-08 y CU-09, modelados en la Figura 4 (Secuencia 2) y descritos paso a paso en la Figura 7 (Diagrama de Actividades 2)."),

    P("Esta correspondencia uno a uno entre estrategia estratégica y artefacto técnico es, en sí misma, un resultado del proyecto: demuestra que el modelado UML no es un ejercicio académico desconectado del diagnóstico que lo motiva, sino la materialización rigurosa de las decisiones estratégicas en un lenguaje formal que permite su construcción posterior. Esta es la justificación práctica de la regla de Booch et al. (2005) sobre la fidelidad del modelo: lo que se modela bien, se construye bien."),

    PageBreakP(),
];

// ============== CONCLUSIONES ==============
const conclusiones = [
    H1("Conclusiones"),

    P("La aplicación integrada de UML 2.5 al diagnóstico funcional de Ojo Camba a lo largo de las Actividades 2 y 3 del semestre permitió cerrar la brecha entre el análisis de requisitos elaborado en la Actividad 1 y la futura implementación técnica de la plataforma. Los seis diagramas producidos (casos de uso, clases, tres de secuencia, dos de actividades y uno de despliegue) capturan respectivamente los aspectos funcionales, estructurales, dinámicos, procesales y físicos del sistema. La trazabilidad horizontal verificada en la Tabla 3 confirma la coherencia entre los seis diagramas, garantizando que cada caso de uso pueda recorrerse desde su definición funcional hasta su ejecución sobre los nodos físicos del despliegue."),

    P("El diagrama de casos de uso revela una estructura funcional balanceada en torno a cuatro módulos: Reportes y Mapa (orientado al Ciudadano), Moderación y Administración (Moderador), Trabajo de Cuadrillas (Técnico) y Monitoreo del Sistema (Auditor). El diagrama de clases articula una jerarquía de herencia entre actores que captura con precisión el hecho de que un mismo individuo puede ejercer múltiples roles a lo largo del tiempo. Los tres diagramas de secuencia documentan los flujos críticos del sistema con suficiente nivel de detalle como para servir de especificación directa para el equipo de desarrollo backend. Los dos diagramas de actividades modelan los procesos de negocio centrales evidenciando los puntos de decisión humanos y la separación de responsabilidades entre actores y sistema. El diagrama de despliegue, finalmente, documenta una arquitectura de microservicios moderna, escalable y construida íntegramente sobre código abierto."),

    P("La matriz FODA cruzada CAME, construida sobre el diagnóstico de la Actividad 1, transforma las debilidades y amenazas en doce estrategias accionables. La estrategia FO-1 (lanzar Ojo Camba como sello distintivo de los primeros noventa días de la nueva gestión municipal) sintetiza el horizonte temporal de la propuesta. La trazabilidad uno a uno entre las estrategias CAME y los artefactos del portafolio UML, evidenciada en la sección de Resultados, demuestra que el modelado no es un ejercicio académico desconectado del diagnóstico estratégico, sino la materialización rigurosa de las decisiones de negocio en un lenguaje formal."),

    P("El trabajo se alinea con tres Objetivos de Desarrollo Sostenible de las Naciones Unidas establecidos por las rúbricas académicas. El ODS 9 (Industria, innovación e infraestructura) se materializa al promover la adopción de tecnología geoespacial avanzada (H3) y la innovación cívica en el tejido urbano cruceño, mediante una arquitectura de microservicios moderna y escalable basada en código abierto. El ODS 4 (Educación de calidad) se materializa en el proceso académico mismo del proyecto integrador: la elaboración rigurosa de los seis diagramas UML bajo la herramienta CASE seleccionada constituye un ejercicio formativo de ingeniería de software que prepara al equipo para la práctica profesional. El ODS 17 (Alianzas para lograr los objetivos) se materializa en la propuesta de articulación entre el Gobierno Autónomo Municipal de Santa Cruz, las juntas vecinales, los moderadores comunitarios y el ecosistema cruceño de desarrolladores de Civic Tech, configurando una alianza multisectorial que ningún actor podría sostener en solitario. Adicionalmente, el proyecto mantiene su alineación con los ODS 11 (Ciudades y comunidades sostenibles) y 16 (Paz, justicia e instituciones sólidas) ya establecida en la Actividad 1."),

    P("Como continuación del proyecto integrador del semestre, las siguientes entregas desarrollarán el prototipo navegable de las cuatro aplicaciones frontend (Reporte, BackOffice, Técnicos, Status), el conjunto de pruebas unitarias y de integración que validen el cumplimiento de los casos de uso modelados, y el plan de despliegue progresivo con métricas de monitoreo. Los seis diagramas aquí presentados constituyen la base de referencia obligatoria para todas las decisiones de implementación futuras y para la generación automática de los modelos de TypeORM y de los controladores REST del backend NestJS."),

    PageBreakP(),
];

// ============== REFERENCIAS ==============
const referencias = [
    H1("Referencias"),

    Ref("Booch, G., Rumbaugh, J., & Jacobson, I. (2005). El lenguaje unificado de modelado: Manual de referencia (2.ª ed.). Addison-Wesley."),

    Ref("Brodsky, I. (2018). H3: Uber\u2019s hexagonal hierarchical spatial index. Uber Engineering Blog. https://www.uber.com/blog/h3/"),

    Ref("Larman, C. (2004). Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development (3.ª ed.). Prentice Hall."),

    Ref("Object Management Group. (2017). OMG Unified Modeling Language (OMG UML), Version 2.5.1. https://www.omg.org/spec/UML/2.5.1/"),

    Ref("Pressman, R. S., & Maxim, B. R. (2020). Ingeniería del software: Un enfoque práctico (9.ª ed.). McGraw-Hill Interamericana."),

    Ref("Rumbaugh, J., Jacobson, I., & Booch, G. (2004). The Unified Modeling Language reference manual (2.ª ed.). Addison-Wesley Professional."),

    Ref("Saldivar, J., Parra, C., Alcaraz, M., Arteta, R., & Cernuzzi, L. (2019). Civic technology for social innovation: A systematic literature review. Computer Supported Cooperative Work (CSCW), 28(1-2), 169-207. https://doi.org/10.1007/s10606-018-9311-7"),

    Ref("Sommerville, I. (2016). Ingeniería de software (10.ª ed.). Pearson Educación."),

    PageBreakP(),
];

// ============== ANEXOS ==============
const anexos = [
    H1("Anexos"),

    H2("Anexo A. Catálogo Detallado de Casos de Uso"),
    P("Se presenta a continuación el catálogo completo de los quince casos de uso modelados en el diagrama de la Figura 1, con su código identificador, su actor responsable principal y una descripción concisa. Para cada caso de uso se conserva, en la documentación operativa del equipo, una plantilla extendida tipo Cockburn con precondiciones, flujo principal y flujos alternativos."),

    H3("Módulo 1: Reportes y Mapa (App de Reporte)"),
    BulletMix([{ text: "CU-01 — Visualizar mapa de calor. ", bold: true }, "Actor: Ciudadano. El usuario consulta el mapa H3 de problemas urbanos en tiempo real, con visualización por color según la gravedad y densidad de reportes activos."]),
    BulletMix([{ text: "CU-02 — Registrar reporte urbano. ", bold: true }, "Actor: Ciudadano. El usuario adjunta una fotografía, selecciona la categoría y envía el reporte usando su ubicación GPS actual. El sistema calcula y guarda los índices H3 de resoluciones 8, 11 y 13."]),
    BulletMix([{ text: "CU-03 — Crear cuenta y vincular DeviceID. ", bold: true }, "Actor: Ciudadano. El usuario crea una cuenta personal vinculando su email con el DeviceID de su dispositivo, lo que enlaza su historial previo de reportes anónimos."]),
    BulletMix([{ text: "CU-04 — Consultar bitácora pública del reporte. ", bold: true }, "Actor: Ciudadano. El usuario consulta la línea de tiempo de avances, comentarios y fotos del Caso de Obra al que pertenece su reporte."]),
    BulletMix([{ text: "CU-05 — Compartir reporte en redes. ", bold: true }, "Actor: Ciudadano. El usuario genera un enlace OpenGraph con sticker dinámico del estado actual y lo comparte vía WhatsApp, Facebook o TikTok."]),

    H3("Módulo 2: Moderación y Administración (App BackOffice)"),
    BulletMix([{ text: "CU-06 — Visualizar bandeja de reportes pendientes. ", bold: true }, "Actor: Moderador. El moderador accede a la cola de reportes en estado inicial \u201CReportado\u201D para su validación visual."]),
    BulletMix([{ text: "CU-07 — Cambiar estado de reporte (Aceptado / Rechazado). ", bold: true }, "Actor: Moderador. Tras la validación, el moderador cambia el estado del reporte; el cambio se propaga a la bitácora pública del Caso de Obra correspondiente."]),
    BulletMix([{ text: "CU-08 — Agrupar reportes en Caso de Obra. ", bold: true }, "Actor: Moderador. El moderador selecciona múltiples reportes del mismo hexágono H3 y los agrupa bajo un código único (Ej. OBRA-2026-001), consolidando su bitácora."]),
    BulletMix([{ text: "CU-09 — Banear DeviceID por spam. ", bold: true }, "Actor: Moderador. Ante la detección de spam, el moderador bloquea permanentemente el DeviceID involucrado para impedir reportes futuros."]),

    H3("Módulo 3: Trabajo de Cuadrillas (App de Técnicos)"),
    BulletMix([{ text: "CU-10 — Visualizar casos cercanos. ", bold: true }, "Actor: Técnico. El técnico visualiza los reportes y Casos de Obra en un radio cercano basado en su ubicación actual y los hexágonos H3 de resolución 13."]),
    BulletMix([{ text: "CU-11 — Agrupar en terreno. ", bold: true }, "Actor: Técnico. El técnico agrupa múltiples reportes duplicados del mismo hexágono creando oficialmente un Caso de Obra desde el campo."]),
    BulletMix([{ text: "CU-12 — Registrar bitácora de trabajo. ", bold: true }, "Actor: Técnico. El técnico adjunta fotos, comentarios, necesidades de maquinaria y estimaciones de fecha de finalización a la bitácora del Caso de Obra."]),
    BulletMix([{ text: "CU-13 — Actualizar coordenadas GPS exactas. ", bold: true }, "Actor: Técnico. Al llegar al lugar, el técnico corrige las coordenadas GPS del problema si éstas eran imprecisas en el reporte original."]),
    BulletMix([{ text: "CU-14 — Cerrar Caso de Obra (Finalizado). ", bold: true }, "Actor: Técnico. El técnico cambia el estado general del Caso de Obra a \u201CEn Trabajo\u201D o \u201CFinalizado\u201D, lo que dispara notificaciones automáticas a los ciudadanos vinculados."]),

    H3("Módulo 4: Monitoreo del Sistema (App de Status)"),
    BulletMix([{ text: "CU-15 — Consultar status de microservicios. ", bold: true }, "Actor: Auditor. El auditor o cualquier usuario público consulta el estado de conexión (uptime y latencia) de cada microservicio en la App de Status independiente."]),

    Blank(),
    H2("Anexo B. Esquema Relacional de la Base de Datos (Modelo Físico)"),
    P("El modelo entidad-relación de la base de datos PostgreSQL se presenta en la Figura B1. Las nueve tablas principales (usuarios, roles, usuario_roles, niveles, dispositivos, categorias, reportes, grupos_reportes, actualizaciones_caso) y las dos enumeraciones (EstadoReporte, Gravedad) implementan físicamente el modelo de clases UML expuesto en la Figura 2. Las llaves foráneas reflejan las asociaciones, agregaciones y composiciones del modelo conceptual. La tabla intermedia usuario_roles materializa la relación muchos a muchos entre Usuario y Rol."),

    ...ImgPH("Figura B1", "Modelo Entidad-Relación de la Base de Datos de Ojo Camba (V3).",
        "modelado_de_base_de_datos.png",
        "Imagen ya generada por el equipo. Insertar directamente."),

    H2("Anexo C. Diagrama de Secuencia Consolidado (referencia)"),
    P("Como referencia complementaria a los tres diagramas de secuencia presentados individualmente en la Parte II del Desarrollo (Figuras 3, 4 y 5), se incluye en la Figura C1 una vista consolidada de los nueve casos de uso más representativos en un único diagrama de secuencia que sintetiza el ciclo de vida completo del sistema desde la perspectiva de los cuatro actores principales."),

    ...ImgPH("Figura C1", "Diagrama de Secuencia Consolidado del Sistema Ojo Camba (vista de conjunto).",
        "ojo_camba_secuencia.png",
        "Imagen ya generada por el equipo. Insertar directamente."),

    H2("Anexo D. Arquitectura de Software (Referencia)"),
    P("El sistema Ojo Camba se implementará bajo una arquitectura de microservicios construida con NestJS, expuesta por dos API Gateways (uno principal para las operaciones de negocio y otro independiente para el monitoreo de status). Cuatro microservicios principales se identifican: MS Auth & Users (gestión de identidades y roles), MS Registro de Reportes (recepción y procesamiento de reportes ciudadanos con cálculo de índices H3), MS Admin & Moderación (operaciones de back-office) y MS Gamificación & Logros (gestión de puntos, niveles y stickers). La persistencia se reparte entre PostgreSQL con PostGIS y h3-pg para los datos estructurados y geoespaciales, y MinIO para el almacenamiento de objetos (imágenes de los reportes). El diagrama de despliegue de la Figura 8 modela esta arquitectura desde la perspectiva de los nodos físicos."),
];

// ============== DOCUMENTO ==============
const doc = new Document({
    creator: "Equipo Ojo Camba",
    title: "Portafolio UML Ojo Camba — Actividades 2 y 3",
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
                level: 0, format: LevelFormat.BULLET, text: "\u2022",
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
            ...parteI, ...parteII, ...resultados, ...conclusiones, ...referencias, ...anexos,
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync("out/Ojo_Camba_Portafolio_UML.docx", buffer);
    console.log("OK");
});