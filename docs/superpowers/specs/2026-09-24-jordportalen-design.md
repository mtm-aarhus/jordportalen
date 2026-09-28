# Jordportalen — design

**Dato:** 2026-09-24
**Status:** Godkendt, klar til implementeringsplan

SPFx-dashboard til behandling af §8-ansøgninger efter jordforureningsloven, i Natur og Miljø,
Teknik og Miljø, Aarhus Kommune.

---

## 1. Formål og afgrænsning

Sagsbehandlerne i Jord og Grundvand mangler overblik over indkomne §8-ansøgninger: hvilke der
findes, hvor de står, og hvem der har ansvaret. I dag lander ansøgningerne i OS2Forms uden et
fælles sted at se dem.

Jordportalen giver det overblik og de funktioner, der hører til: tage og frigive en sag,
skifte status, kommentere, tagge en kollega, skrive egne noter, oprette opgaver, vedhæfte
dokumenter og indsætte links.

### Ikke med

Bevidst fravalgt, så det ikke skal diskuteres igen:

| Fravalgt | Begrundelse |
|---|---|
| Servicemål og SLA-visning | Der er ingen frister at overholde i denne proces |
| Mødehåndtering | Ikke relevant for §8-sagsbehandling |
| Flere sagsbehandlere pr. sag | Ejerskabet er eksklusivt; kollegaer inddrages ved tagning |
| Kommentartæller på dashboardet | Koster et ekstra kald for noget, ingen har efterspurgt |
| Komponent- og browsertests | SPFx gør dem besværlige; servicelaget er hvor fejlene gør ondt |
| Microsoft Graph | Kræver administratorgodkendelse, som vi ikke kan regne med |

Jordportalen er et **arbejds- og overblikssted, ikke sagens arkiv**. Den formelle
journalisering sker fortsat i GO, og links-funktionen peger derhen.

---

## 2. Arkitektur

### To systemer, én database

| System | Repo | Ansvar |
|---|---|---|
| Robotten | `kiogaarhus/os2data-paragraf8` | Henter §8-ansøgninger fra OS2Forms og opretter dem i SharePoint |
| Jordportalen | dette projekt | SPFx-dashboard hvor sagerne behandles |

De deler SharePoint-lister, men ingen kode. Der synkroniseres intet — der er én kopi af data.
Det er samme forhold som mellem Idéportalen og Opgaveportalen, og det fungerer netop fordi
intet kopieres.

**Robotten opdaterer aldrig en eksisterende række.** Ser den et `SubmissionUUID`, den kender,
springer den over. En sagsbehandlers arbejde kan derfor ikke overskrives af en genkørsel.

Skemaet ejes af dette projekt, fordi frontenden definerer størstedelen af det.
Se [SHAREPOINT-LISTER.md](../../../SHAREPOINT-LISTER.md).

### Teknologistak

Samme som Idéportalen og Opgaveportalen: SPFx 1.22, React 17, TypeScript 5.8,
Fluent UI React v9, PnPjs v4, Node ≥ 22.14.

### Site

`https://aarhuskommune.sharepoint.com/teams/Jordportalen`

---

## 3. Datamodel

Ni lister, beskrevet fuldt ud i [SHAREPOINT-LISTER.md](../../../SHAREPOINT-LISTER.md).

Fire skrives af robotten — `P8Ansogninger`, `P8Adresser`, `P8Kontakter`, `P8Vedhaeftninger`.
Fem tilhører Jordportalen — `P8Log`, `P8Noter`, `P8Opgaver`, `P8Links` og dokumentbiblioteket
`P8Dokumenter`.

### Sagsgangen

```
Ny → Under behandling → Afventer → Afgjort
                            ↓          eller
                    (materiale,     Afvist
                     høring eller
                     vurderingssvar)
```

`Afventer` er **én** status med et separat årsagsfelt, ikke tre statusser. Det gør, at
dashboardet kan filtrere alt ventende med ét klik og stadig vise hvorfor, og at man kan skifte
årsag uden at skifte status.

### Ejerskab

`Ansvarlig` er et enkelt personfelt. **Tomt betyder ledig** — det er hele mekanikken bag tag
og frigiv. Der er ingen separat "taget"-markering, der kan komme ud af trit med feltet.

### To principper i skemaet

**Intet felt antager ét af noget.** En sag kan have ubegrænset mange adresser og op til to
ligestillede grundejere. Derfor findes der ingen `PrimaerAdresse` eller `PrimaerGrundejer`;
de denormaliserede felter er flerlinjede opsummeringer, og detaljelisterne er sandheden.

