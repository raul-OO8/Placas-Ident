@echo off
chcp 65001 >nul
title Actualizador - Placas xTool
cd /d "%~dp0"
echo ========================================================
echo   BUSCANDO Y DESCARGANDO ULTIMA VERSION DESDE GITHUB...
echo ========================================================
if exist "data\maquinas.json" copy /Y "data\maquinas.json" "data\maquinas.backup.json" >nul
git fetch origin main
git reset --hard origin/main
if exist "data\maquinas.backup.json" copy /Y "data\maquinas.backup.json" "data\maquinas.json" >nul
echo.
echo   [OK] ¡Programa actualizado correctamente a la ultima version!
echo   Tus maquinas y placas exportadas se han conservado intactas.
echo ========================================================
timeout /t 4
