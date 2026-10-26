<div align="center">

# 🏷️ Placas xTool — Studio de Placas Técnicas

**Generador y gestor de placas técnicas industriales con posicionamiento y parámetros láser automáticos para xTool Studio**

[![Versión](https://img.shields.io/badge/Versión-v1.2.0-44af65?style=for-the-badge)](https://github.com/raul-OO8/Placas-Ident)
[![Plataforma](https://img.shields.io/badge/Plataforma-Windows_10_%2F_11-161a18?style=for-the-badge&logo=windows)](https://github.com/raul-OO8/Placas-Ident)
[![Láser](https://img.shields.io/badge/xTool_Studio-F1_Ultra_Ready-e7246b?style=for-the-badge)](https://github.com/raul-OO8/Placas-Ident)
[![Marcas](https://img.shields.io/badge/Marcas-Zybra_·_Vorma_·_Olsen-dddd19?style=for-the-badge&logoColor=000)](https://github.com/raul-OO8/Placas-Ident)

---

### 🌸 Vorma &nbsp;&nbsp;|&nbsp;&nbsp; ⚡ Olsen & Kael &nbsp;&nbsp;|&nbsp;&nbsp; 🦅 Zybra

</div>

---

## ⚡ ¿Qué hace este programa?

1. **Diseño Modular e Instantáneo**: Selecciona el modelo o crea uno nuevo en segundos. El programa calcula la distribución simétrica en 2 columnas y convierte todos los textos a **curvas vectoriales 100% nativas** (cero fuentes externas requeridas en xTool).
2. **Exportación Directa a xTool (`.xcs`)**: Al pulsar **«Exportar Placa»**, se genera directamente el archivo de proyecto `.xcs` en `Exportados_xTool/<Marca>/` con el material, la potencia, la velocidad, el número de pasadas y las coordenadas exactas de la cama láser preconfiguradas.
3. **Actualización Automática en 1 Clic**: Cada vez que se sube una mejora a este repositorio de GitHub, el programa muestra un pop-up avisando de la nueva versión para actualizarse con un solo clic conservando todos los datos intactos.

---

## 🚀 Guía de Instalación para Windows (1 Clic)

El programa dispone de su propio **instalador ejecutable oficial para Windows**:

<div align="center">

[![Descargar Instalador](https://img.shields.io/badge/Descargar_Instalador_Oficial-Instalador__Placas__xTool__Setup.exe-44af65?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/raul-OO8/Placas-Ident/releases/download/v1.2.0/Instalador_Placas_xTool_Setup.exe)

</div>

### Proceso de instalación en 2 pasos:

1. **Descargar**: Haz clic en el botón superior o descarga el archivo [**`Instalador_Placas_xTool_Setup.exe`**](https://github.com/raul-OO8/Placas-Ident/releases/download/v1.2.0/Instalador_Placas_xTool_Setup.exe).
2. **Instalar**: Haz **doble clic** sobre el archivo descargado y pulsa **«Instalar»**:
   - Se instala automáticamente como cualquier programa de Windows en tu equipo (`%LocalAppData%\Programs\Placas_xTool`).
   - Crea el acceso directo con icono nítido de alta resolución en tu **Escritorio** y en el **Menú Inicio**.
   - Queda registrado en **Configuración de Windows > Aplicaciones instaladas** (con su desinstalador incluido).
   - Incluye su propio motor autónomo integrado (no requiere que el usuario instale nada adicional).
   - Se abre de inmediato al terminar.

---

## 🔄 ¿Cómo se actualiza el programa en el futuro?

No necesitas volver a descargar nada a mano:

1. **Aviso Automático**: Cuando publiquemos una nueva versión, al abrir el programa aparecerá una ventana emergente:
   > *«¡Nueva versión disponible! Al pulsar Actualizar ahora, el programa descargará las mejoras automáticamente conservando todas tus máquinas y placas guardadas.»*
2. **1 Clic**: Pulsas **«Actualizar programa ahora»**, se descarga la actualización en 2 segundos y la pantalla se reinicia sola con los cambios.
3. **Manual**: También puedes actualizar cuando quieras desde el menú **Ajustes → Buscar actualizaciones** o haciendo doble clic en **`Actualizar_Programa.bat`**.

---

## ⚙️ Parámetros Láser Preconfigurados (xTool F1 Ultra)

Todos los proyectos exportados (`.xcs`) ya llevan estos parámetros fijados automáticamente:

| Marca y Plantilla | Medidas y Coordenadas | Material Seleccionado | Parámetros del Grabado Láser |
| :--- | :--- | :--- | :--- |
| **Vorma Grande** | `150 × 90 mm`<br>📐 **X: 51 \| Y: 51** | **Acero Inoxidable 304**<br>*(Espesor: 0.5 mm)* | • **Textos + CE + Serie + Año**: Grabar \| Fibra IR \| **60%** \| **3000 mm/s** \| 1 pasada<br>• **Líneas divisorias**: Marcar \| Fibra IR \| **32%** \| **500 mm/s** \| 1 pasada<br>• **Logo + Isotipo turbina**: Grabar \| Luz azul \| **47%** \| **60 mm/s** \| 1 pasada |
| **Vorma Pequeña** | `110 × 70 mm`<br>📐 **X: 50.5 \| Y: 50** | **Acero Inoxidable 304**<br>*(Espesor: 0.5 mm)* | • **Textos + CE + Serie + Año**: Grabar \| Fibra IR \| **30%** \| **3000 mm/s** \| 1 pasada<br>• **Líneas divisorias**: Marcar \| Fibra IR \| **32%** \| **500 mm/s** \| 1 pasada<br>• **Logo + Isotipo turbina**: Grabar \| Luz azul \| **47%** \| **60 mm/s** \| 1 pasada |
| **Olsen & Kael Grande** | `150 × 90 mm`<br>📐 **X: 48 \| Y: 49.5** | **Acero Inoxidable pintado negro**<br>*(Espesor: 1.0 mm)* | • **Logo + Textos + CE**: Grabar \| Fibra IR \| **70%** \| **1800 mm/s** \| 1 pasada<br>• **Marcos y líneas**: Marcar \| Fibra IR \| **60%** \| **1600 mm/s** \| 1 pasada |
| **Olsen & Kael Pequeña** | `110 × 70 mm`<br>📐 **X: 47 \| Y: 47.5** | **Acero Inoxidable pintado negro**<br>*(Espesor: 1.0 mm)* | • **Logo + Textos + CE**: Grabar \| Fibra IR \| **70%** \| **1800 mm/s** \| 1 pasada<br>• **Marcos y líneas**: Marcar \| Fibra IR \| **60%** \| **1600 mm/s** \| 1 pasada |
| **Zybra** | `150 × 90 mm`<br>📐 **X: 50 \| Y: 50** | **Acero Inoxidable pintado negro**<br>*(Espesor: 1.0 mm)* | • **Logo + Textos + Cajas + CE**: Grabar \| Fibra IR \| **70%** \| **1800 mm/s** \| 1 pasada<br>• **Recuadro y líneas**: Marcar \| Fibra IR \| **60%** \| **1600 mm/s** \| 1 pasada |

---

## 📂 Organización de Archivos

```
📁 Placas-Ident/
├── 🚀 Generador_Placas_xTool.exe   <-- Aplicación de escritorio
├── 🔘 Crear_Acceso_Directo.bat     <-- Configuración rápida y acceso directo en escritorio
├── 🔄 Actualizar_Programa.bat      <-- Actualizador manual alternativo
├── 📁 Exportados_xTool/            <-- Aquí se guardan tus archivos .xcs organizados:
│   ├── 📁 Vorma/
│   ├── 📁 Olsen & Kael/
│   └── 📁 Zybra/
├── 📁 data/                        <-- Base de datos local de tus máquinas (maquinas.json)
└── 📄 README.md                    <-- Esta guía
```

---

<div align="center">
Desarrollado para producción y grabado láser de alta precisión con <b>xTool F1 Ultra</b>.
</div>
