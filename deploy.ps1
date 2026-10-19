# Jordportalen SPFx – deployment script
#
# Uploader og udruller jordportalen.sppkg til Jordportalens site collection
# app catalog ("Apps for SharePoint") i ét trin – uden "Udrul"-dialogen.
#
# KRAV:
#   PnP.PowerShell (1.x i Windows PowerShell 5.1 eller 2.x i PowerShell 7)
#
# BRUG (fra projektmappen):
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#
# SIKKERHED:
#   Scriptet gemmer ingen adgangskoder. Det åbner en browser-login popup
#   (samme som at logge ind på SharePoint manuelt).
#   Din konto skal være webstedssamlingsadministrator på Jordportalen.

param(
    [string]$SiteUrl = "https://aarhuskommune.sharepoint.com/teams/Jordportalen"
)

# PnP.PowerShell 1.x virker i Windows PowerShell 5.1; 2.x kræver PowerShell 7.
# Version 3.x er sprunget over, fordi den ikke længere understøtter -UseWebLogin.
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Import-Module PnP.PowerShell -MaximumVersion "2.99.999" -ErrorAction Stop
} else {
    Import-Module PnP.PowerShell -MaximumVersion "1.99.999" -ErrorAction Stop
}

$PkgPath   = Join-Path $PSScriptRoot "sharepoint\solution\jordportalen.sppkg"
$ProductId = "105e2bf8-0f61-46ce-92cc-af5824fce1cb"   # solution.id i config/package-solution.json

# ── Verify package exists ─────────────────────────────────────────────────────
if (-not (Test-Path $PkgPath)) {
    Write-Host "FEJL: Pakken blev ikke fundet: $PkgPath" -ForegroundColor Red
    Write-Host "Kør først (med Node 22): npm run build" -ForegroundColor Yellow
    exit 1
}

$pkgSize = [math]::Round((Get-Item $PkgPath).Length / 1MB, 1)
$pkgDate = (Get-Item $PkgPath).LastWriteTime
Write-Host "Pakke fundet: $([System.IO.Path]::GetFileName($PkgPath)) ($pkgSize MB, $pkgDate)" -ForegroundColor Cyan

# ── Connect (browser login popup) ────────────────────────────────────────────
Write-Host "`nForbinder til $SiteUrl — browservindue åbner til login..." -ForegroundColor Cyan
try {
    Connect-PnPOnline -Url $SiteUrl -UseWebLogin -ErrorAction Stop
} catch {
    Write-Host "FEJL ved forbindelse: $_" -ForegroundColor Red
    exit 1
}

# ── Upload and deploy ─────────────────────────────────────────────────────────
# -Overwrite erstatter en eksisterende version uden at fjerne den først, så
# webparts på siderne bliver ved med at virke under opdateringen.
Write-Host "Uploader og udruller..." -ForegroundColor Cyan
try {
    Add-PnPApp -Path $PkgPath -Scope Site -Overwrite -Publish -ErrorAction Stop | Out-Null
} catch {
    Write-Host "FEJL ved deploy: $_" -ForegroundColor Red
    exit 1
}

# ── Verify ────────────────────────────────────────────────────────────────────
$app = Get-PnPApp -Identity $ProductId -Scope Site -ErrorAction SilentlyContinue
if ($app -and $app.Deployed) {
    Write-Host "`nDeploy gennemført! Version $($app.AppCatalogVersion), Udrullet: Ja" -ForegroundColor Green
    Write-Host "Vent 1-2 minutter og åbn siden i et inkognito-vindue for at verificere." -ForegroundColor Cyan
} else {
    Write-Host "`nADVARSEL: Pakken er uploadet, men står ikke som udrullet." -ForegroundColor Red
    Write-Host "Tjek at din konto er webstedssamlingsadministrator på $SiteUrl" -ForegroundColor Yellow
    exit 1
}
