@echo off
title Instalador Placas xTool
echo ========================================================
echo    Instalador Oficial - Placas xTool
echo    Zybra ^& Vorma Maschinen GmbH
echo ========================================================
echo.
echo Desbloqueando e iniciando el instalador oficial sin advertencias...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path '%~dp0Instalador_Placas_xTool_Setup.exe' -ErrorAction SilentlyContinue"
start "" "%~dp0Instalador_Placas_xTool_Setup.exe"
exit
