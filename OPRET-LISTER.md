# Oprettelse af SharePoint-listerne

Kommandoer til at oprette Jordportalens ni lister. Hver blok kan kopieres direkte ind i et
PowerShell-vindue.

Skemaet er beskrevet i [SHAREPOINT-LISTER.md](./SHAREPOINT-LISTER.md). Det samme findes som
et samlet script i [`scripts/Opret-SharePointLister.ps1`](./scripts/Opret-SharePointLister.ps1)
— brug det, hvis du hellere vil køre det hele på én gang. Denne fil er til, når du vil tage
det liste for liste, eller når kørselspolitikken forhindrer dig i at afvikle en `.ps1`.

---

## Om danske bogstaver

Kolonne- og listenavne indeholder **ingen** æ, ø eller å. Derfor er de stavet
`Bemaerkninger`, `AntalVedhaeftninger`, `Udfoert`, `AfventerAarsag` og `P8Ansogninger`.
Det er ikke pænt, men det er nødvendigt: SharePoint koder specialtegn om i det interne navn
(`ø` bliver til `_x00f8_`), og det interne navn er låst fra oprettelsen og kan ikke rettes
bagefter.

**Valgmulighederne** indeholder derimod danske tegn — `Rådgiver`, `Høring`. Det kan ikke
undgås: værdien kommer fra OS2Forms-blanketten, og robotten skriver den videre. Ændrer vi
den til `Raadgiver`, fejler robottens skrivning, fordi valgmuligheden ikke findes.

For at undgå at tegnene bliver ødelagt undervejs bygges de af Unicode-kodepunkter i stedet
for at blive skrevet direkte. Et `å` kopieret gennem en editor, en terminal eller en
mailklient kan blive til noget andet uden at noget fejler — og så er det den forkerte værdi,
der står i SharePoint. Kodepunkterne kan ikke ødelægges.

---

## Forberedelse

### 1. Installér PnP PowerShell

```powershell
Install-Module PnP.PowerShell -Scope CurrentUser
```

### 2. Forbind til sitet

```powershell
$site = "https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard"

# Cookie-baseret login. Kraever ingen app-registrering i tenanten.
try {
    Connect-PnPOnline -Url $site -UseWebLogin -ErrorAction Stop
    Write-Host "Forbundet." -ForegroundColor Green
} catch {
    Write-Host "UseWebLogin fejlede, proever Interactive..." -ForegroundColor Yellow
    Connect-PnPOnline -Url $site -Interactive
}
```

**Brug `-UseWebLogin`, ikke `-Interactive`.** Med PnP PowerShell 1.x forsøger `-Interactive`
at bruge Microsofts fælles app "PnP Management Shell"
(`31359c7f-bd7e-475c-86db-fdb8c937548e`). Den app er ikke godkendt i Aarhus Kommunes tenant,
så den giver:

```
AADSTS700016: Application with identifier '31359c7f-...' was not found in the directory
```

Det er ikke en fejl i scriptet, og det kan ikke løses ved at prøve igen — appen findes
simpelthen ikke i tenanten. `-UseWebLogin` går uden om hele problemet ved at bruge den
cookie, browseren allerede har fra SharePoint.

### Hvis login fejler

I Aarhus Kommunes tenant fejler **både** `-Interactive` og `-UseWebLogin`, hver på sin måde.
Her er hvad der sker, og hvad der kan gøres.

#### `-Interactive` giver AADSTS700016

```
AADSTS700016: Application with identifier '31359c7f-bd7e-475c-86db-fdb8c937548e'
was not found in the directory '7d66e379-7f94-41f8-a2ba-fc9740f2faa0'
```

PnP PowerShell 1.x bruger Microsofts fælles app "PnP Management Shell". Den er ikke godkendt
i tenanten, så den findes ikke. Det kan ikke løses ved at prøve igen.

#### `-UseWebLogin` sender dig til BrowserSupport.aspx

`-UseWebLogin` åbner et indlejret **Internet Explorer**-vindue. SharePoint Online
understøtter ikke længere IE og afviser med en scriptfejl og `_layouts/15/BrowserSupport.aspx`.
Metoden er reelt død i SharePoint Online.

