'use strict';
const {
    Paragraph, TextRun, AlignmentType,
    ImageRun, P, H1, Blank, PageBreakP, run, ImgLogo, NAVY, ORANGE,
} = require('./helpers');

const portada = [
    new Paragraph({
        children: [ImgLogo(1500000, 500000)],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
    }),
    new Paragraph({
        children: [run('UNIVERSIDAD PRIVADA DOMINGO SAVIO', { bold: true, size: 28, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
    }),
    new Paragraph({
        children: [run('INGENIERÍA DE SISTEMAS', { size: 22, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 400 },
    }),
    new Paragraph({
        children: [run('PROYECTO INTEGRADOR DE CARRERA', { bold: true, size: 24, color: ORANGE })],
        alignment: AlignmentType.CENTER, spacing: { after: 160 },
    }),
    new Paragraph({
        children: [run('Actividad 5', { bold: true, size: 32, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
    }),
    new Paragraph({
        children: [run('Implementación del Núcleo Técnico — Sprint 1', { bold: true, size: 28, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
    }),
    Blank(),
    new Paragraph({
        children: [run('Sistema Ojo Camba — Plataforma Ciudadana de Reporte Urbano', { italics: true, size: 24, color: NAVY })],
        alignment: AlignmentType.CENTER, spacing: { after: 600 },
    }),
    new Paragraph({
        children: [run('DOCENTE:', { bold: true, size: 22 })],
        alignment: AlignmentType.LEFT, spacing: { after: 80 },
    }),
    new Paragraph({
        children: [run('Ing. _______________________________', { size: 22 })],
        alignment: AlignmentType.LEFT, spacing: { after: 400 },
    }),
    new Paragraph({
        children: [run('ESTUDIANTE:', { bold: true, size: 22 })],
        alignment: AlignmentType.LEFT, spacing: { after: 80 },
    }),
    new Paragraph({
        children: [run('Jhoel Steven Churata Chambi', { size: 22 })],
        alignment: AlignmentType.LEFT, spacing: { after: 400 },
    }),
    new Paragraph({
        children: [run('Santa Cruz de la Sierra, Bolivia — Julio 2026', { italics: true, size: 22 })],
        alignment: AlignmentType.CENTER, spacing: { after: 0 },
    }),
    PageBreakP(),
];

const resumen = [
    H1('Resumen'),
    P('Este informe documenta la ejecución del Sprint 1 del proyecto integrador Ojo Camba, ' +
      'realizada entre el 24 de junio y el 7 de julio de 2026. El Sprint 1 constituye el núcleo ' +
      'técnico del sistema: comprende la implementación de la base de datos relacional en ' +
      'PostgreSQL con la extensión H3 para indexación geoespacial, el módulo de autenticación ' +
      'basado en JWT con bcryptjs (saltRounds = 10) y refresh tokens de 30 días, el sistema de ' +
      'roles con cuatro perfiles (ciudadano, moderador, técnico, admin), y los tres microservicios ' +
      'principales (ms-auth, ms-register, ms-admin) expuestos a través de un API Gateway REST ' +
      'en NestJS.'),
    P('Se ejecutaron seis Historias de Usuario comprometidas en el Sprint Planning del 23 de junio: ' +
      'HU-01 (mapa de calor H3), HU-02 (registrar reporte), HU-06 (bandeja de moderación), ' +
      'HU-07 (aceptar/rechazar reporte), HU-08 (agrupar en Caso de Obra) y HU-09 (banear dispositivo). ' +
      'La Sprint Review se realizó el 7 de julio de 2026 con demostración funcional al Product Owner. ' +
      'Se adjuntan como anexos los archivos TypeScript reales implementados en el repositorio.'),
    new Paragraph({
        children: [run('Palabras clave: ', { bold: true }), run('Sprint 1, JWT, bcrypt, TypeORM, PostgreSQL, H3, NestJS, microservicios, Scrum.')],
        spacing: { after: 200 },
    }),
    PageBreakP(),
];

module.exports = [...portada, ...resumen];
