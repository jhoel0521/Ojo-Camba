'use strict';
const { P, H1, H2, Bullet, Ref, PageBreakP, PMix, run, Paragraph, AlignmentType } = require('./helpers');

const conclusiones = [
    H1('Conclusiones'),
    P('El Sprint 1 de Ojo Camba demostró que la arquitectura de microservicios NestJS con ' +
      'transporte TCP permite implementar autenticación, gestión de reportes y moderación ' +
      'como servicios independientes que se despliegan y escalan por separado, reduciendo el ' +
      'acoplamiento entre dominios funcionales sin sacrificar cohesión interna de cada módulo.'),
    P('El uso de bcryptjs con saltRounds = 10 y el esquema de refresh tokens con revocación ' +
      'activa (columna revoked en refresh_tokens) satisface los requisitos de seguridad de ' +
      'contraseñas de NIST SP 800-63B (2017): resistencia a ataques de diccionario mediante ' +
      'hash adaptativo y capacidad de invalidar sesiones sin requerir expiración del access token.'),
    P('La indexación geoespacial H3 en tres resoluciones (8, 11 y 13) —calculada en el ' +
      'servicio ms-register antes de persistir cada reporte— permite consultas de mapa de ' +
      'calor sin joins costosos: un simple GROUP BY h3_res_8 entrega los hexágonos densificados ' +
      'en la resolución correcta para el zoom actual de la aplicación ciudadana.'),
    P('La prueba E2E automatizada con Playwright, ejecutada sobre el flujo completo ' +
      'ciudadano → moderador, constituye la evidencia objetiva de que las seis Historias de ' +
      'Usuario del Sprint 1 cumplen los criterios de aceptación acordados en el Sprint Planning ' +
      'del 23 de junio de 2026, sin depender de pruebas manuales subjetivas.'),
    PageBreakP(),
];

const referencias = [
    H1('Referencias'),
    Ref('Forsgren, N., Humble, J., & Kim, G. (2018). Accelerate: The science of lean software and DevOps. IT Revolution Press.'),
    Ref('Microsoft. (2020). Playwright: Fast and reliable end-to-end testing for modern web apps. Microsoft Corporation. https://playwright.dev/'),
    Ref('National Institute of Standards and Technology. (2014). Role-based access control (NIST Special Publication 800-162). U.S. Department of Commerce. https://doi.org/10.6028/NIST.SP.800-162'),
    Ref('National Institute of Standards and Technology. (2017). Digital identity guidelines: Authentication and lifecycle management (NIST Special Publication 800-63B). U.S. Department of Commerce. https://doi.org/10.6028/NIST.SP.800-63b'),
    Ref('Open Government Partnership (OGP). (2023). Civic technology and open government: A global review. OGP Secretariat. https://www.opengovpartnership.org/'),
    Ref('Provos, N., & Mazières, D. (1999). A future-adaptable password scheme. Proceedings of the 1999 USENIX Annual Technical Conference, 81–91.'),
    Ref('RFC 7519. (2015). JSON Web Token (JWT). Internet Engineering Task Force. https://datatracker.ietf.org/doc/html/rfc7519'),
    Ref('Schwaber, K., & Sutherland, J. (2020). La guía de Scrum: La guía definitiva de Scrum — Las reglas del juego. Scrum.org. https://scrumguides.org/'),
    Ref('Uber Engineering. (2018). H3: Uber\'s hexagonal hierarchical spatial index. Uber Technologies. https://www.uber.com/blog/h3/'),
    PageBreakP(),
];

module.exports = [...conclusiones, ...referencias];
