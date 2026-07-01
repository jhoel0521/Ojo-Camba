const { P, H1, H2, PageBreakP, Blank } = require('./helpers');

const resultados = [
    H1("Resultados y Análisis"),

    H2("Cobertura de la Rúbrica — Actividad 6 (Sprint 2)"),
    P("El sistema implementa cuatro módulos CRUD de negocio (Reportes, Casos de Obra, Dispositivos, Usuarios), todos paginados y validados, con la máquina de estados EstadoReporte cumpliendo el rol funcional del borrado lógico exigido por la rúbrica —decisión justificada explícitamente en el Paso 2 por la naturaleza de transparencia pública del dominio—, y verificados en demo con los doce casos de prueba del Paso 5 del Sprint 3. Se documentan siete consultas SQL con JOIN, GROUP BY, HAVING y subconsulta, superando el mínimo de cinco. La colección Postman documenta 34 endpoints con cuerpos y respuestas de ejemplo, exportada en el repositorio. El Burndown del Sprint 2 registra línea ideal y línea real día a día, con Sprint Review (demo de las 8 historias) y Retrospectiva con tres acciones concretas documentadas en la Tabla 8."),

    H2("Cobertura de la Rúbrica — Actividad 7 (Sprint 3)"),
    P("El Dashboard expone ocho indicadores (superando el mínimo de cinco) en cuatro tipos de gráfico —tarjetas de contador, barras, circular/dona y radial—, con filtro dinámico de fecha funcional sobre GET /admin/dashboard/kpis, verificado con capturas reales (Figuras 1 y 2) y con los casos de prueba 10 a 12, cerrando la brecha entre KPIs estáticos y un verdadero soporte a la decisión filtrable. Los módulos de los tres sprints se integran en un flujo continuo de demo (login → mapa de calor → reportar → moderar → agrupar → bitácora de campo → cerrar caso → Dashboard filtrado), verificado antes de la sesión de defensa. Se documentan doce casos de prueba de integración con veredicto PASS/FAIL, superando el mínimo de diez, cubriendo autenticación, CRUD y Dashboard, además de cinco criterios de aceptación Given/When/Then que formalizan la Definition of Ready de los casos de implementación centrales. La Sprint Review final demuestra el sistema completo y la Retrospectiva del proyecto documenta lecciones aprendidas de los tres sprints con acciones concretas para una eventual Actividad 8."),

    H2("Alineación con los Objetivos de Desarrollo Sostenible"),
    P("El ODS 8 (Trabajo decente y crecimiento económico) se materializa en la profesionalización del flujo de trabajo del equipo: arquitectura en capas, DTOs validados, documentación de API y pruebas de integración son prácticas de ingeniería de software estándar de la industria que el proyecto adopta desde un contexto académico. El ODS 9 (Industria, innovación e infraestructura) se concreta en el Dashboard de soporte a la decisión: transforma datos operacionales dispersos en información gerencial accionable para la gestión de infraestructura urbana. El ODS 12 (Producción y consumo responsables) se refleja en el diseño de la máquina de estados del Sprint 2: al preservar el historial completo de cada Caso de Obra en lugar de borrarlo, el sistema habilita la auditoría y desincentiva la asignación repetida o desperdiciada de recursos municipales sobre el mismo problema. El ODS 17 (Alianzas para lograr los objetivos) se materializa en la colección Postman y el Dashboard filtrable como artefactos que permiten a terceros —periodistas de datos, la academia, auditores municipales— consumir y verificar la información del sistema sin depender exclusivamente del equipo desarrollador."),
    PageBreakP(),
];

const conclusiones = [
    H1("Conclusiones"),
    P("La ejecución conjunta del Sprint 2 y el Sprint 3 demuestra que la arquitectura en capas establecida desde el Sprint 1 escala sin fricción hacia módulos de negocio más complejos: los cuatro CRUD implementados —Reportes, Casos de Obra, Dispositivos y Usuarios— comparten el mismo patrón Controller–Service–Repository y las mismas entidades TypeORM de libs/common, lo que permitió construir el Dashboard del Sprint 3 reutilizando directamente las consultas de agregación del Sprint 2 en lugar de duplicar lógica de acceso a datos."),
    P("La decisión de reemplazar el borrado lógico genérico por una máquina de estados explícita (EstadoReporte) resultó ser más que una alternativa técnica: es una decisión de diseño alineada con el principio fundacional de transparencia pública verificable de Ojo Camba, y simplificó el propio Dashboard, ya que las mismas condiciones de filtrado por estado sirven simultáneamente para el CRUD del Sprint 2 y para los indicadores de \"casos activos\" del Sprint 3."),
    P("El Dashboard con filtro dinámico de fechas —incorporado explícitamente en este ciclo para que los ocho indicadores respondan a un rango seleccionable en lugar de mostrar siempre una ventana fija, y verificado con capturas reales del sistema en ejecución (Figuras 1 y 2)— convierte al sistema en un verdadero Sistema de Soporte a la Decisión en el sentido de Power (2002): el usuario gerencial explora los datos históricos con la misma interfaz que monitorea el estado operativo en tiempo real, sin necesidad de herramientas externas."),
    P("Finalmente, los doce casos de prueba de integración documentados —verificados contra guard clauses reales del código en lugar de asunciones—, los cinco criterios de aceptación Given/When/Then que formalizan la Definition of Ready de los casos de implementación centrales, y la Retrospectiva final del proyecto, que identifica deuda técnica explícita (TD-04 sobre códigos de error tipados, TD-05 sobre ValidationPipe global) en lugar de ocultarla, dejan al proyecto integrador Ojo Camba en condiciones de someterse a una defensa oral fundamentada tanto en la funcionalidad demostrable como en la honestidad técnica sobre sus límites actuales."),
    PageBreakP(),
];

const referencias = [
    H1("Referencias"),
    P("Elmasri, R., & Navathe, S. B. (2017). Fundamentals of database systems (7th ed.). Pearson."),
    P("Few, S. (2006). Information dashboard design: The effective visual communication of data. O'Reilly Media."),
    P("Fielding, R. T. (2000). Architectural styles and the design of network-based software architectures [Tesis doctoral, University of California, Irvine]. https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm"),
    P("Fowler, M. (2002). Patterns of enterprise application architecture. Addison-Wesley."),
    P("Larman, C. (2004). Applying UML and patterns: An introduction to object-oriented analysis and design and iterative development (3rd ed.). Prentice Hall."),
    P("Power, D. J. (2002). Decision support systems: Concepts and resources for managers. Quorum Books."),
    P("Pressman, R. S., & Maxim, B. R. (2020). Software engineering: A practitioner's approach (9th ed.). McGraw-Hill Education."),
    P("Rubin, K. S. (2012). Essential Scrum: A practical guide to the most popular agile process. Addison-Wesley."),
    P("Schwaber, K., & Sutherland, J. (2020). La guía de Scrum: La guía definitiva de Scrum — Las reglas del juego. Scrum.org. https://scrumguides.org/"),
    P("Sommerville, I. (2016). Software engineering (10th ed.). Pearson."),
    PageBreakP(),
];

module.exports = { resultados, conclusiones, referencias };
