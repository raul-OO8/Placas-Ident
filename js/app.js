/**
 * Lógica Principal de la Aplicación de Gestión y Exportación de Placas Técnicas para xTool
 */

const STORAGE_KEY_MACHINES = 'placas_xtool_machines_v1';
const STORAGE_KEY_SETTINGS = 'placas_xtool_settings_v1';
const STORAGE_KEY_HISTORY = 'placas_xtool_export_history_v1';

const AppState = {
  machines: [],
  selectedMachineId: null,
  filterBrand: 'all',
  filterSize: 'all',
  searchQuery: '',
  // Valores en tiempo real del Modo Operario
  operatorSerial: '',
  operatorDate: '2026',
  // Opciones de visualización en vista previa estilo xTool Studio
  showPlateGuides: true,
  metalPreviewMode: false,
  canvasViewMode: 'plate', // 'plate' (Vista Placa 1:1) o 'bed' (Vista Cama Láser xTool con X/Y)
  xtoolInstalled: false,
  xtoolAppName: 'xTool Studio',
  // Configuración global de exportación y calibración por plantilla
  settings: {
    exportCropMode: 'full_plate', // 'full_plate' (150x90 / 110x70mm) o 'inner_artbox' (recortado al área interior)
    zybraKnockoutMode: 'compound', // 'compound' (trazado compuesto vaciado para xTool) o 'layered' (rect negro + texto blanco)
    lockInnerBoundingBox: false,
    templateConfigs: {}
  },
  exportHistory: [],
  // Estado temporal del modal de creación/edición
  editingMachine: null,
  isNewMachine: false
};

// ============================================================================
// UTILIDADES DE MODERN WEB GUIDANCE (Dialog Light-Dismiss & Form Validation)
// ============================================================================
function setupDialogFallbacks() {
  document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (isDialogContent) return;
        dialog.close();
      });
    }
  });
}

const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const updateState = (input) => {
    const isValid = input.checkValidity();
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);
    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };

  const handleEvent = (event) => {
    const input = event.target;
    if (event.type === 'reset') {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback');
        control.classList.remove('user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }
    if (!input || !input.checkValidity) return;

    if (event.type === 'input' || event.type === 'change') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) updateState(input);
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) updateState(input);
    }
  };

  const init = (root = document) => {
    const syncAria = (el) => {
      if (!el || typeof el.matches !== 'function') return;
      try {
        el.setAttribute('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
      } catch (_) {}
    };
    document.addEventListener('blur', (e) => syncAria(e.target), true);
    document.addEventListener('input', (e) => {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('aria-invalid')) syncAria(e.target);
    });

    if (window.CSS && CSS.supports && CSS.supports('selector(:user-invalid)')) return;
    root.addEventListener('blur', handleEvent, true);
    root.addEventListener('input', handleEvent);
    root.addEventListener('change', handleEvent);
    root.addEventListener('reset', handleEvent, true);
  };

  return { init };
})();

// ============================================================================
// CARGA Y PERSISTENCIA DE DATOS
// ============================================================================
async function loadAppData() {
  // 1. Cargar ajustes
  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      AppState.settings = { ...AppState.settings, ...parsed };
    }
  } catch (e) {
    console.warn('Error cargando ajustes:', e);
  }

  // 2. Cargar historial de exportaciones
  try {
    const savedHist = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHist) {
      AppState.exportHistory = JSON.parse(savedHist) || [];
    }
  } catch (e) {}

  // 3. Intentar cargar desde servidor local si está activo, o desde localStorage, o usar INITIAL_MACHINES
  let loadedMachines = null;
  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/machines');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          loadedMachines = data;
        }
      }
    } catch (_) {}
  }

  if (!loadedMachines) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MACHINES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedMachines = parsed;
        }
      }
    } catch (e) {
      console.warn('Error leyendo localStorage:', e);
    }
  }

  if (!loadedMachines || loadedMachines.length === 0) {
    loadedMachines = JSON.parse(JSON.stringify(window.INITIAL_MACHINES || []));
  }

  AppState.machines = loadedMachines;
  saveMachinesToStorage(false);

  if (AppState.machines.length > 0) {
    // Seleccionar por defecto la BC40 de Vorma Grande o la primera máquina
    const defaultM = AppState.machines.find(m => m.id === 'vorma-grande-bc40') || AppState.machines[0];
    selectMachineForOperator(defaultM.id);
  }
}

async function saveMachinesToStorage(syncServer = true) {
  try {
    localStorage.setItem(STORAGE_KEY_MACHINES, JSON.stringify(AppState.machines));
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }

  if (syncServer && location.protocol.startsWith('http')) {
    try {
      await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(AppState.machines)
      });
    } catch (_) {}
  }
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(AppState.settings));
  } catch (e) {}
}

function getEffectiveTemplateConfig(templateId) {
  const base = window.PlateTemplates.DEFAULT_TEMPLATE_CONFIGS[templateId] || window.PlateTemplates.DEFAULT_TEMPLATE_CONFIGS.vorma_grande;
  const custom = (AppState.settings.templateConfigs && AppState.settings.templateConfigs[templateId]) || {};
  const merged = { ...base, ...custom };
  // Si el usuario personalizó innerWidthMm o innerHeightMm, actualizar también artBoxPt proporcionalmente si se recorta
  return merged;
}

