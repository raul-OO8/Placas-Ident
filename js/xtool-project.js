/**
 * Generador nativo de proyectos xTool Studio v2 (.xcs / .xs)
 * Construye archivos de proyecto compatibles con xTool Studio (protocolo xcs-workspace-v2)
 * con coordenadas exactas en cama láser (X, Y) y parámetros de grabado preconfigurados por capa/grupo.
 */

const crypto = require('crypto');
const zlib = require('zlib');

const PT_TO_MM = 0.352778; // Factor exacto utilizado por xTool Studio al importar SVG en puntos

// Tabla CRC32 estándar para empaquetado ZIP
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Empaqueta un mapa de archivos en un archivo ZIP estándar (compatible con unpackXcsRaw de xTool Studio)
 * @param {Array<{path: string, content?: Buffer|string, isDir?: boolean}>} entries
 * @returns {Buffer}
 */
function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const now = new Date();
  const dosTime = ((now.getHours() & 0x1F) << 11) | ((now.getMinutes() & 0x3F) << 5) | ((now.getSeconds() >> 1) & 0x1F);
  const dosDate = (((now.getFullYear() - 1980) & 0x7F) << 9) | (((now.getMonth() + 1) & 0x0F) << 5) | (now.getDate() & 0x1F);

  for (const item of entries) {
    const nameBuf = Buffer.from(item.path, 'utf8');
    const isDir = !!item.isDir || item.path.endsWith('/');
    const rawBuf = isDir
      ? Buffer.alloc(0)
      : (Buffer.isBuffer(item.content) ? item.content : Buffer.from(String(item.content ?? ''), 'utf8'));

    const method = isDir ? 0 : 8; // 8 = Deflate
    const compBuf = isDir ? Buffer.alloc(0) : zlib.deflateRawSync(rawBuf);
    const crc = isDir ? 0 : crc32(rawBuf);

    // Local File Header (30 bytes + filename)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0); // Signature
    lfh.writeUInt16LE(20, 4);         // Version needed (2.0)
    lfh.writeUInt16LE(0x0800, 6);     // Flags (UTF-8)
    lfh.writeUInt16LE(method, 8);     // Compression method
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compBuf.length, 18);
    lfh.writeUInt32LE(rawBuf.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);         // Extra field length

    localParts.push(lfh, nameBuf, compBuf);

    // Central Directory Header (46 bytes + filename)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0); // Signature
    cdh.writeUInt16LE(20, 4);         // Version made by
    cdh.writeUInt16LE(20, 6);         // Version needed
    cdh.writeUInt16LE(0x0800, 8);     // Flags (UTF-8)
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(dosTime, 12);
    cdh.writeUInt16LE(dosDate, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compBuf.length, 20);
    cdh.writeUInt32LE(rawBuf.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);         // Extra length
    cdh.writeUInt16LE(0, 32);         // Comment length
    cdh.writeUInt16LE(0, 34);         // Disk number
    cdh.writeUInt16LE(0, 36);         // Internal attrs
    cdh.writeUInt32LE(isDir ? 0x10 : 0, 38); // External attrs
    cdh.writeUInt32LE(offset, 42);    // Relative offset of local header

    centralParts.push(cdh, nameBuf);
    offset += 30 + nameBuf.length + compBuf.length;
  }

  const centralDirSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function round6(num) {
  if (typeof num !== 'number' || !Number.isFinite(num)) return num;
  return Number.isInteger(num) ? num : Number(num.toFixed(6));
}

function cubicExtrema(p0, p1, p2, p3) {
  const vals = [p0, p3];
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) {
      const t = -c / b;
      if (t > 0 && t < 1) {
        vals.push((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3);
      }
    }
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      for (const t of [(-b + sq) / (2 * a), (-b - sq) / (2 * a)]) {
        if (t > 0 && t < 1) {
          vals.push((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3);
        }
      }
    }
  }
  return vals;
}

