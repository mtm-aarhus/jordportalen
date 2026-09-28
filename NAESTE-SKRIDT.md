# Næste skridt — Jordportalen

Status pr. 25. september 2026. Skrevet så arbejdet kan genoptages uden at skulle
rekonstrueres.

## Hvor vi står

SPFx-dashboardet er **færdigbygget, gennemgået og sikkerhedsgodkendt**, men **aldrig
kørt mod SharePoint**.

- Kode: [`mtm-aarhus/jordportalen`](https://github.com/mtm-aarhus/jordportalen), offentlig, `main` beskyttet
- 56 tests grønne, typecheck rent, `npm run build` producerer en `.sppkg`
- 19 opgaver, hver gennemgået for sig, plus en samlet gennemgang af hele grenen
- Sikkerhedsgennemgang gennemført — et stored-XSS-hul fundet og lukket, se
  `docs/superpowers/2026-09-25-sikkerhedsrettelser.md`

De ni SharePoint-lister er oprettet manuelt. Intet i grænsefladen er afprøvet i en
browser — ingen subagent har kunnet logge ind i SharePoint.

## Det der mangler, i rækkefølge

### 1. Verificér ETag'en — gør dette først

**Fejler dette punkt, er beskyttelsen mod at to sagsbehandlere tager den samme sag
slået fra, uden at noget fejler.**

Fuld fremgangsmåde i [`OVERDRAGELSE.md`](./OVERDRAGELSE.md), punkt 1. Kort: kør
`npm start` og workbench på Jordportalen-sitet, åbn en sag, og se efter om `etag` har en værdi. Er den tom, ligger en
færdig alternativ implementering udkommenteret i `SagService.ts`.

Bekræft derefter med to-faner-testen: tag samme ledige sag i to faner. Den anden skal
afvises med *"Sagen blev ændret af en anden, mens du arbejdede"* — ikke overskrive tavst.

### 2. Sæt `ReadSecurity` og `WriteSecurity` på `P8Noter`

Sikkerhedsgennemgangen fandt, at "egne noter" er svagere end både grænsefladen og
designdokumentet siger: det er ikke kun en administrator, der kan læse dem — det er
**enhver sagsbehandler med læseadgang til listen**, direkte i listevisningen. Og
`NoteService.opdater`/`slet` tager et vilkårligt note-id uden forfattertjek, så en
kollega kan slette dine noter.

SharePoint har en indstilling på **listeniveau**, som løser begge dele uden at koste
unikke tilladelser:

- **Listeindstillinger → Avancerede indstillinger → Elementniveautilladelser**
- Læseadgang: **Læs kun elementer, der er oprettet af brugeren**
- Oprettelses- og redigeringsadgang: **Opret elementer og rediger kun elementer, der er oprettet af brugeren**

Med dem slået til bliver løftet sandt, og teksten kunne faktisk ændres fra
"Vises kun for dig" til "Privat".

Dette var min fejl: jeg afviste tidligere reelt private noter med henvisning til
SharePoints grænse på 5.000 unikke tilladelser. Det gjaldt tilladelser pr. element —
ikke denne indstilling, som ikke koster nogen.

### 3. Gennemgå de øvrige browser-tjek

Tretten punkter i [`OVERDRAGELSE.md`](./OVERDRAGELSE.md), punkt 4. De vigtigste:

- Dropdownen i filtrene skal have baggrund og styling. Er den gennemsigtig, er
  `mountNode` ikke slået igennem
- Send dig selv et deep-link og åbn det fra en kold side-indlæsning. URL-sammensætningen
  var oprindeligt forkert og gav 404 på hvert link — rettet, men kun verificeret i kode

### 4. Udrul

PnP PowerShell kan ikke forbinde i tenanten, så `.sppkg`-filen uploades i browseren.
Se [`DEPLOY.md`](./DEPLOY.md).

### 5. Opsæt Power Automate-flowet

Tagning af en kollega sender ingen mail, før flowet findes. SharePoints egen
`SendEmail`-API er udfaset, så der er ingen reserveløsning i appen. Se
[`POWER-AUTOMATE.md`](./POWER-AUTOMATE.md).

## Beslutning der stadig mangler

**Sagsgangen er ubekræftet.** `Ny → Under behandling → Afventer → Afgjort / Afvist` kom
fra dig, men ingen har bekræftet, at det svarer til, hvordan Jord og Grundvand faktisk
arbejder. Reglerne ligger samlet i `src/webparts/jordportalen/domaene/statusregler.ts`
og er dækket af tests, så en ændring er billig nu — dyrere når der er sager i systemet.

## Beslægtet

Robotten, der fylder listerne, ligger i
[`mtm-aarhus/Os2FormsParagraf8`](https://github.com/mtm-aarhus/Os2FormsParagraf8).
Uden den kommer der ingen sager ind. Se dens `NAESTE-SKRIDT.md`.

## Dokumentation i dette repo

| Fil | Indhold |
|---|---|
| `OVERDRAGELSE.md` | Alt der kræver et menneske og en browser |
| `SHAREPOINT-LISTER.md` | De ni listers skema |
| `OPRET-LISTER.md` | PowerShell til at oprette dem |
| `DEPLOY.md` | Udrulning |
| `POWER-AUTOMATE.md` | Notifikation ved tagning |
| `docs/superpowers/specs/` | Designdokument med begrundelser og fravalg |
| `docs/superpowers/2026-09-24-udfoerelseslogbog.md` | 21 afgørelser truffet undervejs |