// ============================================================================
// RENDERIZADO DEL CATÁLOGO DE MÁQUINAS
// ============================================================================
function getFilteredMachines() {
  return AppState.machines.filter((m) => {
    const tpl = getEffectiveTemplateConfig(m.templateId);
    if (AppState.filterBrand !== 'all' && m.brand !== AppState.filterBrand) return false;
    if (AppState.filterSize === '150x90' && tpl.plateWidthMm !== 150) return false;
    if (AppState.filterSize === '110x70' && tpl.plateWidthMm !== 110) return false;
    if (AppState.searchQuery.trim() !== '') {
      const q = AppState.searchQuery.toLowerCase().trim();
      const hay = `${m.primaryName} ${m.primaryModel} ${tpl.brandName} ${tpl.formatName} ${m.defaultSerial || ''} ${m.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderCatalog() {
  const grid = document.getElementById('machinesGrid');
  const countBadge = document.getElementById('machinesCountBadge');
  const filtered = getFilteredMachines();

  // Actualizar contadores por marca en las pestañas
  const countAll = AppState.machines.length;
  const countZybra = AppState.machines.filter(m => m.brand === 'zybra').length;
  const countVorma = AppState.machines.filter(m => m.brand === 'vorma').length;
  const countOlsen = AppState.machines.filter(m => m.brand === 'olsen').length;

  const setTabCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setTabCount('countAll', countAll);
  setTabCount('countZybra', countZybra);
  setTabCount('countVorma', countVorma);
  setTabCount('countOlsen', countOlsen);

  if (countBadge) {
    countBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'máquina' : 'máquinas'}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog-state">
        <p>No se encontraron máquinas con ese filtro.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map((m) => {
    const tpl = getEffectiveTemplateConfig(m.templateId);
    const isSelected = m.id === AppState.selectedMachineId;

    return `
      <article class="machine-card brand-${m.brand} ${isSelected ? 'is-selected' : ''}"
               onclick="window.AppActions.selectMachine('${m.id}')"
               tabindex="0"
               role="button"
               aria-pressed="${isSelected}"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.AppActions.selectMachine('${m.id}');}">
        <div class="card-model-title">${escapeHtml(m.primaryModel || 'Sin modelo')}</div>
        <div class="card-machine-type">${escapeHtml(m.primaryName || 'Sin tipo')}</div>
        <div class="card-meta">
          <span class="brand-chip brand-chip-${m.brand}">
            <img src="img/brand-${m.brand}.png" class="brand-avatar-circle" alt="" />
            <span class="brand-chip-name">${escapeHtml(tpl.brandName)}</span>
          </span>
          <span class="size-badge">${tpl.plateWidthMm}×${tpl.plateHeightMm} mm</span>
        </div>
        <button type="button" class="btn-icon card-edit" title="Editar ficha de la máquina"
                onclick="event.stopPropagation();window.AppActions.openEditMachineModal('${m.id}')">
          Editar
        </button>
      </article>
    `;
  }).join('');
}

// ============================================================================
// MODO OPERARIO: SELECCIÓN, PREVISUALIZACIÓN EN TIEMPO REAL Y EXPORTACIÓN SVG
// ============================================================================
function selectMachineForOperator(machineId) {
  const machine = AppState.machines.find(m => m.id === machineId);
  if (!machine) return;

  AppState.selectedMachineId = machine.id;
  AppState.operatorSerial = machine.defaultSerial || '';
  AppState.operatorDate = machine.defaultDate || String(new Date().getFullYear());

  // Actualizar inputs del panel de operario
  const serialInput = document.getElementById('operatorSerialInput');
  const dateInput = document.getElementById('operatorDateInput');
  if (serialInput) serialInput.value = AppState.operatorSerial;
  if (dateInput) dateInput.value = AppState.operatorDate;

  renderCatalog();
  updateOperatorStation();
}

function updateOperatorStation() {
  const machine = AppState.machines.find(m => m.id === AppState.selectedMachineId);
  const emptyStation = document.getElementById('operatorEmptyState');
  const activeStation = document.getElementById('operatorActiveContent');

  if (!machine) {
    if (emptyStation) emptyStation.hidden = false;
    if (activeStation) activeStation.hidden = true;
    return;
  }

  if (emptyStation) emptyStation.hidden = true;
  if (activeStation) activeStation.hidden = false;

  const tpl = getEffectiveTemplateConfig(machine.templateId);

  // Cabecera de máquina seleccionada
  const brandBadge = document.getElementById('opBrandBadge');
  if (brandBadge) {
    brandBadge.innerHTML = `
      <img src="img/brand-${machine.brand}.png" class="brand-avatar-circle" alt="" />
      <span class="brand-chip-name">${escapeHtml(tpl.brandName)}</span>
    `;
    brandBadge.className = `brand-chip brand-chip-station brand-chip-${machine.brand}`;
  }

  const fmtBadge = document.getElementById('opFormatBadge');
  if (fmtBadge) fmtBadge.textContent = `${tpl.plateWidthMm} × ${tpl.plateHeightMm} mm`;

  const titleEl = document.getElementById('opMachineTitle');
  if (titleEl) titleEl.textContent = `${machine.primaryName} — ${machine.primaryModel}`;

  // Etiquetas dinámicas según la marca
  const sLabel = document.getElementById('opSerialLabel');
  if (sLabel) sLabel.textContent = `${tpl.serialLabel}:`;
  const dLabel = document.getElementById('opDateLabel');
  if (dLabel) dLabel.textContent = `${tpl.dateLabel}:`;

  // Coordenadas fijas xTool y medidas interiores (si existen en el DOM)
  const elCoordX = document.getElementById('xtoolCoordX');
  if (elCoordX) elCoordX.textContent = tpl.xToolX;
  const elCoordY = document.getElementById('xtoolCoordY');
  if (elCoordY) elCoordY.textContent = tpl.xToolY;
  const elPlateSize = document.getElementById('xtoolPlateSize');
  if (elPlateSize) elPlateSize.textContent = `${tpl.plateWidthMm} × ${tpl.plateHeightMm} mm`;
  const elInnerSize = document.getElementById('xtoolInnerSize');
  if (elInnerSize) elInnerSize.textContent = `${tpl.innerWidthMm} × ${tpl.innerHeightMm} mm`;

  // Barra superior de objeto estilo xTool Studio (X, Y, W, H)
  const barX = document.getElementById('xtoolBarX');
  const barY = document.getElementById('xtoolBarY');
  const barW = document.getElementById('xtoolBarW');
  const barH = document.getElementById('xtoolBarH');
  const stepX = document.getElementById('stepHintX');
  const stepY = document.getElementById('stepHintY');
  const procMode = document.getElementById('xtoolProcessModeText');

  const isCropped = AppState.settings.exportCropMode === 'inner_artbox';
  const activeW = isCropped ? Number(tpl.innerWidthMm).toFixed(2) : Number(tpl.plateWidthMm).toFixed(2);
  const activeH = isCropped ? Number(tpl.innerHeightMm).toFixed(2) : Number(tpl.plateHeightMm).toFixed(2);

  if (barX) barX.textContent = tpl.xToolX;
  if (barY) barY.textContent = tpl.xToolY;
  if (barW) barW.textContent = activeW;
  if (barH) barH.textContent = activeH;
  if (stepX) stepX.textContent = tpl.xToolX;
  if (stepY) stepY.textContent = tpl.xToolY;
  if (procMode) {
    procMode.textContent = machine.brand === 'zybra'
      ? 'Engrave · Vaciado Blanco sobre Negro'
      : 'Engrave (Grabado Relleno Fibra)';
  }

  // Nombre del archivo que se generará
  const filename = buildExportFilename(machine, AppState.operatorSerial, tpl);
  const fnEl = document.getElementById('exportFilenamePreview');
  if (fnEl) fnEl.textContent = filename;

  // Renderizar SVG en vivo y Reglas Milimétricas xTool
  renderLivePreviewSVG(machine, tpl);
}

function setCanvasViewMode(mode) {
  AppState.canvasViewMode = mode === 'bed' ? 'bed' : 'plate';
  const btnPlate = document.getElementById('btnViewPlate');
  const btnBed = document.getElementById('btnViewBed');
  if (btnPlate) btnPlate.classList.toggle('active', AppState.canvasViewMode === 'plate');
  if (btnBed) btnBed.classList.toggle('active', AppState.canvasViewMode === 'bed');
  updateOperatorStation();
}

/**
 * Dibuja las reglas milimétricas (estilo xTool Studio) alineadas en píxeles reales
 * con el elemento objetivo: el 0 mm coincide con el borde superior-izquierdo del
 * objeto (placa en "Vista Placa" o cama láser en "Vista Cama xTool").
 */
let lastRulerSpec = null;

function renderXToolRulers(maxW, maxH, targetEl) {
  lastRulerSpec = { maxW, maxH, targetEl };
  const topEl = document.getElementById('rulerTopBar');
  const leftEl = document.getElementById('rulerLeftBar');
  if (!topEl || !leftEl || !targetEl) return;

  requestAnimationFrame(() => {
    const tRect = targetEl.getBoundingClientRect();
    const topRect = topEl.getBoundingClientRect();
    const leftRect = leftEl.getBoundingClientRect();
    if (tRect.width === 0 || tRect.height === 0) return;

    const pxPerMmX = tRect.width / maxW;
    const pxPerMmY = tRect.height / maxH;
    const offX = tRect.left - topRect.left;
    const offY = tRect.top - leftRect.top;
    const stepLabel = pxPerMmX < 2.5 ? 20 : 10;

    let topTicks = '';
    const mmStartX = -Math.floor(offX / pxPerMmX / 5) * 5;
    const mmEndX = Math.ceil((topRect.width - offX) / pxPerMmX);
    for (let mm = mmStartX; mm <= mmEndX; mm += 5) {
      const x = offX + mm * pxPerMmX;
      const isMajor = mm % 10 === 0;
      const inside = mm >= 0 && mm <= maxW;
      const color = inside ? (isMajor ? '#cbd5e1' : '#64748b') : '#3b4454';
      topTicks += `<line x1="${x}" y1="${isMajor ? 12 : 17}" x2="${x}" y2="24" stroke="${color}" stroke-width="1"/>`;
      if (mm % stepLabel === 0) {
        topTicks += `<text x="${x + 2}" y="10" fill="${inside ? '#94a3b8' : '#475569'}" font-size="9" font-family="monospace">${mm}</text>`;
      }
    }
    topEl.innerHTML = `<svg class="ruler-svg">${topTicks}</svg>`;

    let leftTicks = '';
    const mmStartY = -Math.floor(offY / pxPerMmY / 5) * 5;
    const mmEndY = Math.ceil((leftRect.height - offY) / pxPerMmY);
    for (let mm = mmStartY; mm <= mmEndY; mm += 5) {
      const y = offY + mm * pxPerMmY;
      const isMajor = mm % 10 === 0;
      const inside = mm >= 0 && mm <= maxH;
      const color = inside ? (isMajor ? '#cbd5e1' : '#64748b') : '#3b4454';
      leftTicks += `<line x1="${isMajor ? 16 : 21}" y1="${y}" x2="28" y2="${y}" stroke="${color}" stroke-width="1"/>`;
      if (mm % stepLabel === 0) {
        leftTicks += `<text x="2" y="${y + 10}" fill="${inside ? '#94a3b8' : '#475569'}" font-size="8.5" font-family="monospace">${mm}</text>`;
      }
    }
    leftEl.innerHTML = `<svg class="ruler-svg">${leftTicks}</svg>`;
  });
}

window.addEventListener('resize', () => {
  if (lastRulerSpec) renderXToolRulers(lastRulerSpec.maxW, lastRulerSpec.maxH, lastRulerSpec.targetEl);
});

function renderLivePreviewSVG(machine, tplConfig) {
  const plateContainer = document.getElementById('svgPreviewContainer');
  const bedContainer = document.getElementById('xtoolBedSimulationContainer');
  if (!plateContainer || !machine) return;

  const tpl = tplConfig || getEffectiveTemplateConfig(machine.templateId);

  const svgCode = window.PlateTemplates.generatePlateSVG(
    machine,
    {
      serialNumber: AppState.operatorSerial,
      manufactureDate: AppState.operatorDate
    },
    {
      forExport: false,
      showPlateGuides: AppState.showPlateGuides,
      zybraKnockoutMode: AppState.settings.zybraKnockoutMode,
      exportCropMode: AppState.settings.exportCropMode,
      templateConfigs: AppState.settings.templateConfigs
    }
  );

  if (AppState.canvasViewMode === 'bed' && bedContainer) {
    plateContainer.hidden = true;
    bedContainer.hidden = false;
    const bedW = 220;
    const bedH = 155;

    const numX = parseFloat(String(tpl.xToolX).replace(',', '.')) || 50;
    const numY = parseFloat(String(tpl.xToolY).replace(',', '.')) || 50;
    const pW = tpl.plateWidthMm;
    const pH = tpl.plateHeightMm;

    // Extraer contenido interno o incrustar el SVG dentro del área de trabajo de xTool (220x155mm)
    const innerBase64 = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgCode);
    const plateBg = AppState.metalPreviewMode ? '#dbe4ee' : '#ffffff';

    bedContainer.innerHTML = `
      <svg viewBox="0 0 ${bedW} ${bedH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="xtoolGridMinor" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#242a36" stroke-width="0.25"/>
          </pattern>
          <pattern id="xtoolGridMajor" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="url(#xtoolGridMinor)"/>
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2f3847" stroke-width="0.45"/>
          </pattern>
        </defs>

        <!-- Fondo de cama láser xTool -->
        <rect x="0" y="0" width="${bedW}" height="${bedH}" fill="#161a18"/>
        <rect x="0" y="0" width="${bedW}" height="${bedH}" fill="url(#xtoolGridMajor)"/>

        <!-- Guías de cota X e Y desde el origen (0,0) de xTool hasta la esquina superior izquierda -->
        <line x1="0" y1="${numY}" x2="${numX}" y2="${numY}" stroke="#44af65" stroke-width="0.7" stroke-dasharray="2,1.5"/>
        <line x1="${numX}" y1="0" x2="${numX}" y2="${numY}" stroke="#44af65" stroke-width="0.7" stroke-dasharray="2,1.5"/>

        <!-- Etiquetas de posición fija X e Y en la cama láser -->
        <rect x="${Math.max(2, numX / 2 - 14)}" y="${Math.max(3, numY - 8.5)}" width="28" height="6.5" rx="1.5" fill="#44af65"/>
        <text x="${Math.max(16, numX / 2)}" y="${Math.max(7.5, numY - 4)}" fill="#ffffff" font-size="3.7" font-weight="bold" font-family="monospace" text-anchor="middle">X: ${escapeHtml(tpl.xToolX)} mm</text>

        <rect x="${Math.max(2, numX - 31)}" y="${Math.max(4, numY / 2 - 3)}" width="29" height="6.5" rx="1.5" fill="#44af65"/>
        <text x="${Math.max(16.5, numX - 16.5)}" y="${Math.max(8.5, numY / 2 + 1.5)}" fill="#ffffff" font-size="3.7" font-weight="bold" font-family="monospace" text-anchor="middle">Y: ${escapeHtml(tpl.xToolY)} mm</text>

        <!-- Placa física posicionada exactamente en (X, Y) -->
        <rect x="${numX}" y="${numY}" width="${pW}" height="${pH}" fill="${plateBg}" stroke="#44af65" stroke-width="0.8" rx="1.2"/>
        <image x="${numX}" y="${numY}" width="${pW}" height="${pH}" href="${innerBase64}" preserveAspectRatio="none"/>

        <!-- Punto de Anclaje Superior-Izquierdo (Anchor Point activo en xTool Studio) -->
        <circle cx="${numX}" cy="${numY}" r="2.2" fill="#44af65" stroke="#161a18" stroke-width="0.7"/>
        <text x="${numX + 3.5}" y="${numY - 2.2}" fill="#44af65" font-size="3.8" font-weight="bold" font-family="monospace">Origen Placa (X:${escapeHtml(tpl.xToolX)} | Y:${escapeHtml(tpl.xToolY)})</text>
      </svg>
    `;
    renderXToolRulers(bedW, bedH, bedContainer.querySelector('svg'));
  } else {
    if (bedContainer) bedContainer.hidden = true;
    plateContainer.hidden = false;
    plateContainer.classList.toggle('metal-simulation', AppState.metalPreviewMode);
    plateContainer.innerHTML = svgCode;
    // En modo recorte al ArtBox, el SVG mide el área interior; si no, la placa completa
    const isCropped = AppState.settings.exportCropMode === 'inner_artbox';
    renderXToolRulers(
      isCropped ? Number(tpl.innerWidthMm) : tpl.plateWidthMm,
      isCropped ? Number(tpl.innerHeightMm) : tpl.plateHeightMm,
      plateContainer.querySelector('svg') || plateContainer
    );
  }
}

function buildExportFilename(machine, serialNumber, tpl) {
  const clean = (str) => String(str || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_');

  const brandPart = clean(tpl.brandName.toUpperCase());
  const modelPart = clean(`${machine.primaryName}_${machine.primaryModel}`);
  const serialPart = serialNumber ? `_SN-${clean(serialNumber)}` : '';
  const coordsPart = `_X${String(tpl.xToolX).replace(',', '.')}_Y${String(tpl.xToolY).replace(',', '.')}`;
  return `${brandPart}_${modelPart}${serialPart}${coordsPart}.xcs`;
}

/**
 * Incrementa automáticamente el número final del Nº de serie (ej. "1803-261101" -> "1803-261102")
 */
function incrementOperatorSerial() {
  const current = AppState.operatorSerial.trim();
  if (!current) {
    AppState.operatorSerial = '0001';
  } else {
    const match = current.match(/^(.*?)(\d+)(\D*)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const suffix = match[3];
      const nextNum = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
      AppState.operatorSerial = `${prefix}${nextNum}${suffix}`;
    } else {
      AppState.operatorSerial = `${current}-1`;
    }
  }

  const serialInput = document.getElementById('operatorSerialInput');
  if (serialInput) serialInput.value = AppState.operatorSerial;
  updateOperatorStation();
}

/**
 * Genera el contenido SVG final de exportación y persiste el último número de serie
 */
function prepareCurrentMachineExportData() {
  const machine = AppState.machines.find(m => m.id === AppState.selectedMachineId);
  if (!machine) return null;

  const tpl = getEffectiveTemplateConfig(machine.templateId);
  const svgContent = window.PlateTemplates.generatePlateSVG(
    machine,
    {
      serialNumber: AppState.operatorSerial,
      manufactureDate: AppState.operatorDate
    },
    {
      forExport: true,
      showPlateGuides: false,
      zybraKnockoutMode: AppState.settings.zybraKnockoutMode,
      exportCropMode: AppState.settings.exportCropMode,
      lockInnerBoundingBox: AppState.settings.lockInnerBoundingBox,
      templateConfigs: AppState.settings.templateConfigs
    }
  );

  const filename = buildExportFilename(machine, AppState.operatorSerial, tpl);

  if (AppState.operatorSerial.trim()) {
    machine.defaultSerial = AppState.operatorSerial.trim();
  }
  if (AppState.operatorDate.trim()) {
    machine.defaultDate = AppState.operatorDate.trim();
  }
  saveMachinesToStorage();

  return { machine, tpl, svgContent, filename };
}

function recordExportInHistory(machine, tpl, filename, savedPathOnDisk) {
  const entry = {
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    brandName: tpl.brandName,
    model: `${machine.primaryName} ${machine.primaryModel}`,
    serial: AppState.operatorSerial || '—',
    coords: `X: ${tpl.xToolX} | Y: ${tpl.xToolY}`,
    filename,
    savedPathOnDisk
  };
  AppState.exportHistory.unshift(entry);
  AppState.exportHistory = AppState.exportHistory.slice(0, 15);
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(AppState.exportHistory));
  } catch (_) {}
  renderExportHistory();
}

/**
 * 1. Exporta la placa (.xcs con parámetros láser y coordenadas + .svg) en Exportados_xTool/<Marca>/ y muestra la carpeta
 */
async function exportAndOpenInXTool() {
  const data = prepareCurrentMachineExportData();
  if (!data) return;
  const { machine, tpl, svgContent, filename } = data;

  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/export-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: tpl.brandName,
          templateId: machine.templateId,
          xToolX: tpl.xToolX,
          xToolY: tpl.xToolY,
          filename,
          svgContent,
          revealInExplorer: true
        })
      });
      if (res.ok) {
        const info = await res.json();
        const savedTarget = info.xcsPath || info.savedPath;
        AppState.lastExportedFilePath = savedTarget;
        recordExportInHistory(machine, tpl, filename, savedTarget);
        showToastNotification(
          `Placa exportada en Exportados_xTool/${tpl.brandName}: ${filename.replace(/\.svg$/i, '.xcs')} (X: ${tpl.xToolX} | Y: ${tpl.xToolY})`,
          'success'
        );
        return;
      }
    } catch (_) {}
  }

  // Fallback si se abre sin motor local
  await exportFinalSVGForXTool();
}

/**
 * 2. Guarda el archivo directamente en Exportados_xTool/<Marca>/ y lo resalta en Windows
 */
async function exportFinalSVGForXTool() {
  const data = prepareCurrentMachineExportData();
  if (!data) return;
  const { machine, tpl, svgContent, filename } = data;

  let savedPathOnDisk = null;
  if (location.protocol.startsWith('http')) {
    try {
      const res = await fetch('/api/export-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: tpl.brandName,
          templateId: machine.templateId,
          xToolX: tpl.xToolX,
          xToolY: tpl.xToolY,
          filename,
          svgContent,
          revealInExplorer: true
        })
      });
      if (res.ok) {
        const info = await res.json();
        savedPathOnDisk = info.xcsPath || info.savedPath;
        AppState.lastExportedFilePath = savedPathOnDisk;
      }
    } catch (_) {}
  }

  if (!savedPathOnDisk) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  recordExportInHistory(machine, tpl, filename, savedPathOnDisk);
  showToastNotification(
    `Placa guardada en Exportados_xTool/${tpl.brandName}: ${filename} (X: ${tpl.xToolX} | Y: ${tpl.xToolY})`,
    'success'
  );
}

/**
 * 3. Abre el diálogo nativo de Windows ("Guardar como...") para elegir carpeta de destino
 */
async function saveSVGWithNativeDialog() {
  const data = prepareCurrentMachineExportData();
  if (!data) return;
  const { machine, tpl, svgContent, filename } = data;

  if (location.protocol.startsWith('http')) {
    try {
      showToastNotification('Abriendo ventana de guardado de Windows...', 'info');
      const res = await fetch('/api/save-svg-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: tpl.brandName,
          templateId: machine.templateId,
          xToolX: tpl.xToolX,
          xToolY: tpl.xToolY,
          filename,
          svgContent
        })
      });
      if (res.ok) {
        const info = await res.json();
        if (info.ok && info.savedPath) {
          AppState.lastExportedFilePath = info.savedPath;
          recordExportInHistory(machine, tpl, filename, info.savedPath);
          showToastNotification(`Placa guardada en: ${info.savedPath}`, 'success');
        } else if (info.autoSavedPath) {
          showToastNotification(`Guardado cancelado (se conservó copia en Exportados_xTool/${tpl.brandName}).`, 'info');
        }
        return;
      }
    } catch (_) {}
  }

  await exportFinalSVGForXTool();
}

/**
 * Abre la carpeta específica donde se guardan las placas de la marca seleccionada en el Explorador de Windows
 */
async function openExportsFolder(filePath = null) {
  const machine = getSelectedMachine();
  const tpl = machine ? getEffectiveTemplateConfig(machine.templateId) : null;
  const brandName = tpl ? tpl.brandName : null;

  // Si no se especificó un archivo concreto, buscar si hay uno recién exportado de esta misma marca
  let targetFile = filePath;
  if (!targetFile && brandName && Array.isArray(AppState.exportHistory)) {
    const recentForBrand = AppState.exportHistory.find(h => h.brandName === brandName && h.savedPathOnDisk);
    if (recentForBrand) targetFile = recentForBrand.savedPathOnDisk;
  }

  if (location.protocol.startsWith('http')) {
    try {
      await fetch('/api/open-exports-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: targetFile,
          brand: brandName
        })
      });
      showToastNotification(
        brandName ? `Abriendo carpeta: Exportados_xTool/${brandName}` : 'Abriendo carpeta: Exportados_xTool',
        'info'
      );
      return;
    } catch (_) {}
  }
  showToastNotification('Carpeta local: Exportados_xTool', 'info');
}

function renderExportHistory() {
  const listEl = document.getElementById('exportHistoryList');
  if (!listEl) return;

  if (AppState.exportHistory.length === 0) {
    listEl.innerHTML = `<li class="history-empty">Aún no se han exportado placas en esta sesión.</li>`;
    return;
  }

  listEl.innerHTML = AppState.exportHistory.slice(0, 5).map((item, idx) => `
    <li class="history-item">
      <div class="history-item-main">
        <span class="history-time">${escapeHtml(item.time)}</span>
        <strong>${escapeHtml(item.brandName)} — ${escapeHtml(item.model)}</strong>
        <span class="history-sn">Nº Serie: <code>${escapeHtml(item.serial)}</code></span>
      </div>
      <div class="history-item-meta">
        <span class="history-coords">xTool ${escapeHtml(item.coords)}</span>
        ${item.savedPathOnDisk ? `<button type="button" class="btn-icon" onclick="window.AppActions.openExportsFolderByIndex(${idx})">Ver archivo</button>` : ''}
      </div>
    </li>
  `).join('');
}

function openExportsFolderByIndex(idx) {
  const item = AppState.exportHistory[idx];
  if (item && item.savedPathOnDisk) {
    openExportsFolder(item.savedPathOnDisk);
  } else {
    openExportsFolder();
  }
}

// ============================================================================
// MODAL DE CREACIÓN Y EDICIÓN DE MÁQUINAS (CON FLEXIBILIDAD DE CAMPOS)
// ============================================================================
const TEMPLATE_PRESET_SCHEMAS = {
  vorma_cutter_8: [
    { slotId: 'L1', col: 'left', row: 0, label: 'Volt', value: '380V 50HZ', enabled: true },
    { slotId: 'L2', col: 'left', row: 1, label: 'Fase', value: '3 + T', enabled: true },
    { slotId: 'L3', col: 'left', row: 2, label: 'Motor', value: '4.1KW', enabled: true },
    { slotId: 'L4', col: 'left', row: 3, label: 'Weigth', value: '368KG', enabled: true },
    { slotId: 'R1', col: 'right', row: 0, label: 'Capacity', value: '10-15KG', enabled: true },
    { slotId: 'R2', col: 'right', row: 1, label: 'Volume', value: '40 L', enabled: true },
    { slotId: 'R3', col: 'right', row: 2, label: 'Velocity', value: '14 R/M', enabled: true },
    { slotId: 'R4', col: 'right', row: 3, label: 'Vel blade', value: '1- 1420 2- 2840 rpm', enabled: true }
  ],
  vorma_std_6: [
    { slotId: 'L1', col: 'left', row: 0, label: 'Volt', value: '380V', enabled: true },
    { slotId: 'L2', col: 'left', row: 1, label: 'Hz', value: '50HZ', enabled: true },
    { slotId: 'L3', col: 'left', row: 2, label: 'Kw', value: '', enabled: true },
    { slotId: 'L4', col: 'left', row: 3, label: 'Weigth', value: '', enabled: true },
    { slotId: 'R1', col: 'right', row: 0, label: 'Size', value: '', enabled: true },
    { slotId: 'R2', col: 'right', row: 1, label: 'Pressure', value: '', enabled: true },
    { slotId: 'R3', col: 'right', row: 2, label: 'Velocity', value: '', enabled: false },
    { slotId: 'R4', col: 'right', row: 3, label: 'Vel blade', value: '', enabled: false }
  ],
  olsen_std_5: [
    { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', value: '', enabled: true },
    { slotId: 'L2', col: 'left', row: 1, label: 'Size', value: '', enabled: true },
    { slotId: 'L3', col: 'left', row: 2, label: 'Weight', value: '', enabled: true },
    { slotId: 'L4', col: 'left', row: 3, label: 'Fase', value: '', enabled: false },
    { slotId: 'R1', col: 'right', row: 0, label: 'Power', value: '', enabled: true },
    { slotId: 'R2', col: 'right', row: 1, label: 'Pressure', value: '', enabled: true },
    { slotId: 'R3', col: 'right', row: 2, label: 'Capacity', value: '', enabled: false },
    { slotId: 'R4', col: 'right', row: 3, label: 'Velocity', value: '', enabled: false }
  ],
  olsen_extended_8: [
    { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', value: '', enabled: true },
    { slotId: 'L2', col: 'left', row: 1, label: 'Fase', value: '', enabled: true },
    { slotId: 'L3', col: 'left', row: 2, label: 'Size', value: '', enabled: true },
    { slotId: 'L4', col: 'left', row: 3, label: 'Weight', value: '', enabled: true },
    { slotId: 'R1', col: 'right', row: 0, label: 'Power', value: '', enabled: true },
    { slotId: 'R2', col: 'right', row: 1, label: 'Pressure', value: '', enabled: true },
    { slotId: 'R3', col: 'right', row: 2, label: 'Capacity', value: '', enabled: true },
    { slotId: 'R4', col: 'right', row: 3, label: 'Velocity', value: '', enabled: true }
  ],
  zybra_std_5: [
    { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', value: '380V 50Hz', enabled: true },
    { slotId: 'L2', col: 'left', row: 1, label: 'Power', value: '2.5 kW', enabled: true },
    { slotId: 'L3', col: 'left', row: 2, label: 'Date', value: '2026', enabled: true, isDateSlot: true },
    { slotId: 'R1', col: 'right', row: 0, label: 'Size', value: '', enabled: true },
    { slotId: 'R2', col: 'right', row: 1, label: 'Weight', value: '', enabled: true }
  ]
};

function openNewMachineModal() {
  const defaultTplId = AppState.filterBrand === 'zybra'
    ? 'zybra_unica'
    : (AppState.filterBrand === 'olsen' ? 'olsen_grande' : 'vorma_grande');
  const tpl = getEffectiveTemplateConfig(defaultTplId);

  AppState.isNewMachine = true;
  AppState.editingMachine = {
    id: 'm-' + Date.now(),
    brand: tpl.brand,
    templateId: defaultTplId,
    primaryName: '',
    primaryModel: '',
    defaultSerial: '',
    defaultDate: String(new Date().getFullYear()),
    notes: '',
    slots: JSON.parse(JSON.stringify(tpl.defaultSlots)).map(s => ({
      ...s,
      value: s.defaultVal || ''
    }))
  };

  populateAndOpenMachineModal('Crear Nueva Especificación de Máquina');
}

function openEditMachineModal(machineId) {
  const targetId = machineId || AppState.selectedMachineId;
  const existing = AppState.machines.find(m => m.id === targetId);
  if (!existing) return;

  AppState.isNewMachine = false;
  AppState.editingMachine = JSON.parse(JSON.stringify(existing));
  populateAndOpenMachineModal(`Editar Máquina: ${existing.primaryName} ${existing.primaryModel}`);
}

function populateAndOpenMachineModal(titleText) {
  const dialog = document.getElementById('machineEditorDialog');
  const m = AppState.editingMachine;
  if (!dialog || !m) return;

  document.getElementById('machineModalTitle').textContent = titleText;
  document.getElementById('editTemplateSelect').value = m.templateId;
  document.getElementById('editPrimaryName').value = m.primaryName || '';
  document.getElementById('editPrimaryModel').value = m.primaryModel || '';
  document.getElementById('editDefaultSerial').value = m.defaultSerial || '';
  document.getElementById('editDefaultDate').value = m.defaultDate || '2026';
  const notesEl = document.getElementById('editMachineNotes');
  if (notesEl) notesEl.value = m.notes || '';

  const manageBtns = document.getElementById('modalManageBtns');
  if (manageBtns) {
    manageBtns.style.display = AppState.isNewMachine ? 'none' : 'flex';
  }

  syncModalTemplateLabelsAndSlots(false);
  dialog.showModal();
}

function syncModalTemplateLabelsAndSlots(resetSlotsToTemplateDefault = false) {
  const m = AppState.editingMachine;
  if (!m) return;

  const tplId = document.getElementById('editTemplateSelect').value;
  const tpl = getEffectiveTemplateConfig(tplId);
  m.templateId = tplId;
  m.brand = tpl.brand;

  document.getElementById('modalNameLabel').textContent = tpl.primaryNameLabel + ' *';
  document.getElementById('modalModelLabel').textContent = tpl.primaryModelLabel + ' *';
  document.getElementById('modalSerialLabel').textContent = tpl.serialLabel + ' (Base)';
  document.getElementById('modalDateLabel').textContent = tpl.dateLabel;
  const infoEl = document.getElementById('modalTemplateInfoBadge');
  if (infoEl) {
    infoEl.innerHTML = `
      <img src="img/brand-${tpl.brand}.png" class="brand-avatar-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;" alt=""/>
      <span>${escapeHtml(tpl.brandName)} — ${escapeHtml(tpl.formatName)} | Posición fija xTool: X: ${tpl.xToolX} | Y: ${tpl.xToolY}</span>
    `;
  }

  if (resetSlotsToTemplateDefault) {
    // Conservar valores existentes por etiqueta o por posición cuando sea posible
    const prevSlots = m.slots || [];
    m.slots = JSON.parse(JSON.stringify(tpl.defaultSlots)).map((defSlot, idx) => {
      const sameLabel = prevSlots.find(p => p.label && p.label.toLowerCase() === defSlot.label.toLowerCase());
      const samePos = prevSlots[idx];
      return {
        ...defSlot,
        value: sameLabel ? sameLabel.value : (samePos && samePos.value ? samePos.value : (defSlot.defaultVal || ''))
      };
    });
  }

  renderModalPresetButtons(tplId);
  renderModalSlotsEditor();
  updateModalLivePreview();
}

function renderModalPresetButtons(tplId) {
  const bar = document.getElementById('modalSchemaPresetsBar');
  if (!bar) return;

  if (tplId.startsWith('vorma_')) {
    bar.innerHTML = `
      <span class="preset-bar-label">Esquemas rápidos Vorma:</span>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.AppActions.applySlotSchemaPreset('vorma_cutter_8')">
        Cutter Completo (8 campos: Volt, Fase, Motor, Weigth, Capacity, Volume, Velocity, Vel blade)
      </button>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.AppActions.applySlotSchemaPreset('vorma_std_6')">
        Estándar (6 campos: Volt, Hz, Kw, Weigth, Size, Pressure)
      </button>
    `;
  } else if (tplId.startsWith('olsen_')) {
    bar.innerHTML = `
      <span class="preset-bar-label">Esquemas rápidos Olsen &amp; Kael:</span>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.AppActions.applySlotSchemaPreset('olsen_std_5')">
        Estándar (5 campos: Voltage, Size, Weight, Power, Pressure)
      </button>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.AppActions.applySlotSchemaPreset('olsen_extended_8')">
        Ampliado (8 campos con Fase, Capacity, Velocity)
      </button>
    `;
  } else {
    bar.innerHTML = `
      <span class="preset-bar-label">Esquema Zybra (5 bloques negros con texto en blanco):</span>
      <button type="button" class="btn btn-sm btn-outline" onclick="window.AppActions.applySlotSchemaPreset('zybra_std_5')">
        Restaurar 5 etiquetas estándar (Voltage, Power, Date, Size, Weight)
      </button>
    `;
  }
}

function applySlotSchemaPreset(presetKey) {
  const preset = TEMPLATE_PRESET_SCHEMAS[presetKey];
  if (!preset || !AppState.editingMachine) return;

  const oldSlots = AppState.editingMachine.slots || [];
  AppState.editingMachine.slots = JSON.parse(JSON.stringify(preset)).map(newSlot => {
    const match = oldSlots.find(o => o.label && o.label.toLowerCase() === newSlot.label.toLowerCase());
    return {
      ...newSlot,
      value: (match && match.value) ? match.value : newSlot.value
    };
  });

  renderModalSlotsEditor();
  updateModalLivePreview();
}

function renderModalSlotsEditor() {
  const m = AppState.editingMachine;
  if (!m) return;
  if (!Array.isArray(m.slots)) m.slots = [];

  const leftContainer = document.getElementById('modalSlotsLeftCol');
  const rightContainer = document.getElementById('modalSlotsRightCol');
  if (!leftContainer || !rightContainer) return;

  const leftSlots = m.slots.filter(s => s.col === 'left');
  const rightSlots = m.slots.filter(s => s.col === 'right');

  const renderSlotRow = (slot, colSlots) => {
    const globalIdx = m.slots.indexOf(slot);
    const colIdx = colSlots.indexOf(slot);
    const canMoveUp = colIdx > 0;
    const canMoveDown = colIdx < colSlots.length - 1;

    return `
      <div class="slot-editor-row" data-slot-id="${escapeHtml(slot.slotId || '')}">
        <div class="slot-inputs">
          <input type="text" list="technicalLabelsList"
                 class="input-slot-label"
                 placeholder="Apartado (ej. Volt, Fase...)"
                 value="${escapeHtml(slot.label || '')}"
                 oninput="window.AppActions.updateModalSlot(${globalIdx}, 'label', this.value)"/>
          <input type="text"
                 class="input-slot-value"
                 placeholder="Valor (ej. 380V 50HZ)"
                 value="${escapeHtml(slot.value || '')}"
                 oninput="window.AppActions.updateModalSlot(${globalIdx}, 'value', this.value)"/>
        </div>
        <div class="slot-actions">
          <button type="button" class="btn-slot-tool" title="Mover a la columna ${slot.col === 'left' ? 'derecha' : 'izquierda'}"
                  onclick="window.AppActions.switchSlotColumn(${globalIdx})">⇄</button>
          <button type="button" class="btn-slot-tool" title="Subir orden"
                  ${canMoveUp ? '' : 'disabled'}
                  onclick="window.AppActions.moveSlotOrder(${globalIdx}, -1)">↑</button>
          <button type="button" class="btn-slot-tool" title="Bajar orden"
                  ${canMoveDown ? '' : 'disabled'}
                  onclick="window.AppActions.moveSlotOrder(${globalIdx}, 1)">↓</button>
          <button type="button" class="btn-slot-tool btn-slot-del" title="Eliminar este parámetro"
                  onclick="window.AppActions.removeSlot(${globalIdx})">✕</button>
        </div>
      </div>
    `;
  };

  leftContainer.innerHTML = `
    <div class="slots-col-header">
      <span class="slots-count-tag">${leftSlots.length} ${leftSlots.length === 1 ? 'parámetro' : 'parámetros'}</span>
    </div>
    <div class="slots-list">${leftSlots.map(s => renderSlotRow(s, leftSlots)).join('')}</div>
    <button type="button" class="btn btn-sm btn-outline btn-add-slot" onclick="window.AppActions.addSlotToColumn('left')">
      + Añadir parámetro
    </button>
  `;

  rightContainer.innerHTML = `
    <div class="slots-col-header">
      <span class="slots-count-tag">${rightSlots.length} ${rightSlots.length === 1 ? 'parámetro' : 'parámetros'}</span>
    </div>
    <div class="slots-list">${rightSlots.map(s => renderSlotRow(s, rightSlots)).join('')}</div>
    <button type="button" class="btn btn-sm btn-outline btn-add-slot" onclick="window.AppActions.addSlotToColumn('right')">
      + Añadir parámetro
    </button>
  `;
}

function addSlotToColumn(col) {
  const m = AppState.editingMachine;
  if (!m) return;
  if (!Array.isArray(m.slots)) m.slots = [];
  const newSlot = {
    slotId: (col === 'left' ? 'L' : 'R') + Date.now(),
    col,
    label: '',
    value: '',
    enabled: true
  };
  m.slots.push(newSlot);
  renderModalSlotsEditor();
  updateModalLivePreview();
}

function removeSlot(slotIndex) {
  const m = AppState.editingMachine;
  if (!m || !m.slots || !m.slots[slotIndex]) return;
  m.slots.splice(slotIndex, 1);
  renderModalSlotsEditor();
  updateModalLivePreview();
}

function switchSlotColumn(slotIndex) {
  const m = AppState.editingMachine;
  if (!m || !m.slots || !m.slots[slotIndex]) return;
  m.slots[slotIndex].col = m.slots[slotIndex].col === 'left' ? 'right' : 'left';
  renderModalSlotsEditor();
  updateModalLivePreview();
}

function moveSlotOrder(slotIndex, direction) {
  const m = AppState.editingMachine;
  if (!m || !m.slots || !m.slots[slotIndex]) return;
  const slot = m.slots[slotIndex];
  const colSlots = m.slots.filter(s => s.col === slot.col);
  const currentPosInCol = colSlots.indexOf(slot);
  const targetPosInCol = currentPosInCol + direction;
  if (targetPosInCol < 0 || targetPosInCol >= colSlots.length) return;

  const otherSlot = colSlots[targetPosInCol];
  const idxA = m.slots.indexOf(slot);
  const idxB = m.slots.indexOf(otherSlot);
  m.slots[idxA] = otherSlot;
  m.slots[idxB] = slot;

  renderModalSlotsEditor();
  updateModalLivePreview();
}

function updateModalSlot(slotIndex, prop, val) {
  const m = AppState.editingMachine;
  if (!m || !m.slots[slotIndex]) return;
  m.slots[slotIndex][prop] = val;
  updateModalLivePreview();
}

function syncModalSlotsFromDOM() {
  const m = AppState.editingMachine;
  if (!m || !Array.isArray(m.slots)) return;

  const leftContainer = document.getElementById('modalSlotsLeftCol');
  const rightContainer = document.getElementById('modalSlotsRightCol');
  if (!leftContainer || !rightContainer) return;

  const leftRows = leftContainer.querySelectorAll('.slot-editor-row');
  const leftSlots = m.slots.filter(s => s.col === 'left');
  leftRows.forEach((row, i) => {
    if (leftSlots[i]) {
      const lbl = row.querySelector('.input-slot-label');
      const val = row.querySelector('.input-slot-value');
      if (lbl) leftSlots[i].label = lbl.value;
      if (val) leftSlots[i].value = val.value;
    }
  });

  const rightRows = rightContainer.querySelectorAll('.slot-editor-row');
  const rightSlots = m.slots.filter(s => s.col === 'right');
  rightRows.forEach((row, i) => {
    if (rightSlots[i]) {
      const lbl = row.querySelector('.input-slot-label');
      const val = row.querySelector('.input-slot-value');
      if (lbl) rightSlots[i].label = lbl.value;
      if (val) rightSlots[i].value = val.value;
    }
  });
}

function syncModalTopInputsToEditingMachine() {
  const m = AppState.editingMachine;
  if (!m) return;
  m.primaryName = document.getElementById('editPrimaryName').value;
  m.primaryModel = document.getElementById('editPrimaryModel').value;
  m.defaultSerial = document.getElementById('editDefaultSerial').value;
  m.defaultDate = document.getElementById('editDefaultDate').value;
  const notesEl = document.getElementById('editMachineNotes');
  if (notesEl) m.notes = notesEl.value;
  syncModalSlotsFromDOM();
  updateModalLivePreview();
}

function duplicateFromModal() {
  if (!AppState.editingMachine) return;
  const targetId = AppState.editingMachine.id;
  document.getElementById('machineEditorDialog').close();
  duplicateMachine(targetId);
}

function deleteFromModal() {
  if (!AppState.editingMachine) return;
  const targetId = AppState.editingMachine.id;
  document.getElementById('machineEditorDialog').close();
  deleteMachine(targetId);
}

function updateModalLivePreview() {
  const m = AppState.editingMachine;
  const previewBox = document.getElementById('modalSvgPreviewBox');
  if (!m || !previewBox) return;

  const svg = window.PlateTemplates.generatePlateSVG(
    m,
    {
      serialNumber: m.defaultSerial || '0000-000001',
      manufactureDate: m.defaultDate || '2026'
    },
    {
      forExport: false,
      showPlateGuides: true,
      zybraKnockoutMode: AppState.settings.zybraKnockoutMode,
      exportCropMode: AppState.settings.exportCropMode,
      templateConfigs: AppState.settings.templateConfigs
    }
  );
  previewBox.innerHTML = svg;
}

function saveMachineFromModal(event) {
  event.preventDefault();
  const form = document.getElementById('machineEditorForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  syncModalTopInputsToEditingMachine();
  const m = AppState.editingMachine;

  if (AppState.isNewMachine) {
    AppState.machines.unshift(m);
  } else {
    const idx = AppState.machines.findIndex(item => item.id === m.id);
    if (idx !== -1) {
      AppState.machines[idx] = m;
    } else {
      AppState.machines.unshift(m);
    }
  }

  saveMachinesToStorage();
  document.getElementById('machineEditorDialog').close();
  selectMachineForOperator(m.id);
  showToastNotification(`Máquina "${m.primaryName} ${m.primaryModel}" guardada correctamente.`, 'success');
}

function duplicateMachine(machineId) {
  const orig = AppState.machines.find(m => m.id === machineId);
  if (!orig) return;

  AppState.isNewMachine = true;
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = 'm-' + Date.now();
  copy.primaryModel = `${orig.primaryModel} (Copia)`;
  AppState.editingMachine = copy;

  populateAndOpenMachineModal(`Duplicar Máquina: ${orig.primaryName} ${orig.primaryModel}`);
}

function deleteMachine(machineId) {
  const target = AppState.machines.find(m => m.id === machineId);
  if (!target) return;

  const ok = window.confirm(`¿Seguro que deseas eliminar la máquina "${target.primaryName} — ${target.primaryModel}" del catálogo?`);
  if (!ok) return;

  AppState.machines = AppState.machines.filter(m => m.id !== machineId);
  saveMachinesToStorage();

  if (AppState.selectedMachineId === machineId) {
    AppState.selectedMachineId = AppState.machines.length > 0 ? AppState.machines[0].id : null;
    if (AppState.selectedMachineId) {
      selectMachineForOperator(AppState.selectedMachineId);
    } else {
      renderCatalog();
      updateOperatorStation();
    }
  } else {
    renderCatalog();
  }
  showToastNotification(`Máquina eliminada.`, 'info');
}

// ============================================================================
// MODAL DE CALIBRACIÓN DE PLANTILLAS Y MEDIDAS xTOOL
// ============================================================================
function openCalibrationModal() {
  const dialog = document.getElementById('calibrationDialog');
  if (!dialog) return;

  document.getElementById('settingExportCropMode').value = AppState.settings.exportCropMode || 'full_plate';
  document.getElementById('settingZybraKnockoutMode').value = AppState.settings.zybraKnockoutMode || 'compound';
  document.getElementById('settingLockInnerBounds').checked = !!AppState.settings.lockInnerBoundingBox;

  const tbody = document.getElementById('calibrationTableBody');
  const keys = ['zybra_unica', 'vorma_grande', 'vorma_pequena', 'olsen_grande', 'olsen_pequena'];

  tbody.innerHTML = keys.map(key => {
    const cfg = getEffectiveTemplateConfig(key);
    return `
      <tr data-tpl-key="${key}">
        <td><strong>${escapeHtml(cfg.brandName)}</strong><br/><small>${escapeHtml(cfg.shortFormat)}</small></td>
        <td>${cfg.plateWidthMm} × ${cfg.plateHeightMm} mm</td>
        <td>
          <div class="calib-pair">
            <label>Ancho:<input type="number" step="0.01" class="input-calib" data-field="innerWidthMm" value="${cfg.innerWidthMm}"/></label>
            <label>Alto:<input type="number" step="0.01" class="input-calib" data-field="innerHeightMm" value="${cfg.innerHeightMm}"/></label>
          </div>
        </td>
        <td>
          <div class="calib-pair">
            <label>X:<input type="text" class="input-calib-coord" data-field="xToolX" value="${escapeHtml(cfg.xToolX)}"/></label>
            <label>Y:<input type="text" class="input-calib-coord" data-field="xToolY" value="${escapeHtml(cfg.xToolY)}"/></label>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  dialog.showModal();
}

function saveCalibrationSettings(event) {
  event.preventDefault();
  AppState.settings.exportCropMode = document.getElementById('settingExportCropMode').value;
  AppState.settings.zybraKnockoutMode = document.getElementById('settingZybraKnockoutMode').value;
  AppState.settings.lockInnerBoundingBox = document.getElementById('settingLockInnerBounds').checked;

  const rows = document.querySelectorAll('#calibrationTableBody tr[data-tpl-key]');
  if (!AppState.settings.templateConfigs) AppState.settings.templateConfigs = {};

  rows.forEach(row => {
    const key = row.getAttribute('data-tpl-key');
    const innerW = parseFloat(row.querySelector('[data-field="innerWidthMm"]').value);
    const innerH = parseFloat(row.querySelector('[data-field="innerHeightMm"]').value);
    const xToolX = row.querySelector('[data-field="xToolX"]').value.trim();
    const xToolY = row.querySelector('[data-field="xToolY"]').value.trim();

    const base = window.PlateTemplates.DEFAULT_TEMPLATE_CONFIGS[key];
    AppState.settings.templateConfigs[key] = {
      innerWidthMm: !isNaN(innerW) && innerW > 0 ? innerW : base.innerWidthMm,
      innerHeightMm: !isNaN(innerH) && innerH > 0 ? innerH : base.innerHeightMm,
      xToolX: xToolX || base.xToolX,
      xToolY: xToolY || base.xToolY
    };
  });

  saveSettingsToStorage();
  document.getElementById('calibrationDialog').close();
  renderCatalog();
  updateOperatorStation();
  showToastNotification('Parámetros de medidas y coordenadas xTool actualizados.', 'success');
}

function resetCalibrationDefaults() {
  AppState.settings.exportCropMode = 'full_plate';
  AppState.settings.zybraKnockoutMode = 'compound';
  AppState.settings.lockInnerBoundingBox = false;
  AppState.settings.templateConfigs = {};
  saveSettingsToStorage();
  openCalibrationModal();
  renderCatalog();
  updateOperatorStation();
  showToastNotification('Medidas y coordenadas restauradas a los valores originales.', 'info');
}

// ============================================================================
// EXPORTAR / IMPORTAR COPIA DE SEGURIDAD JSON DEL CATÁLOGO
// ============================================================================
function exportDatabaseJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: AppState.settings,
    machines: AppState.machines
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Catalogo_Placas_Maquinaria_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToastNotification('Copia de seguridad del catálogo descargada (.json).', 'success');
}

function importDatabaseJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const list = Array.isArray(parsed) ? parsed : parsed.machines;
      if (!Array.isArray(list) || list.length === 0) {
        alert('El archivo JSON no contiene un listado válido de máquinas.');
        return;
      }
      AppState.machines = list;
      if (parsed.settings) {
        AppState.settings = { ...AppState.settings, ...parsed.settings };
        saveSettingsToStorage();
      }
      saveMachinesToStorage();
      selectMachineForOperator(AppState.machines[0].id);
      showToastNotification(`Se han importado ${list.length} máquinas correctamente.`, 'success');
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ============================================================================
// UTILIDADES DE INTERFAZ Y EVENTOS
// ============================================================================
function copyTextToClipboard(text, label) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToastNotification(`${label} copiado: ${text}`, 'info');
    });
  }
}

