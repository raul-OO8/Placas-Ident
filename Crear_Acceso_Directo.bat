@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 1. Iniciar el servicio local silenciosamente si no está activo
powershell.exe -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 3456); $c.Close(); exit 0 } catch { exit 1 }"
if %errorlevel% neq 0 (
    start /b "" node server.js >nul 2>nul
    timeout /t 1 /nobreak >nul
)

:: 2. Buscar Chromium/Edge para abrir el instalador visual en ventana moderna de 720x640
set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"

if defined BROWSER (
    start "" "%BROWSER%" --app="http://127.0.0.1:3456/installer.html" --window-size=720,640 --no-first-run
) else (
    start http://127.0.0.1:3456/installer.html
)
exit /b 0
