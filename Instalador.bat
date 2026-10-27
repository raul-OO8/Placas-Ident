@echo off
chcp 65001 >nul
title Instalador Placas xTool
echo ========================================================
echo    Instalador Oficial - Placas xTool
echo    Zybra ^& Vorma Maschinen GmbH
echo ========================================================
echo.

if exist "%~dp0Instalador_Placas_xTool_Setup.exe" (
    echo Desbloqueando e iniciando el instalador oficial...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%~dp0Instalador_Placas_xTool_Setup.exe' -ErrorAction SilentlyContinue"
    start "" "%~dp0Instalador_Placas_xTool_Setup.exe"
    exit /b 0
)

echo Descargando instalador completo con motor autonomo desde GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $dest = Join-Path $env:TEMP 'Instalador_Placas_xTool_Setup.exe'; Invoke-WebRequest -Uri 'https://github.com/raul-OO8/Placas-Ident/releases/latest/download/Instalador_Placas_xTool_Setup.exe' -OutFile $dest -UseBasicParsing; Unblock-File -Path $dest -ErrorAction SilentlyContinue; Start-Process -FilePath $dest"
exit /b 0