#### Mulighederne, i den rækkefølge det er værd at prøve dem

**1. Device-login** — tager et halvt minut at afprøve:

```powershell
Connect-PnPOnline -Url $site -DeviceLogin
```

Bruger samme app og fejler formentlig på samme måde, men login-flowet er et andet, så det er
værd at udelukke.

**2. Certifikatet fra OpenOrchestrator.** Robotterne har allerede en app-registrering, der må
skrive i SharePoint — `SharePointAPI` (tenant og klient-id) og `SharePointCert` (thumbprint og
sti til certifikatet). Kan du få fat i dem, virker:

```powershell
Connect-PnPOnline -Url $site `
    -ClientId  "<klient-id fra SharePointAPI>" `
    -Tenant    "aarhuskommune.onmicrosoft.com" `
    -Thumbprint "<thumbprint fra SharePointCert>"
```

Certifikatet skal være installeret i maskinens certifikatlager. Ligger det som en `.pem`-fil,
brug `-CertificatePath` i stedet for `-Thumbprint`.

Vær opmærksom på, at appen skal have rettigheder til at **oprette lister**, ikke bare skrive
i dem. Er den sat op med `Sites.Selected`, kan den mangle adgang til netop dette site.

**3. Godkendelse fra en administrator.** Den rigtige løsning på længere sigt. Send dette link
til en global administrator — det godkender PnP-appen i tenanten én gang for alle:

```
https://login.microsoftonline.com/7d66e379-7f94-41f8-a2ba-fc9740f2faa0/adminconsent?client_id=31359c7f-bd7e-475c-86db-fdb8c937548e
```

Er du selv administrator, kan du i stedet køre:

```powershell
Register-PnPManagementShellAccess
```

**4. Opret listerne manuelt i browseren.** Følg [SHAREPOINT-LISTER.md](./SHAREPOINT-LISTER.md).
Ni lister og 52 kolonner tager omkring en time, men kræver ingen rettigheder ud over dem, du
allerede har på sitet — og resultatet er præcis det samme.

#### Hvad der *ikke* hjælper

**Opgradering til PnP.PowerShell 2.x eller 3.x.** De understøtter ikke Windows PowerShell 5.1,
så det kræver først en installation af PowerShell 7 — og de kræver stadig en egen
app-registrering. Opgraderingen løser altså ikke problemet, den flytter det.

### 3. Tjek sitets tidszone

SharePoint gemmer datoer i UTC. Står sitet ikke til dansk tid, vises ansøgningsdatoer nær
midnat **en dag for tidligt**. Fejlen er tavs, så tjek den nu:

```powershell
(Get-PnPWeb -Includes RegionalSettings.TimeZone).RegionalSettings.TimeZone.Description
```

Forventet: `(UTC+01:00) Brussels, Copenhagen, Madrid, Paris`.
Passer det ikke, ret det under **Webstedsindstillinger → Regionale indstillinger**, før du
opretter noget.

---

## Trin 0 — Indsæt hjælpefunktionerne

**Kør denne blok først.** Alle de følgende trin bruger den. Kommer du til at lukke
PowerShell-vinduet undervejs, skal du køre den igen sammen med `Connect-PnPOnline`.

```powershell
# Danske tegn bygges af kodepunkter, saa de ikke kan oedelaegges ved kopiering.
$AA = [char]0x00E5   # aa
$OE = [char]0x00F8   # oe

$RAADGIVER = "R${AA}dgiver"
$HOERING   = "H${OE}ring"
$UDFOERT   = "Opgave udf${OE}rt"
$TILFOEJET = "Link tilf${OE}jet"

