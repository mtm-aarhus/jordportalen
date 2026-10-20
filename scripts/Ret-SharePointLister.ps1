<#
.SYNOPSIS
    Retter de afvigelser, scripts/tjek-lister.js fandt paa Jordportalens lister.

.DESCRIPTION
    Listerne blev oprettet uden om Opret-SharePointLister.ps1 (sandsynligvis ved
    import fra et regneark). Derfor har flere kolonner forkerte interne navne,
    rig tekst, manglende indeks osv. Dette script retter det i to trin:

    1. Retter det, der kan rettes paa stedet: indeks, ren tekst, klokkeslaet,
       valgmuligheder, "kun personer" og elementtilladelser paa P8Noter.
    2. Sletter det, der ikke kan rettes (et internt navn er laast fra
       oprettelsen), og koerer derefter Opret-SharePointLister.ps1 for de
       beroerte lister, som opretter det korrekt.

    Slettes:
      - Kolonnen 'Ansogning' (internt navn field_1) paa P8Adresser, P8Kontakter
        og P8Vedhaeftninger. Genoprettes som opslag til P8Ansogninger.
      - Kolonnen 'Navn*' (Navn_x002a_) paa P8Kontakter. Genoprettes som 'Navn'.
      - Listen P8Dokumenter, som skal vaere et dokumentbibliotek. Kun hvis den
        er tom; ellers springes den over.

    Data i de slettede kolonner forsvinder. Koer Opret-Testsager.ps1 -Fjern og
    derefter Opret-Testsager.ps1 igen bagefter, saa testsagerne faar navne.

    OM DANSKE TEGN
    Filen er bevidst ren ASCII, ligesom Opret-SharePointLister.ps1.

.PARAMETER SiteUrl
    URL til SharePoint-sitet.

.EXAMPLE
    .\scripts\Ret-SharePointLister.ps1

.NOTES
    Kraever PnP PowerShell:  Install-Module PnP.PowerShell -Scope CurrentUser
#>

[CmdletBinding()]
param(
    [string]$SiteUrl = 'https://aarhuskommune.sharepoint.com/teams/Jordportalen'
)

$ErrorActionPreference = 'Stop'

# PnP.PowerShell 1.x virker i Windows PowerShell 5.1; 2.x kraever PowerShell 7.
# Version 3.x er sprunget over, fordi den ikke laengere understoetter -UseWebLogin.
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Import-Module PnP.PowerShell -MaximumVersion '2.99.999'
} else {
    Import-Module PnP.PowerShell -MaximumVersion '1.99.999'
}

$aa = [char]0x00E5
$oe = [char]0x00F8
$ae = [char]0x00E6
$RAADGIVER = "R${aa}dgiver"


# =============================================================
# Hvad der rettes
# =============================================================

$INDEKSER = @(
    'P8Ansogninger|SubmissionUUID', 'P8Ansogninger|Status', 'P8Ansogninger|Ansvarlig',
    'P8Adresser|SubmissionUUID', 'P8Kontakter|SubmissionUUID', 'P8Vedhaeftninger|SubmissionUUID',
    'P8Log|SagId', 'P8Noter|SagId', 'P8Opgaver|SagId', 'P8Links|SagId'
)

$REN_TEKST = @(
    'P8Ansogninger|Bemaerkninger', 'P8Ansogninger|AdresserTekst', 'P8Ansogninger|Grundejere',
    'P8Log|Kommentar', 'P8Noter|Tekst'
)

# Kolonner med forkert internt navn: liste, internt navn, forventet visningsnavn.
$FORKERTE_KOLONNER = @(
    @{ Liste = 'P8Adresser';       Intern = 'field_1';     Titel = 'Ansogning' },
    @{ Liste = 'P8Kontakter';      Intern = 'field_1';     Titel = 'Ansogning' },
    @{ Liste = 'P8Vedhaeftninger'; Intern = 'field_1';     Titel = 'Ansogning' },
    @{ Liste = 'P8Kontakter';      Intern = 'Navn_x002a_'; Titel = 'Navn*' }
)