function showToastNotification(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function checkDesktopSystemInfo() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const res = await fetch('/api/system-info');
    if (!res.ok) return;
    const info = await res.json();
    if (info.version) {
      const badge = document.getElementById('appVersionBadge');
      if (badge) badge.textContent = 'v' + info.version;
    }
  } catch (_) {}
}

/**
 * Comprueba en GitHub si existe una nueva versión disponible.
 * Si hay una versión nueva, muestra automáticamente el pop-up de actualización en 1 clic.
 */
async function checkForUpdates(manual = false) {
  if (!location.protocol.startsWith('http')) return;
  try {
    if (manual) {
      showToastNotification('Buscando actualizaciones en GitHub...', 'info');
    }
    const res = await fetch('/api/check-update');
    if (!res.ok) return;
    const data = await res.json();

    if (data.currentVersion) {
      const badge = document.getElementById('appVersionBadge');
      if (badge) badge.textContent = 'v' + data.currentVersion;
    }

    AppState.latestUpdateInfo = data;

    const btnNotice = document.getElementById('btnUpdateNotice');
    if (data.updateAvailable === true) {
      if (btnNotice) {
        btnNotice.hidden = false;
        btnNotice.style.display = 'inline-flex';
        btnNotice.textContent = `¡Nueva versión v${data.latestVersion}!`;
      }
      openUpdateModal();
    } else {
      if (btnNotice) {
        btnNotice.hidden = true;
        btnNotice.style.display = 'none';
      }
      if (manual) {
        if (data.offline) {
          showToastNotification('No se pudo conectar con GitHub para comprobar actualizaciones.', 'info');
        } else {
          showToastNotification(`Ya tienes instalada la última versión (v${data.currentVersion}).`, 'success');
        }
      }
    }
  } catch (_) {
    if (manual) {
      showToastNotification('Error al comprobar actualizaciones.', 'info');
    }
  }
}

