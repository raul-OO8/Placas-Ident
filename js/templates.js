/**
 * Sistema de Plantillas Vectoriales Fijas y Motor de Trazado a Curvas (xTool)
 * Marcas soportadas:
 *  1. Zybra — Placa Única (150 x 90 mm) -> xTool X: 50 | Y: 50
 *  2. Vorma — Placa Grande (150 x 90 mm) -> xTool X: 51 | Y: 51
 *  3. Vorma — Placa Pequeña (110 x 70 mm) -> xTool X: 50,5 | Y: 50
 *  4. Olsen & Kael — Placa Grande (150 x 90 mm) -> xTool X: 48 | Y: 49,5
 *  5. Olsen & Kael — Placa Pequeña (110 x 70 mm) -> xTool X: 47 | Y: 47,5
 */

const PT_TO_MM = 25.4 / 72.0; // 1 pt = 0.3527777... mm
const MM_TO_PT = 72.0 / 25.4; // 1 mm = 2.83464567 pt

const DEFAULT_TEMPLATE_CONFIGS = {
  zybra_unica: {
    id: 'zybra_unica',
    brand: 'zybra',
    brandName: 'Zybra',
    formatName: 'Placa Única (150 × 90 mm)',
    shortFormat: '150 × 90 mm',
    plateWidthMm: 150,
    plateHeightMm: 90,
    viewBoxWidthPt: 425.197,
    viewBoxHeightPt: 255.118,
    // ArtBox exacto extraído del diseño de Illustrator (en pt y en mm)
    artBoxPt: { x: 14.637, y: 12.107, width: 396.211, height: 230.040 },
    innerWidthMm: 139.77,
    innerHeightMm: 81.15,
    xToolX: '50',
    xToolY: '50',
    primaryNameLabel: 'Name (Tipo de Máquina)',
    primaryModelLabel: 'Model (Modelo)',
    serialLabel: 'Serial number',
    dateLabel: 'Date (Fecha / Año)',
    hasSeparateDateInGrid: true, // En Zybra "Date:" es uno de los 5 bloques negros por defecto
    maxTechSlots: 5,
    defaultSlots: [
      { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', defaultVal: '380V 50Hz', enabled: true },
      { slotId: 'L2', col: 'left', row: 1, label: 'Power', defaultVal: '2.5 kW', enabled: true },
      { slotId: 'L3', col: 'left', row: 2, label: 'Date', defaultVal: '2026', enabled: true, isDateSlot: true },
      { slotId: 'R1', col: 'right', row: 0, label: 'Size', defaultVal: '850x600x950', enabled: true },
      { slotId: 'R2', col: 'right', row: 1, label: 'Weight', defaultVal: '185 kg', enabled: true }
    ]
  },

  vorma_grande: {
    id: 'vorma_grande',
    brand: 'vorma',
    brandName: 'Vorma',
    formatName: 'Placa Grande (150 × 90 mm)',
    shortFormat: '150 × 90 mm (Grande)',
    plateWidthMm: 150,
    plateHeightMm: 90,
    viewBoxWidthPt: 425.197,
    viewBoxHeightPt: 255.118,
    artBoxPt: { x: 15.571, y: 14.856, width: 392.371, height: 225.115 },
    innerWidthMm: 138.42,
    innerHeightMm: 79.42,
    xToolX: '51',
    xToolY: '51',
    primaryNameLabel: 'Machine (Nombre de Máquina)',
    primaryModelLabel: 'Type (Modelo)',
    serialLabel: 'Serial Number',
    dateLabel: 'Año de Fabricación',
    hasSeparateDateInGrid: false,
    maxTechSlots: 8,
    defaultSlots: [
      { slotId: 'L1', col: 'left', row: 0, label: 'Volt', defaultVal: '380V 50HZ', enabled: true },
      { slotId: 'L2', col: 'left', row: 1, label: 'Fase', defaultVal: '3 + T', enabled: true },
      { slotId: 'L3', col: 'left', row: 2, label: 'Motor', defaultVal: '4.1KW', enabled: true },
      { slotId: 'L4', col: 'left', row: 3, label: 'Weigth', defaultVal: '368KG', enabled: true },
      { slotId: 'R1', col: 'right', row: 0, label: 'Capacity', defaultVal: '10-15KG', enabled: true },
      { slotId: 'R2', col: 'right', row: 1, label: 'Volume', defaultVal: '40 L', enabled: true },
      { slotId: 'R3', col: 'right', row: 2, label: 'Velocity', defaultVal: '14 R/M', enabled: true },
      { slotId: 'R4', col: 'right', row: 3, label: 'Vel blade', defaultVal: '1- 1420 2- 2840 rpm', enabled: true }
    ]
  },

  vorma_pequena: {
    id: 'vorma_pequena',
    brand: 'vorma',
    brandName: 'Vorma',
    formatName: 'Placa Pequeña (110 × 70 mm)',
    shortFormat: '110 × 70 mm (Pequeña)',
    plateWidthMm: 110,
    plateHeightMm: 70,
    viewBoxWidthPt: 311.811,
    viewBoxHeightPt: 198.425,
    artBoxPt: { x: 14.928, y: 11.554, width: 280.002, height: 173.236 },
    innerWidthMm: 98.78,
    innerHeightMm: 61.11,
    xToolX: '50,5',
    xToolY: '50',
    primaryNameLabel: 'Machine (Nombre de Máquina)',
    primaryModelLabel: 'Type (Modelo)',
    serialLabel: 'Serial Number',
    dateLabel: 'Año de Fabricación',
    hasSeparateDateInGrid: false,
    maxTechSlots: 8,
    defaultSlots: [
      { slotId: 'L1', col: 'left', row: 0, label: 'Volt', defaultVal: '380V', enabled: true },
      { slotId: 'L2', col: 'left', row: 1, label: 'Hz', defaultVal: '50HZ', enabled: true },
      { slotId: 'L3', col: 'left', row: 2, label: 'Kw', defaultVal: '4.1KW', enabled: true },
      { slotId: 'L4', col: 'left', row: 3, label: 'Weigth', defaultVal: '368KG', enabled: true },
      { slotId: 'R1', col: 'right', row: 0, label: 'Capacity', defaultVal: '', enabled: false },
      { slotId: 'R2', col: 'right', row: 1, label: 'Volume', defaultVal: '', enabled: false },
      { slotId: 'R3', col: 'right', row: 2, label: 'Size', defaultVal: '', enabled: true },
      { slotId: 'R4', col: 'right', row: 3, label: 'Pressure', defaultVal: '', enabled: true }
    ]
  },

  olsen_grande: {
    id: 'olsen_grande',
    brand: 'olsen',
    brandName: 'Olsen & Kael',
    formatName: 'Placa Grande (150 × 90 mm)',
    shortFormat: '150 × 90 mm (Grande)',
    plateWidthMm: 150,
    plateHeightMm: 90,
    viewBoxWidthPt: 425.197,
    viewBoxHeightPt: 255.118,
    artBoxPt: { x: 8.932, y: 9.884, width: 408.264, height: 235.045 },
    innerWidthMm: 144.03,
    innerHeightMm: 82.92,
    xToolX: '48',
    xToolY: '49,5',
    primaryNameLabel: 'Typ (Familia / Nombre)',
    primaryModelLabel: 'Model (Modelo)',
    serialLabel: 'Nº (Número de Serie)',
    dateLabel: 'Manufacture date',
    hasSeparateDateInGrid: false,
    maxTechSlots: 8,
    defaultSlots: [
      { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', defaultVal: '380V 50Hz', enabled: true },
      { slotId: 'L2', col: 'left', row: 1, label: 'Size', defaultVal: '', enabled: true },
      { slotId: 'L3', col: 'left', row: 2, label: 'Weight', defaultVal: '', enabled: true },
      { slotId: 'L4', col: 'left', row: 3, label: 'Fase', defaultVal: '', enabled: false },
      { slotId: 'R1', col: 'right', row: 0, label: 'Power', defaultVal: '', enabled: true },
      { slotId: 'R2', col: 'right', row: 1, label: 'Pressure', defaultVal: '', enabled: true },
      { slotId: 'R3', col: 'right', row: 2, label: 'Capacity', defaultVal: '', enabled: false },
      { slotId: 'R4', col: 'right', row: 3, label: 'Velocity', defaultVal: '', enabled: false }
    ]
  },

  olsen_pequena: {
    id: 'olsen_pequena',
    brand: 'olsen',
    brandName: 'Olsen & Kael',
    formatName: 'Placa Pequeña (110 × 70 mm)',
    shortFormat: '110 × 70 mm (Pequeña)',
    plateWidthMm: 110,
    plateHeightMm: 70,
    viewBoxWidthPt: 311.811,
    viewBoxHeightPt: 198.425,
    artBoxPt: { x: 5.624, y: 5.624, width: 300.325, height: 187.174 },
    innerWidthMm: 105.95,
    innerHeightMm: 66.03,
    xToolX: '47',
    xToolY: '47,5',
    primaryNameLabel: 'Typ (Familia / Nombre)',
    primaryModelLabel: 'Model (Modelo)',
    serialLabel: 'Nº (Número de Serie)',
    dateLabel: 'Date',
    hasSeparateDateInGrid: false,
    maxTechSlots: 8,
    defaultSlots: [
      { slotId: 'L1', col: 'left', row: 0, label: 'Voltage', defaultVal: '230V 50Hz', enabled: true },
      { slotId: 'L2', col: 'left', row: 1, label: 'Size', defaultVal: '', enabled: true },
      { slotId: 'L3', col: 'left', row: 2, label: 'Weight', defaultVal: '', enabled: true },
      { slotId: 'L4', col: 'left', row: 3, label: 'Fase', defaultVal: '', enabled: false },
      { slotId: 'R1', col: 'right', row: 0, label: 'Power', defaultVal: '', enabled: true },
      { slotId: 'R2', col: 'right', row: 1, label: 'Pressure', defaultVal: '', enabled: true },
      { slotId: 'R3', col: 'right', row: 2, label: 'Capacity', defaultVal: '', enabled: false },
      { slotId: 'R4', col: 'right', row: 3, label: 'Velocity', defaultVal: '', enabled: false }
    ]
  }
};

// Vectores fijos extraídos fielmente de los diseños de Illustrator (.ai / .pdf)
const STATIC_VECTORS = {
  zybra_unica: `
    <g id="Zybra_Vectores_Fijos">
      <polygon points="29.48 50 29.46 50.05 29.46 50 29.48 50" fill="#000"/>
      <g fill="#000">
        <path d="M68.35,80.74c-.37-.26-.99-.4-1.86-.4h-5.76v3.5h5.76c.87,0,1.48-.12,1.83-.38.39-.29.59-.75.59-1.37s-.18-1.08-.55-1.35ZM68.53,86.75c-.45-.29-1.19-.43-2.24-.43h-5.57v4.1h5.57c1.04,0,1.78-.15,2.24-.43.52-.33.78-.87.78-1.62s-.26-1.28-.78-1.62ZM86.4,80.68c-.27-.15-.55-.24-.85-.28-.29-.04-.83-.07-1.59-.07h-5.07v3.95h5.07c.75,0,1.27-.02,1.59-.07.31-.04.58-.14.85-.28.56-.3.83-.85.83-1.63s-.28-1.33-.83-1.63ZM14.89,12.11v86.43h101.6V12.11H14.89ZM38.4,93.6h-.35c-.07-.26-.17-.45-.29-.55-.12-.11-.29-.16-.5-.16h-13.15v-.77l8.74-11.78h-7.52c-.23,0-.39.05-.51.15-.12.1-.21.29-.29.56h-.35v-3.89h.35c.09.27.18.45.29.56.12.1.29.15.51.15h12.95v.62l-8.85,11.93h7.82c.22,0,.39-.05.5-.16.12-.1.21-.29.29-.55h.35v3.89ZM55.68,78.22c-.33.04-.61.17-.85.37-.24.2-.57.6-.99,1.18l-4.85,6.83v5.13c0,.23.05.4.15.52.11.12.28.21.55.29v.35h-4.72v-.35c.27-.07.45-.17.56-.29.11-.12.17-.29.17-.52v-5.13l-4.85-6.83c-.42-.58-.75-.98-.99-1.18-.24-.2-.53-.32-.86-.37v-.35h5.94v.35c-.49.08-.74.31-.74.68,0,.13.15.42.45.87l2.7,4.02,2.79-4.02c.31-.43.45-.72.45-.88,0-.18-.07-.31-.2-.44-.13-.12-.31-.2-.54-.23v-.35h5.81v.35ZM71.18,91.79c-.5.39-1.07.67-1.73.84s-1.47.26-2.44.26h-10.27v-.35c.26-.07.45-.17.55-.29.1-.12.15-.29.15-.52v-12.71c0-.23-.05-.4-.15-.52-.1-.12-.28-.21-.55-.29v-.35h10.18c.97,0,1.76.07,2.35.22.59.15,1.12.39,1.56.75.88.69,1.33,1.7,1.33,3.02,0,1.47-.68,2.52-2.03,3.17,1.68.64,2.53,1.82,2.53,3.55,0,1.37-.49,2.44-1.48,3.22ZM91.34,92.89h-5.43v-.35c.37-.06.56-.19.56-.39,0-.13-.18-.45-.52-.96l-3.04-4.42h-4.01v4.99c0,.22.05.39.16.51.1.12.29.21.54.28v.35h-4.69v-.35c.26-.07.45-.17.55-.29.1-.12.15-.29.15-.5v-12.73c0-.23-.05-.4-.15-.52-.1-.12-.28-.21-.55-.29v-.35h9.4c1.15,0,2.05.07,2.73.2.67.13,1.26.36,1.75.69.58.38,1.02.9,1.3,1.55.27.63.4,1.31.4,2.02,0,2.45-1.36,3.89-4.08,4.31l2.92,4.15c.51.72.89,1.19,1.13,1.4.24.2.53.32.88.34v.35ZM110.21,92.89h-5.53v-.35c.48-.08.72-.31.72-.68,0-.15-.07-.38-.22-.69l-1.03-2.11h-6.83l-1.02,2.11c-.14.3-.2.53-.2.69,0,.33.24.55.73.67v.35h-4.97v-.35c.29-.06.52-.16.67-.31.15-.15.33-.43.53-.86l5.53-11.55c.18-.37.27-.67.27-.88,0-.34-.22-.58-.64-.72v-.35h5.33v.35c-.43.12-.65.34-.65.65,0,.21.07.45.21.72l5.72,11.58c.24.5.45.83.64,1.01.18.18.42.3.73.36v.35ZM112.95,71.96H19.08V15.54h93.88v56.42ZM98.3,87.01h4.91l-2.44-5.36-2.47,5.36Z"/>
        <g>
          <path d="M42.15,55.08c.13.3.47,1.01.61,1.31-.02.04-.14.25-.16.29l-4.11-1c-1.35-.45-2.63,1.47-3.5,2.19l.35-4.01c.09-.91,1.05-1.46,1.89-1.08,0,0,1.75.8,1.75.81,2.52.97,3.76-2.6,3.77-4.55-.01-1.16-.06-2.6-.06-3.42l3.4,3,.09.1c-1.26,1.97-2.78,4.42-4.04,6.37Z"/>
          <polygon points="35 55.91 34.98 55.95 34.98 55.9 35 55.91"/>
          <path d="M100.24,47.85c-8.94,4.41-17.65,8.04-25.44,8.82,0,0,19.1.65,19.5.68-7.98,1.06-15.47,2.42-22.85.84l5.67,4.49c-5.33-1.13-9.66-2.92-12.59-5.62l3.65,6.86c-4.38-2.12-6.78-4.82-9.55-9.79-1.17,2.83-9.56,5.01-10.7,4.13-.06.08-1.31,1.31-1.21,1.4-.47,1.57,1.7,1.26,1.71,2.6.14.58-2.21,3.42-2.46,3.93.19-2.27-.78-3.76-3.11-4.07-2.66-.89-3.55-.18-5.37,1.73l.23-2.6c.14-1.63,1.89-2.57,3.3-1.91,1.09.53,2.43.04,3.03-1l.61-2.05c-.8-1.24-.07-2.18.63-3.21.62-.97,2.33-3.68,2.97-4.7-3.04-2.68-7.81-6.93-10.83-9.61-4.48,2.08-5.15,3.59-4.62,4.92-.34-.1-.65-.3-.92-.56l-.02.05c-1.4-1.23-1.48-3.72-.61-5.33h.09l1.05-4.5c2.69-2.02,5.97-5.44,9.7-4.55,3.97.39,9.9.98,13.91,1.38,3.11-.55,8.16-1.52,11.37-2.89.94-.13,3.28.26,4.23.29,2.9.26,7.39.64,10.33.9,3.56.69,15.78-1.78,19.54-2.15-2.87,1.72-7.57,5.98-11.16,5.79-6.08.2-16,.53-22.18.73l12.14,1.5,13.68-.32c-6.6,6.05-15.88,4.14-23.97,3.82l8.74,2.08,9.34.09c-6.73,4.15-10.01,3.8-17.27,1.18l7.35,4.17c-1.82,1.04-4.21.97-6.06-.22l-6.4-3.62,6.07,5.63c-1.07.1-2.17-.07-3.06-.69-3.15-2.12-6.18-4.27-8.95-6.47-.09-.03-.99-.34-1.12-.34,4.85,3.78,4.97,9.06,4.91,9.29,0,0,3.52.6,9.12,1.34,1.01.17,2.06.19,3.11.09l24.47-2.51Z"/>
          <path d="M66.29,25.88c-2.83,1.3-7.2,2.17-10.04,2.71-.9.53-7.79-.46-8.85-.5,2.37-.39,8.25-1.4,11.21-2.7,2.35-1.41,5.31-.34,7.67.48Z"/>
        </g>
      </g>
      <path fill="#000" fill-rule="evenodd" d="M380.91,230.4c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-3.47,0-6.28,2.81-6.28,6.28s2.81,6.28,6.28,6.28c.3,0,.6,0,.9-.04v2.69ZM396.16,230.4c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-2.95,0-5.5,2.05-6.13,4.93h5.24v2.69h-5.24c.63,2.88,3.18,4.93,6.13,4.93.3,0,.6,0,.9-.04v2.69Z"/>
      <rect x="14.89" y="108.78" width="395.71" height="133.11" rx="8.5" ry="8.5" fill="none" stroke="#000" stroke-linejoin="round" stroke-width="0.5"/>
      <line x1="271.05" y1="97.44" x2="275.78" y2="89.09" fill="none" stroke="#000" stroke-linejoin="round" stroke-width="0.5"/>
    </g>
  `,

  vorma_grande: `
    <g id="Vorma_Grande_Vectores_Fijos">
      <g fill="#000">
        <polygon points="36.39 29.65 35 22.53 42.89 14.86 50.46 24.1 51.02 36.98 46.89 39.97 47.49 32.36 43.56 24.58 36.39 29.65"/>
        <polygon points="50.77 30.59 56.23 25.82 66.83 28.82 62.61 40 51.74 46.92 47.08 44.84 53.96 41.56 58.74 34.26 50.77 30.59"/>
        <polygon points="57.14 43.51 64 45.85 66.7 56.53 54.91 58.46 43.48 52.51 42.96 47.44 49.24 51.76 57.95 52.25 57.14 43.51"/>
        <polygon points="49.14 55.49 50.54 62.6 42.64 70.28 35.07 61.03 34.51 48.16 38.64 45.17 38.05 52.77 41.98 60.56 49.14 55.49"/>
        <polygon points="34.77 54.55 29.3 59.31 18.71 56.32 22.93 45.14 33.79 38.21 38.46 40.3 31.57 43.58 26.79 50.88 34.77 54.55"/>
        <polygon points="28.39 41.63 21.53 39.28 18.83 28.61 30.62 26.67 42.05 32.62 42.58 37.7 36.29 33.38 27.58 32.89 28.39 41.63"/>
      </g>
      <g fill="#000">
        <path d="M83.08,29.42h4.1l4.17,10.55,4.17-10.55h4.1l-6.99,16.48h-2.57l-6.99-16.48Z"/>
        <path d="M109.51,29.05c2.6,0,4.73.8,6.37,2.4,1.71,1.66,2.57,3.74,2.57,6.22s-.86,4.51-2.57,6.18c-1.66,1.61-3.79,2.42-6.37,2.42s-4.74-.81-6.42-2.42c-.81-.76-1.44-1.67-1.89-2.73-.45-1.06-.68-2.19-.68-3.4s.23-2.29.7-3.42,1.08-2.07,1.84-2.83c1.61-1.61,3.76-2.42,6.45-2.42ZM109.48,32.55c-1.47,0-2.67.47-3.61,1.41-.97.94-1.46,2.18-1.46,3.73s.5,2.72,1.51,3.7c.96.91,2.13,1.36,3.53,1.36,1.5,0,2.72-.47,3.66-1.41.96-.92,1.43-2.15,1.43-3.68s-.48-2.75-1.43-3.7c-.97-.94-2.18-1.41-3.63-1.41Z"/>
        <path d="M121.29,29.42h5.78c1.78,0,3.18.48,4.2,1.43.95.92,1.43,2.15,1.43,3.68,0,1.4-.43,2.52-1.28,3.36-.66.63-1.42,1.05-2.3,1.26l5.06,6.74h-4.64l-4.45-6.5v6.5h-3.8v-16.48ZM125.09,32.38v4.52h.86c1.04,0,1.79-.24,2.27-.72.41-.41.62-.95.62-1.61,0-.72-.26-1.28-.77-1.68-.46-.35-1.16-.52-2.1-.52h-.89Z"/>
        <path d="M139.32,45.89h-3.8l2.64-16.48h3.16l4.1,9.86,4.1-9.86h3.16l2.64,16.48h-3.8l-1.31-9.83-4.13,9.83h-1.33l-4.13-9.83-1.31,9.83Z"/>
        <path d="M169.09,45.89l-1.24-3.11h-6.22l-1.26,3.11h-3.95l6.65-16.48h3.48l6.5,16.48h-3.95ZM162.74,39.87h4.08l-2.03-5.53-2.05,5.53Z"/>
      </g>
      <g fill="#000">
        <path d="M110.62,52.9h1.69v6.83h-1.08v-5.45h-.04l-1.65,5.45h-1.27l-1.65-5.45h-.04v5.45h-1.08v-6.83h1.69l1.68,5.53h.06l1.68-5.53Z"/>
        <path d="M115.93,54.45c.75,0,1.29.16,1.63.48s.51.84.51,1.54v3.25h-.97v-.73h-.04c-.16.27-.4.48-.71.64-.31.15-.65.23-1.03.23-.55,0-.99-.15-1.32-.45-.33-.3-.49-.63-.49-.99,0-.47.2-.87.59-1.21.4-.34,1-.5,1.82-.5h1.12c0-.64-.08-1.06-.24-1.26s-.48-.3-.95-.3c-.65,0-1.01.27-1.08.8h-1c.07-.53.29-.92.65-1.15.36-.23.86-.35,1.51-.35ZM115.68,59.13c.36,0,.67-.13.95-.39.28-.26.42-.63.42-1.1v-.29h-1.08c-.91,0-1.37.33-1.37.98,0,.53.36.8,1.08.8Z"/>
        <path d="M119.36,58.16h1.04c.12.67.55,1.01,1.3,1.01.87,0,1.31-.31,1.31-.93,0-.19-.09-.34-.26-.46-.17-.12-.38-.2-.64-.24-.25-.05-.53-.1-.83-.17s-.57-.14-.83-.23c-.25-.08-.47-.22-.64-.43-.17-.2-.26-.45-.26-.75,0-.44.2-.8.61-1.09s.92-.43,1.54-.43c1.31,0,2.05.5,2.23,1.51h-1.02c-.05-.28-.16-.49-.34-.63-.17-.14-.46-.21-.87-.21-.34,0-.61.06-.82.19-.2.13-.3.3-.3.52,0,.18.09.33.26.45.17.11.38.19.64.23.25.04.53.1.83.17s.57.15.83.23c.25.08.47.23.64.43.17.2.26.46.26.76,0,.55-.22.99-.67,1.3-.45.31-1.02.47-1.72.47-1.32,0-2.08-.57-2.29-1.7Z"/>
        <path d="M127.52,59.17c.75,0,1.2-.43,1.35-1.29h1.02c-.07.61-.32,1.1-.75,1.45-.43.35-.96.53-1.62.53-.78,0-1.39-.24-1.85-.73s-.68-1.14-.68-1.97.23-1.48.68-1.97c.45-.49,1.07-.74,1.85-.74.63,0,1.15.17,1.57.5s.68.78.76,1.34h-1.05c-.07-.35-.22-.63-.45-.83-.23-.2-.51-.31-.84-.31-.46,0-.81.18-1.05.53-.25.36-.37.85-.37,1.47s.12,1.11.37,1.47.6.54,1.05.54Z"/>
        <path d="M132.19,56.69v3.03h-1.03v-7.04h1.03v2.58c.4-.54.91-.81,1.55-.81s1.1.16,1.42.47.48.83.48,1.56v3.25h-1.03v-3.18c0-.49-.09-.83-.27-1-.18-.17-.47-.26-.86-.26s-.7.12-.94.35c-.24.23-.36.59-.36,1.06Z"/>
        <path d="M138.33,52.68v1.09h-1.03v-1.09h1.03ZM137.3,59.72v-5.17h1.03v5.17h-1.03Z"/>
        <path d="M141.1,56.69v3.03h-1.03v-5.17h1.02v.7c.4-.54.92-.81,1.56-.81s1.1.16,1.43.47.48.83.48,1.56v3.25h-1.03v-3.18c0-.49-.09-.83-.27-1-.18-.17-.47-.26-.86-.26s-.7.12-.94.35c-.24.23-.36.59-.36,1.06Z"/>
        <path d="M148.37,59.17c.71,0,1.14-.36,1.32-1.09h1.02c-.11.55-.37.99-.79,1.3-.42.31-.94.47-1.55.47-.78,0-1.39-.24-1.85-.73-.45-.49-.68-1.14-.68-1.96s.23-1.48.68-1.97c.45-.49,1.07-.74,1.85-.74.67,0,1.25.21,1.73.64.48.43.72,1.04.72,1.86,0,.05,0,.1,0,.17,0,.07,0,.11,0,.11h-3.86c0,.61.13,1.09.39,1.43.26.34.6.51,1.04.51ZM149.73,56.64c-.01-.48-.15-.85-.41-1.1-.26-.25-.58-.38-.96-.38s-.71.13-.95.39c-.24.26-.4.63-.46,1.09h2.77Z"/>
        <path d="M153.12,56.69v3.03h-1.03v-5.17h1.02v.7c.4-.54.92-.81,1.56-.81s1.1.16,1.43.47c.32.31.48.83.48,1.56v3.25h-1.03v-3.18c0-.49-.09-.83-.27-1-.18-.17-.47-.26-.86-.26s-.7.12-.94.35c-.24.23-.36.59-.36,1.06Z"/>
      </g>
      <path fill="#000" fill-rule="evenodd" d="M25.44,237.54c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-3.47,0-6.28,2.81-6.28,6.28s2.81,6.28,6.28,6.28c.3,0,.6,0,.9-.04v2.69ZM40.68,237.54c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-2.95,0-5.5,2.05-6.13,4.93h5.24v2.69h-5.24c.63,2.88,3.18,4.93,6.13,4.93.3,0,.6,0,.9-.04v2.69Z"/>
      <line x1="198.31" y1="18.57" x2="198.31" y2="235.18" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="1"/>
      <line x1="407.44" y1="55.74" x2="198.34" y2="55.74" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="1"/>
    </g>
  `,

  vorma_pequena: `
    <g id="Vorma_Pequena_Vectores_Fijos">
      <line x1="294.43" y1="46.32" x2="147.88" y2="46.32" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="1"/>
      <g fill="#000">
        <polygon points="29.11 21.26 28.19 16.59 33.37 11.55 38.33 17.62 38.7 26.06 35.99 28.03 36.39 23.04 33.81 17.93 29.11 21.26"/>
        <polygon points="38.54 21.87 42.12 18.75 49.07 20.71 46.3 28.04 39.17 32.59 36.12 31.22 40.63 29.07 43.77 24.28 38.54 21.87"/>
        <polygon points="42.72 30.35 47.22 31.89 48.99 38.89 41.25 40.16 33.76 36.25 33.41 32.92 37.54 35.76 43.25 36.08 42.72 30.35"/>
        <polygon points="37.47 38.2 38.39 42.87 33.21 47.91 28.24 41.84 27.87 33.4 30.58 31.43 30.19 36.42 32.77 41.53 37.47 38.2"/>
        <polygon points="28.04 37.59 24.46 40.71 17.51 38.75 20.28 31.42 27.4 26.87 30.46 28.24 25.94 30.39 22.81 35.18 28.04 37.59"/>
        <polygon points="23.86 29.11 19.36 27.57 17.59 20.57 25.32 19.3 32.82 23.21 33.16 26.54 29.04 23.7 23.33 23.38 23.86 29.11"/>
      </g>
      <g fill="#000">
        <path d="M59.73,21.11h2.69l2.74,6.92,2.74-6.92h2.69l-4.59,10.81h-1.68l-4.58-10.81Z"/>
        <path d="M77.06,20.86c1.71,0,3.1.52,4.18,1.57,1.12,1.09,1.69,2.45,1.69,4.08s-.56,2.96-1.69,4.05c-1.09,1.06-2.48,1.59-4.18,1.59s-3.11-.53-4.21-1.59c-.53-.5-.94-1.09-1.24-1.79-.3-.7-.45-1.44-.45-2.23s.15-1.5.46-2.24.71-1.36,1.21-1.86c1.06-1.06,2.47-1.59,4.23-1.59ZM77.05,23.16c-.96,0-1.75.31-2.37.92-.64.62-.96,1.43-.96,2.45s.33,1.78.99,2.43c.63.59,1.4.89,2.32.89.98,0,1.78-.31,2.4-.92.63-.6.94-1.41.94-2.41s-.31-1.8-.94-2.43c-.64-.62-1.43-.92-2.38-.92Z"/>
        <path d="M84.79,21.11h3.79c1.17,0,2.08.31,2.75.94.63.6.94,1.41.94,2.41,0,.92-.28,1.65-.84,2.2-.43.41-.93.69-1.51.83l3.32,4.42h-3.05l-2.92-4.26v4.26h-2.49v-10.81ZM87.29,23.05v2.97h.57c.68,0,1.18-.16,1.49-.47.27-.27.41-.62.41-1.05,0-.48-.17-.84-.5-1.1-.3-.23-.76-.34-1.38-.34h-.58Z"/>
        <path d="M96.62,31.91h-2.49l1.73-10.81h2.07l2.69,6.46,2.69-6.46h2.07l1.73,10.81h-2.49l-.86-6.45-2.71,6.45h-.88l-2.71-6.45-.86,6.45Z"/>
        <path d="M116.14,31.91l-.81-2.04h-4.08l-.83,2.04h-2.59l4.36-10.81h2.28l4.26,10.81h-2.59ZM111.98,27.96h2.67l-1.33-3.63-1.34,3.63Z"/>
      </g>
      <g fill="#000">
        <path d="M77.79,36.5h1.11v4.48h-.71v-3.58h-.03l-1.08,3.58h-.83l-1.08-3.58h-.03v3.58h-.71v-4.48h1.11l1.1,3.63h.04l1.1-3.63Z"/>
        <path d="M81.28,37.52c.49,0,.84.11,1.07.32s.33.55.33,1.01v2.13h-.64v-.48h-.03c-.11.18-.26.32-.47.42-.2.1-.43.15-.67.15-.36,0-.65-.1-.87-.29-.21-.2-.32-.41-.32-.65,0-.31.13-.57.39-.79.26-.22.66-.33,1.19-.33h.73c0-.42-.05-.7-.16-.83s-.31-.2-.62-.2c-.42,0-.66.18-.71.53h-.66c.05-.35.19-.6.42-.76.24-.15.57-.23.99-.23ZM81.11,40.59c.23,0,.44-.09.62-.26.18-.17.27-.41.27-.72v-.19h-.71c-.6,0-.9.21-.9.64,0,.35.24.53.71.53Z"/>
        <path d="M83.52,39.96h.68c.08.44.36.66.85.66.57,0,.86-.2.86-.61,0-.13-.06-.23-.17-.3-.11-.08-.25-.13-.42-.16-.17-.03-.35-.07-.54-.11s-.38-.09-.54-.15c-.17-.05-.31-.15-.42-.28-.11-.13-.17-.3-.17-.49,0-.29.13-.53.4-.71s.6-.28,1.01-.28c.86,0,1.35.33,1.46.99h-.67c-.03-.19-.11-.32-.22-.42-.11-.09-.3-.14-.57-.14-.22,0-.4.04-.54.13-.13.08-.2.2-.2.34,0,.12.06.22.17.29.11.07.25.12.42.15.17.03.35.06.54.11s.38.1.54.15c.17.05.31.15.42.28.11.13.17.3.17.5,0,.36-.15.65-.44.85-.29.2-.67.31-1.13.31-.87,0-1.37-.37-1.5-1.12Z"/>
        <path d="M88.88,40.62c.49,0,.79-.28.88-.84h.67c-.05.4-.21.72-.49.95-.28.23-.63.35-1.06.35-.51,0-.91-.16-1.21-.48s-.44-.75-.44-1.29.15-.97.44-1.29c.3-.32.7-.48,1.21-.48.41,0,.76.11,1.03.33s.44.51.5.88h-.69c-.05-.23-.15-.41-.3-.55-.15-.13-.33-.2-.55-.2-.3,0-.53.12-.69.35-.16.23-.24.56-.24.97s.08.73.24.96.39.35.69.35Z"/>
        <path d="M91.94,39v1.99h-.67v-4.62h.67v1.69c.26-.35.6-.53,1.02-.53s.72.1.93.31.32.55.32,1.02v2.13h-.67v-2.08c0-.32-.06-.54-.18-.66-.12-.11-.31-.17-.56-.17s-.46.08-.62.23c-.16.15-.24.39-.24.7Z"/>
        <path d="M95.96,36.36v.71h-.67v-.71h.67ZM95.29,40.98v-3.39h.67v3.39h-.67Z"/>
        <path d="M97.78,39v1.99h-.67v-3.39h.67v.46c.26-.35.6-.53,1.03-.53s.72.1.93.31.32.55.32,1.02v2.13h-.67v-2.08c0-.32-.06-.54-.18-.66-.12-.11-.31-.17-.56-.17s-.46.08-.62.23c-.16.15-.24.39-.24.7Z"/>
        <path d="M102.55,40.62c.46,0,.75-.24.86-.71h.67c-.07.36-.24.65-.52.85-.27.21-.61.31-1.02.31-.51,0-.91-.16-1.21-.48-.3-.32-.44-.75-.44-1.28s.15-.97.44-1.29c.3-.32.7-.48,1.21-.48.44,0,.82.14,1.13.42.31.28.47.68.47,1.22,0,.03,0,.07,0,.11,0,.05,0,.07,0,.07h-2.53c0,.4.08.71.25.94.17.22.4.33.68.33ZM103.45,38.96c0-.32-.1-.56-.27-.72-.17-.17-.38-.25-.63-.25s-.46.09-.62.26c-.16.17-.26.41-.3.72h1.82Z"/>
        <path d="M105.67,39v1.99h-.67v-3.39h.67v.46c.26-.35.6-.53,1.03-.53s.72.1.93.31.32.55.32,1.02v2.13h-.67v-2.08c0-.32-.06-.54-.18-.66-.12-.11-.31-.17-.56-.17s-.46.08-.62.23c-.16.15-.24.39-.24.7Z"/>
      </g>
      <path fill="#000" fill-rule="evenodd" d="M22.6,184.75c-.23.02-.46.03-.7.03-3.85,0-6.98-3.12-6.98-6.98s3.12-6.98,6.98-6.98c.23,0,.47.01.7.03v2.09c-.23-.03-.46-.04-.7-.03-2.7,0-4.88,2.19-4.88,4.88s2.19,4.88,4.88,4.88c.23,0,.47,0,.7-.03v2.09ZM34.46,184.75c-.23.02-.46.03-.7.03-3.85,0-6.98-3.12-6.98-6.98s3.12-6.98,6.98-6.98c.23,0,.47.01.7.03v2.09c-.23-.03-.46-.04-.7-.03-2.29,0-4.28,1.6-4.77,3.84h4.07v2.09h-4.07c.49,2.24,2.48,3.84,4.77,3.84.23,0,.47,0,.7-.03v2.09Z"/>
      <line x1="147.87" y1="14.44" x2="147.87" y2="182.92" fill="none" stroke="#000" stroke-linecap="round" stroke-miterlimit="10" stroke-width="1"/>
    </g>
  `,

  olsen_grande: `
    <g id="Olsen_Grande_Vectores_Fijos">
      <g fill="#000">
        <path d="M230.49,30.51l-4.37,4.33.03,12.94,4.34,4.35h12.36l4.34-4.32v-12.94l-4.34-4.36h-12.36ZM241.25,49.19h-9.18l-2.54-2.61-.03-10.43v-.07l2.57-2.61h9.21l2.49,2.57.05.05v10.5l-2.52,2.56-.05.05Z"/>
        <polygon points="361.63 49.84 354.41 41.24 354.33 41.14 361.34 31.57 361.34 30.51 358.07 30.51 351.47 39.7 351.41 39.77 346.09 39.77 346.02 30.51 342.65 30.51 342.65 52.13 346.03 52.13 346.06 42.89 346.06 42.71 351.41 42.71 358.48 52.01 358.57 52.13 397.31 52.13 397.3 49.72 361.63 49.84"/>
        <polygon points="254.95 49.72 254.95 32.27 253.26 30.51 249.39 30.51 251.79 33.27 251.79 52.13 311.69 52.13 311.68 49.72 254.95 49.72"/>
        <polygon points="403.28 30.51 399.42 30.51 401.82 33.27 401.82 52.13 404.97 52.13 404.97 32.27 403.28 30.51"/>
        <polygon points="270.72 39.85 270.73 40.71 270.73 42.58 269.75 43.53 259.66 43.53 259.66 46.22 271.24 46.22 273.88 43.59 273.88 39.85 271.2 37.16 263.6 37.16 262.66 36.18 262.63 34.4 262.64 33.58 273.04 33.58 273.04 30.88 262.15 30.88 259.47 33.51 259.47 37.19 262.15 39.85 270.72 39.85"/>
        <path d="M291.25,46.22v-2.76h-9.43l-1.84-1.87-.05-.05v-1.6h12.41v-5.5l-3.52-3.57h-8.52l-3.53,3.54v8.26l3.56,3.54h10.91ZM279.9,35.35v-1.77h7.41l1.88,1.92.04,1.91h-9.29l-.04-2.06Z"/>
        <polygon points="301.41 30.88 299.09 31.96 299.09 30.88 296.69 30.88 296.69 46.22 299.85 46.22 299.81 35.22 299.82 33.64 306.91 33.64 308.54 35.28 308.54 46.22 311.69 46.22 311.69 34.14 308.45 30.88 301.41 30.88"/>
        <path d="M332.32,46.39l-1.39,1.39h-7.53l-1.39-1.35v-2.18l1.39-1.38h1.62l1.39,1.38v.76h3.17v-1.2l-2.74-2.46,2.2-1.95v-3.27l-2.84-2.58h-3.96l-2.84,2.58v3.27l2.2,1.95-2.74,2.46v3.58l3.13,2.94h10.35l3.11-2.94v-3.5l-3.18-2.14.05,4.65ZM324.73,36.09l1.14.97v1.91s-1.37,1.36-1.37,1.36h-.47l-1.48-1.38v-1.88s1.16-.98,1.16-.98h1.03Z"/>
        <path d="M365.99,36.69l-2.9,2.88.06,4.03,2.62,2.63h7.43l1.78-1.5h.77v1.5h2.4l.03-12.24-3.06-3.1h-9.95v2.76h9.88l-.06,3.05h-9.01ZM372.7,43.53h-5.45l-.94-.98v-2.02l1.19-1.3h7.53l.03,2.31v.08s-2.31,1.87-2.31,1.87l-.05.04Z"/>
        <path d="M396.21,46.22v-2.76h-9.43l-1.84-1.87-.05-.05v-1.6h12.41v-5.5l-3.52-3.57h-8.52l-3.53,3.54v8.26l3.56,3.54h10.92ZM384.86,33.58h7.4l1.88,1.92.04,1.91h-9.29l-.04-3.84Z"/>
      </g>
      <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" d="M208.82,63.13H9.31V30.91c2.84-2.84,4.46-4.46,7.3-7.3h184.9c2.84,2.84,4.46,4.46,7.3,7.3v32.23Z"/>
      <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.5" d="M416.82,244.55h-92.46v-24.36c1.64-1.64,2.58-2.58,4.23-4.23h88.24v28.59Z"/>
      <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" d="M416.82,244.55H31.67c-8.7-8.7-13.67-13.67-22.36-22.36V63.13h385.15c8.7,8.7,13.67,13.67,22.36,22.36v159.06Z"/>
      <path fill="#000" fill-rule="evenodd" d="M47.72,239.18c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-3.47,0-6.28,2.81-6.28,6.28s2.81,6.28,6.28,6.28c.3,0,.6,0,.9-.04v2.69ZM62.96,239.18c-.3.03-.6.04-.9.04-4.95,0-8.97-4.02-8.97-8.97s4.02-8.97,8.97-8.97c.3,0,.6.01.9.04v2.69c-.3-.04-.6-.05-.9-.04-2.95,0-5.5,2.05-6.13,4.93h5.24v2.69h-5.24c.63,2.88,3.18,4.93,6.13,4.93.3,0,.6,0,.9-.04v2.69Z"/>
      <polygon fill="#000" points="110.4 226.73 111.27 230.34 113.98 232.9 110.4 231.85 106.81 232.9 109.52 230.34 110.4 226.73"/>
      <line fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" x1="9.31" y1="215.97" x2="416.82" y2="215.97"/>
      <polyline fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.5" points="216.44 241.21 216.44 223.1 219.17 219.21"/>
      <polyline fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.5" points="86.42 241.21 86.42 223.1 89.14 219.21"/>
    </g>
  `,

  olsen_pequena: `
    <g id="Olsen_Pequena_Vectores_Fijos">
      <g fill="#000">
        <path d="M191.43,14.18l-2.51,2.48.02,7.43,2.49,2.5h7.1l2.49-2.48v-7.43l-2.49-2.5h-7.1ZM197.6,24.91h-5.27l-1.46-1.5-.02-5.99v-.04l1.48-1.5h5.29l1.43,1.47.03.03v6.03l-1.45,1.47-.03.03Z"/>
        <polygon points="266.72 25.28 262.57 20.35 262.52 20.28 266.55 14.79 266.55 14.18 264.67 14.18 260.88 19.46 260.85 19.5 257.79 19.5 257.76 14.18 255.82 14.18 255.82 26.6 257.76 26.6 257.77 21.29 257.77 21.19 260.85 21.19 264.91 26.53 264.96 26.6 287.2 26.6 287.19 25.21 266.72 25.28"/>
        <polygon points="205.47 25.21 205.47 15.19 204.5 14.18 202.28 14.18 203.66 15.77 203.66 26.6 238.05 26.6 238.04 25.21 205.47 25.21"/>
        <polygon points="290.63 14.18 288.41 14.18 289.78 15.77 289.78 26.6 291.6 26.6 291.6 15.19 290.63 14.18"/>
        <polygon points="214.52 19.55 214.53 20.04 214.53 21.11 213.97 21.66 208.18 21.66 208.18 23.2 214.82 23.2 216.34 21.7 216.34 19.55 214.8 18 210.44 18 209.9 17.44 209.88 16.42 209.89 15.94 215.86 15.94 215.86 14.4 209.61 14.4 208.07 15.91 208.07 18.02 209.61 19.55 214.52 19.55"/>
        <path d="M226.31,23.2v-1.58h-5.41l-1.05-1.08-.03-.03v-.92h7.13v-3.16l-2.02-2.05h-4.89l-2.02,2.03v4.74l2.04,2.03h6.27ZM219.79,16.96v-1.02h4.25l1.08,1.1.02,1.1h-5.33l-.02-1.18Z"/>
        <polygon points="232.14 14.4 230.81 15.02 230.81 14.4 229.43 14.4 229.43 23.2 231.24 23.2 231.23 16.89 231.23 15.98 235.3 15.98 236.24 16.92 236.24 23.2 238.05 23.2 238.05 16.27 236.18 14.4 232.14 14.4"/>
        <path d="M249.89,23.3l-.8.8h-4.32l-.8-.78v-1.25l.8-.79h.93l.8.79v.43h1.82v-.69l-1.57-1.41,1.26-1.12v-1.88l-1.63-1.48h-2.27l-1.63,1.48v1.88l1.26,1.12-1.57,1.41v2.06l1.8,1.69h5.94l1.78-1.69v-2.01l-1.82-1.23.03,2.67ZM245.53,17.39l.65.56v1.1s-.79.78-.79.78h-.27l-.85-.79v-1.08s.66-.56.66-.56h.59Z"/>
        <path d="M269.22,17.73l-1.66,1.65.03,2.31,1.5,1.51h4.27l1.02-.86h.44v.86h1.38l.02-7.03-1.75-1.78h-5.71v1.58h5.67l-.04,1.75h-5.17ZM273.07,21.66h-3.13l-.54-.56v-1.16l.68-.75h4.32l.02,1.33v.05s-1.33,1.07-1.33,1.07l-.03.02Z"/>
        <path d="M286.56,23.2v-1.58h-5.41l-1.06-1.08-.03-.03v-.92h7.13v-3.16l-2.02-2.05h-4.89l-2.02,2.03v4.74l2.04,2.03h6.27ZM280.05,15.94h4.25l1.08,1.1.02,1.1h-5.33l-.02-2.2Z"/>
      </g>
      <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" d="M305.57,59.39H6V17.34l11.34-11.34h276.9c4.43,4.43,6.91,6.91,11.34,11.34v42.05Z"/>
      <path fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" d="M294.26,192.42H17.31c-4.4-4.4-6.91-6.91-11.31-11.31V59.39h299.57v121.72c-4.42,4.42-6.9,6.9-11.31,11.31Z"/>
      <path fill="#000" fill-rule="evenodd" d="M37.99,187.53c-.24.02-.49.04-.73.04-4.04,0-7.31-3.27-7.31-7.31s3.27-7.31,7.31-7.31c.24,0,.49.01.73.04v2.19c-.24-.03-.49-.04-.73-.04-2.83,0-5.12,2.29-5.12,5.12s2.29,5.12,5.12,5.12c.24,0,.49,0,.73-.04v2.19ZM50.43,187.53c-.24.02-.49.04-.73.04-4.04,0-7.31-3.27-7.31-7.31s3.27-7.31,7.31-7.31c.24,0,.49.01.73.04v2.19c-.24-.03-.49-.04-.73-.04-2.4,0-4.49,1.67-5,4.02h4.27v2.19h-4.27c.52,2.35,2.6,4.02,5,4.02.24,0,.49,0,.73-.04v2.19Z"/>
      <polygon fill="#000" points="100.47 176.01 101.23 179.17 103.61 181.41 100.47 180.49 97.32 181.41 99.7 179.17 100.47 176.01"/>
      <line fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" x1="6" y1="167.38" x2="305.57" y2="167.38"/>
      <polyline fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.5" points="193.33 189.89 193.33 174.03 195.71 170.62"/>
      <polyline fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.5" points="79.47 189.89 79.47 174.03 81.86 170.62"/>
      <line fill="none" stroke="#000" stroke-miterlimit="10" stroke-width="0.75" x1="180.3" y1="6" x2="180.3" y2="59.39"/>
    </g>
  `
};

// Coordenadas exactas de las ranuras de la tabla técnica para cada uno de los 5 formatos
const SLOT_COORDINATES = {
  zybra_unica: {
    left: [
      { labelX: 37.16, labelY: 142.08, boxX: 107.0, boxY: 129.87, boxW: 77.05, boxH: 16.27 },
      { labelX: 37.16, labelY: 178.66, boxX: 107.0, boxY: 165.86, boxW: 77.05, boxH: 16.27 },
      { labelX: 37.16, labelY: 214.56, boxX: 107.0, boxY: 204.53, boxW: 77.05, boxH: 16.27 }
    ],
    right: [
      { labelX: 217.96, labelY: 142.08, boxX: 283.43, boxY: 129.87, boxW: 77.05, boxH: 16.27 },
      { labelX: 217.96, labelY: 178.66, boxX: 283.43, boxY: 165.86, boxW: 77.05, boxH: 16.27 }
    ]
  },

  vorma_grande: {
    left: [
      { labelX: 220.58, labelY: 84.56, valX: 220.58, valY: 98.96 },
      { labelX: 220.58, labelY: 129.04, valX: 220.58, valY: 143.44 },
      { labelX: 220.58, labelY: 170.84, valX: 220.58, valY: 185.24 },
      { labelX: 220.58, labelY: 213.73, valX: 220.58, valY: 228.13 }
    ],
    right: [
      { labelX: 299.65, labelY: 83.54, valX: 299.65, valY: 97.94 },
      { labelX: 299.65, labelY: 124.87, valX: 299.65, valY: 139.27 },
      { labelX: 298.80, labelY: 168.40, valX: 298.80, valY: 182.80 },
      { labelX: 298.79, labelY: 213.73, valX: 298.79, valY: 228.13 }
    ]
  },

  vorma_pequena: {
    left: [
      { labelX: 166.81, labelY: 64.93, valX: 166.81, valY: 76.13 },
      { labelX: 166.81, labelY: 95.96, valX: 166.81, valY: 107.16 },
      { labelX: 166.81, labelY: 129.42, valX: 166.81, valY: 140.62 },
      { labelX: 166.81, labelY: 159.82, valX: 166.81, valY: 171.02 }
    ],
    right: [
      { labelX: 223.62, labelY: 64.93, valX: 223.62, valY: 76.13 },
      { labelX: 223.62, labelY: 95.96, valX: 223.62, valY: 107.16 },
      { labelX: 223.62, labelY: 127.67, valX: 223.62, valY: 138.87 },
      { labelX: 222.75, labelY: 159.82, valX: 222.75, valY: 171.02 }
    ]
  },

  olsen_grande: {
    left: [
      { labelX: 23.97, labelY: 95.24 },
      { labelX: 25.91, labelY: 131.90 },
      { labelX: 23.97, labelY: 168.50 },
      { labelX: 23.97, labelY: 198.00 }
    ],
    right: [
      { labelX: 220.68, labelY: 95.24 },
      { labelX: 221.01, labelY: 131.90 },
      { labelX: 220.68, labelY: 168.50 },
      { labelX: 220.68, labelY: 198.00 }
    ]
  },

  olsen_pequena: {
    left: [
      { labelX: 26.61, labelY: 81.78 },
      { labelX: 28.55, labelY: 115.69 },
      { labelX: 26.61, labelY: 148.24 },
      { labelX: 26.61, labelY: 161.50 }
    ],
    right: [
      { labelX: 171.30, labelY: 81.62 },
      { labelX: 171.64, labelY: 116.49 },
      { labelX: 171.30, labelY: 148.24 },
      { labelX: 171.30, labelY: 161.50 }
    ]
  }
};

// Funciones dinámicas que calculan el posicionamiento vertical distribuido
// en las 2 columnas según el espacio real disponible en cada formato de placa

function getZybraSlotCoord(col, idx, leftCount = 3, rightCount = 2) {
  const maxRows = Math.max(leftCount || 0, rightCount || 0);

  let boxH, minY, maxY, valFontSize, labelFontSize;

  if (maxRows <= 1) {
    boxH = 16.27; minY = 165.86; maxY = 165.86; valFontSize = 11.5; labelFontSize = 12;
  } else if (maxRows === 2) {
    boxH = 16.27; minY = 129.87; maxY = 168.00; valFontSize = 11.5; labelFontSize = 12;
  } else if (maxRows === 3 && (rightCount || 0) <= 2) {
    // 3 en izquierda y hasta 2 en derecha (el estándar histórico de Illustrator de Zybra)
    boxH = 16.27;
    valFontSize = 11.5;
    labelFontSize = 12;
    const yList = [129.87, 165.86, 202.00];
    const boxY = yList[idx] ?? 202.00;
    const baselineOff = 11.95;
    const common = { boxH, boxY, valFontSize, labelFontSize };
    if (col === 'left') {
      return { ...common, labelX: 37.16, labelY: +(boxY + baselineOff).toFixed(2), boxX: 107.0, boxW: 77.05 };
    } else {
      return { ...common, labelX: 217.96, labelY: +(boxY + baselineOff).toFixed(2), boxX: 283.43, boxW: 77.05 };
    }
  } else if (maxRows === 3) {
    // 3 filas en derecha (o en ambas columnas)
    boxH = 14.5;
    minY = 118.0;
    maxY = 187.0; // Fondo de la última = 187.0 + 14.5 = 201.5 (deja >26pt limpios sobre Made in Germany)
    valFontSize = 11;
    labelFontSize = 11;
  } else if (maxRows === 4) {
    // 4 filas (caso del reporte del usuario con 4 parámetros)
    boxH = 13.0;
    minY = 116.0;
    maxY = 188.5; // Fondo de la última = 188.5 + 13.0 = 201.5
    valFontSize = 10;
    labelFontSize = 10;
  } else if (maxRows === 5) {
    boxH = 11.5;
    minY = 115.0;
    maxY = 190.0; // Fondo de la última = 190.0 + 11.5 = 201.5
    valFontSize = 9;
    labelFontSize = 9;
  } else {
    // 6 o más filas
    boxH = Math.max(9.0, 11.5 - (maxRows - 5) * 0.6);
    minY = 114.0;
    maxY = 201.5 - boxH;
    valFontSize = 8;
    labelFontSize = 8;
  }

  const step = maxRows > 1 ? (maxY - minY) / (maxRows - 1) : 0;
  const boxY = +(minY + idx * step).toFixed(2);
  const baselineOff = +(boxH * 0.735).toFixed(2);

  const common = { boxH, boxY, valFontSize, labelFontSize };
  if (col === 'left') {
    return { ...common, labelX: 37.16, labelY: +(boxY + baselineOff).toFixed(2), boxX: 107.0, boxW: 77.05 };
  } else {
    return { ...common, labelX: 217.96, labelY: +(boxY + baselineOff).toFixed(2), boxX: 283.43, boxW: 77.05 };
  }
}

function getVormaSlotCoord(templateId, col, idx, totalInCol) {
  const isLarge = templateId === 'vorma_grande';
  if (isLarge) {
    const labelX = col === 'left' ? 220.58 : 299.65;
    const valX = col === 'left' ? 220.58 : 299.65;
    let labelY;
    if (totalInCol <= 1) {
      labelY = 145.0;
    } else if (totalInCol === 2) {
      labelY = [95.0, 185.0][idx] ?? 145.0;
    } else if (totalInCol === 3) {
      labelY = [85.0, 145.0, 205.0][idx] ?? 145.0;
    } else if (totalInCol === 4) {
      labelY = (col === 'left'
        ? [84.56, 129.04, 170.84, 213.73]
        : [83.54, 124.87, 168.40, 213.73])[idx] ?? 213.73;
    } else {
      const minY = 78.0;
      const maxY = 216.0;
      const step = (maxY - minY) / (totalInCol - 1);
      labelY = minY + idx * step;
    }
    const valOffset = totalInCol > 5 ? 12.0 : 14.4;
    return { labelX, labelY, valX, valY: labelY + valOffset };
  } else {
    // Vorma Pequeña (110 x 70 mm)
    const labelX = col === 'left' ? 166.81 : 223.62;
    const valX = col === 'left' ? 166.81 : 223.62;
    let labelY;
    if (totalInCol <= 1) {
      labelY = 110.0;
    } else if (totalInCol === 2) {
      labelY = [75.0, 145.0][idx] ?? 110.0;
    } else if (totalInCol === 3) {
      labelY = [66.0, 112.0, 158.0][idx] ?? 110.0;
    } else if (totalInCol === 4) {
      labelY = (col === 'left'
        ? [64.93, 95.96, 129.42, 159.82]
        : [64.93, 95.96, 127.67, 159.82])[idx] ?? 159.82;
    } else {
      const minY = 62.0;
      const maxY = 162.0;
      const step = (maxY - minY) / (totalInCol - 1);
      labelY = minY + idx * step;
    }
    const valOffset = totalInCol > 5 ? 9.5 : 11.2;
    return { labelX, labelY, valX, valY: labelY + valOffset };
  }
}

function getOlsenRowY(templateId, col, rowIndex, totalActiveInCol) {
  if (templateId === 'olsen_grande') {
    if (totalActiveInCol <= 1) return 145.0;
    if (totalActiveInCol === 2) return [105.0, 175.0][rowIndex] ?? 145.0;
    if (totalActiveInCol === 3) {
      const stdY = col === 'left' ? [95.24, 131.90, 178.40] : [97.03, 131.90, 178.40];
      return stdY[rowIndex] ?? 178.40;
    }
    if (totalActiveInCol === 4) {
      return [90.0, 124.0, 158.0, 192.0][rowIndex] ?? 192.0;
    }
    const minY = 82.0;
    const maxY = 202.0;
    const step = (maxY - minY) / (totalActiveInCol - 1);
    return minY + rowIndex * step;
  } else {
    // Olsen Pequeña (110 x 70 mm)
    if (totalActiveInCol <= 1) return 115.0;
    if (totalActiveInCol === 2) return [90.0, 140.0][rowIndex] ?? 115.0;
    if (totalActiveInCol === 3) {
      const stdY = col === 'left' ? [81.78, 115.69, 148.24] : [81.62, 116.49, 148.24];
      return stdY[rowIndex] ?? 148.24;
    }
    if (totalActiveInCol === 4) {
      return [78.0, 104.0, 130.0, 155.0][rowIndex] ?? 155.0;
    }
    const minY = 74.0;
    const maxY = 158.0;
    const step = (maxY - minY) / (totalActiveInCol - 1);
    return minY + rowIndex * step;
  }
}

// Cargador de las 5 tipografías reales embebidas para opentype.js
const LoadedFonts = {};

function initEmbeddedFonts() {
  if (!window.opentype || !window.EMBEDDED_FONTS_BASE64) {
    console.warn('opentype.js o EMBEDDED_FONTS_BASE64 no disponible aún.');
    return false;
  }
  for (const [fontName, b64] of Object.entries(window.EMBEDDED_FONTS_BASE64)) {
    if (!LoadedFonts[fontName]) {
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      LoadedFonts[fontName] = window.opentype.parse(bytes.buffer);
    }
  }
  return true;
}

/**
 * Convierte un texto en un elemento <path> vectorial usando la fuente real .ttf
 */
function textToPathElement(fontKey, text, x, y, fontSize, options = {}) {
  const str = String(text ?? '');
  if (!str.trim()) return '';
  const font = LoadedFonts[fontKey];
  if (!font) {
    // Fallback por si no se hubiera inicializado aún
    const fill = options.fill || '#000';
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${fontKey}" font-size="${fontSize}" fill="${fill}">${escapeXml(str)}</text>`;
  }

  let actualSize = fontSize;
  if (options.maxWidth) {
    const rawW = font.getAdvanceWidth(str, actualSize, { kerning: true });
    if (rawW > options.maxWidth && rawW > 0) {
      actualSize = Math.max(5.5, actualSize * (options.maxWidth / rawW));
    }
  }

  let drawX = x;
  if (options.align === 'center' && options.boxWidth) {
    const w = font.getAdvanceWidth(str, actualSize, { kerning: true });
    drawX = x + (options.boxWidth - w) / 2;
  }

  const pathObj = font.getPath(str, drawX, y, actualSize, { kerning: true });
  const d = pathObj.toPathData(3);
  if (!d) return '';
  const fill = options.fill || '#000';
  return `<path fill="${fill}" d="${d}"/>`;
}

/**
 * Devuelve solo el string `d` de las curvas de un texto (útil para trazados compuestos en Zybra)
 */
function textToPathD(fontKey, text, x, y, fontSize, options = {}) {
  const str = String(text ?? '');
  if (!str.trim()) return '';
  const font = LoadedFonts[fontKey];
  if (!font) return '';

  let actualSize = fontSize;
  if (options.maxWidth) {
    const rawW = font.getAdvanceWidth(str, actualSize, { kerning: true });
    if (rawW > options.maxWidth && rawW > 0) {
      actualSize = Math.max(5.5, actualSize * (options.maxWidth / rawW));
    }
  }

  let drawX = x;
  if (options.align === 'center' && options.boxWidth) {
    const w = font.getAdvanceWidth(str, actualSize, { kerning: true });
    drawX = x + (options.boxWidth - w) / 2;
  }

  const pathObj = font.getPath(str, drawX, y, actualSize, { kerning: true });
  return pathObj.toPathData(3);
}

/**
 * Formateador inteligente para valores de Vorma (ej. "380V 50HZ", "4.1KW", "1- 1420 2- 2840 rpm")
 * Reproduce exactamente el estilo del PDF página 2 donde números van a 12pt (9.33pt en pequeña)
 * y las unidades (HZ, KG, KW, L, R/M, rpm, 1-, 2-) van a 9pt (7pt en pequeña) en la misma línea base.
 */
function renderVormaValuePaths(text, x, y, mainSize, smallSize) {
  const str = String(text ?? '').trim();
  if (!str) return '';
  const font = LoadedFonts['UniversLTStd-Cn'];
  if (!font) {
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="UniversLTStd-Cn" font-size="${mainSize}" fill="#000">${escapeXml(str)}</text>`;
  }

  // Tokenizar reconociendo prefijos "1-", "2-" y sufijos de unidades "HZ", "KG", "KW", "R/M", "rpm", "L", "BAR"
  const tokenRegex = /(1-|2-|\b(?:HZ|Hz|KG|kg|KW|kW|R\/M|r\/m|rpm|RPM|BAR|bar)\b|(?<=\d\s*)L\b|(?<=\d)(?:HZ|Hz|KG|kg|KW|kW|R\/M|r\/m|rpm|RPM|L)\b)/g;
  const parts = [];
  let lastIdx = 0;
  let match;
  while ((match = tokenRegex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ text: str.slice(lastIdx, match.index), isSmall: false });
    }
    parts.push({ text: match[0], isSmall: true });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < str.length) {
    parts.push({ text: str.slice(lastIdx), isSmall: false });
  }

  // Calcular ancho total para escalar si es muy largo
  let totalW = 0;
  for (const p of parts) {
    const sz = p.isSmall ? smallSize : mainSize;
    totalW += font.getAdvanceWidth(p.text, sz, { kerning: true });
  }
  const maxW = 104; // Evitar que invada la siguiente columna o salga del borde
  const scale = totalW > maxW ? (maxW / totalW) : 1;

  let curX = x;
  let combinedD = '';
  for (const p of parts) {
    const sz = (p.isSmall ? smallSize : mainSize) * scale;
    const pathObj = font.getPath(p.text, curX, y, sz, { kerning: true });
    const d = pathObj.toPathData(3);
    if (d) combinedD += (combinedD ? ' ' : '') + d;
    curX += font.getAdvanceWidth(p.text, sz, { kerning: true });
  }

  return combinedD ? `<path fill="#000" d="${combinedD}"/>` : '';
}

function escapeXml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Crea el trazado de un rectángulo redondeado en sentido ANTIHORARIO (down -> right -> up -> left)
 * igual que hace Adobe Illustrator en el logo de Zybra para que al concatenar los glifos (.ttf)
 * el texto quede vaciado (blanco) dentro del rectángulo negro tanto en nonzero como en evenodd.
 */
function createCounterClockwiseRectPath(x, y, w, h) {
  const x2 = +(x + w).toFixed(3);
  const y2 = +(y + h).toFixed(3);
  const x1 = +x.toFixed(3);
  const y1 = +y.toFixed(3);
  return `M${x1},${y1}V${y2}H${x2}V${y1}H${x1}Z`;
}

/**
 * Genera el código SVG completo de una máquina (para previsualización o para exportación final a xTool)
 * @param {Object} machine - Datos de la máquina
 * @param {Object} runtimeOverrides - { serialNumber, manufactureDate } del Modo Operario
 * @param {Object} options - { forExport, showPlateGuides, zybraKnockoutMode, exportCropMode, templateConfigs }
 */
function generatePlateSVG(machine, runtimeOverrides = {}, options = {}) {
  initEmbeddedFonts();

  const templateId = machine.templateId || 'vorma_grande';
  const customConfigs = options.templateConfigs || {};
  const tpl = {
    ...DEFAULT_TEMPLATE_CONFIGS[templateId],
    ...(customConfigs[templateId] || {})
  };

  const serialNumber = runtimeOverrides.serialNumber !== undefined
    ? runtimeOverrides.serialNumber
    : (machine.defaultSerial || '');
  const manufactureDate = runtimeOverrides.manufactureDate !== undefined
    ? runtimeOverrides.manufactureDate
    : (machine.defaultDate || '');

  const primaryName = machine.primaryName || '';
  const primaryModel = machine.primaryModel || '';
  const slots = Array.isArray(machine.slots) ? machine.slots : tpl.defaultSlots;

  const dynamicPaths = [];

  // =========================================================================
  // 1. MARCA: ZYBRA (Placa Única 150 x 90 mm)
  // =========================================================================
  if (templateId === 'zybra_unica') {
    // Textos fijos de cabecera y pie convertidos a curvas exactas
    dynamicPaths.push(textToPathElement('CorporateA-Regular', 'Name:', 135.93, 38.65, 9));
    dynamicPaths.push(textToPathElement('CorporateA-SemiBold', primaryName, 189.47, 38.07, 24, { maxWidth: 218 }));

    dynamicPaths.push(textToPathElement('CorporateA-Regular', 'Model:', 136.38, 66.11, 9));
    dynamicPaths.push(textToPathElement('CorporateA-Italic', primaryModel, 189.47, 66.32, 24, { maxWidth: 218 }));

    dynamicPaths.push(textToPathElement('CorporateA-Regular', 'zybra.de.com / support@zybra.de.com', 134.19, 95.31, 7));
    dynamicPaths.push(textToPathElement('CorporateA-Regular', 'Made in Germany', 301.08, 229.50, 7));

    // Serial number arriba a la derecha
    dynamicPaths.push(textToPathElement('CorporateA-Regular', 'Serial number:', 301.08, 95.31, 7));
    if (serialNumber) {
      dynamicPaths.push(textToPathElement('CorporateA-Regular', serialNumber, 348.50, 95.31, 7, { maxWidth: 62 }));
    }

    // Bloques Técnicos (Etiqueta en negro + Rectángulo negro con valor en tipografía blanca)
    const leftSlots = slots.filter(s => s.col === 'left' && s.enabled !== false);
    const rightSlots = slots.filter(s => s.col === 'right' && s.enabled !== false);

    const renderZybraSlot = (slot, coord) => {
      if (!slot || !coord) return;
      const lbl = slot.label ? (slot.label.endsWith(':') ? slot.label : `${slot.label}:`) : '';
      const labelFontSize = coord.labelFontSize || 12;
      const valFontSize = coord.valFontSize || 11;

      if (lbl) {
        dynamicPaths.push(textToPathElement('CorporateA-Regular', lbl, coord.labelX, coord.labelY, labelFontSize, { maxWidth: 66 }));
      }
      // Determinar el valor (si es el campo de fecha, usa manufactureDate del modo operario)
      const isDateField = slot.isDateSlot || /^(date|fecha|año|year)$/i.test((slot.label || '').replace(':', '').trim());
      const valText = isDateField ? (manufactureDate || slot.value || '') : (slot.value ?? '');

      const rectD = createCounterClockwiseRectPath(coord.boxX, coord.boxY, coord.boxW, coord.boxH);
      const textY = coord.boxY + (coord.boxH * 0.735); // Línea base centrada verticalmente en la caja
      const glyphD = textToPathD('CorporateA-SemiBold', valText, coord.boxX + 4, textY, valFontSize, {
        align: 'center',
        boxWidth: coord.boxW - 8,
        maxWidth: coord.boxW - 8
      });

      if (glyphD && options.zybraKnockoutMode !== 'layered') {
        // Modo por defecto: Trazado compuesto vaciado real (Compound Path) + fondo blanco visual en preview
        if (!options.forExport) {
          dynamicPaths.push(`<rect x="${coord.boxX}" y="${coord.boxY}" width="${coord.boxW}" height="${coord.boxH}" rx="0.57" ry="0.57" fill="#ffffff"/>`);
        }
        dynamicPaths.push(`<path fill="#000000" fill-rule="evenodd" d="${rectD} ${glyphD}"/>`);
      } else if (glyphD && options.zybraKnockoutMode === 'layered') {
        // Modo capas separadas: Rectángulo negro + Texto blanco encima
        dynamicPaths.push(`<rect x="${coord.boxX}" y="${coord.boxY}" width="${coord.boxW}" height="${coord.boxH}" rx="0.57" ry="0.57" fill="#000000"/>`);
        dynamicPaths.push(`<path fill="#ffffff" d="${glyphD}"/>`);
      } else {
        // Caja negra sin texto
        dynamicPaths.push(`<rect x="${coord.boxX}" y="${coord.boxY}" width="${coord.boxW}" height="${coord.boxH}" rx="0.57" ry="0.57" fill="#000000"/>`);
      }
    };

    leftSlots.forEach((s, idx) => renderZybraSlot(s, getZybraSlotCoord('left', idx, leftSlots.length, rightSlots.length)));
    rightSlots.forEach((s, idx) => renderZybraSlot(s, getZybraSlotCoord('right', idx, leftSlots.length, rightSlots.length)));
  }

  // =========================================================================
  // 2. MARCA: VORMA (Placa Grande 150x90 y Placa Pequeña 110x70)
  // =========================================================================
  else if (templateId === 'vorma_grande' || templateId === 'vorma_pequena') {
    const isLarge = templateId === 'vorma_grande';
    const mainFontSize = isLarge ? 12 : 9.3333;
    const unitFontSize = isLarge ? 9 : 7.0;

    if (isLarge) {
      // Cabecera derecha: Type (Modelo) y Machine (Nombre)
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Type:', 218.11, 29.85, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', primaryModel, 218.11, 44.25, mainFontSize, { maxWidth: 55 }));

      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Machine:', 269.66, 30.09, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', primaryName, 269.66, 44.49, mainFontSize, { maxWidth: 136 }));

      // Datos fijos empresa izquierda
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Vorma Maschinen GmbH', 18.60, 107.08, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'www.vormasmachinen.com', 18.60, 123.93, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Made in Germany', 18.60, 141.81, mainFontSize));

      // Año de fabricación debajo de Made in Germany (ej. 2026 en página 2 del PDF)
      if (manufactureDate) {
        dynamicPaths.push(textToPathElement('UniversLTStd-Cn', manufactureDate, 18.71, 160.35, mainFontSize));
      }

      // Serial Number abajo a la izquierda
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Serial Number:', 68.06, 222.57, mainFontSize));
      if (serialNumber) {
        dynamicPaths.push(textToPathElement('UniversLTStd-Cn', serialNumber, 68.06, 236.97, mainFontSize, { maxWidth: 125 }));
      }
    } else {
      // Vorma Pequeña (110 x 70 mm)
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Type:', 161.44, 23.22, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', primaryModel, 161.44, 34.42, mainFontSize, { maxWidth: 52 }));

      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Machine:', 219.57, 23.41, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', primaryName, 219.57, 34.61, mainFontSize, { maxWidth: 85 }));

      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Vorma Maschinen GmbH', 23.98, 79.97, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'www.vormasmachinen.com', 23.98, 95.87, mainFontSize));
      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Made in Germany', 23.98, 111.16, mainFontSize));

      if (manufactureDate) {
        dynamicPaths.push(textToPathElement('UniversLTStd-Cn', manufactureDate, 23.98, 126.45, mainFontSize));
      }

      dynamicPaths.push(textToPathElement('UniversLTStd-Cn', 'Serial Number:', 47.19, 173.11, mainFontSize));
      if (serialNumber) {
        dynamicPaths.push(textToPathElement('UniversLTStd-Cn', serialNumber, 47.19, 184.31, mainFontSize, { maxWidth: 96 }));
      }
    }

    // Tabla técnica modular (distribución dinámica en 2 columnas según cantidad de parámetros)
    const leftSlots = slots.filter(s => s.col === 'left' && s.enabled !== false);
    const rightSlots = slots.filter(s => s.col === 'right' && s.enabled !== false);

    leftSlots.forEach((slot, idx) => {
      const c = getVormaSlotCoord(templateId, 'left', idx, leftSlots.length);
      if (!c) return;
      const lbl = slot.label ? (slot.label.endsWith(':') ? slot.label : `${slot.label}:`) : '';
      if (lbl) dynamicPaths.push(textToPathElement('UniversLTStd-Cn', lbl, c.labelX, c.labelY, mainFontSize));
      if (slot.value) dynamicPaths.push(renderVormaValuePaths(slot.value, c.valX, c.valY, mainFontSize, unitFontSize));
    });

    rightSlots.forEach((slot, idx) => {
      const c = getVormaSlotCoord(templateId, 'right', idx, rightSlots.length);
      if (!c) return;
      const lbl = slot.label ? (slot.label.endsWith(':') ? slot.label : `${slot.label}:`) : '';
      if (lbl) dynamicPaths.push(textToPathElement('UniversLTStd-Cn', lbl, c.labelX, c.labelY, mainFontSize));
      if (slot.value) dynamicPaths.push(renderVormaValuePaths(slot.value, c.valX, c.valY, mainFontSize, unitFontSize));
    });
  }

  // =========================================================================
  // 3. MARCA: OLSEN & KAEL (Placa Grande 150x90 y Placa Pequeña 110x70)
  // =========================================================================
  else if (templateId === 'olsen_grande' || templateId === 'olsen_pequena') {
    const isLarge = templateId === 'olsen_grande';
    const fontKey = 'JetBrainsMono-ExtraLight';
    const font = LoadedFonts[fontKey];

    if (isLarge) {
      // Cabecera: Typ y Model
      dynamicPaths.push(textToPathElement(fontKey, 'Typ:', 23.97, 20.06, 8));
      dynamicPaths.push(textToPathElement(fontKey, primaryName, 24.82, 49.16, 15, { maxWidth: 92 }));

      // En los SVG de Olsen Grande, si el modelo es largo (ej. DUO AUTO), empieza en x=106.81; si es corto (600), en 122.3
      const modelX = primaryModel.length > 5 ? 106.81 : 122.30;
      dynamicPaths.push(textToPathElement(fontKey, 'Model:', modelX, 20.06, 8));
      dynamicPaths.push(textToPathElement(fontKey, primaryModel, modelX, 48.79, 15, { maxWidth: 96 }));

      // Nº de Serie arriba a la derecha (en la misma línea que Nº:)
      dynamicPaths.push(textToPathElement(fontKey, 'Nº:', 308.81, 16.80, 8));
      if (serialNumber) {
        dynamicPaths.push(textToPathElement(fontKey, serialNumber, 326.50, 16.80, 8, { maxWidth: 88 }));
      }

      // Pie de placa: web, Manufacture date: y valor dentro del recuadro inferior derecho
      dynamicPaths.push(textToPathElement(fontKey, 'olsenandkael.com', 120.26, 232.57, 8));
      dynamicPaths.push(textToPathElement(fontKey, 'Manufacture date:', 230.85, 232.57, 8));
      if (manufactureDate) {
        // Recuadro inferior derecho va de x=324.36 a x=416.82 (ancho 92.46)
        dynamicPaths.push(textToPathElement(fontKey, manufactureDate, 328.36, 233.20, 9, {
          align: 'center',
          boxWidth: 84.46,
          maxWidth: 84.46
        }));
      }
    } else {
      // Olsen & Kael Pequeña (110 x 70 mm)
      dynamicPaths.push(textToPathElement(fontKey, 'Typ:', 15.78, 27.24, 8));
      dynamicPaths.push(textToPathElement(fontKey, primaryName, 15.69, 51.46, 13, { maxWidth: 54 }));

      dynamicPaths.push(textToPathElement(fontKey, 'Model:', 73.46, 27.24, 8));
      dynamicPaths.push(textToPathElement(fontKey, primaryModel, 72.18, 50.91, 13, { maxWidth: 104 }));

      dynamicPaths.push(textToPathElement(fontKey, 'Nº:', 188.92, 48.43, 8));
      if (serialNumber) {
        dynamicPaths.push(textToPathElement(fontKey, serialNumber, 206.50, 48.43, 8, { maxWidth: 92 }));
      }

      dynamicPaths.push(textToPathElement(fontKey, 'olsenandkael.com', 109.11, 181.12, 7.01));
      dynamicPaths.push(textToPathElement(fontKey, 'Date:', 205.94, 181.12, 7.01));
      if (manufactureDate) {
        dynamicPaths.push(textToPathElement(fontKey, manufactureDate, 231.50, 181.12, 7.01, { maxWidth: 68 }));
      }
    }

    // Cuerpo técnico central: valor justo a la derecha de cada etiqueta en la misma línea
    const leftSlots = slots.filter(s => s.col === 'left' && s.enabled !== false);
    const rightSlots = slots.filter(s => s.col === 'right' && s.enabled !== false);

    const renderOlsenSlot = (slot, col, idx, totalInCol) => {
      const y = getOlsenRowY(templateId, col, idx, totalInCol);
      const baseX = isLarge
        ? (col === 'left' ? (idx === 1 && totalInCol <= 3 && slot.label === 'Size' ? 25.91 : 23.97) : 220.68)
        : (col === 'left' ? (idx === 1 && totalInCol <= 3 && slot.label === 'Size' ? 28.55 : 26.61) : 171.30);

      const lbl = slot.label ? (slot.label.endsWith(':') ? slot.label : `${slot.label}:`) : '';
      if (!lbl && !slot.value) return;

      dynamicPaths.push(textToPathElement(fontKey, lbl, baseX, y, 8));
      if (slot.value) {
        const lblWidth = font ? font.getAdvanceWidth(lbl + ' ', 8, { kerning: true }) : (lbl.length + 1) * 4.8;
        const valX = baseX + lblWidth + 2;
        const maxColW = isLarge ? (col === 'left' ? 185 - lblWidth : 185 - lblWidth) : (col === 'left' ? 138 - lblWidth : 125 - lblWidth);
        dynamicPaths.push(textToPathElement(fontKey, slot.value, valX, y, 8, { maxWidth: Math.max(30, maxColW) }));
      }
    };

    leftSlots.forEach((s, idx) => renderOlsenSlot(s, 'left', idx, leftSlots.length));
    rightSlots.forEach((s, idx) => renderOlsenSlot(s, 'right', idx, rightSlots.length));
  }

  // =========================================================================
  // CONFIGURACIÓN DE VIEWBOX Y MEDIDAS EXACTAS EN MILÍMETROS
  // =========================================================================
  const cropToInner = options.exportCropMode === 'inner_artbox';
  let vbX = 0;
  let vbY = 0;
  let vbW = tpl.viewBoxWidthPt;
  let vbH = tpl.viewBoxHeightPt;
  let svgWidthMm = tpl.plateWidthMm;
  let svgHeightMm = tpl.plateHeightMm;

  if (cropToInner && tpl.artBoxPt) {
    vbX = tpl.artBoxPt.x;
    vbY = tpl.artBoxPt.y;
    vbW = tpl.artBoxPt.width;
    vbH = tpl.artBoxPt.height;
    svgWidthMm = tpl.innerWidthMm;
    svgHeightMm = tpl.innerHeightMm;
  }

  // Guías visuales opcionales solo para la vista previa en pantalla (NUNCA se incluyen en el SVG exportado a xTool)
  let previewGuides = '';
  if (!options.forExport && options.showPlateGuides && tpl.artBoxPt) {
    const ab = tpl.artBoxPt;
    previewGuides = `
      <g id="Guias_Visuales_No_Exportables" pointer-events="none">
        <rect x="${ab.x}" y="${ab.y}" width="${ab.width}" height="${ab.height}"
              fill="none" stroke="#44af65" stroke-width="0.6" stroke-dasharray="3,2" opacity="0.8"/>
      </g>
    `;
  }

  // Si el usuario activa "Fijar marco invisible del área interior para xTool", se añade un rect sin relleno ni trazo
  // o micro-puntos en las esquinas del ArtBox para garantizar que el bounding box en xTool sea siempre idéntico
  let xtoolBoundingLock = '';
  if (options.forExport && options.lockInnerBoundingBox && tpl.artBoxPt) {
    const ab = tpl.artBoxPt;
    xtoolBoundingLock = `<rect id="xTool_Inner_Area_Bounds" x="${ab.x}" y="${ab.y}" width="${ab.width}" height="${ab.height}" fill="none" stroke="none"/>`;
  }

  const svgAttr = options.forExport
    ? `xmlns="http://www.w3.org/2000/svg" width="${svgWidthMm}mm" height="${svgHeightMm}mm" viewBox="${vbX} ${vbY} ${vbW} ${vbH}"`
    : `xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" class="plate-svg-preview"`;

  const metadataComment = options.forExport
    ? `<!-- Generado para xTool | Marca: ${tpl.brandName} | Placa: ${tpl.plateWidthMm}x${tpl.plateHeightMm}mm | Área Interior: ${tpl.innerWidthMm}x${tpl.innerHeightMm}mm | Posición Fija xTool -> X: ${tpl.xToolX} | Y: ${tpl.xToolY} -->\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>\n${metadataComment}<svg id="Capa_1" data-name="Capa 1" ${svgAttr}>
  ${xtoolBoundingLock}
  ${STATIC_VECTORS[templateId] || ''}
  <g id="Textos_Trazados_En_Curvas">
    ${dynamicPaths.join('\n    ')}
  </g>
  ${previewGuides}
</svg>`;
}

window.PlateTemplates = {
  PT_TO_MM,
  MM_TO_PT,
  DEFAULT_TEMPLATE_CONFIGS,
  SLOT_COORDINATES,
  initEmbeddedFonts,
  generatePlateSVG
};