function Add-Kolonne {
    param(
        [Parameter(Mandatory)][string]$Liste,
        [Parameter(Mandatory)][string]$Navn,
        [Parameter(Mandatory)]
        [ValidateSet('Text','Note','Number','Boolean','DateTime','URL','User','UserMulti','Choice')]
        [string]$Type,
        [string[]]$Valg,
        [switch]$MedKlokkeslaet,
        [switch]$Indekseret,
        [object]$Standard
    )

    if (Get-PnPField -List $Liste -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Host "    = $Navn" -ForegroundColor DarkGray
        return
    }

    # InternalName saettes eksplicit lig DisplayName. Uden det udleder SharePoint
    # selv navnet, koder specialtegn om og afkorter ved 32 tegn.
    switch ($Type) {
        'UserMulti' {
            Add-PnPFieldFromXml -List $Liste -FieldXml ("<Field Type='UserMulti' DisplayName='$Navn' " +
                "Name='$Navn' StaticName='$Navn' Mult='TRUE' UserSelectionMode='PeopleOnly' />") | Out-Null
        }
        'User' {
            Add-PnPFieldFromXml -List $Liste -FieldXml ("<Field Type='User' DisplayName='$Navn' " +
                "Name='$Navn' StaticName='$Navn' UserSelectionMode='PeopleOnly' />") | Out-Null
        }
        'Choice' {
            # Add-PnPField i PnP.PowerShell 1.x har ingen -Choices-parameter, saa
            # valgmulighederne maa angives i felt-XML'en. Virker ogsaa i 2.x og 3.x.
            $valgXml = ($Valg | ForEach-Object { "<CHOICE>$_</CHOICE>" }) -join ''
            $stdXml  = if ($null -ne $Standard) { "<Default>$Standard</Default>" } else { '' }
            Add-PnPFieldFromXml -List $Liste -FieldXml ("<Field Type='Choice' DisplayName='$Navn' " +
                "Name='$Navn' StaticName='$Navn' Format='Dropdown'><CHOICES>$valgXml</CHOICES>$stdXml</Field>") | Out-Null
        }
        default {
            Add-PnPField -List $Liste -DisplayName $Navn -InternalName $Navn -Type $Type `
                         -AddToDefaultView | Out-Null
        }
    }

    $v = @{}
    if ($Type -eq 'Note')     { $v['RichText'] = $false }          # undgaa HTML-wrapper
    if ($Type -eq 'Number')   { $v['Decimals'] = 0 }
    if ($Type -eq 'DateTime') { $v['DisplayFormat'] = if ($MedKlokkeslaet) { 1 } else { 0 } }
    if ($Type -eq 'URL')      { $v['DisplayFormat'] = 0 }          # 0 = Hyperlink, 1 = Billede
    if ($Indekseret)          { $v['Indexed'] = $true }
    # Standardvaerdien for Choice er allerede sat i XML'en ovenfor.
    if ($null -ne $Standard -and $Type -ne 'Choice') { $v['DefaultValue'] = [string]$Standard }
    if ($v.Count -gt 0) { Set-PnPField -List $Liste -Identity $Navn -Values $v | Out-Null }

    Write-Host "    + $Navn [$Type]" -ForegroundColor Green
}

function Add-Opslag {
    param([Parameter(Mandatory)][string]$Liste, [Parameter(Mandatory)][string]$Navn)

    if (Get-PnPField -List $Liste -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Host "    = $Navn" -ForegroundColor DarkGray
        return
    }
    $maal = (Get-PnPList -Identity 'P8Ansogninger').Id
    Add-PnPField -List $Liste -DisplayName $Navn -InternalName $Navn -Type Lookup -AddToDefaultView | Out-Null
    Set-PnPField -List $Liste -Identity $Navn -Values @{ LookupList = $maal.ToString(); LookupField = 'Title' } | Out-Null
    Write-Host "    + $Navn [Lookup]" -ForegroundColor Green
}

function New-Liste {
    param([string]$Navn, [ValidateSet('GenericList','DocumentLibrary')][string]$Skabelon = 'GenericList')

    if (Get-PnPList -Identity $Navn -ErrorAction SilentlyContinue) {
        Write-Host "$Navn - findes allerede" -ForegroundColor DarkYellow
        return
    }
    New-PnPList -Title $Navn -Template $Skabelon -OnQuickLaunch | Out-Null
    Write-Host "$Navn - oprettet" -ForegroundColor Cyan
}

Write-Host "Hjaelpefunktioner klar." -ForegroundColor Green
```

Alle blokke herunder er idempotente: kører du dem igen, springes det over, der allerede
findes, og der oprettes ingen dubletter.

---

## Trin 1 — Test med én liste

Start her. `P8Opgaver` har kun to kolonner, ingen opslag og ingen afhængigheder, så du får
testet forbindelse, rettigheder og navngivning uden risiko.

```powershell
New-Liste 'P8Opgaver'
Add-Kolonne -Liste 'P8Opgaver' -Navn 'SagId'   -Type Number -Indekseret
Add-Kolonne -Liste 'P8Opgaver' -Navn 'Udfoert' -Type Boolean -Standard 0
```

Kontrollér resultatet, før du går videre:

```powershell
Get-PnPField -List 'P8Opgaver' |
    Where-Object { -not $_.Hidden -and -not $_.ReadOnlyField } |
    Select-Object Title, InternalName, TypeAsString
```

`Title` og `InternalName` skal være **identiske** for `SagId` og `Udfoert`. Er de ikke det,
så stop — resten af listerne vil fejle på samme måde, og et internt navn kan ikke rettes
bagefter.

---

## Trin 2 — P8Ansogninger

Hovedlisten. **Skal oprettes før** `P8Adresser`, `P8Kontakter` og `P8Vedhaeftninger`, som
har en opslagskolonne til den.

```powershell
New-Liste 'P8Ansogninger'
$l = 'P8Ansogninger'

# Fra OS2Forms - skrives af robotten ved oprettelse
Add-Kolonne -Liste $l -Navn 'SubmissionUUID'   -Type Text -Indekseret
Add-Kolonne -Liste $l -Navn 'SubmissionSerial' -Type Number
Add-Kolonne -Liste $l -Navn 'SubmissionSid'    -Type Number
Add-Kolonne -Liste $l -Navn 'OS2FormsUrl'      -Type URL
Add-Kolonne -Liste $l -Navn 'Udfylder'         -Type Text
Add-Kolonne -Liste $l -Navn 'IndsendtAf'       -Type Choice -Valg 'Grundejer','Bygherre',$RAADGIVER
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
Add-Kolonne -Liste $l -Navn 'Status' -Type Choice -Indekseret -Standard 'Ny' `
            -Valg 'Ny','Under behandling','Afventer','Afgjort','Afvist'
Add-Kolonne -Liste $l -Navn 'AfventerAarsag' -Type Choice -Valg 'Materiale',$HOERING,'Vurderingssvar'
Add-Kolonne -Liste $l -Navn 'Ansvarlig' -Type User -Indekseret
```

`Ansvarlig` tom betyder, at sagen er ledig. Det er hele mekanikken bag tag og frigiv.

---

## Trin 3 — P8Adresser

Én række pr. ejendom. Antallet er ubegrænset, så denne liste vokser hurtigst af alle —
indekset er ikke valgfrit.

```powershell
New-Liste 'P8Adresser'
$l = 'P8Adresser'
Add-Opslag  -Liste $l -Navn 'Ansogning'
Add-Kolonne -Liste $l -Navn 'SubmissionUUID'   -Type Text -Indekseret
Add-Kolonne -Liste $l -Navn 'Adresse'          -Type Text
Add-Kolonne -Liste $l -Navn 'Matrikel'         -Type Text
Add-Kolonne -Liste $l -Navn 'LokalitetsNummer' -Type Text
```

---

## Trin 4 — P8Kontakter

```powershell
New-Liste 'P8Kontakter'
$l = 'P8Kontakter'
Add-Opslag  -Liste $l -Navn 'Ansogning'
Add-Kolonne -Liste $l -Navn 'SubmissionUUID' -Type Text -Indekseret
Add-Kolonne -Liste $l -Navn 'KontaktType'    -Type Choice -Valg 'Grundejer','Bygherre',$RAADGIVER
Add-Kolonne -Liste $l -Navn 'ErUdfylder'     -Type Boolean -Standard 0
Add-Kolonne -Liste $l -Navn 'Navn'           -Type Text
Add-Kolonne -Liste $l -Navn 'Firma'          -Type Text
Add-Kolonne -Liste $l -Navn 'CVR'            -Type Text
Add-Kolonne -Liste $l -Navn 'Email'          -Type Text
Add-Kolonne -Liste $l -Navn 'Telefon'        -Type Text
Add-Kolonne -Liste $l -Navn 'Adresse'        -Type Text
```

`KontaktType` er ikke unik — der kan være to grundejere på samme sag.

---

## Trin 5 — P8Vedhaeftninger

Borgerens uploadede dokumenter fra OS2Forms. Ikke sagsbehandlerens egne filer.

```powershell
New-Liste 'P8Vedhaeftninger'
$l = 'P8Vedhaeftninger'
Add-Opslag  -Liste $l -Navn 'Ansogning'
Add-Kolonne -Liste $l -Navn 'SubmissionUUID' -Type Text -Indekseret
Add-Kolonne -Liste $l -Navn 'FilId'          -Type Text
Add-Kolonne -Liste $l -Navn 'Filnavn'        -Type Text
Add-Kolonne -Liste $l -Navn 'FilUrl'         -Type URL
```

---

## Trin 6 — P8Log

Sagens fælles historik: statusskift, kommentarer og handlinger i én liste.

```powershell
New-Liste 'P8Log'
$l = 'P8Log'
Add-Kolonne -Liste $l -Navn 'SagId'     -Type Number -Indekseret
Add-Kolonne -Liste $l -Navn 'Handling'  -Type Choice -Valg `
            'Statusskift','Kommentar','Sag taget','Sag frigivet',
            'Opgave oprettet',$UDFOERT,'Dokument uploadet',$TILFOEJET
Add-Kolonne -Liste $l -Navn 'FraStatus' -Type Text
Add-Kolonne -Liste $l -Navn 'TilStatus' -Type Text
Add-Kolonne -Liste $l -Navn 'Kommentar' -Type Note
Add-Kolonne -Liste $l -Navn 'TaggedeBrugere' -Type UserMulti
```

`TaggedeBrugere` er den kolonne, Power Automate-flowet lytter på, når nogen tagger en
kollega. Den **skal** tillade flere valg — det sikrer `UserMulti`-typen.

---

## Trin 7 — P8Noter

Sagsbehandlerens egne arbejdsnoter. Filtreres på forfatter i koden.

```powershell
New-Liste 'P8Noter'
Add-Kolonne -Liste 'P8Noter' -Navn 'SagId' -Type Number -Indekseret
Add-Kolonne -Liste 'P8Noter' -Navn 'Tekst' -Type Note
```

---

## Trin 8 — P8Links

Henvisninger til andre systemer, typisk GO-sagen.

```powershell
New-Liste 'P8Links'
Add-Kolonne -Liste 'P8Links' -Navn 'SagId' -Type Number -Indekseret
Add-Kolonne -Liste 'P8Links' -Navn 'Url'   -Type URL
```

---

## Trin 9 — P8Dokumenter

**Dokumentbibliotek**, ikke en liste. Sagsbehandlerens egne filer, i en mappe pr. sag.

```powershell
New-Liste 'P8Dokumenter' -Skabelon DocumentLibrary
Add-Kolonne -Liste 'P8Dokumenter' -Navn 'SagId' -Type Number -Indekseret
Set-PnPList -Identity 'P8Dokumenter' -EnableVersioning $true
```

Versioneringen er hele grunden til at bruge et bibliotek frem for vedhæftninger på
list-elementet.

**Opret ingen mapper.** Filerne havner i `/P8Dokumenter/sag-{id}/`, men mapperne laves af
koden efter behov, første gang der uploades en fil til en sag. De kan ikke laves på forhånd,
da `{id}` først findes, når robotten har oprettet ansøgningen. Biblioteket skal stå tomt.

---

## Kontrol til sidst

### Interne navne

Det vigtigste tjek. En uoverensstemmelse giver **ingen fejl** — koden skriver bare til en
kolonne, som visningen ikke viser.

```powershell
$indbyggede = @('Title','Created','Modified','Author','Editor','FileLeafRef','Attachments')
$problemer = 0

foreach ($navn in 'P8Ansogninger','P8Adresser','P8Kontakter','P8Vedhaeftninger',
                  'P8Log','P8Noter','P8Opgaver','P8Links','P8Dokumenter') {
    if (-not (Get-PnPList -Identity $navn -ErrorAction SilentlyContinue)) {
        Write-Host "! $navn findes ikke" -ForegroundColor Yellow
        continue
    }
    Get-PnPField -List $navn |
        Where-Object { -not $_.Hidden -and -not $_.ReadOnlyField -and $_.InternalName -notin $indbyggede } |
        ForEach-Object {
            if ($_.Title -ne $_.InternalName) {
                Write-Host "! $navn : $($_.Title) -> $($_.InternalName)" -ForegroundColor Yellow
                $problemer++
            }
        }
}

if ($problemer -eq 0) { Write-Host "Alle interne navne matcher." -ForegroundColor Green }
else { Write-Host "$problemer afvigelse(r). Slet kolonnen og opret den igen - navnet kan ikke rettes." -ForegroundColor Red }
```

Kig efter `_x` i navnene, navne hugget af ved 32 tegn, eller et tal sat bagpå som `Status0`
— det sidste betyder, at der allerede fandtes en kolonne med samme visningsnavn.

### Danske tegn i valgmulighederne

```powershell
$forventet = @{
    'P8Ansogninger|IndsendtAf'     = @('Grundejer','Bygherre',$RAADGIVER)
    'P8Ansogninger|AfventerAarsag' = @('Materiale',$HOERING,'Vurderingssvar')
    'P8Kontakter|KontaktType'      = @('Grundejer','Bygherre',$RAADGIVER)
}
$fejl = 0

foreach ($n in $forventet.Keys) {
    $liste, $felt = $n -split '\|'
    $f = Get-PnPField -List $liste -Identity $felt -ErrorAction SilentlyContinue
    if (-not $f) { continue }
    foreach ($v in $forventet[$n]) {
        if ($f.Choices -notcontains $v) {
            Write-Host "! $liste.$felt mangler '$v'. Fandt: $($f.Choices -join ', ')" -ForegroundColor Yellow
            $fejl++
        }
    }
}

if ($fejl -eq 0) { Write-Host "Danske tegn er intakte." -ForegroundColor Green }
```

Fejler den, er et `å` eller `ø` blevet ødelagt undervejs. Ret valgmulighederne direkte i
listeindstillingerne — kolonnen behøver ikke oprettes igen, da det kun er værdierne, der er
forkerte.

### Indekser

```powershell
foreach ($navn in 'P8Ansogninger','P8Adresser','P8Kontakter','P8Vedhaeftninger',
                  'P8Log','P8Noter','P8Opgaver','P8Links','P8Dokumenter') {
    $idx = Get-PnPField -List $navn -ErrorAction SilentlyContinue |
           Where-Object { $_.Indexed } | Select-Object -ExpandProperty InternalName
    "{0,-20} {1}" -f $navn, ($idx -join ', ')
}
```

Forventet: `SubmissionUUID` på de fire første, `Status` og `Ansvarlig` på `P8Ansogninger`,
og `SagId` på de fem sidste.

---

## Hvis noget går galt

**"The field with Id ... already exists"** — kolonnen findes allerede, men med et andet
visningsnavn. Slet den i listeindstillingerne og kør blokken igen.

**Internt navn fik et tal bagpå (`Status0`)** — der fandtes allerede en kolonne med samme
visningsnavn, måske skjult. Slet begge og opret igen.

**`Add-PnPFieldFromXml` fejler på `UserMulti`** — kontrollér at du er forbundet med en konto,
der må ændre listeskemaer på sitet. Person-felter kræver flere rettigheder end tekstfelter.

**Hele blokken fejler med "term is not recognized"** — hjælpefunktionerne fra trin 0 er ikke
indlæst i dette vindue. Kør trin 0 igen.