**Denormalisering kun hvor data ikke ændrer sig.** `AntalAdresser` og `AdresserTekst`
vedligeholdes af robotten, fordi de sættes én gang. Kommentarer og opgaver ændrer sig hele
tiden, og et felt der skal opdateres ved hver skrivning, kommer ud af sync.

---

## 4. Komponentarkitektur

Én webpart med intern routing mellem dashboard og detaljeside.

```
src/webparts/jordportalen/
├── JordportalenWebPart.ts       SPFx-indgang, PnPjs-init, tema
├── components/
│   ├── Jordportalen.tsx         rod: routing
│   ├── dashboard/               KpiKort, Filtre, SagsTabel
│   ├── detalje/
│   │   ├── SagDetalje.tsx       layout + dataorkestrering
│   │   ├── Metadata.tsx         venstre kolonne
│   │   ├── AnsvarligKort.tsx    profilkort + tag/frigiv
│   │   └── …syv panelkomponenter
│   └── faelles/                 PeoplePicker, ProfilKort, MountNode
├── services/                    én pr. liste
└── utils/deepLink.ts
```

### Detaljesiden

**Venstre kolonne** er ansøgningen som den kom fra OS2Forms — adresser, kontakter, bilag.
Læse-kun; robottens data ændres aldrig herfra. Øverst står profilkortet for den ansvarlige,
med tag- og frigiv-knappen på selve kortet: knappen handler om netop den plads, så den hører
hjemme der og ikke i en separat sektion.

**Højre kolonne** er syv selvstændige paneler: status, kommentarer, egne noter, opgaver,
dokumenter, links og historik. Hvert panel er sin egen fil på 100–200 linjer.

`SagDetalje` henter al data i ét samlet kald og sender den ned med callbacks. Panelerne ejer
kun deres egen formulartilstand og er dermed presentationelle.

Det er en bevidst afvigelse fra jeres eksisterende portaler, hvor `OpgaveDetail.tsx` er 56 KB
og `IdeaDetail.tsx` 96 KB. §8 har flere funktioner på detaljesiden end Opgaveportalen — samlet
i én fil ville den blive større, ikke mindre.

### Profilkort

Den ansvarlige vises med billede, navn, jobtitel og afdeling, med genveje til mail og
Teams-chat. Er sagen ledig, står der "Ledig" med tag-knappen.

Data hentes **uden Microsoft Graph**, fordi Graph kræver administratorgodkendelse:

| Data | Kilde |
|---|---|
| Billede | `/_layouts/15/userphoto.aspx?size=M&accountname={mail}` |
| Navn og mail | `Ansvarlig`-feltet |
| Jobtitel og afdeling | User Information List på sitet |

Jobtitel og afdeling falder stille bort, hvis de ikke er udfyldt. Opslag caches pr. bruger i
sessionen.

### Servicelaget

Én service pr. liste: `SagService`, `LogService`, `NoteService`, `OpgaveService`,
`DokumentService`, `LinkService`, plus `UserService` til brugersøgning.

Flere filer end Opgaveportalens ene `TaskService`, og det er med vilje: hver er 50–150 linjer
og kan testes isoleret. `SagService` får `LogService` som afhængighed, så et statusskift
automatisk skriver en logpost — koordineringen ligger ét sted i stedet for spredt ud i
komponenterne.

Komponenter kalder aldrig PnPjs direkte.

### Adgang

`Ansvarlig` gater kun **skift status** og **frigiv sagen**. Er sagen taget af en anden, er de
to knapper deaktiverede.

Alt andet er åbent for alle — kommentarer, opgaver, dokumenter og links. En kollega skal kunne
bidrage uden at overtage sagen. Egne noter er per definition kun ens egne.

### Deep-links

Formatet er **`?sag=<id>`**, ikke `#sag-<id>`. Et hash i den initielle URL crasher SharePoints
eget side-bootstrap ved koldt load — altså netop når nogen åbner et link fra en mail.
Idéportalen har lært det; Opgaveportalen bruger stadig hash. Legacy `#sag-`-links parses for
en sikkerheds skyld, men genereres ikke.

---

## 5. Dataflow

### Dashboard

Ét kald på `P8Ansogninger` med kun de felter, oversigten viser. Ingen opslag på
detaljelisterne — det er derfor `AdresserTekst` findes.

**`.top(500)` løses frem for at arves.** Alle sider hentes med PnPjs' paginering, med en
sikkerhedsgrænse. Rammes den, **vises det i grænsefladen**. Jeres egen dokumentation kalder
den nuværende adfærd "afskærer stille og roligt resten uden fejl" — det er den værste slags
fejl, og §8-sager akkumulerer over år.

### Detaljeside