function quadExtrema(p0, p1, p2) {
  const vals = [p0, p2];
  const denom = p0 - 2 * p1 + p2;
  if (Math.abs(denom) > 1e-12) {
    const t = (p0 - p1) / denom;
    if (t > 0 && t < 1) {
      vals.push((1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2);
    }
  }
  return vals;
}

/**
 * Calcula el Bounding Box exacto de cualquier trazado SVG `d` (soporta M,L,H,V,C,S,Q,Z absolutos y relativos)
 */
function getPathBBox(d) {
  const tokens = String(d || '').match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  let i = 0;
  let cmd = '';
  let cx = 0, cy = 0, sx = 0, sy = 0, prevCx2 = 0, prevCy2 = 0, prevCmd = '';
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const addPt = (x, y) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  };

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
    }
    const isRel = cmd === cmd.toLowerCase();
    const u = cmd.toUpperCase();

    if (u === 'M') {
      const x = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      cx = sx = x;
      cy = sy = y;
      addPt(cx, cy);
      cmd = isRel ? 'l' : 'L';
    } else if (u === 'L') {
      cx = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      cy = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      addPt(cx, cy);
    } else if (u === 'H') {
      cx = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      addPt(cx, cy);
    } else if (u === 'V') {
      cy = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      addPt(cx, cy);
    } else if (u === 'C') {
      const x1 = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y1 = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      const x2 = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y2 = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      const x = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      for (const vx of cubicExtrema(cx, x1, x2, x)) {
        for (const vy of cubicExtrema(cy, y1, y2, y)) addPt(vx, vy);
      }
      prevCx2 = x2;
      prevCy2 = y2;
      cx = x;
      cy = y;
    } else if (u === 'S') {
      const x1 = (prevCmd === 'C' || prevCmd === 'S') ? 2 * cx - prevCx2 : cx;
      const y1 = (prevCmd === 'C' || prevCmd === 'S') ? 2 * cy - prevCy2 : cy;
      const x2 = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y2 = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      const x = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      for (const vx of cubicExtrema(cx, x1, x2, x)) {
        for (const vy of cubicExtrema(cy, y1, y2, y)) addPt(vx, vy);
      }
      prevCx2 = x2;
      prevCy2 = y2;
      cx = x;
      cy = y;
    } else if (u === 'Q') {
      const x1 = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y1 = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      const x = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      for (const vx of quadExtrema(cx, x1, x)) {
        for (const vy of quadExtrema(cy, y1, y)) addPt(vx, vy);
      }
      prevCx2 = x1;
      prevCy2 = y1;
      cx = x;
      cy = y;
    } else if (u === 'A') {
      i += 5; // rx, ry, xAxisRotation, largeArcFlag, sweepFlag
      const x = (isRel ? cx : 0) + parseFloat(tokens[i++]);
      const y = (isRel ? cy : 0) + parseFloat(tokens[i++]);
      addPt(x, y);
      cx = x;
      cy = y;
    } else if (u === 'Z') {
      cx = sx;
      cy = sy;
    } else {
      i++;
    }
    prevCmd = u;
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0.001, maxX - minX),
    height: Math.max(0.001, maxY - minY)
  };
}

function getAttr(tagStr, attrName) {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, 'i');
  const m = tagStr.match(re);
  return m ? m[1] : null;
}

/**
 * Extrae todos los elementos vectoriales del SVG manteniendo la jerarquía de grupos <g>
 */
