# Jordportalen — SharePoint-lister

Anvisning til manuel oprettelse af de ni lister, som §8-løsningen bygger på.

**Site:** `https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard`

Frontend-siden er
[§8-Ansøgninger – Jord og Grundvand](https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/SitePages/%C2%A78-Ans%C3%B8gninger---Jord-og-Grundvand.aspx).

To systemer deler disse lister:

- **Robotten** ([`os2data-paragraf8`](https://github.com/kiogaarhus/os2data-paragraf8)) henter
  §8-ansøgninger fra OS2Forms og opretter dem. Den rører aldrig sagsbehandlingsfelterne.
- **Jordportalen** (dette projekt) er SPFx-dashboardet, hvor sagerne behandles.

---

## Læs dette først

### Interne kolonnenavne er ikke visningsnavne

Det navn du taster ind er kolonnens **visningsnavn**. SharePoint udleder et **internt navn**
ved oprettelsen, og det er det interne navn, koden skriver til. De falder fra hinanden på
fire måder:

1. **Specialtegn kodes om.** `-` bliver `_x002d_`, `ø` bliver `_x00f8_`, mellemrum bliver
   `_x0020_`. En kolonne der vises som "Az-ident" hedder internt `Az_x002d_ident`.
2. **Navnet afkortes ved 32 tegn.** "Organisatorisk enhed over medarbejder" blev internt til
   `Organisatoriskenhedovermedarbejd` — afhugget midt i et ord.
3. **Omdøbning ændrer kun visningsnavnet.** Det interne navn er låst fra oprettelsen.
4. **To kolonner kan dele visningsnavn.** I MTM's Altinget-liste findes `Magistratsafdeling`,
   `Magistratsafdeling0` og `Magistratsafdeling1`, som alle vises ens. Skriver koden til den
   forkerte, **lykkes kaldet uden fejl** — værdien lander bare et sted, visningen ikke viser.

Alle navne i denne anvisning er derfor korte, rene ASCII-navne uden mellemrum, bindestreger
eller æ/ø/å, og alle under 32 tegn. **Tast dem præcis som vist**, så bliver det interne navn
identisk med visningsnavnet.

Bekræft det alligevel bagefter — se tjeklisten nederst.

### Sitets tidszone skal stå til dansk tid

SharePoint lagrer alle dato-felter i UTC. En ansøgningsdato den 21. februar gemmes som
`2017-02-20T23:00:00Z`, fordi midnat dansk tid er den foregående dag i UTC. Står sitets
regionale indstillinger til UTC i stedet for dansk tid, vises datoen som **den 20.**

Tjek **Webstedsindstillinger → Regionale indstillinger → Tidszone** før noget tages i brug.
Fejlen er tavs og rammer kun datoer nær midnat, så den er svær at opdage bagefter.

### Rig tekst skal slås fra

For alle kolonner af typen **Flere tekstlinjer** skal "Brug forbedret rig tekst" sættes til
**Nej**. Ellers wrapper SharePoint indholdet i HTML (`<div class="ExternalClass...">`), som
koden så skal rydde op i ved hver læsning.

---

## Oprettelsesrækkefølge

`P8Ansogninger` skal oprettes først, da de tre detaljelister har en opslagskolonne til den.
De øvrige kan oprettes i vilkårlig rækkefølge.

| # | Liste | Type | Oprettes af |
|---|---|---|---|
| 1 | `P8Ansogninger` | Brugerdefineret liste | — |
| 2 | `P8Adresser` | Brugerdefineret liste | Robot |
| 3 | `P8Kontakter` | Brugerdefineret liste | Robot |
| 4 | `P8Vedhaeftninger` | Brugerdefineret liste | Robot |
| 5 | `P8Log` | Brugerdefineret liste | Jordportalen |
| 6 | `P8Noter` | Brugerdefineret liste | Jordportalen |
| 7 | `P8Opgaver` | Brugerdefineret liste | Jordportalen |
| 8 | `P8Links` | Brugerdefineret liste | Jordportalen |
| 9 | `P8Dokumenter` | **Dokumentbibliotek** | Jordportalen |

Lister oprettes via **Webstedsindhold → Ny → Liste → Tom liste**.
Dokumentbiblioteket via **Webstedsindhold → Ny → Dokumentbibliotek**.

---

## 1. P8Ansogninger

Hovedlisten. Én række pr. §8-ansøgning. Det er denne liste, dashboardet viser.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SubmissionUUID** | Enkelt tekstlinje | Unik nøgle fra OS2Forms. **Skal indekseres** |
| **SubmissionSerial** | Tal | 0 decimaler. Fortløbende nummer pr. blanket |
| **SubmissionSid** | Tal | 0 decimaler. OS2Forms' interne id |
| **OS2FormsUrl** | Hyperlink eller billede | Format: **Hyperlink**. Link til originalen i OS2Forms |
| **Udfylder** | Enkelt tekstlinje | Navnet på den, der udfyldte blanketten |
| **IndsendtAf** | Valg | `Grundejer`, `Bygherre`, `Rådgiver`. Ingen anden værdi findes i blanketten |
| **AnsogningsDato** | Dato og klokkeslæt | Inkluder klokkeslæt: **Nej** |
| **Bemaerkninger** | Flere tekstlinjer | Almindelig tekst |
| **ModtagetDato** | Dato og klokkeslæt | Inkluder klokkeslæt: **Ja** |
| **AfsluttetDato** | Dato og klokkeslæt | Inkluder klokkeslæt: **Ja**. Kan stå tom |
| **FlereGrundejere** | Ja/Nej | Standard: Nej |
| **BygherreSammeSomGrundejer** | Ja/Nej | Standard: Nej |
| **Status** | Valg | `Ny`, `Under behandling`, `Afventer`, `Afgjort`, `Afvist`. Standard: `Ny`. **Skal indekseres** |
| **AfventerAarsag** | Valg | `Materiale`, `Høring`, `Vurderingssvar`. Ingen standardværdi. Kun meningsfuld når `Status = Afventer` |
| **Ansvarlig** | Person eller gruppe | Enkelt bruger, kun personer. **Tom betyder ledig** — det er hele mekanikken bag tag og frigiv. **Skal indekseres** |
| **AntalAdresser** | Tal | 0 decimaler, standard 0 |
| **AntalKontakter** | Tal | 0 decimaler, standard 0 |
| **AntalVedhaeftninger** | Tal | 0 decimaler, standard 0 |
| **AdresserTekst** | Flere tekstlinjer | Alle adresser, én pr. linje |
| **Grundejere** | Flere tekstlinjer | Grundejernes navne, ét pr. linje |

> `Title` findes automatisk — opret den ikke. Robotten sætter den til sagens første adresse,
> med `(+N flere)` bagefter hvis der er flere.

> `Oprettet`/`Created` findes også automatisk, men er *robottens* skrivetidspunkt, ikke
> ansøgerens. Brug `ModtagetDato` i dashboardet.

**Indeksér fire kolonner:** Listeindstillinger → Indekserede kolonner. `SubmissionUUID` (robottens
dubletopslag), `Status` og `Ansvarlig` (dashboardets filtre), og `Modified` hvis listen vokser.

### Hvem skriver hvad

| Skrives af | Kolonner |
|---|---|
| Robotten, ved oprettelse | Alt undtagen `Status`, `AfventerAarsag` og `Ansvarlig` |
| Robotten, én gang | `Status = Ny`. Derefter rører den den aldrig igen |
| Jordportalen | `Status`, `AfventerAarsag`, `Ansvarlig` |

Robotten opdaterer aldrig en eksisterende række. Ser den et `SubmissionUUID`, den kender,
springer den over. En sagsbehandlers arbejde kan derfor ikke overskrives af en genkørsel.

---

## 2. P8Adresser

Én række pr. ejendom på sagen. **Antallet er ubegrænset** — ansøger kan tilføje så mange
ejendomme til projektet som ønsket.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **Ansogning** | Opslag (Lookup) | Hent fra `P8Ansogninger`, felt `Title`. Enkelt værdi |
| **SubmissionUUID** | Enkelt tekstlinje | **Skal indekseres** |
| **Adresse** | Enkelt tekstlinje | Hele adressen på én linje |
| **Matrikel** | Enkelt tekstlinje | |
| **LokalitetsNummer** | Enkelt tekstlinje | Jordforureningslokalitet |

> `Title` sættes til adressen.

Denne liste vokser hurtigere end hovedlisten. Indekset på `SubmissionUUID` er **ikke valgfrit**
— uden det rammer man SharePoints grænse på 5.000 elementer pr. visning, og opslag begynder at
fejle frem for bare at blive langsomme.

---

## 3. P8Kontakter

Én række pr. kontaktperson. En sag har typisk to til fire.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **Ansogning** | Opslag (Lookup) | Hent fra `P8Ansogninger`, felt `Title`. Enkelt værdi |
| **SubmissionUUID** | Enkelt tekstlinje | **Skal indekseres** |
| **KontaktType** | Valg | `Grundejer`, `Bygherre`, `Rådgiver` |
| **ErUdfylder** | Ja/Nej | Standard: Nej |
| **Navn** | Enkelt tekstlinje | Kan stå tom — se note nedenfor |
| **Firma** | Enkelt tekstlinje | |
| **CVR** | Enkelt tekstlinje | Tekst, ikke Tal — bevarer foranstillede nuller |
| **Email** | Enkelt tekstlinje | |
| **Telefon** | Enkelt tekstlinje | Tekst. Formatet varierer i blanketten |
| **Adresse** | Enkelt tekstlinje | Kontaktens egen adresse, ikke sagens lokalitet |

> `Title` sættes til kontaktens navn, eller til firmaet hvis navnet mangler.

**`KontaktType` er ikke unik.** Der kan være to grundejere på samme sag. Dashboardet henter alle
rækker af typen og viser dem som en gruppe — det må aldrig slå op på "den første".

**`Navn` kan være tom for grundejer nr. 2.** Blanketten mangler feltet `navn_kontaktperson_2`.
Det er en mangel i OS2Forms, ikke i koden.

---

## 4. P8Vedhaeftninger

Borgerens uploadede dokumenter fra OS2Forms. **Ikke** sagsbehandlerens egne filer — de ligger i
`P8Dokumenter`.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **Ansogning** | Opslag (Lookup) | Hent fra `P8Ansogninger`, felt `Title`. Enkelt værdi |
| **SubmissionUUID** | Enkelt tekstlinje | **Skal indekseres** |
| **FilId** | Enkelt tekstlinje | OS2Forms' fil-id |
| **Filnavn** | Enkelt tekstlinje | Kan stå tom indtil fil-id'et er slået op |
| **FilUrl** | Hyperlink eller billede | Format: **Hyperlink**. Kan stå tom |

> `Title` sættes til filnavnet, eller til fil-id'et hvis navnet ikke kendes.

---

## 5. P8Log

Sagens fælles historik. Én liste til både statusskift, kommentarer og handlinger.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SagId** | Tal | 0 decimaler. Element-id fra `P8Ansogninger`. **Skal indekseres** |
| **Handling** | Valg | `Statusskift`, `Kommentar`, `Sag taget`, `Sag frigivet`, `Opgave oprettet`, `Opgave udført`, `Dokument uploadet`, `Link tilføjet` |
| **FraStatus** | Enkelt tekstlinje | Kun ved statusskift |
| **TilStatus** | Enkelt tekstlinje | Kun ved statusskift |
| **Kommentar** | Flere tekstlinjer | Almindelig tekst. Selve kommentarteksten |
| **TaggedeBrugere** | Person eller gruppe | **Tillad flere valg: Ja.** Kun personer |

> `Title` sættes til en kort beskrivelse af handlingen.
> `Oprettet` og `Oprettet af` findes automatisk og bruges som tidsstempel og aktør — der skal
> ikke oprettes et separat felt til hvem der gjorde hvad.

**`TaggedeBrugere` er den kolonne, Power Automate-flowet lytter på.** Når der oprettes et
element med mindst én tagget person, sendes en notifikation. Flowet filtrerer bevidst ikke på
`Handling`, så tagning virker i enhver sammenhæng uden at flowet skal ændres.

Notifikationen kan ikke sendes fra selve appen: SharePoints `SendEmail`-API er udfaset af
Microsoft. Derfor Power Automate.

---

## 6. P8Noter

Sagsbehandlerens egne arbejdsnoter.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SagId** | Tal | 0 decimaler. **Skal indekseres** |
| **Tekst** | Flere tekstlinjer | Almindelig tekst |

> `Title` sættes automatisk af koden. `Oprettet af` bruges som forfatter.

**Om fortrolighed.** Noterne filtreres på forfatter i selve forespørgslen, så en sagsbehandler
kun ser sine egne — også hvis sagen skifter ansvarlig. Men listen har ingen tilladelser pr.
element, så en administrator kan åbne den direkte i SharePoint og læse alt. Grænsefladen siger
derfor "Vises kun for dig", ikke "Privat".

Skal noterne være reelt utilgængelige for andre, kræver det brudt tilladelsesarv pr. element.
Det er fravalgt: SharePoint har en hård grænse på 5.000 unikke tilladelser pr. liste, og den
nås hurtigere end man tror.

---

## 7. P8Opgaver

Underopgaver på en sag.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SagId** | Tal | 0 decimaler. **Skal indekseres** |
| **Udfoert** | Ja/Nej | Standard: Nej |

> `Title` er selve opgaveteksten.

Bevidst uden ansvarlig og frist. Sagen har allerede én ansvarlig, og felterne kan tilføjes, hvis
der viser sig et behov.

---

## 8. P8Links

Henvisninger fra en sag til andre systemer — typisk GO-sagen.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SagId** | Tal | 0 decimaler. **Skal indekseres** |
| **Url** | Hyperlink eller billede | Format: **Hyperlink** |

> `Title` er linkets etiket, fx "GO-sag 2026-0041".

---

## 9. P8Dokumenter

**Dokumentbibliotek**, ikke en liste. Sagsbehandlerens egne filer.

| Kolonne | Type | Indstillinger |
|---|---|---|
| **SagId** | Tal | 0 decimaler. **Skal indekseres** |

**Opret kun biblioteket og kolonnen — ingen mapper.**

Filerne lægges i en mappe pr. sag, `/P8Dokumenter/sag-{id}/`, men mapperne oprettes af koden
efter behov, første gang nogen uploader en fil til en sag. De kan ikke laves på forhånd:
`{id}` er element-id'et fra `P8Ansogninger`, som først findes, når robotten har oprettet
ansøgningen. Har en sag ingen filer, findes dens mappe ikke.

Mapperne er til mennesker, der browser biblioteket. `SagId`-kolonnen er til koden, så den kan
hente en sags filer uden at traversere mapper.

**Slå versionering til:** Biblioteksindstillinger → Versionsindstillinger → Opret en version
hver gang. Det er hele grunden til at bruge et bibliotek frem for vedhæftninger på list-elementet.

---

## Tjekliste efter oprettelse

**Site**

- [ ] Tidszonen står til **(UTC+01:00) Bruxelles, København, Madrid, Paris**

**Lister**

- [ ] Alle ni findes under Webstedsindhold, med præcis de navne der står her
- [ ] `P8Dokumenter` er et **dokumentbibliotek**, ikke en liste
- [ ] `P8Dokumenter` har versionering slået til

**Kolonner**

- [ ] Alle kolonner af typen Flere tekstlinjer har **rig tekst slået fra**
- [ ] `TaggedeBrugere` på `P8Log` tillader **flere valg**
- [ ] `Ansvarlig` på `P8Ansogninger` tillader **kun én** bruger
- [ ] `OS2FormsUrl`, `FilUrl` og `Url` er sat til format **Hyperlink**, ikke Billede
- [ ] Opslagskolonnerne `Ansogning` viser værdier fra `P8Ansogninger`

**Indekser**

- [ ] `SubmissionUUID` på `P8Ansogninger`, `P8Adresser`, `P8Kontakter`, `P8Vedhaeftninger`
- [ ] `Status` og `Ansvarlig` på `P8Ansogninger`
- [ ] `SagId` på `P8Log`, `P8Noter`, `P8Opgaver`, `P8Links`, `P8Dokumenter`

**Interne navne**

- [ ] Kontrollér at hvert internt navn er identisk med visningsnavnet

Det sidste punkt er det vigtigste, fordi en fejl her ikke giver nogen fejlmeddelelse. Kontrollen
kan køres i browserens adresselinje på en liste ad gangen:

```
https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/_api/web/lists/getbytitle('P8Ansogninger')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false and ReadOnlyField eq false
```

Kig efter interne navne med `_x` i sig, navne der er hugget af ved 32 tegn, eller navne med et
tal sat bagpå (`Status0`) — det sidste betyder, at der allerede fandtes en kolonne med samme
visningsnavn.

**Tilladelser**

- [ ] Robottens servicekonto har skriveadgang til `P8Ansogninger` og de tre detaljelister
- [ ] Sagsbehandlerne kan redigere `Status`, `AfventerAarsag` og `Ansvarlig`
