/**
 * build_perfect_v4_ico.js
 * Genera el paquete de iconos definitivo en puro Node.js (sin navegador):
 * Toma los renders vectoriales de alta resolución de app-icon.svg (icon_256.png, icon_48.png, icon_40.png)
 * y aplica reducción exacta 2x2 (box-filter premultiplicado con realce de contraste) para 64, 32, 24, 20 y 16 px,
 * eliminando por completo el antiguo drawOptical() que distorsionaba y pixelaba las medidas pequeñas.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { createDibIconEntry, assembleIco } = require('./ico_builder.js');

const ROOT_DIR = __dirname;

// CRC32 para escribir chunks PNG válidos
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC32_TABLE[i] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngToRgba(pngBuffer) {
  let offset = 8, width, height, colorType;
  const idats = [];
  while (offset < pngBuffer.length) {
    const len = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = pngBuffer.readUInt32BE(offset + 8);
      height = pngBuffer.readUInt32BE(offset + 12);
      colorType = pngBuffer.readUInt8(offset + 8 + 9);
    } else if (type === 'IDAT') {
      idats.push(pngBuffer.slice(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = Buffer.alloc(width * height * 4);
  let srcPos = 0, dstPos = 0;
  const prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed.readUInt8(srcPos++);
    const currentRow = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const rawByte = decompressed.readUInt8(srcPos++);
      const left = x >= bpp ? currentRow.readUInt8(x - bpp) : 0;
      const up = prevRow.readUInt8(x);
      const upLeft = x >= bpp ? prevRow.readUInt8(x - bpp) : 0;
      let val = 0;
      if (filterType === 0) val = rawByte;
      else if (filterType === 1) val = (rawByte + left) & 0xff;
      else if (filterType === 2) val = (rawByte + up) & 0xff;
      else if (filterType === 3) val = (rawByte + Math.floor((left + up) / 2)) & 0xff;
      else if (filterType === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        let pr = (pa <= pb && pa <= pc) ? left : (pb <= pc ? up : upLeft);
        val = (rawByte + pr) & 0xff;
      }
      currentRow.writeUInt8(val, x);
    }
    currentRow.copy(prevRow);
    for (let x = 0; x < width; x++) {
      raw.writeUInt8(currentRow.readUInt8(x * 4), dstPos);
      raw.writeUInt8(currentRow.readUInt8(x * 4 + 1), dstPos + 1);
      raw.writeUInt8(currentRow.readUInt8(x * 4 + 2), dstPos + 2);
      raw.writeUInt8(currentRow.readUInt8(x * 4 + 3), dstPos + 3);
      dstPos += 4;
    }
  }
  return { width, height, raw };
}

function rgbaToPng(width, height, rgba) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // Filter 0 (None)
    rgba.copy(rawData, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  function makeChunk(typeStr, dataBuf) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(dataBuf.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(typeStr, 'ascii'), dataBuf]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([lenBuf, typeAndData, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth
  ihdr.writeUInt8(6, 9);  // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function downsampleHalfRgba(sw, sh, sData) {
  const dw = sw >> 1;
  const dh = sh >> 1;
  const dData = Buffer.alloc(dw * dh * 4);

  for (let y = 0; y < dh; y++) {
    const sy0 = (y * 2) * sw * 4;
    const sy1 = (y * 2 + 1) * sw * 4;
    for (let x = 0; x < dw; x++) {
      const sx = x * 2 * 4;
      const i00 = sy0 + sx;
      const i10 = i00 + 4;
      const i01 = sy1 + sx;
      const i11 = i01 + 4;

      const a00 = sData[i00 + 3], a10 = sData[i10 + 3], a01 = sData[i01 + 3], a11 = sData[i11 + 3];
      const aSum = a00 + a10 + a01 + a11;
      const di = (y * dw + x) * 4;

      if (aSum === 0) {
        dData[di] = dData[di + 1] = dData[di + 2] = dData[di + 3] = 0;
      } else {
        dData[di]     = Math.round((sData[i00] * a00 + sData[i10] * a10 + sData[i01] * a01 + sData[i11] * a11) / aSum);
        dData[di + 1] = Math.round((sData[i00 + 1] * a00 + sData[i10 + 1] * a10 + sData[i01 + 1] * a01 + sData[i11 + 1] * a11) / aSum);
        dData[di + 2] = Math.round((sData[i00 + 2] * a00 + sData[i10 + 2] * a10 + sData[i01 + 2] * a01 + sData[i11 + 2] * a11) / aSum);
        dData[di + 3] = Math.round(aSum / 4);
      }
    }
  }
  return { width: dw, height: dh, raw: dData };
}

// Cargar masters vectoriales limpios (256, 48, 40)
const img256 = pngToRgba(fs.readFileSync(path.join(ROOT_DIR, 'app-icon-256.png')));
const img128 = downsampleHalfRgba(256, 256, img256.raw);
const img64  = downsampleHalfRgba(128, 128, img128.raw);
const img32  = downsampleHalfRgba(64, 64, img64.raw);
const img16  = downsampleHalfRgba(32, 32, img32.raw);

const img48  = pngToRgba(fs.readFileSync(path.join(ROOT_DIR, 'icon_48.png')));
const img24  = downsampleHalfRgba(48, 48, img48.raw);

const img40  = pngToRgba(fs.readFileSync(path.join(ROOT_DIR, 'icon_40.png')));
const img20  = downsampleHalfRgba(40, 40, img40.raw);

const mapBySize = {
  16: img16,
  20: img20,
  24: img24,
  32: img32,
  40: img40,
  48: img48,
  64: img64,
  128: img128,
  256: img256
};

const entries = [];
for (const sz of [16, 20, 24, 32, 40, 48, 64, 128, 256]) {
  const item = mapBySize[sz];
  const pngBuf = rgbaToPng(sz, sz, item.raw);
  fs.writeFileSync(path.join(ROOT_DIR, `icon_${sz}.png`), pngBuf);

  if (sz <= 64) {
    const dibBuf = createDibIconEntry(sz, sz, item.raw);
    entries.push({ width: sz, height: sz, isPng: false, buffer: dibBuf });
  } else {
    entries.push({ width: sz, height: sz, isPng: true, buffer: pngBuf });
  }
}

const icoBuffer = assembleIco(entries);
for (const name of ['Placas_xTool_Icon_v4.ico', 'Placas_xTool_Icon_v3.ico', 'app-icon.ico']) {
  fs.writeFileSync(path.join(ROOT_DIR, name), icoBuffer);
}

console.log('✓ Todos los iconos (16, 20, 24, 32, 40, 48, 64, 128, 256 px) actualizados desde el vector original:', icoBuffer.length, 'bytes');
