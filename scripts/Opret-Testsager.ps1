<#
.SYNOPSIS
    Opretter fem testsager i Jordportalen, saa dashboardet og sagsdetaljen kan ses
    med indhold. Kan fjerne dem igen med -Fjern.

.DESCRIPTION
    Hver testsag faar en raekke i P8Ansogninger plus adresser og kontakter (koblet
    paa SubmissionUUID) og en smule historik og opgaver (koblet paa SagId).

    Testsagerne kendes paa tre ting, saa de aldrig kan forveksles med rigtige sager:
      - SubmissionSerial 900001-900005
      - SubmissionUUID 'testsag-900001' osv.
      - Titlen starter med '[TEST]', og Bemaerkninger starter med 'TESTSAG'

    Scriptet er idempotent: en testsag, hvis serienummer allerede findes, springes over.

    OM DANSKE TEGN
    Filen er bevidst ren ASCII, ligesom Opret-SharePointLister.ps1. Danske tegn
    bygges af kodepunkter, saa Windows PowerShell 5.1 ikke kan laese dem forkert.

.PARAMETER SiteUrl
    URL til SharePoint-sitet.

.PARAMETER Fjern
    Opret intet - slet testsagerne og alt, der haenger paa dem.

.EXAMPLE
    .\scripts\Opret-Testsager.ps1

.EXAMPLE
    .\scripts\Opret-Testsager.ps1 -Fjern

.NOTES
    Kraever PnP PowerShell:  Install-Module PnP.PowerShell -Scope CurrentUser
#>

[CmdletBinding()]
param(
    [string]$SiteUrl = 'https://aarhuskommune.sharepoint.com/teams/Jordportalen',
    [switch]$Fjern
)

$ErrorActionPreference = 'Stop'

# PnP.PowerShell 1.x virker i Windows PowerShell 5.1; 2.x kraever PowerShell 7.
# Version 3.x er sprunget over, fordi den ikke laengere understoetter -UseWebLogin.
if ($PSVersionTable.PSVersion.Major -ge 7) {
    Import-Module PnP.PowerShell -MaximumVersion '2.99.999'
} else {
    Import-Module PnP.PowerShell -MaximumVersion '1.99.999'
}


# =============================================================
# Danske tegn
# =============================================================

$ae = [char]0x00E6
$oe = [char]0x00F8
$aa = [char]0x00E5
$STORT_AA = [char]0x00C5   # PowerShell skelner ikke store og smaa bogstaver i variabelnavne

$RAADGIVER = "R${aa}dgiver"
$HOERING   = "H${oe}ring"
$UDFOERT   = "Opgave udf${oe}rt"


# =============================================================
# Testdata
# =============================================================

$FOERSTE_SERIAL = 900001
$SIDSTE_SERIAL  = 900005
$MAERKE         = 'TESTSAG'

function Get-Uuid { param([int]$Serial) "testsag-$Serial" }

$nu = Get-Date

