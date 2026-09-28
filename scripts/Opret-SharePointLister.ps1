<#
.SYNOPSIS
    Opretter Jordportalens ni SharePoint-lister med korrekte kolonnetyper.

.DESCRIPTION
    Svarer en-til-en til SHAREPOINT-LISTER.md. Scriptet er idempotent: det tjekker
    om hver liste og hver kolonne findes, foer den oprettes, saa det kan koeres igen
    uden at lave dubletter.

    HVORFOR SCRIPT OG IKKE CSV-IMPORT
    SharePoint gaetter kolonnetyper ud fra data ved CSV-import, og gaetter tekst
    naesten hver gang. Valg-, Person-, Opslags- og Hyperlink-kolonner bliver
    forkerte, og en tekstkolonne kan ikke konverteres til Person eller Opslag
    bagefter - den skal slettes og oprettes igen, hvorved det interne navn bliver
    fx 'Ansvarlig0'. Det interne navn er laast fra oprettelsen.

    OM DANSKE TEGN
    Denne fil er bevidst ren ASCII. Windows PowerShell 5.1 laeser .ps1-filer som
    ANSI med mindre de har et UTF-8 BOM, saa et 'aa' skrevet direkte i filen kan
    blive laest som to forkerte tegn - og saa er det DEN vaerdi der havner i
    SharePoint, uden at noget fejler. Derfor bygges alle danske vaerdier af
    Unicode-kodepunkter nedenfor, og scriptet kontrollerer bagefter at de faktisk
    kom rigtigt frem.

.PARAMETER SiteUrl
    URL til SharePoint-sitet.

.PARAMETER Lister
    Opret kun disse lister. Udelades: opret alle ni.
    Brug den til at teste en liste foerst.

.PARAMETER Kontroller
    Opret intet - kontroller kun de lister der allerede findes: interne navne og
    danske tegn i valgmuligheder.

.EXAMPLE
    # Test med en liste foerst
    .\Opret-SharePointLister.ps1 -SiteUrl "https://aarhuskommune.sharepoint.com/teams/Jordportalen" -Lister P8Opgaver

.EXAMPLE
    # Opret dem alle
    .\Opret-SharePointLister.ps1 -SiteUrl "https://aarhuskommune.sharepoint.com/teams/Jordportalen"

.EXAMPLE
    # Kontroller bagefter
    .\Opret-SharePointLister.ps1 -SiteUrl "https://..." -Kontroller

.NOTES
    Kraever PnP PowerShell:  Install-Module PnP.PowerShell -Scope CurrentUser
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [ValidateSet('P8Ansogninger', 'P8Adresser', 'P8Kontakter', 'P8Vedhaeftninger',
                 'P8Log', 'P8Noter', 'P8Opgaver', 'P8Links', 'P8Dokumenter')]
    [string[]]$Lister,

    [switch]$Kontroller
)

$ErrorActionPreference = 'Stop'


# =============================================================
# Danske tegn
# =============================================================
# Bygget af kodepunkter, saa filens egen encoding ikke kan oedelaegge dem.
# Vaerdierne SKAL matche dem robotten skriver i src/mapper.py byte for byte -
# ellers opretter SharePoint en raekke med en valgmulighed der ikke findes.

$AE = [char]0x00E6   # ae
$OE = [char]0x00F8   # oe
$AA = [char]0x00E5   # aa

$RAADGIVER = "R${AA}dgiver"        # Raadgiver
$HOERING   = "H${OE}ring"          # Hoering
$UDFOERT   = "Opgave udf${OE}rt"   # Opgave udfoert
$TILFOEJET = "Link tilf${OE}jet"   # Link tilfoejet

# Raekkefoelgen betyder noget: P8Ansogninger skal findes, foer detaljelisterne kan
# faa deres opslagskolonne.
$ALLE_LISTER = @('P8Ansogninger', 'P8Adresser', 'P8Kontakter', 'P8Vedhaeftninger',
                 'P8Log', 'P8Noter', 'P8Opgaver', 'P8Links', 'P8Dokumenter')

