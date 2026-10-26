/**
 * Backend Local de Escritorio (Sin dependencias externas) para:
 * "Generador de Placas Técnicas — Studio xTool"
 *
 * Funciones nativas de escritorio en Windows:
 * - Persistencia automática de la base de datos en data/maquinas.json
 * - Exportación directa (.xcs con parámetros láser y coordenadas + .svg) en Exportados_xTool/<Marca>/
 * - Diálogo nativo de Windows "Guardar archivo como..." (System.Windows.Forms.SaveFileDialog)
 * - Apertura directa en primer plano de la carpeta donde se guarda el archivo de la marca activa
 * - Comprobación y actualización automática en 1 clic desde GitHub (raul-OO8/placas-xtool)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { buildXToolProjectArchive } = require('./js/xtool-project.js');

const PORT = 3456;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'maquinas.json');
const EXPORTS_DIR = path.join(ROOT_DIR, 'Exportados_xTool');
const VERSION_FILE = path.join(ROOT_DIR, 'version.json');
const DEFAULT_GITHUB_REPO = 'raul-OO8/placas-xtool';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.png': 'image/png'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 30 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function getLocalVersionInfo() {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    version: '1.2.0',
    releasedAt: '2026-10-26',
    repo: DEFAULT_GITHUB_REPO,
    notes: ''
  };
}

function compareSemver(vA, vB) {
  const pa = String(vA || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(vB || '0.0.0').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const a = pa[i] || 0;
    const b = pb[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function fetchHttpsText(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Placas-xTool-Updater/1.2',
        'Cache-Control': 'no-cache'
      },
      timeout: timeoutMs
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHttpsText(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

function fetchHttpsBuffer(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Placas-xTool-Updater/1.2',
        'Cache-Control': 'no-cache'
      },
      timeout: timeoutMs
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHttpsBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

/**
 * Guarda tanto el archivo .SVG como el proyecto nativo .XCS (con parámetros láser y coordenadas X/Y)
 * en la subcarpeta de la marca correspondiente: Exportados_xTool/<Marca>/
 */
function savePlateFilesToExportsFolder({ brand, templateId, xToolX, xToolY, filename, svgContent }) {
  const safeBrand = String(brand || 'General').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'General';
  const safeFile = path.basename(String(filename || 'placa.svg'));
  const brandFolder = path.join(EXPORTS_DIR, safeBrand);
  if (!fs.existsSync(brandFolder)) fs.mkdirSync(brandFolder, { recursive: true });

  const targetSvgPath = path.join(brandFolder, safeFile);
  fs.writeFileSync(targetSvgPath, svgContent, 'utf8');

  const xcsFilename = safeFile.replace(/\.svg$/i, '') + '.xcs';
  const targetXcsPath = path.join(brandFolder, xcsFilename);
  try {
    const xcsBuffer = buildXToolProjectArchive({
      svgContent,
      brand: brand || 'Vorma',
      templateId: templateId || 'vorma_grande',
      xToolX: xToolX ?? '51',
      xToolY: xToolY ?? '51',
      projectName: path.basename(targetSvgPath, '.svg')
    });
    fs.writeFileSync(targetXcsPath, xcsBuffer);
  } catch (err) {
    console.error('Error generando archivo .xcs:', err);
  }

  return {
    targetPath: targetSvgPath,
    xcsPath: fs.existsSync(targetXcsPath) ? targetXcsPath : targetSvgPath,
    brandFolder
  };
}

/**
 * Abre el Explorador de Windows en primer plano mostrando la carpeta o resaltando el archivo indicado
 */
function openExplorerInForeground(targetPath, selectFile = false) {
  const cleanPath = path.resolve(String(targetPath || EXPORTS_DIR));
  if (selectFile && fs.existsSync(cleanPath)) {
    exec(`explorer.exe /select,"${cleanPath}"`);
  } else {
    const dirToOpen = fs.existsSync(cleanPath) && fs.statSync(cleanPath).isDirectory()
      ? cleanPath
      : path.dirname(cleanPath);
    if (!fs.existsSync(dirToOpen)) fs.mkdirSync(dirToOpen, { recursive: true });
    exec(`explorer.exe "${dirToOpen}"`);
  }
}

/**
 * Abre un diálogo nativo de Windows (SaveFileDialog) para elegir dónde guardar la placa (.xcs o .svg)
 */
