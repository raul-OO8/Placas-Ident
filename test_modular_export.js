/**
 * Test de verificación integral del motor de plantillas y curvas:
 * - Carga de fuentes opentype (CorporateA, Univers, JetBrainsMono)
 * - Verificación de todas las 33 máquinas
 * - Verificación de casos modulares: añadir parámetros, eliminar, 2 columnas asimétricas
 * - Verificación de que 0 elementos <text> existen (100% path trazado a curvas)
 * - Verificación de dimensiones mm y coordenadas fijas de xTool
 */

const fs = require('fs');
const path = require('path');

// Simular entorno window para los scripts del cliente
global.window = global;

global.opentype = require('./js/opentype.min.js');
require('./js/fonts-data.js');
require('./js/templates.js');

const { initEmbeddedFonts, generatePlateSVG, DEFAULT_TEMPLATE_CONFIGS } = window.PlateTemplates;

// Inicializar fuentes embebidas
initEmbeddedFonts();

// Cargar máquinas de prueba desde data/maquinas.json
const maquinasJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'maquinas.json'), 'utf8'));

console.log(`Total de maquinas cargadas: ${maquinasJson.length}`);

const expectedCoords = {
  zybra_unica: { x: '50', y: '50', w: 150, h: 90 },
  vorma_grande: { x: '51', y: '51', w: 150, h: 90 },
  vorma_pequena: { x: '50,5', y: '50', w: 110, h: 70 },
  olsen_grande: { x: '48', y: '49,5', w: 150, h: 90 },
  olsen_pequena: { x: '47', y: '47,5', w: 110, h: 70 }
};

let errors = 0;

for (const m of maquinasJson) {
  const tpl = DEFAULT_TEMPLATE_CONFIGS[m.templateId];
  if (!tpl) {
    console.error(`ERROR: Template no encontrado para maquina ${m.id}: ${m.templateId}`);
    errors++;
    continue;
  }

  const exp = expectedCoords[m.templateId];
  if (tpl.xToolX !== exp.x || tpl.xToolY !== exp.y || tpl.plateWidthMm !== exp.w || tpl.plateHeightMm !== exp.h) {
    console.error(`ERROR: Coordenadas o medidas no coinciden para ${m.templateId}:`, {
      got: { x: tpl.xToolX, y: tpl.xToolY, w: tpl.plateWidthMm, h: tpl.plateHeightMm },
      expected: exp
    });
    errors++;
  }

  const svg = generatePlateSVG(m, {
    serialNumber: 'SN-TEST-9999',
    manufactureDate: '2026'
  }, { forExport: true });

  // 1. Verificar ausencia total de etiquetas de texto crudo
  if (/<text[\s>]/i.test(svg) || /<tspan[\s>]/i.test(svg)) {
    console.error(`ERROR: El SVG generado para ${m.id} contiene etiquetas <text> o <tspan> sin trazar!`);
    errors++;
  }

  // 2. Verificar que contiene trazados
  if (!/<path\s/i.test(svg)) {
    console.error(`ERROR: El SVG generado para ${m.id} no contiene elementos <path>!`);
    errors++;
  }
}

// Probar ahora casos modulares extremos (muchos parámetros, pocos parámetros, asimetría 2 columnas)
console.log('\n--- Probando casos modulares personalizados en 2 columnas ---');

const testCases = [
  {
    desc: 'Vorma Grande con 6 campos en izquierda y 1 en derecha',
    templateId: 'vorma_grande',
    brand: 'vorma',
    primaryName: 'ENVASADORA AL VACÍO INDUSTRIAL',
    primaryModel: 'MODELO DUAL EXTENDED-400',
    slots: [
      { col: 'left', label: 'Voltaje', value: '400V 50Hz', enabled: true },
      { col: 'left', label: 'Potencia', value: '7.5 kW', enabled: true },
      { col: 'left', label: 'Frecuencia', value: '50 Hz', enabled: true },
      { col: 'left', label: 'Fases', value: '3 Fases + N', enabled: true },
      { col: 'left', label: 'Presión Vacío', value: '0.08 MPa', enabled: true },
      { col: 'left', label: 'Capacidad Bomba', value: '63 m3/h', enabled: true },
      { col: 'right', label: 'Peso Neto', value: '420 kg', enabled: true }
    ]
  },
  {
    desc: 'Olsen Pequeña con 4 campos en derecha y 0 en izquierda',
    templateId: 'olsen_pequena',
    brand: 'olsen',
    primaryName: 'CUTTER HORIZONTAL COMPACTO',
    primaryModel: 'MINI-CUT 20',
    slots: [
      { col: 'right', label: 'Power', value: '1.5 kW', enabled: true },
      { col: 'right', label: 'Voltage', value: '230V', enabled: true },
      { col: 'right', label: 'Weight', value: '65 kg', enabled: true },
      { col: 'right', label: 'Velocity', value: '1400 rpm', enabled: true }
    ]
  },
  {
    desc: 'Zybra 150x90 con 6 bloques negros modulares redistribuidos',
    templateId: 'zybra_unica',
    brand: 'zybra',
    primaryName: 'SAW BLADE CUTTER',
    primaryModel: 'ZYB-8800',
    slots: [
      { col: 'left', label: 'Voltage', value: '380V 50Hz', enabled: true },
      { col: 'left', label: 'Power', value: '3.0 kW', enabled: true },
      { col: 'left', label: 'Blade Diam.', value: '350 mm', enabled: true },
      { col: 'right', label: 'Speed', value: '2800 rpm', enabled: true },
      { col: 'right', label: 'Weight', value: '190 kg', enabled: true },
      { col: 'right', label: 'Air Press.', value: '6 bar', enabled: true }
    ]
  }
];

for (const tc of testCases) {
  const svg = generatePlateSVG(tc, {
    serialNumber: 'MODULAR-TEST-001',
    manufactureDate: '2026'
  }, { forExport: true });

  if (/<text[\s>]/i.test(svg) || /<tspan[\s>]/i.test(svg)) {
    console.error(`ERROR en caso modular [${tc.desc}]: Contiene texto crudo!`);
    errors++;
  } else {
    console.log(`✓ [${tc.desc}] generado con éxito (${(svg.length / 1024).toFixed(1)} KB, 100% curvas)`);
  }
}

if (errors === 0) {
  console.log('\n=========================================');
  console.log('TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE (0 errores)');
  console.log('=========================================');
} else {
  console.error(`\nFALLARON ${errors} PRUEBAS.`);
  process.exit(1);
}