function openUpdateModal() {
  const dialog = document.getElementById('updateDialog');
  if (!dialog) return;
  const info = AppState.latestUpdateInfo || {};

  const curEl = document.getElementById('updateCurrentVerText');
  const latEl = document.getElementById('updateLatestVerText');
  const notesEl = document.getElementById('updateNotesBox');

  if (curEl) curEl.textContent = 'v' + (info.currentVersion || '1.2.0');
  if (latEl) latEl.textContent = 'v' + (info.latestVersion || '1.2.0');
  if (notesEl) {
    notesEl.textContent = info.notes || 'Mejoras de estabilidad, parámetros láser xTool y plantillas actualizadas.';
  }

  dialog.showModal();
}

async function performOneClickUpdate() {
  const btn = document.getElementById('btnPerformUpdateNow');
  const lead = document.getElementById('updateStatusLead');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Actualizando programa...';
  }
  if (lead) {
    lead.textContent = 'Descargando e instalando la nueva versión desde GitHub. Tus máquinas y placas guardadas se conservarán intactas...';
  }

  try {
    const res = await fetch('/api/perform-update', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.ok) {
      showToastNotification(`¡Programa actualizado a v${data.updatedVersion}! Recargando...`, 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      throw new Error(data.error || 'Error al actualizar');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Reintentar actualización';
    }
    if (lead) {
      lead.textContent = 'Hubo un problema al actualizar automáticamente: ' + err.message;
    }
    showToastNotification('No se pudo actualizar automáticamente.', 'info');
  }
}

