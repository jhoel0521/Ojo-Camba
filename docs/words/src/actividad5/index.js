'use strict';
const path    = require('path');
const fs      = require('fs');
const { Packer } = require('docx');

const { Document, buildHeader } = require('./helpers');

const portada   = require('./portada');
const marcoSecs = require('./marco');
const desarrollo = require('./desarrollo');
const cierre    = require('./cierre');
const anexos    = require('./anexos');

const TITLE = 'ACTIVIDAD 5 OJO CAMBA';

const doc = new Document({
    creator: 'Jhoel Churata — Ojo Camba',
    title: 'Actividad 5: Implementación del Núcleo Técnico — Sprint 1',
    description: 'Sprint 1 | 24 jun – 7 jul 2026',
    styles: {
        default: {
            document: { run: { font: 'Times New Roman', size: 24 } },
        },
    },
    sections: [{
        properties: {
            page: {
                margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 },
            },
        },
        headers: { default: buildHeader(TITLE) },
        children: [
            ...portada,
            ...marcoSecs,
            ...desarrollo,
            ...cierre,
            ...anexos,
        ],
    }],
});

const outDir = path.join(__dirname, '../../out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

Packer.toBuffer(doc).then(buf => {
    const outPath = path.join(outDir, 'Ojo_Camba_Actividad5.docx');
    fs.writeFileSync(outPath, buf);
    console.log('OK — out/Ojo_Camba_Actividad5.docx generado');
}).catch(err => {
    console.error('Error generando Actividad 5:', err.message);
    process.exit(1);
});
