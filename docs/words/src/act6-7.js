const fs = require('fs');
const {
    Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
    LevelFormat, Header, PageNumber, F, S, L,
} = require('./actividad6-7/helpers');

const { portada, resumen, intro, marco } = require('./actividad6-7/portada');
const { desarrollo1 } = require('./actividad6-7/desarrollo1');
const { desarrollo2 } = require('./actividad6-7/desarrollo2');
const { resultados, conclusiones, referencias } = require('./actividad6-7/resultados');
const { anexos } = require('./actividad6-7/anexos');

const doc = new Document({
    creator: "Equipo Ojo Camba",
    title: "Actividades 6 y 7 — Sprint 2 y Sprint 3 — Ojo Camba",
    styles: {
        default: { document: { run: { font: F, size: S } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, font: F },
                paragraph: { spacing: { before: 240, after: 240, line: L }, outlineLevel: 0, alignment: AlignmentType.CENTER },
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, font: F },
                paragraph: { spacing: { before: 240, after: 120, line: L }, outlineLevel: 1 },
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: S, bold: true, italics: true, font: F },
                paragraph: { spacing: { before: 200, after: 100, line: L }, outlineLevel: 2 },
            },
        ],
    },
    numbering: {
        config: [{
            reference: "bullets",
            levels: [{
                level: 0, format: LevelFormat.BULLET, text: "•",
                alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            }],
        }],
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ children: [PageNumber.CURRENT], font: F, size: S })],
                })],
            }),
        },
        children: [
            ...portada, ...resumen, ...intro, ...marco,
            ...desarrollo1, ...desarrollo2,
            ...resultados, ...conclusiones, ...referencias, ...anexos,
        ],
    }],
});

const OUT_DIR = 'out/word base';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

Packer.toBuffer(doc).then((buffer) => {
    const outPath = `${OUT_DIR}/Actividad 6-7 (revisado).docx`;
    fs.writeFileSync(outPath, buffer);
    console.log(`OK -> ${outPath}`);
}).catch((err) => {
    console.error('ERROR generando el documento:', err);
    process.exitCode = 1;
});