function parseSvgElements(svgContent) {
  const elements = [];
  const groupStack = [];
  const groupsMeta = {};

  // Tokenizar etiquetas de apertura/cierre de grupos y primitivas geométricas
  const tagRegex = /<\/?g\b[^>]*>|<(?:polygon|polyline|path|line|rect)\b[^>]*\/?>/gi;
  let match;

  while ((match = tagRegex.exec(svgContent)) !== null) {
    const tag = match[0];
    const lower = tag.toLowerCase();

    if (lower.startsWith('</g')) {
      groupStack.pop();
      continue;
    }

    if (lower.startsWith('<g')) {
      const gId = getAttr(tag, 'id') || '';
      if (gId === 'Guias_Visuales_No_Exportables') continue;
      const gTag = `g-${crypto.randomUUID()}`;
      groupsMeta[gTag] = {
        groupName: gId,
        groupTag: gTag,
        visible: true,
        enableTransform: true,
        zOrder: 1,
        rotation: 0
      };
      groupStack.push({ gTag, gId });
      continue;
    }

    // Ignorar rectángulo invisible de bloqueo si existiera
    const elId = getAttr(tag, 'id') || '';
    if (elId === 'xTool_Inner_Area_Bounds') continue;

    const currentGroupTags = groupStack.slice().reverse().map(g => g.gTag);
    const inDynamicTexts = groupStack.some(g => g.gId === 'Textos_Trazados_En_Curvas');
    const inStaticVectors = groupStack.some(g => g.gId.includes('Vectores_Fijos'));

    if (lower.startsWith('<polygon')) {
      const pts = (getAttr(tag, 'points') || '').trim();
      if (!pts) continue;
      const dPath = `M${pts}Z`;
      const bbox = getPathBBox(dPath);
      elements.push({
        kind: 'PATH',
        dPath,
        bbox,
        isFill: true,
        fillRule: 'nonzero',
        isClosePath: true,
        isCompoundPath: false,
        groupTags: currentGroupTags,
        role: (inStaticVectors && !inDynamicTexts) ? 'logo' : 'text'
      });
    } else if (lower.startsWith('<polyline')) {
      const pts = (getAttr(tag, 'points') || '').trim();
      if (!pts) continue;
      const dPath = `M${pts}`;
      const bbox = getPathBBox(dPath);
      elements.push({
        kind: 'PATH',
        dPath,
        bbox,
        isFill: false,
        fillRule: 'nonzero',
        isClosePath: false,
        isCompoundPath: false,
        groupTags: currentGroupTags,
        role: 'lines'
      });
    } else if (lower.startsWith('<path')) {
      const dPath = (getAttr(tag, 'd') || '').trim();
      if (!dPath) continue;
      const fillAttr = getAttr(tag, 'fill');
      const strokeAttr = getAttr(tag, 'stroke');
      const fillRule = getAttr(tag, 'fill-rule') || 'nonzero';
      const isStrokedLine = fillAttr === 'none' && strokeAttr && strokeAttr !== 'none';
      const isFill = !isStrokedLine;
      const mCount = (dPath.match(/[Mm]/g) || []).length;
      const bbox = getPathBBox(dPath);

      // En Vorma, dentro de Vectores_Fijos:
      // - Los trazados del logo ("VORMA" y "Maschinen") tienen fillRule !== 'evenodd'
      // - El símbolo CE tiene fill-rule="evenodd" y va con los textos (Fibra IR 60% 3000mm/s)
      let role = 'text';
      if (isStrokedLine) {
        role = 'lines';
      } else if (inStaticVectors && !inDynamicTexts && fillRule !== 'evenodd') {
        role = 'logo';
      }

      elements.push({
        kind: 'PATH',
        dPath,
        bbox,
        isFill,
        fillRule,
        isClosePath: /[Zz]\s*$/.test(dPath),
        isCompoundPath: mCount > 1,
        groupTags: currentGroupTags,
        role
      });
    } else if (lower.startsWith('<line')) {
      const x1 = parseFloat(getAttr(tag, 'x1') || '0');
      const y1 = parseFloat(getAttr(tag, 'y1') || '0');
      const x2 = parseFloat(getAttr(tag, 'x2') || '0');
      const y2 = parseFloat(getAttr(tag, 'y2') || '0');
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);
      elements.push({
        kind: 'LINE',
        x1,
        y1,
        x2,
        y2,
        bbox: {
          minX,
          minY,
          maxX,
          maxY,
          width: Math.max(0.001, maxX - minX),
          height: Math.max(0.001, maxY - minY)
        },
        groupTags: currentGroupTags,
        role: 'lines'
      });
    } else if (lower.startsWith('<rect')) {
      const rx = parseFloat(getAttr(tag, 'x') || '0');
      const ry = parseFloat(getAttr(tag, 'y') || '0');
      const rw = parseFloat(getAttr(tag, 'width') || '0');
      const rh = parseFloat(getAttr(tag, 'height') || '0');
      const cornerR = Math.min(parseFloat(getAttr(tag, 'rx') || getAttr(tag, 'ry') || '0') || 0, rw / 2, rh / 2);
      const fillAttr = getAttr(tag, 'fill');
      if (rw <= 0 || rh <= 0) continue;
      const isFill = fillAttr !== 'none';
      const dPath = cornerR > 0
        ? `M${round6(rx + cornerR)},${round6(ry)}H${round6(rx + rw - cornerR)}A${round6(cornerR)},${round6(cornerR)} 0 0 1 ${round6(rx + rw)},${round6(ry + cornerR)}V${round6(ry + rh - cornerR)}A${round6(cornerR)},${round6(cornerR)} 0 0 1 ${round6(rx + rw - cornerR)},${round6(ry + rh)}H${round6(rx + cornerR)}A${round6(cornerR)},${round6(cornerR)} 0 0 1 ${round6(rx)},${round6(ry + rh - cornerR)}V${round6(ry + cornerR)}A${round6(cornerR)},${round6(cornerR)} 0 0 1 ${round6(rx + cornerR)},${round6(ry)}Z`
        : `M${rx},${ry}H${rx + rw}V${ry + rh}H${rx}Z`;
      const bbox = { minX: rx, minY: ry, maxX: rx + rw, maxY: ry + rh, width: rw, height: rh };
      elements.push({
        kind: 'PATH',
        dPath,
        bbox,
        isFill,
        fillRule: 'nonzero',
        isClosePath: true,
        isCompoundPath: false,
        groupTags: currentGroupTags,
        role: isFill ? 'text' : 'lines'
      });
    }
  }

  return { elements, groupsMeta };
}

/**
 * Construye el archivo de proyecto .xcs (v2 ZIP) con posicionamiento y parámetros láser de xTool F1 Ultra
 * @param {Object} opts
 * @param {string} opts.svgContent - Código SVG generado de la placa
 * @param {string} opts.brand - Nombre o identificador de la marca (ej. 'Vorma')
 * @param {string} opts.templateId - ID de plantilla (ej. 'vorma_grande', 'vorma_pequena')
 * @param {string|number} opts.xToolX - Posición X calibrada en mm (ej. '51' o '50,5')
 * @param {string|number} opts.xToolY - Posición Y calibrada en mm (ej. '51' o '50')
 * @param {string} opts.projectName - Nombre del proyecto
 * @returns {Buffer} Buffer ZIP del archivo .xcs/.xs
 */
