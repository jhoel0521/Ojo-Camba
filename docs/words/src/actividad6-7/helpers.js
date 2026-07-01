const fs = require('fs');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
    PageBreak, LevelFormat, Header, PageNumber, ImageRun
} = require('docx');

const F = "Times New Roman";
const CF = "Consolas";
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
const H1 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240, line: L },
    children: [new TextRun({ text: t, bold: true, font: F, size: S })]
});
const H2 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_2, alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120, line: L },
    children: [new TextRun({ text: t, bold: true, font: F, size: S })]
});
const H3 = (t) => new Paragraph({
    heading: HeadingLevel.HEADING_3, alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 100, line: L },
    children: [new TextRun({ text: t, bold: true, italics: true, font: F, size: S })]
});
const Bullet = (t) => new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 0, line: L }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: t, font: F, size: S })]
});
const PageBreakP = () => new Paragraph({ children: [new PageBreak()] });
const Blank = () => new Paragraph({ spacing: { line: L }, children: [new TextRun({ text: "", font: F, size: S })] });

// Bloque de codigo con fondo oscuro y fuente monoespaciada.
const CodeBlock = (lines) => new Paragraph({
    spacing: { after: 0, line: 260 },
    shading: { fill: "2C221C", type: ShadingType.CLEAR, color: "auto" },
    border: { top: border, bottom: border, left: border, right: border },
    children: lines.split('\n').flatMap((ln, i) => i === 0
        ? [new TextRun({ text: ln || " ", font: CF, size: 18, color: "F5F2EB" })]
        : [new TextRun({ break: 1, text: ln || " ", font: CF, size: 18, color: "F5F2EB" })]),
});

const FuenteNota = (t) => new Paragraph({
    spacing: { before: 60, after: 180, line: L }, alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: t, italics: true, font: F, size: 20, color: "666666" })],
});

const TablaTitulo = (n, titulo) => [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, before: 200 }, children: [new TextRun({ text: `Tabla ${n}`, bold: true, font: F, size: S })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: L, after: 120 }, children: [new TextRun({ text: titulo, italics: true, font: F, size: S })] }),
];

const CM = { top: 100, bottom: 100, left: 140, right: 140 };
const hc = (t, w, c = "1F3864") => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: { fill: c, type: ShadingType.CLEAR, color: "auto" }, margins: CM,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 260 }, children: [new TextRun({ text: t, bold: true, color: "FFFFFF", font: F, size: 20 })] })],
});
const bc = (t, w, opts = {}) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: CM,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 260 },
        children: [new TextRun({ text: String(t), font: F, size: 20, bold: opts.bold || false })],
    })],
});
const rowT = (cells) => new TableRow({ children: cells });
const Tbl = (widths, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows });

function Fig(path, widthPx, label, titulo, nota) {
    const data = fs.readFileSync(path);
    const heightPx = Math.round(widthPx * (900 / 1280));
    return [
        new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { before: 200, after: 120, line: L },
            children: [new ImageRun({ data, transformation: { width: widthPx, height: heightPx }, type: "png" })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 60, line: L },
            children: [new TextRun({ text: `${label}. `, bold: true, font: F, size: S }), new TextRun({ text: titulo, italics: true, font: F, size: S })],
        }),
        FuenteNota(nota),
    ];
}

// Imagen suelta sin caption tipo Figura — para el logo institucional de la portada.
function LogoImg(path, sizePx) {
    const data = fs.readFileSync(path);
    const ext = path.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    return new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 120, line: L },
        children: [new ImageRun({ data, transformation: { width: sizePx, height: sizePx }, type: ext })],
    });
}

const GH = "https://github.com/jhoel0521/Ojo-Camba/blob/dev";
const CodigoRef = (label, titulo, archivo, lineas, url, descripcion, codeLines) => [
    new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60, line: L },
        children: [new TextRun({ text: `${label}. `, bold: true, font: F, size: S }), new TextRun({ text: titulo, italics: true, font: F, size: S })],
    }),
    P(descripcion),
    new Paragraph({
        spacing: { after: 120, line: L },
        children: [
            new TextRun({ text: "Archivo: ", bold: true, font: F, size: S }),
            new TextRun({ text: `${archivo} (líneas ${lineas}). `, font: F, size: S }),
            new TextRun({ text: url, font: F, size: S, color: "1F3864", underline: {} }),
        ],
    }),
    CodeBlock(codeLines),
    Blank(),
];

module.exports = {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel,
    BorderStyle, WidthType, ShadingType, PageBreak, LevelFormat, Header, PageNumber, ImageRun,
    F, CF, S, L, IND, border, borders,
    P, PMix, H1, H2, H3, Bullet, PageBreakP, Blank, CodeBlock, FuenteNota, TablaTitulo,
    hc, bc, rowT, Tbl, Fig, LogoImg, CodigoRef, GH,
};