# Listerne, Opret-SharePointLister.ps1 skal koere for bagefter.
$GENOPRET = @('P8Adresser', 'P8Kontakter', 'P8Vedhaeftninger', 'P8Dokumenter')


# =============================================================
# Hjaelpefunktioner
# =============================================================

function Write-Trin  { param([string]$Tekst) Write-Host "`n$Tekst" -ForegroundColor Cyan }
function Write-Ret   { param([string]$Tekst) Write-Host "    + $Tekst" -ForegroundColor Green }
function Write-Har   { param([string]$Tekst) Write-Host "    = $Tekst" -ForegroundColor DarkGray }
function Write-Slet  { param([string]$Tekst) Write-Host "    - $Tekst" -ForegroundColor Yellow }
function Write-Advar { param([string]$Tekst) Write-Host "    ! $Tekst" -ForegroundColor Yellow }

function Set-Felt {
    <#
        Saetter vaerdier paa et felt og laeser dem tilbage. Set-PnPField giver kun
        en advarsel, hvis en egenskab ikke kan saettes, saa uden tilbagelaesning
        ville scriptet melde "rettet" for noget, der ikke blev aendret.
    #>
    param([string]$Liste, [string]$Intern, [hashtable]$Vaerdier, [string]$Besked)
    $f = Get-Felt -Liste $Liste -Intern $Intern
    if (-not $f) { Write-Advar "$Liste.$Intern findes ikke"; return }
    Set-PnPField -List $Liste -Identity $f.Id -Values $Vaerdier | Out-Null
    $efter = Get-Felt -Liste $Liste -Intern $Intern
    foreach ($navn in $Vaerdier.Keys) {
        # PnP 1.x indlaeser ikke altid de typespecifikke egenskaber (fx Choices).
        # Kan vaerdien ikke laeses, stoler vi paa tjek-lister.js bagefter.
        $laest = "$($efter.$navn)"
        if (-not $laest) { continue }
        if ($laest -ne "$($Vaerdier[$navn])") {
            Write-Advar "$Liste.$Intern.$navn blev ikke aendret (er '$($efter.$navn)') - ret den i listeindstillingerne"
            return
        }
    }
    Write-Ret $Besked
}

function Get-Felt {
    <#  Felt ud fra det INTERNE navn. -Identity matcher ogsaa visningsnavnet, og
        det er netop den forveksling, der skjuler fejlene.  #>
    param([string]$Liste, [string]$Intern)
    Get-PnPField -List $Liste | Where-Object { $_.InternalName -eq $Intern } | Select-Object -First 1
}


# =============================================================
# Koersel
# =============================================================

Write-Host @"
Scriptet retter listerne paa $SiteUrl.

Det SLETTER:
  - kolonnen 'Ansogning' (field_1) paa P8Adresser, P8Kontakter og P8Vedhaeftninger
  - kolonnen 'Navn*' paa P8Kontakter
  - listen P8Dokumenter, hvis den er tom (den genoprettes som dokumentbibliotek)
Data i de kolonner forsvinder. Alt andet rettes paa stedet.
"@ -ForegroundColor Cyan

$svar = Read-Host 'Skriv JA for at fortsaette'
if ($svar -cne 'JA') {
    Write-Host 'Afbrudt. Intet er aendret.' -ForegroundColor Yellow
    return
}

