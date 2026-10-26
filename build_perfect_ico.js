/**
 * Genera un app-icon.ico nítido de alta definición (con 256, 128, 64, 48, 32, 24 y 16 px)
 * a partir del SVG vectorial puro proporcionado por el usuario.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const PORT = 3899;
const ROOT_DIR = __dirname;
const svgContent = fs.readFileSync(path.join(ROOT_DIR, 'app-icon.svg'), 'utf8');

const htmlPage = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; background: #000; color: #fff; font-family: sans-serif; padding: 20px; }
  canvas { border: 1px solid #444; margin: 4px; background: transparent; }
</style>
</head>
<body>
  <h2>Renderizando iconos de alta resolución...</h2>
  <div id="canvases"></div>
  <script>
    const svgText = ${JSON.stringify(svgContent)};
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = async () => {
      const sizes = [256, 128, 64, 48, 32, 24, 16];
      const results = {};

      for (const sz of sizes) {
        const canvas = document.createElement('canvas');
        canvas.width = sz;
        canvas.height = sz;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, sz, sz);
        ctx.drawImage(img, 0, 0, sz, sz);
        document.getElementById('canvases').appendChild(canvas);
        results[sz] = canvas.toDataURL('image/png');
      }

      const res = await fetch('/save-ico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });
      const data = await res.json();
      document.body.innerHTML += '<h3>Listo: ' + JSON.stringify(data) + '</h3>';
      setTimeout(() => window.close(), 1000);
    };

    img.src = url;
  </script>
</body>
</html>`;

function createIcoBuffer(pngBuffers) {
  // pngBuffers: array de { size: 256, buffer: Buffer }
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let currentOffset = headerSize;

  const entries = [];
  for (const item of pngBuffers) {
    const bW = item.size === 256 ? 0 : item.size;
    const bH = item.size === 256 ? 0 : item.size;
    entries.push({
      width: bW,
      height: bH,
      size: item.buffer.length,
      offset: currentOffset,
      buffer: item.buffer
    });
    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.alloc(currentOffset);

  // ICONDIR header
  icoBuffer.writeUInt16LE(0, 0); // reserved
  icoBuffer.writeUInt16LE(1, 2); // type 1 = ICO
  icoBuffer.writeUInt16LE(count, 4); // count

  let entryPos = 6;
  for (const e of entries) {
    icoBuffer.writeUInt8(e.width, entryPos + 0);
    icoBuffer.writeUInt8(e.height, entryPos + 1);
    icoBuffer.writeUInt8(0, entryPos + 2); // color count
    icoBuffer.writeUInt8(0, entryPos + 3); // reserved
    icoBuffer.writeUInt16LE(1, entryPos + 4); // planes
    icoBuffer.writeUInt16LE(32, entryPos + 6); // bit count
    icoBuffer.writeUInt32LE(e.size, entryPos + 8); // image bytes
    icoBuffer.writeUInt32LE(e.offset, entryPos + 12); // offset
    entryPos += 16;
  }

  for (const e of entries) {
    e.buffer.copy(icoBuffer, e.offset);
  }

  return icoBuffer;
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/render.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage);
    return;
  }

  if (req.url === '/save-ico' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const sizes = [256, 128, 64, 48, 32, 24, 16];
        const pngBuffers = [];

        for (const sz of sizes) {
          const dataUrl = payload[sz];
          if (!dataUrl) continue;
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          pngBuffers.push({ size: sz, buffer: buf });

          // Guardar también copia del PNG de 256px y 64px para inspección
          if (sz === 256) {
            fs.writeFileSync(path.join(ROOT_DIR, 'app-icon-256.png'), buf);
          }
        }

        const icoBuffer = createIcoBuffer(pngBuffers);
        const icoPath = path.join(ROOT_DIR, 'app-icon.ico');
        fs.writeFileSync(icoPath, icoBuffer);
        console.log(`✓ Archivo app-icon.ico generado con éxito (${icoBuffer.length} bytes, 7 resoluciones).`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, bytes: icoBuffer.length }));

        // Finalizar el servidor una vez generado
        setTimeout(() => {
          server.close(() => {
            console.log('Servidor temporal cerrado.');
            process.exit(0);
          });
        }, 500);

      } catch (err) {
        console.error('Error procesando save-ico:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor de renderizado iniciado en http://127.0.0.1:${PORT}`);
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const tmpProfile = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'edge_ico_profile_' + Date.now());

  const args = [
    `--user-data-dir=${tmpProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `http://127.0.0.1:${PORT}/render.html`
  ];

  spawn(edgePath, args, { detached: true, stdio: 'ignore' });
});
