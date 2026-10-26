# Firmar_Ejecutables.ps1
# Crea o recupera el certificado de firma de codigo de Zybra & Vorma
# y firma digitalmente los ejecutables generados.

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
if (-not $ROOT) { $ROOT = (Get-Location).Path }
Set-Location $ROOT

$certName = "Zybra & Vorma Maschinen GmbH"
$cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*$certName*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Generando nuevo certificado de firma digital Authenticode..." -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=$certName, O=Zybra & Vorma Maschinen GmbH, C=ES" `
        -KeyUsage DigitalSignature `
        -FriendlyName "Zybra & Vorma - Firma Oficial Placas xTool" `
        -NotAfter (Get-Date).AddYears(10) `
        -CertStoreLocation "Cert:\CurrentUser\My"
    Write-Host "Certificado creado con Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
} else {
    Write-Host "Usando certificado existente: $($cert.Thumbprint)" -ForegroundColor Green
}

# Exportar certificado publico (.cer) para distribucion o instalacion facil
$certDir = Join-Path $ROOT "cert"
if (-not (Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir | Out-Null }
$cerPath = Join-Path $certDir "Zybra_Vorma_Certificado.cer"
Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
Write-Host "Certificado publico exportado en: $cerPath" -ForegroundColor White

# Firmar los ejecutables
$targetExes = @(
    "Generador_Placas_xTool.exe",
    "Desinstalar.exe",
    "Instalador_Placas_xTool_Setup.exe"
)

foreach ($exe in $targetExes) {
    $fullPath = Join-Path $ROOT $exe
    if (Test-Path $fullPath) {
        Write-Host "Firmando digitalmente $exe..." -ForegroundColor Yellow
        $res = Set-AuthenticodeSignature -FilePath $fullPath -Certificate $cert -HashAlgorithm SHA256
        Write-Host "  Estado: $($res.Status) | Signer: $($res.SignerCertificate.Subject)" -ForegroundColor Green
    }
}

Write-Host "Proceso de firma digital completado." -ForegroundColor Green