Write-Host "`nForbinder til $SiteUrl ..." -ForegroundColor Cyan
try {
    Connect-PnPOnline -Url $SiteUrl -UseWebLogin -ErrorAction Stop
} catch {
    Write-Host "FEJL ved forbindelse: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# --- 1. Ret paa stedet ---------------------------------------

Write-Trin 'Indeks'
foreach ($n in $INDEKSER) {
    $liste, $felt = $n -split '\|'
    $f = Get-Felt -Liste $liste -Intern $felt
    if (-not $f) { Write-Advar "$liste.$felt findes ikke"; continue }
    if ($f.Indexed) { Write-Har "$liste.$felt"; continue }
    Set-Felt -Liste $liste -Intern $felt -Vaerdier @{ Indexed = $true } -Besked "$liste.$felt indekseret"
}

Write-Trin 'Ren tekst i stedet for rig tekst'
foreach ($n in $REN_TEKST) {
    $liste, $felt = $n -split '\|'
    Set-Felt -Liste $liste -Intern $felt -Vaerdier @{ RichText = $false } -Besked "$liste.$felt"
}

Write-Trin 'Dato med klokkeslaet'
Set-Felt -Liste 'P8Ansogninger' -Intern 'ModtagetDato' -Besked 'P8Ansogninger.ModtagetDato' `
    -Vaerdier @{ DisplayFormat = [Microsoft.SharePoint.Client.DateTimeFieldFormatType]::DateTime }

Write-Trin 'Valgmuligheder'
# "Grundejer #1" osv. er rester fra importen. Robotten skriver de rene navne.
$valg = [string[]]@('Grundejer', 'Bygherre', $RAADGIVER)
Set-Felt -Liste 'P8Ansogninger' -Intern 'IndsendtAf' -Vaerdier @{ Choices = $valg } `
    -Besked "P8Ansogninger.IndsendtAf: $($valg -join ', ')"

Write-Trin 'Kun personer'
# Power Automate-flowet sender til de taggede; en gruppe kan ikke modtage det.
Set-Felt -Liste 'P8Log' -Intern 'TaggedeBrugere' -Besked 'P8Log.TaggedeBrugere' `
    -Vaerdier @{ SelectionMode = [Microsoft.SharePoint.Client.FieldUserSelectionMode]::PeopleOnly }

Write-Trin 'Elementtilladelser paa P8Noter'
# 2 = kun egne elementer, for baade laesning og redigering.
$noter = Get-PnPList -Identity 'P8Noter'
$noter.ReadSecurity = 2
$noter.WriteSecurity = 2
$noter.Update()
Invoke-PnPQuery
Write-Ret 'Kolleger kan ikke laese eller slette hinandens noter'

# --- 2. Slet det, der ikke kan rettes -----------------------

Write-Trin 'Kolonner med forkert internt navn'
foreach ($k in $FORKERTE_KOLONNER) {
    $f = Get-Felt -Liste $k.Liste -Intern $k.Intern
    if (-not $f) { Write-Har "$($k.Liste).$($k.Intern) findes ikke"; continue }
    # Kun den kolonne, vi forventer: samme interne navn OG samme visningsnavn.
    if ($f.Title -ne $k.Titel) {
        Write-Advar "$($k.Liste).$($k.Intern) hedder '$($f.Title)', ikke '$($k.Titel)' - roeres ikke"
        continue
    }
    Remove-PnPField -List $k.Liste -Identity $f.Id -Force
    Write-Slet "$($k.Liste): '$($k.Titel)' ($($k.Intern))"
}

Write-Trin 'P8Dokumenter'
$dok = Get-PnPList -Identity 'P8Dokumenter' -ErrorAction SilentlyContinue
if (-not $dok) {
    Write-Har 'Findes ikke - oprettes nedenfor'
} elseif ($dok.BaseTemplate -eq 101) {
    Write-Har 'Er allerede et dokumentbibliotek'
} elseif ($dok.ItemCount -gt 0) {
    Write-Advar "Er en liste med $($dok.ItemCount) element(er) - slettes ikke. Flyt indholdet og slet den manuelt."
} else {
    Remove-PnPList -Identity 'P8Dokumenter' -Force
    Write-Slet 'Listen P8Dokumenter (tom) - genoprettes som dokumentbibliotek'
}

# --- 3. Opret det manglende med det rigtige script ---------

Write-Trin 'Opretter manglende kolonner og bibliotek med Opret-SharePointLister.ps1'
Write-Host '    (logger ind igen)' -ForegroundColor DarkGray
& (Join-Path $PSScriptRoot 'Opret-SharePointLister.ps1') -SiteUrl $SiteUrl -Lister $GENOPRET

Write-Host "`nF${ae}rdig. K${oe}r scripts/tjek-lister.js igen for at se, om alt stemmer." -ForegroundColor Green