function buildXToolProjectArchive(opts) {
  const {
    svgContent,
    brand = 'Vorma',
    templateId = 'vorma_grande',
    xToolX = '51',
    xToolY = '51',
    projectName = 'Placa_Vorma'
  } = opts;

  const targetX = parseFloat(String(xToolX).replace(',', '.')) || 51;
  const targetY = parseFloat(String(xToolY).replace(',', '.')) || 51;

  const { elements, groupsMeta } = parseSvgElements(svgContent);

  // Grupo raíz "Capa 1" igual que crea xTool Studio al importar el SVG
  const rootGroupTag = `g-${crypto.randomUUID()}`;
  const totalCount = elements.length;
  groupsMeta[rootGroupTag] = {
    groupName: 'Capa 1',
    groupTag: rootGroupTag,
    visible: true,
    enableTransform: true,
    zOrder: totalCount,
    rotation: 0
  };

  // Calcular el punto mínimo global (minX, minY en pt) de toda la placa
  let globalMinPtX = Infinity;
  let globalMinPtY = Infinity;
  for (const el of elements) {
    if (el.bbox.minX < globalMinPtX) globalMinPtX = el.bbox.minX;
    if (el.bbox.minY < globalMinPtY) globalMinPtY = el.bbox.minY;
  }
  if (!Number.isFinite(globalMinPtX)) globalMinPtX = 0;
  if (!Number.isFinite(globalMinPtY)) globalMinPtY = 0;

  // Offset exacto en mm para que la esquina superior-izquierda del diseño quede en (targetX, targetY)
  const baseOffsetX = round6(targetX - globalMinPtX * PT_TO_MM);
  const baseOffsetY = round6(targetY - globalMinPtY * PT_TO_MM);

  const vectorIndexEntries = {};
  const vectorDataEntries = {};

  const textDisplayIds = [];
  const lineDisplayIds = [];
  const logoDisplayIds = [];

  // En xTool Studio, displays-0.json se almacena desde zOrder = N hasta zOrder = 1
  const displays = [];
  for (let idx = elements.length - 1; idx >= 0; idx--) {
    const el = elements[idx];
    const zOrder = idx + 1;
    const dispId = crypto.randomUUID();
    const gTags = [...el.groupTags, rootGroupTag];

    for (const gt of gTags) {
      if (groupsMeta[gt] && zOrder > groupsMeta[gt].zOrder) {
        groupsMeta[gt].zOrder = zOrder;
      }
    }

    if (el.role === 'logo') {
      logoDisplayIds.push(dispId);
    } else if (el.role === 'lines') {
      lineDisplayIds.push(dispId);
    } else {
      textDisplayIds.push(dispId);
    }

    if (el.kind === 'LINE') {
      const hasDx = Math.abs(el.x2 - el.x1) > 1e-4;
      const hasDy = Math.abs(el.y2 - el.y1) > 1e-4;
      const scaleX = hasDx ? PT_TO_MM : 1;
      const scaleY = hasDy ? PT_TO_MM : 1;
      const lineOffX = round6(baseOffsetX + el.x1 * PT_TO_MM);
      const lineOffY = round6(baseOffsetY + el.y1 * PT_TO_MM);
      const dispX = round6(baseOffsetX + el.bbox.minX * PT_TO_MM);
      const dispY = round6(baseOffsetY + el.bbox.minY * PT_TO_MM);
      const dispW = round6(Math.max(0.001, (el.bbox.maxX - el.bbox.minX) * PT_TO_MM));
      const dispH = round6(Math.max(0.001, (el.bbox.maxY - el.bbox.minY) * PT_TO_MM));

      displays.push({
        id: dispId,
        name: null,
        type: 'LINE',
        x: dispX,
        y: dispY,
        angle: 0,
        scale: { x: scaleX, y: scaleY },
        skew: { x: 0, y: 0 },
        pivot: { x: 0, y: 0 },
        localSkew: { x: 0, y: 0 },
        offsetX: lineOffX,
        offsetY: lineOffY,
        lockRatio: false,
        isClosePath: false,
        zOrder,
        groupTags: gTags,
        layerTag: '#000000',
        layerColor: '#000000',
        visible: true,
        originColor: '#000000',
        enableTransform: true,
        visibleState: true,
        lockState: false,
        resourceOrigin: '',
        customData: { tabBreaks: {}, startPoint: {} },
        rootComponentId: '',
        minCanvasVersion: '0.0.0',
        alpha: 1,
        fill: { paintType: 'color', visible: false, color: 0, alpha: 1 },
        stroke: {
          paintType: 'color',
          visible: true,
          color: 0,
          alpha: 1,
          width: 1,
          cap: 'round',
          join: 'miter',
          miterLimit: 10,
          alignment: 0.5
        },
        effects: [],
        transform: [scaleX, 0, 0, scaleY, lineOffX, lineOffY],
        width: dispW,
        height: dispH,
        isFill: false,
        lineColor: 16421416,
        fillColor: '#f9932b',
        endPoint: {
          x: round6(el.x2 - el.x1),
          y: round6(el.y2 - el.y1)
        }
      });
    } else {
      const dispX = round6(baseOffsetX + el.bbox.minX * PT_TO_MM);
      const dispY = round6(baseOffsetY + el.bbox.minY * PT_TO_MM);
      const dispW = round6(Math.max(0.001, el.bbox.width * PT_TO_MM));
      const dispH = round6(Math.max(0.001, el.bbox.height * PT_TO_MM));

      const pathObj = {
        id: dispId,
        name: null,
        type: 'PATH',
        x: dispX,
        y: dispY,
        angle: 0,
        scale: { x: PT_TO_MM, y: PT_TO_MM },
        skew: { x: 0, y: 0 },
        pivot: { x: 0, y: 0 },
        localSkew: { x: 0, y: 0 },
        offsetX: baseOffsetX,
        offsetY: baseOffsetY,
        lockRatio: true,
        isClosePath: el.isClosePath,
        zOrder,
        groupTags: gTags,
        layerTag: '#000000',
        layerColor: '#000000',
        visible: true,
        originColor: '#000000',
        enableTransform: true,
        visibleState: true,
        lockState: false,
        resourceOrigin: '',
        customData: { tabBreaks: {}, startPoint: {} },
        rootComponentId: '',
        minCanvasVersion: '0.0.0',
        alpha: 1,
        fill: { paintType: 'color', visible: el.isFill, color: 0, alpha: 1 },
        stroke: {
          paintType: 'color',
          visible: !el.isFill,
          color: 0,
          alpha: 1,
          width: 1,
          cap: 'butt',
          join: 'miter',
          miterLimit: 4,
          alignment: 0.5
        },
        effects: [],
        transform: [PT_TO_MM, 0, 0, PT_TO_MM, baseOffsetX, baseOffsetY],
        width: dispW,
        height: dispH,
        isFill: el.isFill,
        lineColor: 16421416,
        fillColor: '#f9932b',
        points: [],
        fillRule: el.fillRule,
        graphicX: baseOffsetX,
        graphicY: baseOffsetY,
        isCompoundPath: el.isCompoundPath
      };

      if (el.dPath.length >= 4096) {
        const hash = crypto.createHash('sha256').update(el.dPath, 'utf8').digest('hex');
        vectorIndexEntries[hash] = { hash, size: Buffer.byteLength(el.dPath, 'utf8') };
        vectorDataEntries[hash] = el.dPath;
        pathObj.vectorRef = {
          vectorHash: hash,
          bucketType: 'svg',
          originalField: 'dPath'
        };
      } else {
        pathObj.dPath = el.dPath;
      }

      displays.push(pathObj);
    }
  }

  const projectId = crypto.randomUUID();
  const canvasId = crypto.randomUUID();
  const nowTs = Date.now();

  // 1. meta/persistence-meta.json
  const persistenceMeta = {
    schemaVersion: '2.0.0',
    protocol: 'xcs-workspace-v2'
  };

  // 2. project.json
  const projectJson = {
    __v2__: true,
    version: '2.0.0',
    schemaMeta: {
      schemaVersion: '2.1.0',
      format: 'directory',
      migratedFrom: '1.0',
      migratedAt: nowTs
    },
    projectId,
    projectTraceID: projectId,
    projectName: String(projectName).replace(/\.(svg|xcs|xs)$/i, ''),
    activeCanvasId: canvasId,
    activeDeviceId: 'GS002-1',
    created: nowTs,
    modify: nowTs,
    modules: {
      canvases: [canvasId],
      devices: ['GS002-1']
    },
    extId: 'F1Ultra',
    extName: 'F1 Ultra',
    format: 'directory'
  };

  // 3. Perfiles, Material y Parches según Marca y Formato de Placa en xTool F1 Ultra
  const isVorma = String(templateId).startsWith('vorma_') || /vorma/i.test(brand);
  const isVormaSmall = templateId === 'vorma_pequena';

  let patches;
  let bindings;
  let materialId;
  let materialThickness;

  if (isVorma) {
    // VORMA (Acero Inoxidable 304 - materialId: 1323, thickness: 0.5)
    // - Vorma Grande (150x90): Textos Fibra IR 60% 3000mm/s | Líneas Marcar Fibra IR 32% 500mm/s | Logo Luz azul 47% 60mm/s
    // - Vorma Pequeña (110x70): Textos Fibra IR 30% 3000mm/s | Líneas Marcar Fibra IR 32% 500mm/s | Logo Luz azul 47% 60mm/s
    materialId = 1323;
    materialThickness = 0.5;
    const vormaTextPower = isVormaSmall ? 30 : 60;

    patches = {
      'patch:Muk8gzPv3U5G': {
        id: 'patch:Muk8gzPv3U5G',
        profileId: 'profile:t5vny5eGa7Xb',
        source: 'material',
        material: {
          materialType: 'official',
          materialId: 1323,
          paramSource: 'official',
          paramSchemeId: 1796580,
          planType: 'red'
        },
        overrides: {
          speed: 1600,
          processingLightSource: 'red',
          power: 70,
          repeat: 1,
          frequency: 30,
          defocus_distance: 7
        }
      },
      'patch:6kj6qaKjKNh1': {
        id: 'patch:6kj6qaKjKNh1',
        profileId: 'profile:f4B2UcIqxoUf',
        source: 'material',
        material: {
          materialType: 'official',
          materialId: 1323,
          paramSource: 'official',
          paramSchemeId: 1796581,
          planType: 'red'
        },
        overrides: {
          bitmapEngraveMode: 'normal',
          speed: 2200,
          density: 200,
          dotDuration: 100,
          processingLightSource: 'red',
          power: 70,
          repeat: 1,
          frequency: 30,
          defocus_distance: 7
        }
      },
      // Grupo 2: Líneas divisorias -> Marcar | Fibra IR (red) | Potencia 32% | Velocidad 500 mm/s | 1 pasada
      'patch:DIowUtnj0r0N': {
        id: 'patch:DIowUtnj0r0N',
        profileId: 'profile:t5vny5eGa7Xb',
        source: 'custom',
        overrides: {
          speed: 500,
          processingLightSource: 'red',
          power: 32,
          repeat: 1,
          frequency: 30,
          defocus: false,
          defocus_distance: 7,
          enableKerf: false,
          kerfDistance: 0
        }
      },
      // Grupo 1: Textos técnicos + CE + Serie + Año -> Grabar | Fibra IR (red) | Potencia 60% (Grande) o 30% (Pequeña) | Velocidad 3000 mm/s | 1 pasada
      'patch:Ge86BhORLelG': {
        id: 'patch:Ge86BhORLelG',
        profileId: 'profile:f4B2UcIqxoUf',
        source: 'custom',
        overrides: {
          imageCorrection: false,
          bitmapEngraveMode: 'normal',
          speed: 3000,
          density: 200,
          needGapNumDensity: true,
          dotDuration: 100,
          dpi: 500,
          processingLightSource: 'red',
          power: vormaTextPower,
          repeat: 1,
          bitmapScanMode: 'zMode',
          frequency: 30,
          scanAngle: 0,
          angleType: 2,
          crossAngle: false,
          defocus: false,
          defocus_distance: 7,
          enableKerf: false,
          kerfDistance: 0
        }
      },
      // Grupo 3: Logo VORMA + Isotipo turbina -> Grabar | Luz azul (blue) | Potencia 47% | Velocidad 60 mm/s | 1 pasada
      'patch:HkevOJYDL4rr': {
        id: 'patch:HkevOJYDL4rr',
        profileId: 'profile:f4B2UcIqxoUf',
        source: 'custom',
        overrides: {
          imageCorrection: false,
          bitmapEngraveMode: 'normal',
          speed: 60,
          density: 200,
          needGapNumDensity: true,
          dotDuration: 100,
          dpi: 500,
          processingLightSource: 'blue',
          power: 47,
          repeat: 1,
          bitmapScanMode: 'zMode',
          frequency: 30,
          scanAngle: 0,
          angleType: 2,
          crossAngle: false,
          defocus: false,
          defocus_distance: 3,
          enableKerf: false,
          kerfDistance: 0
        }
      }
    };

    bindings = [
      {
        bindingId: 'binding:7jxgXTYgiky7',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:t5vny5eGa7Xb',
        patchIds: ['patch:Muk8gzPv3U5G'],
        displayIds: [],
        shadowOf: 'binding:nPJy038J4y1o'
      },
      {
        bindingId: 'binding:xsV5e38iqhyE',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:YeZLi3JEifzr',
        displayIds: [],
        shadowOf: 'binding:nPJy038J4y1o'
      },
      {
        bindingId: 'binding:1MyMYRrYIq1u',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:f4B2UcIqxoUf',
        patchIds: ['patch:6kj6qaKjKNh1'],
        displayIds: [],
        shadowOf: 'binding:I0iHz858hnmU'
      },
      {
        bindingId: 'binding:r4TyYZ1xwd4X',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:YeZLi3JEifzr',
        displayIds: [],
        shadowOf: 'binding:I0iHz858hnmU'
      },
      {
        bindingId: 'binding:I0iHz858hnmU',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:t5vny5eGa7Xb',
        patchIds: ['patch:DIowUtnj0r0N'],
        displayIds: lineDisplayIds
      },
      {
        bindingId: 'binding:nPJy038J4y1o',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:f4B2UcIqxoUf',
        patchIds: ['patch:Ge86BhORLelG'],
        displayIds: textDisplayIds
      },
      {
        bindingId: 'binding:qQj1cpsO3gTL',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:t5vny5eGa7Xb',
        patchIds: ['patch:Muk8gzPv3U5G'],
        displayIds: [],
        shadowOf: 'binding:3OZwoUyWPlnL'
      },
      {
        bindingId: 'binding:je05uR1YCqU5',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:YeZLi3JEifzr',
        displayIds: [],
        shadowOf: 'binding:3OZwoUyWPlnL'
      },
      {
        bindingId: 'binding:3OZwoUyWPlnL',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:f4B2UcIqxoUf',
        patchIds: ['patch:HkevOJYDL4rr'],
        displayIds: logoDisplayIds.slice().reverse()
      }
    ];
  } else {
    // OLSEN & KAEL (Grande 150x90 y Pequeña 110x70) y ZYBRA (150x90)
    // Material: Acero inoxidable pintado de negro (materialId: 2406, thickness: 1)
    // - Vectores con relleno (Logo + Textos + Bloques + CE): Grabar | Fibra IR (red) | 70% | 1800 mm/s | 1 pasada (density: 200, freq: 30, defocus: 7)
    // - Líneas y marcos (Recuadros / Polylines / Lines): Marcar | Fibra IR (red) | 60% | 1600 mm/s | 1 pasada (freq: 30, defocus: 7)
    materialId = 2406;
    materialThickness = 1;
    const allFilledDisplayIds = [...textDisplayIds, ...logoDisplayIds];

    patches = {
      'patch:AT3KVrZxpl7C': {
        id: 'patch:AT3KVrZxpl7C',
        profileId: 'profile:t5vny5eGa7Xb',
        source: 'material',
        material: {
          materialType: 'official',
          materialId: 2406,
          paramSource: 'official',
          paramSchemeId: 1555483,
          planType: 'red'
        },
        overrides: {
          speed: 1600,
          processingLightSource: 'red',
          power: 60,
          repeat: 1,
          frequency: 30,
          defocus_distance: 7
        }
      },
      'patch:DHtR187cuxPc': {
        id: 'patch:DHtR187cuxPc',
        profileId: 'profile:f4B2UcIqxoUf',
        source: 'material',
        material: {
          materialType: 'official',
          materialId: 2406,
          paramSource: 'official',
          paramSchemeId: 1555484,
          planType: 'red'
        },
        overrides: {
          bitmapEngraveMode: 'normal',
          speed: 1800,
          density: 200,
          dotDuration: 100,
          processingLightSource: 'red',
          power: 70,
          repeat: 1,
          frequency: 30,
          defocus_distance: 7
        }
      }
    };

    bindings = [
      {
        bindingId: 'binding:7jxgXTYgiky7',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:t5vny5eGa7Xb',
        patchIds: ['patch:AT3KVrZxpl7C'],
        displayIds: [],
        shadowOf: 'binding:V1u234xD10sD'
      },
      {
        bindingId: 'binding:xsV5e38iqhyE',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:YeZLi3JEifzr',
        displayIds: [],
        shadowOf: 'binding:V1u234xD10sD'
      },
      {
        bindingId: 'binding:V1u234xD10sD',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:f4B2UcIqxoUf',
        patchIds: ['patch:DHtR187cuxPc'],
        displayIds: allFilledDisplayIds
      },
      {
        bindingId: 'binding:1MyMYRrYIq1u',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:f4B2UcIqxoUf',
        patchIds: ['patch:DHtR187cuxPc'],
        displayIds: [],
        shadowOf: 'binding:W7e234xD10sE'
      },
      {
        bindingId: 'binding:r4TyYZ1xwd4X',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:YeZLi3JEifzr',
        displayIds: [],
        shadowOf: 'binding:W7e234xD10sE'
      },
      {
        bindingId: 'binding:W7e234xD10sE',
        canvasId,
        mode: 'LASER_PLANE',
        baseProfileId: 'profile:t5vny5eGa7Xb',
        patchIds: ['patch:AT3KVrZxpl7C'],
        displayIds: lineDisplayIds
      }
    ];
  }

  const profilesJson = {
    version: '1.0',
    profiles: {
      'profile:f4B2UcIqxoUf': {
        id: 'profile:f4B2UcIqxoUf',
        processingType: 'FILL_VECTOR_ENGRAVING',
        values: {
          imageCorrection: false,
          bitmapEngraveMode: 'normal',
          speed: 80,
          density: 100,
          needGapNumDensity: true,
          dotDuration: 100,
          dpi: 500,
          processingLightSource: 'blue',
          power: 1,
          repeat: 1,
          bitmapScanMode: 'zMode',
          frequency: 30,
          scanAngle: 0,
          angleType: 2,
          crossAngle: false,
          defocus: false,
          defocus_distance: 3,
          enableKerf: false,
          kerfDistance: 0
        }
      },
      'profile:t5vny5eGa7Xb': {
        id: 'profile:t5vny5eGa7Xb',
        processingType: 'VECTOR_ENGRAVING',
        values: {
          speed: 20,
          processingLightSource: 'blue',
          power: 1,
          repeat: 1,
          frequency: 30,
          defocus: false,
          defocus_distance: 3,
          enableKerf: false,
          kerfDistance: 0
        }
      },
      'profile:YeZLi3JEifzr': {
        id: 'profile:YeZLi3JEifzr',
        processingType: 'VECTOR_CUTTING',
        values: {
          processingLightSource: 'blue',
          power: 1,
          speed: 16,
          repeat: 1,
          cuttingDrop: false,
          sinkingMethod: 'one',
          firstCuttingDropValue: 0.01,
          cuttingDropValue: 0.01,
          descentIntervalDescent: 1,
          descentPerStep: 0.01,
          enableKerf: false,
          kerfDistance: 0,
          enableBreakPoint: false,
          breakPointGenMode: 'auto',
          breakPointSize: 0.5,
          breakPointMode: 'count',
          breakPointCount: 2,
          breakPointDistance: 100,
          breakPointPower: 0,
          frequency: 30
        }
      }
    },
    patches
  };

  // 4. canvases/<canvasId>.json
  const canvasJson = {
    id: canvasId,
    title: '{panel}1',
    layerData: {
      '#000000': {
        name: '#000000',
        order: 1,
        visible: true
      }
    },
    groupData: groupsMeta,
    extendInfo: {
      rulerPluginData: {
        version: '2.0.0',
        isShow: true,
        guideLineShow: true,
        guides: []
      },
      gridOptions: {
        color: 'normal',
        isShow: true
      }
    },
    currentLayer: '#000000',
    chunkLayout: {
      displayCount: displays.length,
      chunkCount: 1,
      chunkIndexes: [0]
    }
  };

  // 5. canvases/<canvasId>/displays-0.json
  const displaysChunkJson = {
    canvasId,
    chunkIndex: 0,
    displays
  };

  // 6. devices/device-GS002-1.json
  const deviceJson = {
    id: 'GS002-1',
    deviceCode: 'GS002',
    extId: 'F1Ultra',
    extName: 'F1 Ultra',
    power: [20, 20],
    processing: {
      [canvasId]: {
        id: canvasId,
        activeMode: 'LASER_PLANE',
        modes: {
          LASER_PLANE: {
            ignoredDisplayIds: [],
            data: {
              material: materialId,
              lightSourceMode: 'blue',
              thickness: materialThickness,
              perimeter: null,
              diameter: null,
              isProcessByLayer: false,
              pathPlanning: 'auto',
              fillPlanning: 'separate',
              dreedyTsp: false,
              avoidSmokeModal: false,
              scanDirection: 'topToBottom',
              enableOddEvenKerf: true,
              focalLen: null,
              focalLength: null,
              fanGear: 3,
              purifierGear: 3,
              precautionCodes: [
                'HIGH_REFLECT',
                'ODOR_PROTECTION',
                'OXIDATION',
                'HOT_SURFACE_WARN',
                'CLOSE_TO_EXHAUST',
                'SURFACE_PRETREATMENT'
              ],
              glbModel: null,
              purifierV3Gear: 40,
              backpackPurifierGear: 75,
              ap2miniPurifierGear: 0,
              xcsUsed: [
                'glbModel',
                'purifierV3Gear',
                'backpackPurifierGear',
                'ap2miniPurifierGear',
                'axis_y_transmission_ratio_roll_material'
              ]
            },
            profileRefs: [
              'profile:t5vny5eGa7Xb',
              'profile:YeZLi3JEifzr',
              'profile:f4B2UcIqxoUf'
            ],
            patches,
            bindings
          }
        }
      }
    }
  };

  const zipEntries = [
    { path: 'meta/persistence-meta.json', content: JSON.stringify(persistenceMeta, null, 2) },
    { path: 'project.json', content: JSON.stringify(projectJson, null, 2) },
    { path: 'profiles.json', content: JSON.stringify(profilesJson, null, 2) },
    { path: 'canvases/', isDir: true },
    { path: `canvases/${canvasId}.json`, content: JSON.stringify(canvasJson, null, 2) },
    { path: `canvases/${canvasId}/`, isDir: true },
    { path: `canvases/${canvasId}/displays-0.json`, content: JSON.stringify(displaysChunkJson) },
    { path: 'devices/', isDir: true },
    { path: 'devices/device-GS002-1.json', content: JSON.stringify(deviceJson, null, 2) },
    { path: 'resources/', isDir: true }
  ];

  const vectorHashes = Object.keys(vectorIndexEntries);
  if (vectorHashes.length > 0) {
    zipEntries.push(
      { path: 'vectors/', isDir: true },
      { path: 'vectors/svg/', isDir: true },
      {
        path: 'vectors/svg/index.json',
        content: JSON.stringify({
          bucketType: 'svg',
          version: '1.0',
          entryCount: vectorHashes.length,
          entries: vectorIndexEntries
        }, null, 2)
      },
      {
        path: 'vectors/svg/data-0.json',
        content: JSON.stringify({
          bucketType: 'svg',
          chunkIndex: 0,
          entries: vectorDataEntries
        }, null, 2)
      }
    );
  }

  zipEntries.push({ path: '.format', content: 'v2' });

  return createZipBuffer(zipEntries);
}

module.exports = {
  buildXToolProjectArchive
};