// Exponer acciones globales para manejadores inline
window.AppActions = {
  selectMachine: selectMachineForOperator,
  openNewMachineModal,
  openEditMachineModal,
  duplicateMachine,
  duplicateFromModal,
  deleteMachine,
  deleteFromModal,
  applySlotSchemaPreset,
  addSlotToColumn,
  removeSlot,
  switchSlotColumn,
  moveSlotOrder,
  updateModalSlot,
  incrementOperatorSerial,
  setCanvasViewMode,
  exportAndOpenInXTool,
  exportFinalSVGForXTool,
  saveSVGWithNativeDialog,
  openExportsFolder,
  openExportsFolderByIndex,
  openCalibrationModal,
  resetCalibrationDefaults,
  exportDatabaseJSON,
  copyTextToClipboard,
  checkForUpdates,
  openUpdateModal,
  performOneClickUpdate
};

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  window.PlateTemplates.initEmbeddedFonts();
  setupDialogFallbacks();
  UserInvalidFallback.init(document);
  checkDesktopSystemInfo();
  setTimeout(() => checkForUpdates(false), 1200);

  // Filtros de marca
  document.querySelectorAll('[data-brand-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-brand-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.filterBrand = btn.getAttribute('data-brand-filter');
      renderCatalog();
    });
  });

  // Filtro de tamaño de placa
  const sizeFilterEl = document.getElementById('plateSizeFilter');
  if (sizeFilterEl) {
    sizeFilterEl.addEventListener('change', (e) => {
      AppState.filterSize = e.target.value;
      renderCatalog();
    });
  }

  // Buscador en vivo
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      renderCatalog();
    });
  }

  // Inputs en tiempo real del Modo Operario
  const opSerial = document.getElementById('operatorSerialInput');
  if (opSerial) {
    opSerial.addEventListener('input', (e) => {
      AppState.operatorSerial = e.target.value;
      updateOperatorStation();
    });
  }

  const opDate = document.getElementById('operatorDateInput');
  if (opDate) {
    opDate.addEventListener('input', (e) => {
      AppState.operatorDate = e.target.value;
      updateOperatorStation();
    });
  }

  // Controles de vista previa (Guías y Modo Metal)
  const chkGuides = document.getElementById('toggleGuidesCheckbox');
  if (chkGuides) {
    chkGuides.addEventListener('change', (e) => {
      AppState.showPlateGuides = e.target.checked;
      updateOperatorStation();
    });
  }

  const chkMetal = document.getElementById('toggleMetalCheckbox');
  if (chkMetal) {
    chkMetal.addEventListener('change', (e) => {
      AppState.metalPreviewMode = e.target.checked;
      updateOperatorStation();
    });
  }

  // Eventos del Modal de Creación/Edición de Máquina
  const tplSelect = document.getElementById('editTemplateSelect');
  if (tplSelect) {
    tplSelect.addEventListener('change', () => syncModalTemplateLabelsAndSlots(true));
  }

  ['editPrimaryName', 'editPrimaryModel', 'editDefaultSerial', 'editDefaultDate', 'editMachineNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', syncModalTopInputsToEditingMachine);
  });

  const machineForm = document.getElementById('machineEditorForm');
  if (machineForm) {
    machineForm.addEventListener('submit', saveMachineFromModal);
  }

  const calibForm = document.getElementById('calibrationForm');
  if (calibForm) {
    calibForm.addEventListener('submit', saveCalibrationSettings);
  }

  const importFileInput = document.getElementById('importJsonFileInput');
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importDatabaseJSON(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  await loadAppData();
  renderExportHistory();
  if (location.hash === '#cama') setCanvasViewMode('bed');
});
