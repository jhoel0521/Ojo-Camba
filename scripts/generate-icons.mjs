import { createWriteStream } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const COLOR_BG = [0x1a, 0x73, 0xe8, 0xff]; // #1a73e8
const COLOR_FG = [0xff, 0xff, 0xff, 0xff]; // white
const OUT_DIR = 'frontend/app-reporte/public/icons';

function createPNG(size) {
  // Build raw pixel data
  const raw = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Simple "OC" letters approximation using colored blocks
      const cx = size / 2;
      const cy = size / 2;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const r = size * 0.35;

      // Circle with letter area
      const inCircle = Math.sqrt(dx * dx + dy * dy) < r;
      // O shape (outer ring) or C shape (left curve)
      const ringOuter = Math.sqrt(dx * dx + dy * dy) < r;
      const ringInner = Math.sqrt(dx * dx + dy * dy) < r * 0.55;
      const inRing = ringOuter && !ringInner;
      const inLetter = inRing;

      if (inLetter) {
        raw[idx] = COLOR_FG[0];
        raw[idx + 1] = COLOR_FG[1];
        raw[idx + 2] = COLOR_FG[2];
        raw[idx + 3] = COLOR_FG[3];
      } else {
        raw[idx] = COLOR_BG[0];
        raw[idx + 1] = COLOR_BG[1];
        raw[idx + 2] = COLOR_BG[2];
        raw[idx + 3] = COLOR_BG[3];
      }
    }
  }

  // Filter with Paeth for each row
  const filtered = Buffer.alloc(size * size * 4 + size);
  for (let y = 0; y < size; y++) {
    filtered[y * (size * 4 + 1)] = 0; // filter type None
    raw.copy(filtered, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = deflateSync(filtered);

  // Build PNG
  const chunks = [];
  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT
  chunks.push(makeChunk('IDAT', compressed));

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

for (const size of SIZES) {
  const png = createPNG(size);
  const path = `${OUT_DIR}/icon-${size}.png`;
  const ws = createWriteStream(path);
  ws.write(png);
  ws.end();
  console.log(`  icon-${size}.png (${png.length} bytes)`);
}

console.log('Icons generated in', OUT_DIR);