Sagen og dens otte datasæt — adresser, kontakter, bilag, log, noter, opgaver, links og
dokumenter — hentes i ét `Promise.all`. Efter en handling opdateres **kun det berørte
datasæt**: en ny kommentar henter loggen igen, ikke adresser og dokumenter. Hvert panel har
sin egen `onOpdater`-callback.

### Samtidighed

To sagsbehandlere kan klikke "Tag sagen" samtidig. Uden beskyttelse lykkes begge skrivninger,
den sidste vinder, og den første tror han har sagen.

`SagService` læser elementets **ETag** ved indlæsning og sender den med på skrivningen. Er
sagen ændret i mellemtiden, afviser SharePoint med 412, og brugeren får besked om at en anden
nåede først. Samme greb ved statusskift.

Det findes ikke i nogen af jeres eksisterende portaler, men uden det er "tag sagen"
utroværdigt i et delt dashboard.

---

## 6. Fejlhåndtering

Fejl vises **der hvor de opstår** — i panelets egen fejltilstand, ikke som en global besked
der skjuler resten af siden. Fejler en kommentar, kan man stadig skifte status.

**Logskrivning blokerer aldrig en handling.** Fejler logposten efter et statusskift, står
statussen stadig. Men hvor Opgaveportalen kun skriver en `console.warn`, vises det diskret i
historik-panelet: et hul i historikken skal kunne opdages uden at åbne DevTools.

403 oversættes til en læselig besked om manglende rettigheder. Det er den fejl, nye brugere
oftest rammer.

---

## 7. Test

Begge eksisterende portaler har nul tests og kalder det selv den højeste tekniske gæld.
Vi retter det ét sted: **servicelaget og de rene funktioner**.

- Samtidighed — at en forældet ETag afvises med den rigtige besked
- Paginering — at alle sider hentes, og at sikkerhedsgrænsen bliver synlig
- Forfatterfiltret på noter — at en anden sagsbehandlers noter aldrig kommer med
- Statusregler — tilladte skift, og at `AfventerAarsag` kun sættes sammen med `Afventer`
- Deep-link-parsing — at `?sag=42` læses, og at legacy `#sag-42` stadig virker

SharePoint mockes. Testene rører aldrig et rigtigt site.

---

## 8. Byg og udrulning

SPFx 1.22 bygger med Heft. Node 22.14, npm 10.9 og Yeoman 7 er på plads.

Versionsnummeret bumpes **to steder** i `config/package-solution.json` — i roden og inde i
`solution`. `includeClientSideAssets: true` og `skipFeatureDeployment: true` sættes fra start;
uden dem opdateres UI ikke efter udrulning, hvilket ligner en cache-fejl og ikke er det.

**Den dokumenterede udrulningsvej er upload af `.sppkg` til App Catalog i browseren.**
`deploy_spfx.ps1` leveres også, men PnP-godkendelsen mangler i tenanten (se nedenfor), og
ingen skal vente på en rettighed for at få noget i luften.

---

## 9. Kendte begrænsninger

**PnP PowerShell kan ikke forbinde i tenanten.** Appen `31359c7f-bd7e-475c-86db-fdb8c937548e`
er ikke godkendt, så `-Interactive` giver AADSTS700016, og `-UseWebLogin` åbner et Internet
Explorer-vindue, SharePoint Online afviser. Listerne er derfor oprettet manuelt, og udrulning
sker gennem browseren. Godkendelse er sendt til administrator.

**Egne noter er ikke teknisk private.** De filtreres på forfatter i selve forespørgslen, så en
sagsbehandler kun ser sine egne — også hvis sagen skifter ansvarlig. Men listen har ingen
tilladelser pr. element, så en administrator kan læse dem. Grænsefladen siger derfor "Vises
kun for dig", ikke "Privat". Tilladelser pr. element er fravalgt: SharePoint har en hård
grænse på 5.000 unikke tilladelser pr. liste.

**Vedhæftede filer fra OS2Forms mangler navn og URL.** Blanketten leverer kun fil-id'er.
REST-API'et har et `/entity/file/{file_id}`-endpoint, som ikke er verificeret endnu.

---

## 10. Åbne punkter

1. **Filnavne på OS2Forms-bilag** — kræver verifikation af `/entity/file/{file_id}` mod et
   rigtigt REST-svar.
2. **`navn_kontaktperson_2` mangler i blanketten.** Grundejer nr. 2 har ingen navnefelt. Skal
   det tilføjes i OS2Forms? Indtil da bruges firmanavnet.
3. **Interne kolonnenavne** skal bekræftes efter den manuelle oprettelse, før koden skrives.
   En uoverensstemmelse giver ingen fejl — værdier forsvinder bare ud af syne.
