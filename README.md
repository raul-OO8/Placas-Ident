# Placas xTool — Generador de Placas Técnicas

Aplicación de escritorio para diseño, gestión y exportación de placas técnicas industriales para **xTool Studio** (**Zybra**, **Vorma** y **Olsen & Kael**).

## Características principales

- **Exportación directa lista para grabar (`.xcs` + `.svg`)**:
  - Genera en `Exportados_xTool/<Marca>/` tanto el proyecto nativo `.xcs` de xTool Studio (con coordenadas `X, Y`, material y parámetros láser ya asignados por grupo) como el archivo vectorial `.svg` 100 % trazado en curvas.
- **Parámetros láser preconfigurados (xTool F1 Ultra)**:
  - **Vorma Grande (150 × 90 mm — `X: 51 | Y: 51`)**: Material *Acero Inoxidable 304* (`0.5 mm`). Textos y CE: Grabar Fibra IR `60%` / `3000 mm/s` (1 pasada). Líneas: Marcar Fibra IR `32%` / `500 mm/s` (1 pasada). Logo e isotipo: Grabar Luz azul `47%` / `60 mm/s` (1 pasada).
  - **Vorma Pequeña (110 × 70 mm — `X: 50,5 | Y: 50`)**: Material *Acero Inoxidable 304* (`0.5 mm`). Textos y CE: Grabar Fibra IR `30%` / `3000 mm/s` (1 pasada). Líneas: Marcar Fibra IR `32%` / `500 mm/s` (1 pasada). Logo e isotipo: Grabar Luz azul `47%` / `60 mm/s` (1 pasada).
  - **Olsen & Kael (Grande 150 × 90 mm `X: 48 | Y: 49,5` y Pequeña 110 × 70 mm `X: 47 | Y: 47,5`) y Zybra (150 × 90 mm `X: 50 | Y: 50`)**: Material *Acero inoxidable pintado de negro* (`1 mm`). Textos, bloques y logos: Grabar Fibra IR `70%` / `1800 mm/s` (1 pasada). Marcos y líneas: Marcar Fibra IR `60%` / `1600 mm/s` (1 pasada).
- **Actualización automática en 1 clic**:
  - Al abrir el programa, comprueba automáticamente si existe una versión nueva en este repositorio (`version.json`).
  - Si hay una versión nueva, muestra una ventana emergente con el botón **"Actualizar programa ahora"**, que descarga los cambios conservando intactas todas las máquinas y placas guardadas.
  - También se puede actualizar en cualquier momento desde **Ajustes → Buscar actualizaciones** o haciendo doble clic en `Actualizar_Programa.bat`.