$valgte = if ($Lister) { $ALLE_LISTER | Where-Object { $_ -in $Lister } } else { $ALLE_LISTER }


# =============================================================
# Hjaelpefunktioner
# =============================================================

function Write-Trin  { param([string]$Tekst) Write-Host "`n$Tekst" -ForegroundColor Cyan }
function Write-Ny    { param([string]$Tekst) Write-Host "    + $Tekst" -ForegroundColor Green }
function Write-Har   { param([string]$Tekst) Write-Host "    = $Tekst" -ForegroundColor DarkGray }
function Write-Advar { param([string]$Tekst) Write-Host "    ! $Tekst" -ForegroundColor Yellow }

function Confirm-Liste {
    <#  Opretter listen hvis den mangler. Returnerer $true hvis den er ny.  #>
    param(
        [string]$Navn,
        [ValidateSet('GenericList', 'DocumentLibrary')]
        [string]$Skabelon = 'GenericList'
    )

    if (Get-PnPList -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Har 'Listen findes'
        return $false
    }

    New-PnPList -Title $Navn -Template $Skabelon -OnQuickLaunch | Out-Null
    Write-Ny "Listen oprettet ($Skabelon)"
    return $true
}

function Add-Kolonne {
    <#
        Opretter en kolonne hvis den mangler, med de indstillinger typen kraever.

        InternalName saettes eksplicit lig DisplayName. Goer man ikke det, udleder
        SharePoint det selv, koder specialtegn om og afkorter ved 32 tegn.
    #>
    param(
        [Parameter(Mandatory)][string]$Liste,
        [Parameter(Mandatory)][string]$Navn,
        [Parameter(Mandatory)]
        [ValidateSet('Text', 'Note', 'Number', 'Boolean', 'DateTime', 'URL', 'User', 'UserMulti', 'Choice')]
        [string]$Type,

        [string[]]$Valgmuligheder,
        [switch]$MedKlokkeslaet,
        [switch]$Indekseret,
        [object]$Standard
    )

    if (Get-PnPField -List $Liste -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Har $Navn
        return
    }

    switch ($Type) {
        'UserMulti' {
            # Flervalgs-personfelt kan ikke oprettes med Add-PnPField - det kraever
            # Mult='TRUE' i felt-XML'en.
            $xml = "<Field Type='UserMulti' DisplayName='$Navn' Name='$Navn' StaticName='$Navn' " +
                   "Mult='TRUE' UserSelectionMode='PeopleOnly' />"
            Add-PnPFieldFromXml -List $Liste -FieldXml $xml | Out-Null
        }
        'User' {
            $xml = "<Field Type='User' DisplayName='$Navn' Name='$Navn' StaticName='$Navn' " +
                   "UserSelectionMode='PeopleOnly' />"
            Add-PnPFieldFromXml -List $Liste -FieldXml $xml | Out-Null
        }
        'Choice' {
            # Add-PnPField i PnP.PowerShell 1.x har ingen -Choices-parameter, saa
            # valgmulighederne maa angives i felt-XML'en. Det virker ogsaa i 2.x og 3.x.
            $valgXml = ($Valgmuligheder | ForEach-Object { "<CHOICE>$_</CHOICE>" }) -join ''
            $standardXml = if ($null -ne $Standard) { "<Default>$Standard</Default>" } else { '' }
            $xml = "<Field Type='Choice' DisplayName='$Navn' Name='$Navn' StaticName='$Navn' " +
                   "Format='Dropdown'><CHOICES>$valgXml</CHOICES>$standardXml</Field>"
            Add-PnPFieldFromXml -List $Liste -FieldXml $xml | Out-Null
        }
        default {
            Add-PnPField -List $Liste -DisplayName $Navn -InternalName $Navn -Type $Type `
                         -AddToDefaultView | Out-Null
        }
    }

    $vaerdier = @{}

    if ($Type -eq 'Note') {
        # Rig tekst wrapper indholdet i <div class="ExternalClass...">, som koden
        # saa skal rydde op i ved hver laesning.
        $vaerdier['RichText'] = $false
    }
    if ($Type -eq 'Number')   { $vaerdier['Decimals'] = 0 }
    if ($Type -eq 'DateTime') { $vaerdier['DisplayFormat'] = if ($MedKlokkeslaet) { 1 } else { 0 } }
    if ($Type -eq 'URL')      { $vaerdier['DisplayFormat'] = 0 }   # 0 = Hyperlink, 1 = Billede
    if ($Indekseret)          { $vaerdier['Indexed'] = $true }
    # Standardvaerdien for Choice er allerede sat i XML'en ovenfor.
    if ($null -ne $Standard -and $Type -ne 'Choice') { $vaerdier['DefaultValue'] = [string]$Standard }

    if ($vaerdier.Count -gt 0) {
        Set-PnPField -List $Liste -Identity $Navn -Values $vaerdier | Out-Null
    }

    $noter = @()
    if ($Indekseret)      { $noter += 'indekseret' }
    if ($Type -eq 'Note') { $noter += 'ren tekst' }
    $suffix = if ($noter) { "  ($($noter -join ', '))" } else { '' }
    Write-Ny "$Navn [$Type]$suffix"
}

function Add-Opslag {
    <#  Opslagskolonne til P8Ansogninger.  #>
    param(
        [Parameter(Mandatory)][string]$Liste,
        [Parameter(Mandatory)][string]$Navn
    )

    if (Get-PnPField -List $Liste -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Har $Navn
        return
    }

    $maalId = (Get-PnPList -Identity 'P8Ansogninger').Id
    Add-PnPField -List $Liste -DisplayName $Navn -InternalName $Navn -Type Lookup -AddToDefaultView | Out-Null
    Set-PnPField -List $Liste -Identity $Navn -Values @{
        LookupList  = $maalId.ToString()
        LookupField = 'Title'
    } | Out-Null
    Write-Ny "$Navn [Lookup -> P8Ansogninger.Title]"
}


# =============================================================
# Kontroller
# =============================================================

function Test-InterneNavne {
    <#
        Kontrollerer at hvert internt navn er identisk med visningsnavnet.

        Det er det vigtigste punkt, fordi en uoverensstemmelse ikke giver nogen
        fejl - koden skriver bare til en kolonne som visningen ikke viser.
    #>
    param([string[]]$Lister)

    $problemer = 0
    $indbyggede = @('Title', 'Created', 'Modified', 'Author', 'Editor', 'FileLeafRef', 'Attachments')

    foreach ($navn in $Lister) {
        if (-not (Get-PnPList -Identity $navn -ErrorAction SilentlyContinue)) {
            Write-Advar "$navn findes ikke - springes over"
            continue
        }

        $felter = Get-PnPField -List $navn |
            Where-Object { -not $_.Hidden -and -not $_.ReadOnlyField -and $_.InternalName -notin $indbyggede }

        foreach ($felt in $felter) {
            if ($felt.Title -eq $felt.InternalName) { continue }
            $problemer++
            Write-Advar "$navn : $($felt.Title)  ->  $($felt.InternalName)"
        }
    }

    return $problemer
}

function Test-DanskeTegn {
    <#
        Laeser valgmulighederne tilbage fra SharePoint og kontrollerer at de danske
        tegn overlevede.

        Encoding-fejl i et PowerShell-script fejler ikke - de skriver bare forkerte
        tegn. Derfor laeses vaerdierne tilbage og sammenlignes med det forventede.
    #>
    $forventet = @{
        'P8Ansogninger|IndsendtAf'     = @('Grundejer', 'Bygherre', $RAADGIVER)
        'P8Ansogninger|AfventerAarsag' = @('Materiale', $HOERING, 'Vurderingssvar')
        'P8Kontakter|KontaktType'      = @('Grundejer', 'Bygherre', $RAADGIVER)
    }

    $problemer = 0

    foreach ($noegle in $forventet.Keys) {
        $listeNavn, $feltNavn = $noegle -split '\|'

        if (-not (Get-PnPList -Identity $listeNavn -ErrorAction SilentlyContinue)) { continue }
        $felt = Get-PnPField -List $listeNavn -Identity $feltNavn -ErrorAction SilentlyContinue
        if (-not $felt) { continue }

        $faktiske = $felt.Choices
        foreach ($vaerdi in $forventet[$noegle]) {
            if ($faktiske -notcontains $vaerdi) {
                $problemer++
                Write-Advar "$listeNavn.$feltNavn mangler '$vaerdi'. Fandt: $($faktiske -join ', ')"
            }
        }
    }

    return $problemer
}


# =============================================================
# Listedefinitioner
# =============================================================

function New-P8Ansogninger {
    Confirm-Liste -Navn 'P8Ansogninger' | Out-Null
    $l = 'P8Ansogninger'

    # Fra OS2Forms - skrives af robotten ved oprettelse
    Add-Kolonne -Liste $l -Navn 'SubmissionUUID'   -Type Text     -Indekseret
    Add-Kolonne -Liste $l -Navn 'SubmissionSerial' -Type Number
    Add-Kolonne -Liste $l -Navn 'SubmissionSid'    -Type Number
    Add-Kolonne -Liste $l -Navn 'OS2FormsUrl'      -Type URL
    Add-Kolonne -Liste $l -Navn 'Udfylder'         -Type Text
    Add-Kolonne -Liste $l -Navn 'IndsendtAf'       -Type Choice -Valgmuligheder 'Grundejer', 'Bygherre', $RAADGIVER
    Add-Kolonne -Liste $l -Navn 'AnsogningsDato'   -Type DateTime
    Add-Kolonne -Liste $l -Navn 'Bemaerkninger'    -Type Note
    Add-Kolonne -Liste $l -Navn 'ModtagetDato'     -Type DateTime -MedKlokkeslaet
    Add-Kolonne -Liste $l -Navn 'AfsluttetDato'    -Type DateTime -MedKlokkeslaet
    Add-Kolonne -Liste $l -Navn 'FlereGrundejere'  -Type Boolean -Standard 0
    Add-Kolonne -Liste $l -Navn 'BygherreSammeSomGrundejer' -Type Boolean -Standard 0
    Add-Kolonne -Liste $l -Navn 'AntalAdresser'       -Type Number -Standard 0
    Add-Kolonne -Liste $l -Navn 'AntalKontakter'      -Type Number -Standard 0
    Add-Kolonne -Liste $l -Navn 'AntalVedhaeftninger' -Type Number -Standard 0
    Add-Kolonne -Liste $l -Navn 'AdresserTekst'    -Type Note
    Add-Kolonne -Liste $l -Navn 'Grundejere'       -Type Note

    # Sagsbehandling - skrives af Jordportalen. Robotten roerer dem aldrig.
    Add-Kolonne -Liste $l -Navn 'Status'         -Type Choice -Indekseret -Standard 'Ny' `
                -Valgmuligheder 'Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist'
    Add-Kolonne -Liste $l -Navn 'AfventerAarsag' -Type Choice `
                -Valgmuligheder 'Materiale', $HOERING, 'Vurderingssvar'
    Add-Kolonne -Liste $l -Navn 'Ansvarlig'      -Type User -Indekseret
}

function New-P8Adresser {
    Confirm-Liste -Navn 'P8Adresser' | Out-Null
    $l = 'P8Adresser'
    Add-Opslag  -Liste $l -Navn 'Ansogning'
    Add-Kolonne -Liste $l -Navn 'SubmissionUUID'   -Type Text -Indekseret
    Add-Kolonne -Liste $l -Navn 'Adresse'          -Type Text
    Add-Kolonne -Liste $l -Navn 'Matrikel'         -Type Text
    Add-Kolonne -Liste $l -Navn 'LokalitetsNummer' -Type Text
}

function New-P8Kontakter {
    Confirm-Liste -Navn 'P8Kontakter' | Out-Null
    $l = 'P8Kontakter'
    Add-Opslag  -Liste $l -Navn 'Ansogning'
    Add-Kolonne -Liste $l -Navn 'SubmissionUUID' -Type Text -Indekseret
    Add-Kolonne -Liste $l -Navn 'KontaktType'    -Type Choice -Valgmuligheder 'Grundejer', 'Bygherre', $RAADGIVER
    Add-Kolonne -Liste $l -Navn 'ErUdfylder'     -Type Boolean -Standard 0
    Add-Kolonne -Liste $l -Navn 'Navn'           -Type Text
    Add-Kolonne -Liste $l -Navn 'Firma'          -Type Text
    Add-Kolonne -Liste $l -Navn 'CVR'            -Type Text
    Add-Kolonne -Liste $l -Navn 'Email'          -Type Text
    Add-Kolonne -Liste $l -Navn 'Telefon'        -Type Text
    Add-Kolonne -Liste $l -Navn 'Adresse'        -Type Text
}

function New-P8Vedhaeftninger {
    Confirm-Liste -Navn 'P8Vedhaeftninger' | Out-Null
    $l = 'P8Vedhaeftninger'
    Add-Opslag  -Liste $l -Navn 'Ansogning'
    Add-Kolonne -Liste $l -Navn 'SubmissionUUID' -Type Text -Indekseret
    Add-Kolonne -Liste $l -Navn 'FilId'          -Type Text
    Add-Kolonne -Liste $l -Navn 'Filnavn'        -Type Text
    Add-Kolonne -Liste $l -Navn 'FilUrl'         -Type URL
}

function New-P8Log {
    Confirm-Liste -Navn 'P8Log' | Out-Null
    $l = 'P8Log'
    Add-Kolonne -Liste $l -Navn 'SagId'     -Type Number -Indekseret
    Add-Kolonne -Liste $l -Navn 'Handling'  -Type Choice -Valgmuligheder `
                'Statusskift', 'Kommentar', 'Sag taget', 'Sag frigivet',
                'Opgave oprettet', $UDFOERT, 'Dokument uploadet', $TILFOEJET
    Add-Kolonne -Liste $l -Navn 'FraStatus' -Type Text
    Add-Kolonne -Liste $l -Navn 'TilStatus' -Type Text
    Add-Kolonne -Liste $l -Navn 'Kommentar' -Type Note
    # Power Automate-flowet lytter paa denne kolonne.
    Add-Kolonne -Liste $l -Navn 'TaggedeBrugere' -Type UserMulti
}

function New-P8Noter {
    Confirm-Liste -Navn 'P8Noter' | Out-Null
    Add-Kolonne -Liste 'P8Noter' -Navn 'SagId' -Type Number -Indekseret
    Add-Kolonne -Liste 'P8Noter' -Navn 'Tekst' -Type Note
}

function New-P8Opgaver {
    Confirm-Liste -Navn 'P8Opgaver' | Out-Null
    Add-Kolonne -Liste 'P8Opgaver' -Navn 'SagId'   -Type Number -Indekseret
    Add-Kolonne -Liste 'P8Opgaver' -Navn 'Udfoert' -Type Boolean -Standard 0
}

function New-P8Links {
    Confirm-Liste -Navn 'P8Links' | Out-Null
    Add-Kolonne -Liste 'P8Links' -Navn 'SagId' -Type Number -Indekseret
    Add-Kolonne -Liste 'P8Links' -Navn 'Url'   -Type URL
}

function New-P8Dokumenter {
    $erNy = Confirm-Liste -Navn 'P8Dokumenter' -Skabelon DocumentLibrary
    Add-Kolonne -Liste 'P8Dokumenter' -Navn 'SagId' -Type Number -Indekseret

    # Versionering er hele grunden til at bruge et bibliotek frem for
    # vedhaeftninger paa list-elementet.
    Set-PnPList -Identity 'P8Dokumenter' -EnableVersioning $true | Out-Null
    if ($erNy) { Write-Ny 'Versionering slaaet til' } else { Write-Har 'Versionering' }
}


# =============================================================
# Koersel
# =============================================================

Write-Host "Forbinder til $SiteUrl ..." -ForegroundColor Cyan

# PnP PowerShell 1.x bruger Microsofts faelles app 'PnP Management Shell'
# (31359c7f-bd7e-475c-86db-fdb8c937548e) ved -Interactive. Den er ikke godkendt i
# Aarhus Kommunes tenant og giver AADSTS700016. -UseWebLogin gaar uden om det ved at
# bruge browserens eksisterende SharePoint-cookie og kraever ingen app-registrering.
try {
    Connect-PnPOnline -Url $SiteUrl -UseWebLogin -ErrorAction Stop
    Write-Host 'Forbundet (UseWebLogin).' -ForegroundColor Green
} catch {
    Write-Advar "UseWebLogin fejlede: $($_.Exception.Message)"
    Write-Advar 'Proever -Interactive. Fejler den med AADSTS700016, mangler appen godkendelse i tenanten.'
    Connect-PnPOnline -Url $SiteUrl -Interactive
    Write-Host 'Forbundet (Interactive).' -ForegroundColor Green
}

# Tidszonen skal staa til dansk tid, ellers vises datoer naer midnat en dag for
# tidligt. Fejlen er tavs, saa den tjekkes her frem for at blive opdaget senere.
$web = Get-PnPWeb -Includes RegionalSettings.TimeZone
$tz = $web.RegionalSettings.TimeZone.Description
Write-Host "Sitets tidszone: $tz"
if ($tz -notmatch 'Copenhagen|Brussels|Bruxelles|Madrid|Paris') {
    Write-Advar 'Tidszonen ser ikke dansk ud. Datoer naer midnat vil blive vist en dag for tidligt.'
    Write-Advar 'Ret den under Webstedsindstillinger -> Regionale indstillinger.'
}

if (-not $Kontroller) {
    $kraeverOpslag = @('P8Adresser', 'P8Kontakter', 'P8Vedhaeftninger')
    if (($valgte | Where-Object { $_ -in $kraeverOpslag }) -and
        ($valgte -notcontains 'P8Ansogninger') -and
        -not (Get-PnPList -Identity 'P8Ansogninger' -ErrorAction SilentlyContinue)) {
        throw 'P8Ansogninger skal oprettes foerst - de valgte lister har en opslagskolonne til den.'
    }

    $i = 0
    foreach ($navn in $valgte) {
        $i++
        Write-Trin "[$i/$($valgte.Count)] $navn"
        & "New-$navn"
    }
}

Write-Trin 'Kontrollerer interne navne'
$navneProblemer = Test-InterneNavne -Lister $valgte
if ($navneProblemer -eq 0) { Write-Host '    Alle interne navne matcher visningsnavnene.' -ForegroundColor Green }

Write-Trin 'Kontrollerer danske tegn i valgmuligheder'
$tegnProblemer = Test-DanskeTegn
if ($tegnProblemer -eq 0) { Write-Host '    Danske tegn er intakte.' -ForegroundColor Green }

Write-Host ''
if ($navneProblemer -eq 0 -and $tegnProblemer -eq 0) {
    Write-Host 'Faerdig uden problemer.' -ForegroundColor Green
} else {
    Write-Host "Faerdig med $($navneProblemer + $tegnProblemer) problem(er) - se advarslerne ovenfor." -ForegroundColor Red
    if ($navneProblemer -gt 0) {
        Write-Host 'Afvigende internt navn kan ikke rettes. Slet kolonnen og opret den igen.' -ForegroundColor Red
    }
    if ($tegnProblemer -gt 0) {
        Write-Host 'Forkerte tegn i valgmuligheder skyldes encoding. Ret valgmulighederne i listeindstillingerne.' -ForegroundColor Red
    }
}
