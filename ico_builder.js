const fs = require('fs');

function createDibIconEntry(width, height, rgbaBuffer) {
  const headerSize = 40;
  const xorSize = width * height * 4;
  const andRowBytes = Math.floor((width + 31) / 32) * 4;
  const andSize = andRowBytes * height;
  const totalSize = headerSize + xorSize + andSize;

  const buf = Buffer.alloc(totalSize);

  buf.writeUInt32LE(40, 0); // biSize
  buf.writeInt32LE(width, 4); // biWidth
  buf.writeInt32LE(height * 2, 8); // biHeight = XOR + AND height
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount
  buf.writeUInt32LE(0, 16); // biCompression = BI_RGB
  buf.writeUInt32LE(xorSize + andSize, 20); // biSizeImage
  buf.writeInt32LE(0, 24);
  buf.writeInt32LE(0, 28);
  buf.writeUInt32LE(0, 32);
  buf.writeUInt32LE(0, 36);

  // XOR Mask (bottom-up BGRA) + 1-bit AND Mask for transparent corners
  let dstPos = headerSize;
  const andOffset = headerSize + xorSize;

  for (let row = 0; row < height; row++) {
    const y = height - 1 - row;
    const andRowStart = andOffset + row * andRowBytes;

    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const r = rgbaBuffer.readUInt8(srcIdx);
      const g = rgbaBuffer.readUInt8(srcIdx + 1);
      const b = rgbaBuffer.readUInt8(srcIdx + 2);
      const a = rgbaBuffer.readUInt8(srcIdx + 3);

      buf.writeUInt8(b, dstPos++);
      buf.writeUInt8(g, dstPos++);
      buf.writeUInt8(r, dstPos++);
      buf.writeUInt8(a, dstPos++);

      if (a < 16) {
        const byteIndex = andRowStart + (x >> 3);
        const bitMask = 0x80 >> (x & 7);
        buf[byteIndex] |= bitMask;
      }
    }
  }

  return buf;
}

function assembleIco(entries) {
  const count = entries.length;
  const headerSize = 6 + count * 16;
  let currentOffset = headerSize;

  const directory = [];
  for (const item of entries) {
    const w = item.width === 256 ? 0 : item.width;
    const h = item.height === 256 ? 0 : item.height;
    directory.push({
      width: w,
      height: h,
      size: item.buffer.length,
      offset: currentOffset,
      buffer: item.buffer
    });
    currentOffset += item.buffer.length;
  }

  const icoBuf = Buffer.alloc(currentOffset);
  icoBuf.writeUInt16LE(0, 0); // Reserved
  icoBuf.writeUInt16LE(1, 2); // Type 1 = ICO
  icoBuf.writeUInt16LE(count, 4); // Count

  let dirPos = 6;
  for (const d of directory) {
    icoBuf.writeUInt8(d.width, dirPos + 0);
    icoBuf.writeUInt8(d.height, dirPos + 1);
    icoBuf.writeUInt8(0, dirPos + 2); // Colors
    icoBuf.writeUInt8(0, dirPos + 3); // Reserved
    icoBuf.writeUInt16LE(1, dirPos + 4); // Planes
    icoBuf.writeUInt16LE(32, dirPos + 6); // BitCount
    icoBuf.writeUInt32LE(d.size, dirPos + 8); // Size
    icoBuf.writeUInt32LE(d.offset, dirPos + 12); // Offset
    dirPos += 16;
  }

  for (const d of directory) {
    d.buffer.copy(icoBuf, d.offset);
  }

  return icoBuf;
}

module.exports = { createDibIconEntry, assembleIco };
