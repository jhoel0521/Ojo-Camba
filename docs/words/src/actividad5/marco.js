'use strict';
const { P, H1, H2, H3, Bullet, Ref, PageBreakP, PMix, run, Paragraph, AlignmentType } = require('./helpers');

const introduccion = [
    H1('Introducción'),
    P('El Sprint 1 del proyecto Ojo Camba materializa la transición del modelado teórico —' +
      'consolidado en la Actividad 4 mediante el Product Backlog de 23 Historias de Usuario, ' +
      'el Planning Poker y la Definition of Done— hacia la implementación técnica ejecutable. ' +
      'Siguiendo el marco Scrum (Schwaber & Sutherland, 2020), el Sprint 1 se planificó el ' +
      '23 de junio de 2026 con un horizonte de diez días hábiles (24 jun – 7 jul 2026).'),
    P('El objetivo de este informe es documentar los resultados del Sprint 1 con evidencia ' +
      'técnica directa: los archivos de código implementados, la estructura de base de datos ' +
      'adoptada, el pipeline de integración continua configurado y el resultado de la prueba ' +
      'automatizada E2E ejecutada con Playwright. Toda referencia a identificadores de historia ' +
      'utiliza la nomenclatura HU-XX conforme a la corrección aplicada en la Actividad 4.'),
    PageBreakP(),
];

const marco = [
    H1('Marco Teórico'),

    H2('JSON Web Token (JWT)'),
    P('Un JSON Web Token (RFC 7519, 2015) es una cadena compacta de tres segmentos separados por ' +
      'puntos (header.payload.signature) que permite transmitir afirmaciones (claims) entre partes ' +
      'de forma firmada digitalmente. El ms-auth de Ojo Camba emite access tokens con expiración ' +
      'de 7 días (configurable mediante la variable de entorno JWT_EXPIRES_IN) firmados con ' +
      'HMAC-SHA256 usando la clave JWT_SECRET. Los refresh tokens (30 días) se almacenan en la ' +
      'tabla refresh_tokens con columnas expires_at y revoked para soporte de logout activo.'),

    H2('bcryptjs y Almacenamiento Seguro de Contraseñas'),
    P('bcrypt (Provos & Mazières, 1999) es una función de hash adaptativa que incorpora un salt ' +
      'aleatorio y un factor de coste (saltRounds) para resistir ataques de fuerza bruta. El valor ' +
      'saltRounds = 10 establece 2^10 = 1024 iteraciones internas, produciendo un hash de 60 ' +
      'caracteres. En el AuthService de ms-auth (línea 42 de auth.service.ts) se invoca ' +
      'bcrypt.hash(dto.password, 10) antes de persistir al campo password_hash de la entidad ' +
      'Usuario. La verificación usa bcrypt.compare(), que extrae el salt del hash almacenado.'),

    H2('Control de Acceso Basado en Roles (RBAC)'),
    P('El modelo RBAC (NIST 800-162, 2014) asigna permisos a roles, y usuarios a roles, ' +
      'desacoplando la identidad del acceso. Ojo Camba implementa cuatro roles: ciudadano ' +
      '(reportar, ver mapa), moderador (validar, agrupar, banear), técnico (ver casos, bitácora) ' +
      'y admin (gestión global). La relación usuario-rol se almacena en la tabla usuario_roles ' +
      'como vínculo many-to-many, gestionada por la entidad UsuarioRol con columnas usuario_id ' +
      'y rol_id.'),

    H2('TypeORM y PostgreSQL con Extensión H3'),
    P('TypeORM es un ORM para TypeScript/NestJS que mapea clases decoradas con @Entity() a ' +
      'tablas relacionales. La extensión H3 (Uber Engineering, 2018) provee la función ' +
      'h3_lat_lng_to_cell(lat, lng, resolution) para convertir coordenadas GPS a identificadores ' +
      'hexagonales jerárquicos. Ojo Camba calcula h3_res_8, h3_res_11 y h3_res_13 al persistir ' +
      'cada reporte, permitiendo búsquedas geoespaciales eficientes y la generación del mapa de ' +
      'calor hexagonal (HU-01).'),

    H2('Arquitectura de Microservicios con NestJS y TCP'),
    P('Los tres microservicios del Sprint 1 (ms-auth en puerto 3001, ms-register en 3002, ' +
      'ms-admin en 3003) se comunican mediante transporte TCP nativo de NestJS, usando el ' +
      'patrón message/send con constantes definidas en libs/common/src/patterns/tcp-patterns.ts. ' +
      'El API Gateway (gateway-principal, puerto 3000) actúa como punto de entrada HTTP único, ' +
      'traduciendo las rutas REST a llamadas RPC internas mediante sendRpc().'),

    H2('Integración Continua con GitHub Actions'),
    P('El archivo .github/workflows/ci.yml define un pipeline de dos etapas (lint → build) ' +
      'que se ejecuta en cada push a la rama dev y en cada Pull Request hacia main. Usa ' +
      'pnpm/action-setup@v4 con pnpm v9 y Node.js 22 (LTS). El job build depende (needs: lint) ' +
      'del éxito del lint, garantizando que solo código sin errores de estilo sea compilado.'),

    H2('Pruebas E2E con Playwright'),
    P('Playwright (Microsoft, 2020) es un framework de automatización de navegadores que permite ' +
      'escribir tests end-to-end tipados en TypeScript. La suite e2e/tests/reporte-y-aceptar.spec.ts ' +
      'orquesta dos contextos de navegador: uno para el ciudadano (app-reporte en localhost:5173) ' +
      'y otro para el moderador (app-backoffice en localhost:5174), verificando el flujo completo ' +
      'de creación y aceptación de un reporte ciudadano.'),

    PageBreakP(),
];

module.exports = [...introduccion, ...marco];
