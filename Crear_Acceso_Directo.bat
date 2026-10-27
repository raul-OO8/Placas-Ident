@echo off
chcp 65001 >nul
title Instalador Placas xTool
echo ========================================================
echo    Configuracion y Acceso Directo - Placas xTool
echo    Zybra ^& Vorma Maschinen GmbH
echo ========================================================
echo.

if exist "%~dp0Generador_Placas_xTool.exe" (
    if exist "%~dp0node.exe" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $d = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut((Join-Path $d 'Placas xTool.lnk')); $s.TargetPath = '%~dp0Generador_Placas_xTool.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0Placas_xTool_Icon_v6.ico,0'; $s.Save()"
        start "" "%~dp0Generador_Placas_xTool.exe"
        exit /b 0
    )
)

if exist "%~dp0Instalador_Placas_xTool_Setup.exe" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%~dp0Instalador_Placas_xTool_Setup.exe' -ErrorAction SilentlyContinue"
    start "" "%~dp0Instalador_Placas_xTool_Setup.exe"
    exit /b 0
)

echo Descargando e iniciando el instalador oficial completo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $dest = Join-Path $env:TEMP 'Instalador_Placas_xTool_Setup.exe'; Invoke-WebRequest -Uri 'https://github.com/raul-OO8/Placas-Ident/releases/latest/download/Instalador_Placas_xTool_Setup.exe' -OutFile $dest -UseBasicParsing; Unblock-File -Path $dest -ErrorAction SilentlyContinue; Start-Process -FilePath $dest"
exit /b 0
