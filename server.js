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
const DEFAULT_GITHUB_REPO = 'raul-OO8/Placas-Ident';

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
 * Guarda únicamente el proyecto nativo .XCS de xTool Studio (con parámetros láser y coordenadas X/Y)
 * en la subcarpeta de la marca correspondiente: Exportados_xTool/<Marca>/
 */
function savePlateFilesToExportsFolder({ brand, templateId, xToolX, xToolY, filename, svgContent }) {
  const safeBrand = String(brand || 'General').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'General';
  const baseName = path.basename(String(filename || 'placa.xcs')).replace(/\.(svg|xcs)$/i, '');
  const brandFolder = path.join(EXPORTS_DIR, safeBrand);
  if (!fs.existsSync(brandFolder)) fs.mkdirSync(brandFolder, { recursive: true });

  // Si existía un .svg antiguo con el mismo nombre en la carpeta, eliminarlo para que solo quede el .xcs
  const oldSvgPath = path.join(brandFolder, baseName + '.svg');
  if (fs.existsSync(oldSvgPath)) {
    try { fs.unlinkSync(oldSvgPath); } catch (_) {}
  }

  const xcsFilename = baseName + '.xcs';
  const targetXcsPath = path.join(brandFolder, xcsFilename);
  try {
    const xcsBuffer = buildXToolProjectArchive({
      svgContent,
      brand: brand || 'Vorma',
      templateId: templateId || 'vorma_grande',
      xToolX: xToolX ?? '51',
      xToolY: xToolY ?? '51',
      projectName: baseName
    });
    fs.writeFileSync(targetXcsPath, xcsBuffer);
  } catch (err) {
    console.error('Error generando archivo .xcs:', err);
  }

  return {
    targetPath: targetXcsPath,
    xcsPath: targetXcsPath,
    brandFolder
  };
}

/**
 * Abre el Explorador de Windows de manera instantánea en primer plano
 */
function openFolderInstantly(folderPath) {
  const cleanDir = path.resolve(String(folderPath || EXPORTS_DIR));
  if (!fs.existsSync(cleanDir)) fs.mkdirSync(cleanDir, { recursive: true });
  exec(`start "" "${cleanDir}"`);
}

