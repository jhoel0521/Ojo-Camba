'use strict';
const {
    Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle,
    ShadingType, Header,
    ImageRun, PageBreak,
} = require('docx');
const path = require('path');
const fs   = require('fs');

const NAVY   = '0E2841';
const ORANGE = 'E97132';
const GREY   = 'F2F2F2';
const FONT   = 'Times New Roman';

// Colores de fondo para celdas de código
const CODE_BG = 'F4F4F4';

const logoPath = path.join(__dirname, '../../recursos/upds_logo.jpg');
const logoData = fs.readFileSync(logoPath);

// ── Tipografía base ──────────────────────────────────────────────────────────
const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 24, ...opts });

const P = (text, opts = {}) => new Paragraph({
    children: [run(text)],
    spacing: { after: 200 },
    style: 'Normal',
    ...opts,
});

const PMix = (parts, opts = {}) => new Paragraph({
    children: parts.map(p =>
        typeof p === 'string' ? run(p) : run(p.text, { bold: p.bold, italics: p.italics, underline: p.underline ? {} : undefined })
    ),
    spacing: { after: 200 },
    ...opts,
});

const Ref = (text) => new Paragraph({
    children: [run(text)],
    spacing: { after: 200 },
    indent: { left: 720, hanging: 720 },
    style: 'Normal',
});

// ── Encabezados APA 7 ────────────────────────────────────────────────────────
const H1 = (text) => new Paragraph({
    children: [run(text, { bold: true })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
});

const H2 = (text) => new Paragraph({
    children: [run(text, { bold: true })],
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 300, after: 160 },
});

const H3 = (text) => new Paragraph({
    children: [run(text, { bold: true, italics: true })],
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
});

// ── Bullet simple ────────────────────────────────────────────────────────────
const Bullet = (text) => new Paragraph({
    children: [run(text)],
    bullet: { level: 0 },
    spacing: { after: 120 },
});

const BulletMix = (parts) => new Paragraph({
    children: parts.map(p =>
        typeof p === 'string' ? run(p) : run(p.text, { bold: p.bold, italics: p.italics })
    ),
    bullet: { level: 0 },
    spacing: { after: 120 },
});

const PageBreakP = () => new Paragraph({ children: [new PageBreak()] });
const Blank = () => new Paragraph({ children: [run('')], spacing: { after: 0 } });

// ── Celdas de tabla ─────────────────────────────────────────────────────────
const THIN = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const cellBorder = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const hc = (text, w, opts = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { type: ShadingType.SOLID, color: NAVY },
    borders: cellBorder,
    children: [new Paragraph({
        children: [run(text, { bold: true, color: 'FFFFFF', size: opts.sz || 20 })],
        alignment: AlignmentType.CENTER,
    })],
});

const bc = (text, w, opts = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: cellBorder,
    shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
    children: [new Paragraph({
        children: [run(text, { bold: opts.bold, color: opts.color, size: opts.sz || 20 })],
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40 },
    })],
});

// Celda con bloque de código (monospace)
const codeCell = (lines, w) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: cellBorder,
    shading: { type: ShadingType.SOLID, color: CODE_BG },
    children: lines.map(l => new Paragraph({
        children: [new TextRun({ text: l, font: 'Courier New', size: 18 })],
        spacing: { after: 0 },
    })),
});

// ── Imagen placeholder ───────────────────────────────────────────────────────
const ImgLogo = (w = 1500000, h = 500000) => new ImageRun({
    type: 'jpg', data: logoData, transformation: { width: w / 9525, height: h / 9525 },
});

const IMG_DIR = path.join(__dirname, 'IMG');

// Carga una imagen de IMG/ y la devuelve como ImageRun centrado.
// widthCm: ancho en cm (alto se calcula automáticamente respetando aspect ratio si no se da).
const Img = (filename, widthCm = 14, caption = '') => {
    const imgPath = path.join(IMG_DIR, filename);
    if (!fs.existsSync(imgPath)) {
        console.warn(`[WARN] Imagen no encontrada: ${filename}`);
        return [new Paragraph({ children: [new TextRun({ text: `[Figura pendiente: ${filename}]`, italics: true, color: 'FF0000' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } })];
    }
    const data = fs.readFileSync(imgPath);
    const ext = path.extname(filename).slice(1).toLowerCase().replace('jpg', 'jpeg');
    const widthEMU = Math.round(widthCm * 360000);
    const elems = [
        new Paragraph({
            children: [new ImageRun({ type: ext, data, transformation: { width: widthCm * 37.8, height: widthCm * 37.8 * 0.6 } })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
        }),
    ];
    if (caption) elems.push(new Paragraph({
        children: [new TextRun({ text: caption, italics: true, size: 20 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
    }));
    return elems;
};

// ── Header APA ───────────────────────────────────────────────────────────────
const buildHeader = (title) => new Header({
    children: [new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), font: FONT, size: 20, bold: true })],
        alignment: AlignmentType.RIGHT,
    })],
});

// ── Exportar ─────────────────────────────────────────────────────────────────
module.exports = {
    Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
    Header, ImageRun, PageBreak,
    NAVY, ORANGE, GREY,
    run, P, PMix, Ref, H1, H2, H3, Bullet, BulletMix,
    PageBreakP, Blank, hc, bc, codeCell, ImgLogo, Img, buildHeader,
};
