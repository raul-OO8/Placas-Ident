# Compilar_Instalador.ps1
# Genera el instalador oficial de Windows (Instalador_Placas_xTool_Setup.exe)
# empaquetando la aplicacion completa con su motor autonomo node.exe,
# firma digital Authenticode oficial y paquete ZIP de distribucion con lanzador.

$ErrorActionPreference = "Stop";
$ROOT = $PSScriptRoot;
if (-not $ROOT) { $ROOT = (Get-Location).Path };
Set-Location $ROOT;

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe";
if (-not (Test-Path $csc)) {
    throw "No se encontro el compilador csc.exe en: $csc";
}

Add-Type -AssemblyName System.IO.Compression.FileSystem;

Write-Host "==========================================================" -ForegroundColor Cyan;
Write-Host "  COMPILANDO INSTALADOR OFICIAL - PLACAS XTOOL SETUP" -ForegroundColor Cyan;
Write-Host "==========================================================" -ForegroundColor Cyan;

# 0. Obtener o crear certificado digital de firma de codigo
$certName = 'Zybra & Vorma Maschinen GmbH';
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*Zybra*" } | Select-Object -First 1
if (-not $cert) {
    Write-Host "Creando certificado digital de firma Authenticode..." -ForegroundColor Yellow
    $subjectStr = 'CN=' + $certName + ', O=' + $certName + ', C=ES';
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $subjectStr `
        -KeyUsage DigitalSignature `
        -FriendlyName 'Zybra & Vorma - Firma Oficial Placas xTool' `
        -NotAfter (Get-Date).AddYears(10) `
        -CertStoreLocation 'Cert:\CurrentUser\My'
}
Write-Host "Certificado de firma activo: $($cert.Thumbprint)" -ForegroundColor Green

function Sign-AppFile($filePath) {
    if (Test-Path $filePath) {
        try {
            Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -TimestampServer 'http://timestamp.digicert.com' -HashAlgorithm SHA256 | Out-Null
        } catch {
            Set-AuthenticodeSignature -FilePath $filePath -Certificate $cert -HashAlgorithm SHA256 | Out-Null
        }
        $leaf = Split-Path $filePath -Leaf
        Write-Host "  [FIRMADO] $leaf" -ForegroundColor Green
    }
}

# 1. Compilar Desinstalar.exe
Write-Host "1. Compilando Desinstalar.exe..." -ForegroundColor Yellow;
& $csc /target:winexe /out:"Desinstalar.exe" /win32icon:"Placas_xTool_Icon_v6.ico" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "src_installer\UninstallProgram.cs";
Sign-AppFile (Join-Path $ROOT "Desinstalar.exe")

# 2. Compilar ejecutable principal
Write-Host "2. Compilando Generador_Placas_xTool.exe..." -ForegroundColor Yellow;
& $csc /target:winexe /out:"Generador_Placas_xTool.exe" /win32icon:"Placas_xTool_Icon_v6.ico" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll "src_launcher\Program.cs";
Sign-AppFile (Join-Path $ROOT "Generador_Placas_xTool.exe")

# 3. Preparar stage
Write-Host "3. Empaquetando archivos del programa en el payload..." -ForegroundColor Yellow;
$stage = Join-Path $ROOT "build_stage";
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force };
New-Item -ItemType Directory -Path $stage | Out-Null;

$filesToCopy = @(
    "Generador_Placas_xTool.exe", "Desinstalar.exe", "server.js",
    "index.html", "installer.html", "version.json", "README.md",
    "app-icon.svg", "app-icon.ico", "Placas_xTool_Icon_v6.ico"
);
foreach ($f in $filesToCopy) {
    if (Test-Path (Join-Path $ROOT $f)) {
        Copy-Item (Join-Path $ROOT $f) $stage;
    }
}
Get-ChildItem -Path $ROOT -Filter "icon_*.png" | Copy-Item -Destination $stage;

# Copiar carpetas
foreach ($dir in @("css", "js", "fonts", "img")) {
    $srcDir = Join-Path $ROOT $dir;
    if (Test-Path $srcDir) {
        Copy-Item $srcDir $stage -Recurse;
    }
}

New-Item -ItemType Directory -Path (Join-Path $stage "data") | Out-Null;
if (Test-Path (Join-Path $ROOT "data\maquinas.json")) {
    Copy-Item (Join-Path $ROOT "data\maquinas.json") (Join-Path $stage "data");
}

New-Item -ItemType Directory -Path (Join-Path $stage 'Exportados_xTool\Vorma') | Out-Null;
New-Item -ItemType Directory -Path (Join-Path $stage 'Exportados_xTool\Olsen & Kael') | Out-Null;
New-Item -ItemType Directory -Path (Join-Path $stage 'Exportados_xTool\Zybra') | Out-Null;

# Incluir node.exe autonomo
$nodePath = "C:\Program Files\nodejs\node.exe";
if (Test-Path $nodePath) {
    Copy-Item $nodePath (Join-Path $stage "node.exe");
}

$zipPath = Join-Path $ROOT "app_payload.zip";
if (Test-Path $zipPath) { Remove-Item $zipPath -Force };
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $stage).Path, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false);
Remove-Item $stage -Recurse -Force;

# 4. Compilar SetupProgram.cs con el payload embebido
Write-Host "4. Compilando Instalador_Placas_xTool_Setup.exe..." -ForegroundColor Yellow;
$setupExe = Join-Path $ROOT "Instalador_Placas_xTool_Setup.exe";
& $csc /target:winexe /out:"$setupExe" /win32icon:"Placas_xTool_Icon_v6.ico" "/resource:app_payload.zip,AppPayload.zip" /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll "src_installer\SetupProgram.cs";
if ($LASTEXITCODE -ne 0) { throw "Error al compilar SetupProgram.cs" }

Remove-Item $zipPath -Force -ErrorAction SilentlyContinue;

# 5. Firmar el instalador final
Write-Host "5. Firmando digitalmente Instalador_Placas_xTool_Setup.exe..." -ForegroundColor Yellow;
Sign-AppFile $setupExe

# 6. Generar paquete ZIP de distribucion facil
Write-Host "6. Creando paquete de distribucion Placas_xTool_Instalador.zip..." -ForegroundColor Yellow;
$distStage = Join-Path $ROOT "dist_stage";
if (Test-Path $distStage) { Remove-Item $distStage -Recurse -Force };
New-Item -ItemType Directory -Path $distStage | Out-Null;
Copy-Item $setupExe $distStage;
Copy-Item (Join-Path $ROOT "Instalar.bat") $distStage;

Copy-Item (Join-Path $ROOT "LEEME_INSTALACION.txt") (Join-Path $distStage "LEEME.txt");

$distZip = Join-Path $ROOT "Placas_xTool_Instalador.zip";
if (Test-Path $distZip) { Remove-Item $distZip -Force };
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $distStage).Path, $distZip, [System.IO.Compression.CompressionLevel]::Optimal, $false);
Remove-Item $distStage -Recurse -Force;

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [OK] Instalador generado y firmado con exito:" -ForegroundColor Green
Write-Host "      EXE: $setupExe" -ForegroundColor White
Write-Host "      ZIP: $distZip" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