function openExplorerInForeground(targetPath, selectFile = false) {
  const cleanPath = path.resolve(String(targetPath || EXPORTS_DIR));
  if (selectFile && fs.existsSync(cleanPath)) {
    exec(`explorer.exe /select,"${cleanPath}"`);
  } else {
    openFolderInstantly(cleanPath);
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

    // 2. Comprobar si existe una versión nueva en GitHub (soporta GitHub Releases API, HTTPS raw y Git)
    if (pathname === '/api/check-update' && req.method === 'GET') {
      const localInfo = getLocalVersionInfo();
      const repo = localInfo.repo || DEFAULT_GITHUB_REPO;
      const apiLatestUrl = `https://api.github.com/repos/${repo}/releases/latest`;
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/version.json?t=${Date.now()}`;

      try {
        let remoteInfo = null;

        // Estrategia 1: GitHub Releases API (tiempo real, sin retraso de caché de CDN)
        try {
          const apiText = await fetchHttpsText(apiLatestUrl, 3500);
          const apiJson = JSON.parse(apiText);
          if (apiJson && apiJson.tag_name) {
            remoteInfo = {
              version: String(apiJson.tag_name).replace(/^v/i, '').trim(),
              releasedAt: (apiJson.published_at || '').slice(0, 10),
              notes: apiJson.body || '',
              repo: repo
            };
          }
        } catch (_) {}

        // Estrategia 2: version.json raw de GitHub
        if (!remoteInfo) {
          try {
            const remoteText = await fetchHttpsText(rawUrl, 3500);
            remoteInfo = JSON.parse(remoteText);
          } catch (_) {}
        }

        // Estrategia 3: Git local si existe el repositorio .git
        if (!remoteInfo && fs.existsSync(path.join(ROOT_DIR, '.git'))) {
          remoteInfo = await new Promise((resolve, reject) => {
            exec('git fetch origin main && git show origin/main:version.json', { cwd: ROOT_DIR, timeout: 6000 }, (err, stdout) => {
              if (err || !stdout) return reject(err || new Error('Sin respuesta de git'));
              try {
                resolve(JSON.parse(stdout));
              } catch (parseErr) {
                reject(parseErr);
              }
            });
          });
        }

        if (!remoteInfo) {
          throw new Error('No se pudo obtener información de la versión remota.');
        }

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
        let updatedViaGit = false;
        if (fs.existsSync(path.join(ROOT_DIR, '.git'))) {
          updatedViaGit = await new Promise((resolve) => {
            exec('git fetch origin main && git reset --hard origin/main', { cwd: ROOT_DIR, timeout: 10000 }, (err) => {
              resolve(!err);
            });
          });
        }

        if (!updatedViaGit) {
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

          for (const relPath of filesToSync) {
            const cleanRel = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
            if (cleanRel.startsWith('data/') || cleanRel.startsWith('Exportados_xTool/')) continue;
            const destPath = path.join(ROOT_DIR, cleanRel);
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            try {
              const fileBuf = await fetchHttpsBuffer(`${rawBase}/${cleanRel}?t=${Date.now()}`, 8000);
              fs.writeFileSync(destPath, fileBuf);
            } catch (_) {
              // Ignorar si algún ejecutable está bloqueado en memoria durante la actualización en caliente
            }
          }
        }

        // Restaurar la base de datos local del usuario si existía
        if (machinesBackup !== null) {
          if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(DB_FILE, machinesBackup, 'utf8');
        }

        const newLocalVer = getLocalVersionInfo();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          ok: true,
          updatedVersion: newLocalVer.version,
          notes: newLocalVer.notes || ''
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

    // 8. Abrir instantáneamente la carpeta donde se guarda la placa de la marca seleccionada
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

      // Si se indicó un archivo específico y existe
      if (targetFile && fs.existsSync(targetFile)) {
        openExplorerInForeground(targetFile, true);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, openedPath: targetFile }));
        return;
      }

      // Si se solicita abrir la carpeta de la marca activa
      let folderToOpen = EXPORTS_DIR;
      if (brand) {
        const safeBrand = String(brand).replace(/[\\/:*?"<>|]+/g, '_').trim();
        if (safeBrand) {
          folderToOpen = path.join(EXPORTS_DIR, safeBrand);
        }
      }

      openFolderInstantly(folderToOpen);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, exportsDir: folderToOpen }));
      return;
    }

    // 9. Crear acceso directo en el escritorio y lanzar la aplicación desde el instalador visual
    if (pathname === '/api/create-desktop-shortcut' && req.method === 'POST') {
      const psCommand = `
        $ws = New-Object -ComObject WScript.Shell;
        $desktop = [Environment]::GetFolderPath('Desktop');
        $shortcut = $ws.CreateShortcut((Join-Path $desktop 'Placas xTool.lnk'));
        $shortcut.TargetPath = '${path.join(ROOT_DIR, 'Generador_Placas_xTool.exe').replace(/'/g, "''")}';
        $shortcut.WorkingDirectory = '${ROOT_DIR.replace(/'/g, "''")}';
        $icon = '${path.join(ROOT_DIR, 'Placas_xTool_Icon_v6.ico').replace(/'/g, "''")}';
        $shortcut.IconLocation = $icon + ',0';
        $shortcut.Description = 'Generador de Placas Técnicas para xTool Studio';
        $shortcut.Save();
      `;
      const encoded = Buffer.from(psCommand, 'utf16le').toString('base64');
      exec(`powershell.exe -NoProfile -WindowStyle Hidden -EncodedCommand ${encoded}`, (err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        }
      });
      return;
    }

    // 10. Lanzar la aplicación principal desde el instalador
    if (pathname === '/api/launch-app' && req.method === 'POST') {
      const exePath = path.join(ROOT_DIR, 'Generador_Placas_xTool.exe');
      if (fs.existsSync(exePath)) {
        exec(`start "" "${exePath}"`);
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // 11. Apagado limpio del motor local (para reinstalación o desinstalación)
    if (pathname === '/api/shutdown' && (req.method === 'POST' || req.method === 'GET')) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      setTimeout(() => process.exit(0), 100);
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