# Ansvarlig: 'mig' = den indloggede bruger, $null = ledig.
$TESTSAGER = @(
    @{
        Serial = 900001; Status = 'Ny'; Aarsag = $null; Ansvarlig = $null; DageSiden = 1
        Adresser = @(
            @{ Adresse = "Skovvangsvej 112, 8200 Aarhus N"; Matrikel = "1234a Aarhus Markjorder"; Lok = '751-12345' }
        )
        Kontakter = @(
            @{ Type = 'Grundejer'; Udfylder = $true; Navn = "Mette S${oe}rensen"; Email = 'mette.sorensen@example.dk'; Telefon = '20 12 34 56' }
        )
    },
    @{
        Serial = 900002; Status = 'Ny'; Aarsag = $null; Ansvarlig = $null; DageSiden = 3
        Adresser = @(
            @{ Adresse = "Viby Ringvej 4, 8260 Viby J"; Matrikel = "56b Viby By, Viby"; Lok = '751-23456' },
            @{ Adresse = "Viby Ringvej 6, 8260 Viby J"; Matrikel = "56c Viby By, Viby"; Lok = '751-23457' }
        )
        Kontakter = @(
            @{ Type = 'Grundejer'; Udfylder = $false; Navn = 'Jens Hansen'; Email = 'jens.hansen@example.dk'; Telefon = '30 45 67 89' },
            @{ Type = $RAADGIVER; Udfylder = $true; Navn = 'Line Krogh'; Firma = 'Jordteknik ApS'; Email = 'lk@jordteknik.example.dk'; Telefon = '86 12 00 00' }
        )
    },
    @{
        Serial = 900003; Status = 'Under behandling'; Aarsag = $null; Ansvarlig = 'mig'; DageSiden = 8
        Adresser = @(
            @{ Adresse = "Gren${aa}vej 155, 8240 Risskov"; Matrikel = "12ab Risskov By, ${STORT_AA}by"; Lok = '751-34567' }
        )
        Kontakter = @(
            @{ Type = 'Grundejer'; Udfylder = $true; Navn = "S${oe}ren Mikkelsen"; Email = 'soren.m@example.dk'; Telefon = '40 11 22 33' },
            @{ Type = 'Bygherre'; Udfylder = $false; Navn = 'Anna Holm'; Firma = 'Holm Byg A/S'; Email = 'anna@holmbyg.example.dk'; Telefon = '87 65 43 21' }
        )
    },
    @{
        Serial = 900004; Status = 'Afventer'; Aarsag = $HOERING; Ansvarlig = 'mig'; DageSiden = 15
        Adresser = @(
            @{ Adresse = "Silkeborgvej 260, 8230 ${STORT_AA}byh${oe}j"; Matrikel = "7d ${STORT_AA}byh${oe}j By"; Lok = '751-45678' }
        )
        Kontakter = @(
            @{ Type = 'Grundejer'; Udfylder = $true; Navn = 'Peter Lund'; Email = 'peter.lund@example.dk'; Telefon = '25 66 77 88' }
        )
    },
    @{
        Serial = 900005; Status = 'Afgjort'; Aarsag = $null; Ansvarlig = 'mig'; DageSiden = 32
        Adresser = @(
            @{ Adresse = "Randersvej 300, 8200 Aarhus N"; Matrikel = "88 Vejlby By, Vejlby"; Lok = '751-56789' }
        )
        Kontakter = @(
            @{ Type = 'Grundejer'; Udfylder = $false; Navn = 'Karen Ebbesen'; Email = 'karen.e@example.dk'; Telefon = '61 23 45 67' },
            @{ Type = 'Bygherre'; Udfylder = $true; Navn = 'Michael Dahl'; Firma = 'Dahl Entreprise'; Email = 'md@dahl.example.dk'; Telefon = '70 20 30 40' }
        )
    }
)


# =============================================================
# Hjaelpefunktioner
# =============================================================

function Write-Trin  { param([string]$Tekst) Write-Host "`n$Tekst" -ForegroundColor Cyan }
function Write-Ny    { param([string]$Tekst) Write-Host "    + $Tekst" -ForegroundColor Green }
function Write-Har   { param([string]$Tekst) Write-Host "    = $Tekst" -ForegroundColor DarkGray }
function Write-Slet  { param([string]$Tekst) Write-Host "    - $Tekst" -ForegroundColor Yellow }

function Get-Elementer {
    <#  Elementer i en liste, hvor et felt har en bestemt vaerdi.  #>
    param([string]$Liste, [string]$Felt, [string]$Type, [string]$Vaerdi)
    $caml = "<View><Query><Where><Eq><FieldRef Name='$Felt'/><Value Type='$Type'>$Vaerdi</Value></Eq></Where></Query></View>"
    @(Get-PnPListItem -List $Liste -Query $caml)
}

function Get-Testsager {
    $caml = "<View><Query><Where><And>" +
            "<Geq><FieldRef Name='SubmissionSerial'/><Value Type='Number'>$FOERSTE_SERIAL</Value></Geq>" +
            "<Leq><FieldRef Name='SubmissionSerial'/><Value Type='Number'>$SIDSTE_SERIAL</Value></Leq>" +
            "</And></Where></Query></View>"
    # Dobbelt sikring: kun raekker der ogsaa har testmaerket i UUID'en slettes.
    @(Get-PnPListItem -List 'P8Ansogninger' -Query $caml) |
        Where-Object { "$($_['SubmissionUUID'])" -like 'testsag-*' }
}

# Felterne paa sitet kan afvige fra Opret-SharePointLister.ps1 (fx mangler
# opslagskolonnen 'Ansogning' paa nogle lister). Vaerdier til felter, der ikke
# findes, springes over med en advarsel i stedet for at stoppe scriptet.
$feltCache = @{}
$advaret = @{}