function openNativeSaveDialog(defaultFilename, initialDir) {
  return new Promise((resolve) => {
    const safeInitialDir = (initialDir || EXPORTS_DIR).replace(/'/g, "''");
    const baseName = String(defaultFilename || 'placa.svg').replace(/\.(svg|xcs)$/i, '');
    const safeFileName = (baseName + '.xcs').replace(/'/g, "''");

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $f = New-Object System.Windows.Forms.Form
      $f.TopMost = $true
      $f.Opacity = 0
      $f.ShowInTaskbar = $false
      $dlg = New-Object System.Windows.Forms.SaveFileDialog
      $dlg.Title = 'Guardar Placa para xTool Studio'
      $dlg.Filter = 'Proyecto xTool Studio con parametros (*.xcs)|*.xcs|Archivo Vectorial SVG (*.svg)|*.svg'
      $dlg.InitialDirectory = '${safeInitialDir}'
      $dlg.FileName = '${safeFileName}'
      $dlg.OverwritePrompt = $true
      $res = $dlg.ShowDialog($f)
      $f.Dispose()
      if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Write-Output $dlg.FileName
      }
    `;

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -STA -WindowStyle Hidden -EncodedCommand ${encoded}`, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const chosen = String(stdout || '').trim();
      resolve(chosen || null);
    });
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const pathname = decodeURIComponent(urlObj.pathname);

    // 1. Información del sistema y versión actual
    if (pathname === '/api/system-info' && req.method === 'GET') {
      const verInfo = getLocalVersionInfo();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        isDesktopApp: true,
        version: verInfo.version,
        repo: verInfo.repo || DEFAULT_GITHUB_REPO,
        exportsDir: EXPORTS_DIR,
        dbFile: DB_FILE
      }));
      return;
    }

    // 2. Comprobar si existe una versión nueva en GitHub
    if (pathname === '/api/check-update' && req.method === 'GET') {
      const localInfo = getLocalVersionInfo();
      const repo = localInfo.repo || DEFAULT_GITHUB_REPO;
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/version.json?t=${Date.now()}`;

      try {
        const remoteText = await fetchHttpsText(rawUrl, 4500);
        const remoteInfo = JSON.parse(remoteText);
        const hasUpdate = compareSemver(remoteInfo.version, localInfo.version) > 0;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          updateAvailable: hasUpdate,
          currentVersion: localInfo.version,
          latestVersion: remoteInfo.version || localInfo.version,
          releasedAt: remoteInfo.releasedAt || '',
          notes: remoteInfo.notes || '',
          repoUrl: `https://github.com/${repo}`
        }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: false,
          offline: true,
          updateAvailable: false,
          currentVersion: localInfo.version,
          latestVersion: localInfo.version,
          error: err.message
        }));
      }
      return;
    }

    // 3. Ejecutar actualización automática desde GitHub (conservando siempre data/maquinas.json y Exportados_xTool)
    if (pathname === '/api/perform-update' && req.method === 'POST') {
      const localInfo = getLocalVersionInfo();
      const repo = localInfo.repo || DEFAULT_GITHUB_REPO;
      const rawBase = `https://raw.githubusercontent.com/${repo}/main`;

      // Respaldar maquinas.json en memoria antes de actualizar
      let machinesBackup = null;
      if (fs.existsSync(DB_FILE)) {
        machinesBackup = fs.readFileSync(DB_FILE, 'utf8');
      }

      try {
        // Primero obtener el version.json remoto para saber qué archivos actualizar
        const remoteVerText = await fetchHttpsText(`${rawBase}/version.json?t=${Date.now()}`, 6000);
        const remoteVer = JSON.parse(remoteVerText);
        const filesToSync = Array.isArray(remoteVer.files) && remoteVer.files.length > 0
          ? remoteVer.files
          : [
              'version.json',
              'index.html',
              'server.js',
              'app-icon.svg',
              'app-icon.ico',
              'css/styles.css',
              'js/app.js',
              'js/templates.js',
              'js/xtool-project.js',
              'js/initial-data.js'
            ];

        // Intentar git pull primero si existe .git
        await new Promise((resolve) => {
          if (fs.existsSync(path.join(ROOT_DIR, '.git'))) {
            exec('git fetch origin main && git reset --hard origin/main', { cwd: ROOT_DIR }, () => resolve());
          } else {
            resolve();
          }
        });

        // Además descargar directamente cada archivo listado desde GitHub Raw (funciona incluso sin Git instalado)
        for (const relPath of filesToSync) {
          const cleanRel = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
          if (cleanRel.startsWith('data/') || cleanRel.startsWith('Exportados_xTool/')) continue;
          const destPath = path.join(ROOT_DIR, cleanRel);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const fileBuf = await fetchHttpsBuffer(`${rawBase}/${cleanRel}?t=${Date.now()}`, 8000);
          fs.writeFileSync(destPath, fileBuf);
        }

        // Restaurar la base de datos local del usuario si existía
        if (machinesBackup !== null) {
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(DB_FILE, machinesBackup, 'utf8');
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          updatedVersion: remoteVer.version,
          notes: remoteVer.notes || ''
        }));
      } catch (err) {
        if (machinesBackup !== null && !fs.existsSync(DB_FILE)) {
          fs.writeFileSync(DB_FILE, machinesBackup, 'utf8');
        }
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: false,
          error: 'No se pudo completar la actualización desde GitHub: ' + err.message
        }));
      }
      return;
    }

    // 4. Obtener listado de máquinas guardadas en disco
    if (pathname === '/api/machines' && req.method === 'GET') {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(raw);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end('[]');
      }
      return;
    }

    // 5. Guardar listado de máquinas en disco
    if (pathname === '/api/machines' && req.method === 'POST') {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // 6. Exportar Placa (.XCS con parámetros láser + .SVG) en Exportados_xTool/<Marca>/ y mostrar en carpeta
    if ((pathname === '/api/export-svg' || pathname === '/api/open-in-xtool') && req.method === 'POST') {
      const body = await readBody(req);
      const { brand, templateId, xToolX, xToolY, filename, svgContent, revealInExplorer } = JSON.parse(body);
      const { targetPath, xcsPath, brandFolder } = savePlateFilesToExportsFolder({
        brand,
        templateId,
        xToolX,
        xToolY,
        filename,
        svgContent
      });

      if (revealInExplorer !== false) {
        openExplorerInForeground(xcsPath, true);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        savedPath: targetPath,
        xcsPath,
        folderPath: brandFolder
      }));
      return;
    }

    // 7. Guardar Placa mediante diálogo nativo de Windows ("Guardar como...")
    if (pathname === '/api/save-svg-dialog' && req.method === 'POST') {
      const body = await readBody(req);
      const { brand, templateId, xToolX, xToolY, filename, svgContent } = JSON.parse(body);
      const { targetPath: autoPath, xcsPath: autoXcsPath, brandFolder } = savePlateFilesToExportsFolder({
        brand,
        templateId,
        xToolX,
        xToolY,
        filename,
        svgContent
      });

      const chosenPath = await openNativeSaveDialog(filename, brandFolder);
      if (!chosenPath) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, cancelled: true, autoSavedPath: autoXcsPath }));
        return;
      }

      if (chosenPath.toLowerCase().endsWith('.xcs') && fs.existsSync(autoXcsPath)) {
        fs.copyFileSync(autoXcsPath, chosenPath);
      } else {
        fs.writeFileSync(chosenPath, svgContent, 'utf8');
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, savedPath: chosenPath, autoSavedPath: autoXcsPath }));
      return;
    }

    // 8. Abrir la carpeta donde se guarda el archivo de la marca seleccionada en el Explorador de Windows
    if (pathname === '/api/open-exports-folder' && req.method === 'POST') {
      let targetFile = null;
      let brand = null;
      try {
        const body = await readBody(req);
        if (body) {
          const parsed = JSON.parse(body);
          targetFile = parsed.filePath;
          brand = parsed.brand;
        }
      } catch (_) {}

      if (targetFile && fs.existsSync(targetFile)) {
        openExplorerInForeground(targetFile, true);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, openedPath: targetFile }));
        return;
      }

      // Si se indicó la marca activa, abrir directamente la subcarpeta de esa marca (Exportados_xTool/<Marca>/)
      let folderToOpen = EXPORTS_DIR;
      if (brand) {
        const safeBrand = String(brand).replace(/[\\/:*?"<>|]+/g, '_').trim();
        if (safeBrand) {
          folderToOpen = path.join(EXPORTS_DIR, safeBrand);
          if (!fs.existsSync(folderToOpen)) {
            fs.mkdirSync(folderToOpen, { recursive: true });
          }
        }
      }

      // Si hay archivos dentro de esa carpeta, seleccionar el más reciente para que el usuario lo vea al instante
      let newestFile = null;
      try {
        const files = fs.readdirSync(folderToOpen)
          .filter(f => /\.(xcs|svg)$/i.test(f))
          .map(f => {
            const full = path.join(folderToOpen, f);
            return { full, mtime: fs.statSync(full).mtimeMs };
          })
          .sort((a, b) => b.mtime - a.mtime);
        if (files.length > 0) newestFile = files[0].full;
      } catch (_) {}

      if (newestFile) {
        openExplorerInForeground(newestFile, true);
      } else {
        openExplorerInForeground(folderToOpen, false);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, exportsDir: folderToOpen }));
      return;
    }

    // Archivos estáticos
    let filePath = pathname === '/' ? path.join(ROOT_DIR, 'index.html') : path.join(ROOT_DIR, pathname);
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Puerto ${PORT} ya está en uso (el servidor local ya se encuentra activo).`);
    process.exit(0);
  } else {
    console.error('Error en el servidor:', err);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log('================================================================');
  console.log(' GENERADOR DE PLACAS TECNICAS xTOOL STUDIO — DESKTOP ENGINE');
  console.log(` Endpoint local: ${url}`);
  console.log(` Base de datos: ${DB_FILE}`);
  console.log(` Carpeta de exportaciones: ${EXPORTS_DIR}`);
  console.log('================================================================');
});
