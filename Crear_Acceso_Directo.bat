@echo off
chcp 65001 >nul
title Configurar Placas xTool
cd /d "%~dp0"

echo ======================================================================
echo           CONFIGURACION RAPIDA DE PLACAS XTOOL (1 CLIC)
echo ======================================================================
echo.

:: 1. Comprobar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] No se ha detectado Node.js en este ordenador.
    echo     Instalando Node.js automaticamente para que funcione el programa...
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo     Abriendo instalador de Node.js en tu navegador...
        start https://nodejs.org/en/download/
        echo     Por favor, instala Node.js y vuelve a ejecutar este archivo.
        pause
        exit /b 1
    )
)

:: 2. Crear acceso directo en el Escritorio con icono de alta resolución
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
    "$shortcut = $ws.CreateShortcut((Join-Path $desktop 'Placas xTool.lnk')); " ^
    "$shortcut.TargetPath = (Resolve-Path 'Generador_Placas_xTool.exe').Path; " ^
    "$shortcut.WorkingDirectory = (Get-Location).Path; " ^
    "$icon = Resolve-Path 'Placas_xTool_Icon_v6.ico' -ErrorAction SilentlyContinue; " ^
    "if (-not $icon) { $icon = Resolve-Path 'app-icon.ico' }; " ^
    "$shortcut.IconLocation = $icon.Path + ',0'; " ^
    "$shortcut.Description = 'Generador de Placas Técnicas para xTool Studio'; " ^
    "$shortcut.Save(); " ^
    "Write-Output '[OK] Acceso directo creado en tu Escritorio.'"

echo.
echo ======================================================================
echo  ¡Listo! Ya tienes el acceso directo "Placas xTool" en tu Escritorio.
echo  Abriendo el programa...
echo ======================================================================
start "" "Generador_Placas_xTool.exe"
timeout /t 3 >nul