function Add-Raekke {
    param([string]$Liste, [hashtable]$Vaerdier)
    if (-not $feltCache.ContainsKey($Liste)) {
        $feltCache[$Liste] = @(Get-PnPField -List $Liste | ForEach-Object { $_.InternalName })
    }
    $gyldige = @{}
    foreach ($navn in $Vaerdier.Keys) {
        if ($feltCache[$Liste] -contains $navn) {
            $gyldige[$navn] = $Vaerdier[$navn]
        } elseif (-not $advaret.ContainsKey("$Liste|$navn")) {
            $advaret["$Liste|$navn"] = $true
            Write-Host "    ! $Liste har ingen kolonne '$navn' - springes over" -ForegroundColor Yellow
        }
    }
    Add-PnPListItem -List $Liste -Values $gyldige
}

function Add-Log {
    param([int]$SagId, [string]$Handling, [string]$Titel, [string]$Kommentar, [string]$Fra, [string]$Til)
    $v = @{ Title = $Titel; SagId = $SagId; Handling = $Handling }
    if ($Kommentar) { $v.Kommentar = $Kommentar }
    if ($Fra) { $v.FraStatus = $Fra }
    if ($Til) { $v.TilStatus = $Til }
    Add-Raekke -Liste 'P8Log' -Vaerdier $v | Out-Null
}


# =============================================================
# Koersel
# =============================================================

Write-Host "Forbinder til $SiteUrl ..." -ForegroundColor Cyan
try {
    Connect-PnPOnline -Url $SiteUrl -UseWebLogin -ErrorAction Stop
} catch {
    Write-Host "FEJL ved forbindelse: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($Fjern) {
    Write-Trin 'Fjerner testsager'
    $sager = Get-Testsager
    if (-not $sager) { Write-Har 'Ingen testsager fundet.'; return }

    foreach ($sag in $sager) {
        $uuid = "$($sag['SubmissionUUID'])"
        Write-Host "  [$($sag['SubmissionSerial'])] $($sag['Title'])"

        foreach ($liste in 'P8Adresser', 'P8Kontakter', 'P8Vedhaeftninger') {
            foreach ($el in (Get-Elementer -Liste $liste -Felt 'SubmissionUUID' -Type 'Text' -Vaerdi $uuid)) {
                Remove-PnPListItem -List $liste -Identity $el.Id -Force
                Write-Slet "$liste #$($el.Id)"
            }
        }
        # Ogsaa det, man selv har lagt paa sagen under afproevningen.
        foreach ($liste in 'P8Log', 'P8Noter', 'P8Opgaver', 'P8Links', 'P8Dokumenter') {
            foreach ($el in (Get-Elementer -Liste $liste -Felt 'SagId' -Type 'Number' -Vaerdi $sag.Id)) {
                Remove-PnPListItem -List $liste -Identity $el.Id -Force
                Write-Slet "$liste #$($el.Id)"
            }
        }
        Remove-PnPListItem -List 'P8Ansogninger' -Identity $sag.Id -Force
        Write-Slet "P8Ansogninger #$($sag.Id)"
    }
    Write-Host "`nTestsagerne er fjernet." -ForegroundColor Green
    return
}

# Den indloggede bruger bliver ansvarlig paa nogle sager, saa 'Mine sager' har indhold.
$web = Get-PnPWeb
$mig = Get-PnPProperty -ClientObject $web -Property CurrentUser
Write-Host "Logget ind som $($mig.Title) ($($mig.Email))"

Write-Trin 'Opretter testsager'
$eksisterende = @(Get-Testsager | ForEach-Object { [int]$_['SubmissionSerial'] })

foreach ($t in $TESTSAGER) {
    $uuid = Get-Uuid $t.Serial
    $titel = "[TEST] $($t.Adresser[0].Adresse)"
    if ($eksisterende -contains $t.Serial) {
        Write-Har "[$($t.Serial)] findes allerede - springes over"
        continue
    }

    $modtaget = $nu.AddDays(-$t.DageSiden).Date.AddHours(9).AddMinutes(17 * $t.DageSiden % 60)
    $udfylder = $t.Kontakter | Where-Object { $_.Udfylder } | Select-Object -First 1
    $grundejere = ($t.Kontakter | Where-Object { $_.Type -eq 'Grundejer' } | ForEach-Object { $_.Navn }) -join ', '

    $vaerdier = @{
        Title                     = $titel
        SubmissionUUID            = $uuid
        SubmissionSerial          = $t.Serial
        SubmissionSid             = $t.Serial
        Udfylder                  = $udfylder.Navn
        IndsendtAf                = $udfylder.Type
        AnsogningsDato            = $modtaget.Date
        ModtagetDato              = $modtaget
        Bemaerkninger             = "$MAERKE - oprettet af scripts/Opret-Testsager.ps1 til afpr${oe}vning. Kan slettes med -Fjern."
        FlereGrundejere           = (@($t.Kontakter | Where-Object { $_.Type -eq 'Grundejer' }).Count -gt 1)
        BygherreSammeSomGrundejer = -not ($t.Kontakter | Where-Object { $_.Type -eq 'Bygherre' })
        Status                    = $t.Status
        AntalAdresser             = $t.Adresser.Count
        AntalKontakter            = $t.Kontakter.Count
        AntalVedhaeftninger       = 0
        AdresserTekst             = ($t.Adresser | ForEach-Object { $_.Adresse }) -join "`n"
        Grundejere                = $grundejere
    }
    if ($t.Aarsag) { $vaerdier.AfventerAarsag = $t.Aarsag }
    if ($t.Ansvarlig -eq 'mig') { $vaerdier.Ansvarlig = $mig.LoginName }
    if ($t.Status -eq 'Afgjort') { $vaerdier.AfsluttetDato = $nu.AddDays(-2) }

    $sag = Add-Raekke -Liste 'P8Ansogninger' -Vaerdier $vaerdier
    Write-Ny "[$($t.Serial)] $titel ($($t.Status)) -> #$($sag.Id)"

    foreach ($a in $t.Adresser) {
        Add-Raekke -Liste 'P8Adresser' -Vaerdier @{
            Title = $a.Adresse; Ansogning = $sag.Id; SubmissionUUID = $uuid
            Adresse = $a.Adresse; Matrikel = $a.Matrikel; LokalitetsNummer = $a.Lok
        } | Out-Null
    }
    foreach ($k in $t.Kontakter) {
        $kv = @{
            Title = $k.Navn; Ansogning = $sag.Id; SubmissionUUID = $uuid
            KontaktType = $k.Type; ErUdfylder = [bool]$k.Udfylder
            Navn = $k.Navn; Email = $k.Email; Telefon = $k.Telefon
        }
        if ($k.Firma) { $kv.Firma = $k.Firma }
        Add-Raekke -Liste 'P8Kontakter' -Vaerdier $kv | Out-Null
    }

    # Lidt historik og opgaver paa de sager, der er i gang, saa panelerne ikke er tomme.
    if ($t.Ansvarlig -eq 'mig') {
        Add-Log -SagId $sag.Id -Handling 'Sag taget' -Titel 'Sag taget'
    }
    if ($t.Status -ne 'Ny') {
        Add-Log -SagId $sag.Id -Handling 'Statusskift' -Titel "Ny -> $($t.Status)" -Fra 'Ny' -Til $t.Status
        Add-Log -SagId $sag.Id -Handling 'Kommentar' -Titel 'Testkommentar' `
            -Kommentar "Grundejer er kontaktet. Afventer svar p${aa} jordpr${oe}ver."
        Add-Raekke -Liste 'P8Opgaver' -Vaerdier @{ Title = "Tjek kortl${ae}gning"; SagId = $sag.Id; Udfoert = $true } | Out-Null
        Add-Raekke -Liste 'P8Opgaver' -Vaerdier @{ Title = "Send afg${oe}relse"; SagId = $sag.Id; Udfoert = ($t.Status -eq 'Afgjort') } | Out-Null
        Add-Log -SagId $sag.Id -Handling 'Opgave oprettet' -Titel 'Opgaver oprettet'
        if ($t.Status -eq 'Afgjort') {
            Add-Log -SagId $sag.Id -Handling $UDFOERT -Titel "Send afg${oe}relse"
        }
    }
}

Write-Host "`nF${ae}rdig. ${STORT_AA}bn Jordportalen og opdater siden." -ForegroundColor Green
Write-Host 'Fjern testsagerne igen med: .\scripts\Opret-Testsager.ps1 -Fjern' -ForegroundColor Cyan
