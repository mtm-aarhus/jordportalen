# Jordportalen — brugeroplevelse, første runde

**Dato:** 2026-09-28
**Status:** Designet godkendt afsnit for afsnit i chatten, spec afventer gennemlæsning
**Bygger på:** [2026-09-24-jordportalen-design.md](./2026-09-24-jordportalen-design.md)

---

## 1. Formål og afgrænsning

Jordportalen er færdigbygget, men ingen sagsbehandler har brugt den endnu. Denne runde retter
det, der med sikkerhed vil irritere i hverdagen, og venter med større omlægninger, til
sagsbehandlerne i Jord og Grundvand har prøvet løsningen.

**Brugerne** er sagsbehandlerne i Jord og Grundvand. **Målet** er, at man hurtigt kan se, hvad
der venter, og kan finde tilbage til det, man var i gang med.

### Med i denne runde

| # | Problem i dag | Løsning |
|---|---|---|
| 1 | Filtrene nulstilles, hver gang man går tilbage fra en sag | Filtrene står i adressen (afsnit 2) |
| 2 | Afsluttede sager fylder listen som standard | Aktive sager er standard (afsnit 3) |
| 3 | Nøgletallene regnes på det filtrerede resultat, så "Ledige" viser 0 med "Mine sager" slået til | Nøgletal tæller altid aktive sager og er klikbare genveje (afsnit 3) |
| 4 | Browserens tilbage-knap forlader portalen | Åbning af en sag lægger et historiktrin (afsnit 2) |
| 5 | Sagssiden har ingen overskrift, der siger hvilken sag man står i | Ny overskrift med sagsnummer, adresse, status og ansvarlig (afsnit 4) |
| 6 | "Ledig" i tabellen ligner en knap, der tager sagen, men åbner den bare | Bliver en diskret mærkat (afsnit 3) |
| 7 | Tom matrikel eller lokalitet viser "Matrikel · Lokalitet" uden værdier | Kun udfyldte dele vises (afsnit 4) |

### Ikke med, venter på feedback fra sagsbehandlerne

- Tage en sag direkte fra listen
- Klikbare rækker og sortering pr. kolonne
- Faner eller anden opdeling af de syv paneler på sagssiden
- Sammenlægning af kommentarer og historik, som i dag vises to steder fra samme liste
- CVR, firma og kontaktens adresse på kontakterne, og klikbare telefonnumre
- En overskrift der bliver stående ved scroll. Kan komme i konflikt med SharePoints egen
  scroll-container
- At huske scroll-positionen ved tilbagevenden. SharePoint scroller i sin egen container,
  ikke i vinduet, så det er skrøbeligt

### Forudsætning

Omkring 500 §8-ansøgninger om året eller færre (brugerens svar). Derfor kan alle sager hentes
én gang og filtreres i browseren. Selv efter mange år er det langt under SharePoints grænse på
5.000 elementer, og advarslen ved afkortning bliver stående som sikkerhedsnet.

---

## 2. Adresse og navigation

### Visningen som ét objekt

Et nyt rent modul `utils/visning.ts` afløser `utils/deepLink.ts` og beskriver hele visningen:

```ts
export type Udvalg = 'aktive' | 'afsluttede' | 'alle' | SagStatus;
export type Hvem = 'alle' | 'ledige' | 'mine';

export interface IVisning {
  sag?: number;     // åben sag, ellers dashboardet
  udvalg: Udvalg;   // standard 'aktive'
  hvem: Hvem;       // standard 'alle'
  soeg: string;     // standard ''
}
```

| Felt | I adressen | Standard |
|---|---|---|
| `sag` | `?sag=12` | ingen |
| `udvalg` | `?status=Afventer`, `?status=afsluttede`, `?status=alle` | aktive, udelades |
| `hvem` | `?hvem=ledige`, `?hvem=mine` | alle, udelades |
| `soeg` | `?q=Ringvej` | tom, udelades |

To funktioner:

- `laesVisning(url: string): IVisning`
- `byggUrl(sideUrl: string, visning: IVisning): string`

**Regler:**

- Standardværdier skrives ikke i adressen, så den almindelige visning har en ren adresse.
- Andre parametre i adressen bevares, fx SharePoints egne. Det gør `byggSagLink` allerede i dag.
- Gamle `#sag-<id>`-links parses fortsat, men genereres aldrig. Begrundelsen står i det
  oprindelige design: et hash i den initielle URL crasher SharePoints side-bootstrap ved kold
  indlæsning.
- Ugyldige værdier falder stille tilbage til standard, fx `?status=Lukket` fra et gammelt
  bogmærke eller `?sag=abc`. Et ugyldigt `sag` giver dashboardet og ikke en tom side.
- `?q=` URL-kodes og -afkodes, så æ/ø/å og mellemrum overlever.

### Adressen er den eneste kilde

`Jordportalen.tsx` holder visningen i state, men læser den altid fra adressen og ændrer den
kun gennem én funktion:

```ts
naviger(visning: IVisning, maade: 'nyt-trin' | 'erstat'): void
```

| Handling | Måde | Hvorfor |
|---|---|---|
| Åbne en sag | `nyt-trin` (`pushState`) | Browserens tilbage-knap skal føre til oversigten |
| Skifte filter, udvalg eller hvem | `erstat` (`replaceState`) | Tilbage-knappen skal ikke træde gennem hvert filterskift |
| Skrive i søgefeltet | `erstat` | Ikke ét historiktrin pr. tastetryk |

En lytter på `popstate` læser adressen igen, når brugeren bruger browserens tilbage og frem.

Historiktrin, portalen selv lægger, mærkes i `history.state` (`{ jordportalen: true }`).

### "← Oversigten"

- Ligger der et trin fra portalen bagved, fordi sagen blev åbnet fra oversigten, går knappen
  ét trin tilbage (`history.back()`). Så opstår der ikke dobbelte trin, og oversigten kommer
  tilbage med sine filtre.
- Er sagen åbnet direkte fra et link, fx i en mail, er der ingen oversigt bagved. Så lægges
  oversigten ind som nyt trin med standardfiltre.

Beslutningen ligger i en ren funktion, så den kan testes:

```ts
tilbageHandling(historyState: unknown): 'gaa-tilbage' | 'nyt-trin'
```

### Risiko

SharePoints moderne sider har deres egen navigation, som muligvis reagerer på `popstate`.
Fører browserens tilbage-knap til en fuld genindlæsning af siden, virker løsningen stadig,
fordi filtrene står i adressen, men den bliver langsommere. Det kan kun afgøres i en browser
og er derfor browsertjek nr. 1 (afsnit 5).

---

## 3. Dashboardet

### Hentning

- Alle sager hentes med ét kald, `hentAlleSager()` uden filter, når dashboardet åbnes. Det
  sker også ved tilbagevenden fra en sag, så et statusskift ses med det samme.
- `Grundejere` hentes med i oversigtsfelterne, så søgningen kan ramme den.
- Advarslen ved afkortning bliver.
- `dashboardFilter` i `domaene/forespoergsler.ts` og `IDashboardFilter` fjernes sammen med
  deres tests, så der ikke er to filtreringer, der kan komme ud af trit. Dashboardet
  genindlæser ikke længere ved filterskift.

### Filtrering

En ren funktion i et nyt modul `domaene/dashboard.ts`:

```ts
filtrerSager(sager: ISag[], visning: IVisning, brugerId: number): ISag[]
```

- `aktive` er alt undtagen `Afgjort` og `Afvist`. `afsluttede` er de to. `alle` er alt. En
  bestemt status er præcis den status.
- `ledige` er sager uden `AnsvarligId`. `mine` er `AnsvarligId === brugerId`.
- Søgningen matcher sagsnummer (`SubmissionSerial`), `Title`, `AdresserTekst` og
  `Grundejere`, uden hensyn til store og små bogstaver og efter trim.
- Rækkefølgen bevares: nyeste `ModtagetDato` først, som serveren leverer.

Listen over afsluttede statusser ligger i `domaene/statusregler.ts` sammen med de øvrige
statusregler.

### Filterlinjen

- **Udvalg** i én dropdown: *Aktive sager* (standard), *Afsluttede*, *Alle*, en skillelinje og
  derefter hver status fra `ALLE_STATUS`.
- **Hvem** som tre knapper side om side (Fluent `ToggleButton`): *Alle · Ledige · Mine*.
  De afløser de to kontakter, der slog hinanden fra.
- **Søgefeltet** har pladsholderen *"Søg på sagsnummer, adresse eller grundejer"*.
- **"Nulstil"** vises kun, når visningen afviger fra standard, og sætter udvalg, hvem og
  søgning tilbage.
- Dropdownen beholder `mountNode`. Uden den mister popuppen sin styling (se `MountNode.tsx`).

### Nøgletalskort

```ts
taelNoegletal(sager: ISag[], brugerId: number): { aktive, ledige, mine, afventer }
```

- De tæller altid **aktive** sager, uanset filtre, så tallene står stille, mens man filtrerer.
- *Afventer* er en delmængde af aktive.
- Er resultatet afkortet, viser *Aktive* `5.000+`, som i dag.

Kortene er genveje:

| Kort | Sætter |
|---|---|
| Aktive | udvalg `aktive`, hvem `alle` |
| Ledige | udvalg `aktive`, hvem `ledige` |
| Mine | udvalg `aktive`, hvem `mine` |
| Afventer | udvalg `Afventer`, hvem `alle` |

Søgningen bevares ved klik på et kort. Det kort, hvis genvej svarer til den aktuelle visning,
vises markeret. Kortene er rigtige knapper med `aria-pressed`, så de kan bruges med
tastaturet. Genvejene og reglen for markering ligger som rene funktioner i
`domaene/dashboard.ts`.

### Tabellen

- "Ledig" i Ansvarlig-kolonnen bliver en diskret mærkat (Fluent `Badge`, appearance
  `outline`) i stedet for en knap.
- Status vises med den fælles `StatusMaerkat` (afsnit 4).
- Ingen træf: teksten *"Ingen sager matcher"* og en knap *"Nulstil filtre"*. Den vises kun, når
  visningen afviger fra standard. Er der slet ingen aktive sager, står der *"Ingen aktive
  sager"*.

---

## 4. Sagssiden

### Overskrift

En ny komponent `components/detalje/SagHoved.tsx` afløser den løse "Tilbage"-knap i
`SagDetalje.tsx`:

```
← Oversigten                                          [Kopiér link]
Sag 75 · Ringvej 12, 8000 Aarhus C (+2 flere)
[Afventer: Høring]   Ansvarlig: Mette Hansen   Modtaget 3. sep. 2026
```

- **"← Oversigten"** følger reglerne i afsnit 2.
- **Titlen** er `Sag {SubmissionSerial} · {Title}`. `Title` er allerede første adresse med
  "(+N flere)", sat af robotten.
- **Status** vises med `StatusMaerkat`.
- **Ansvarlig** vises kort: navnet, eller "Ledig". `AnsvarligKort` nedenunder beholder
  billede, kontaktlinks og knapperne til at tage og frigive. Overskriften fortæller hvem, og
  kortet er der, man handler.
- **Modtaget** vises som dato i dansk format.
- **"Kopiér link"** kopierer `byggUrl(sideUrl, { sag })` med `navigator.clipboard.writeText`.
  Lykkes det, vises kort *"Link kopieret"*. Fejler det, vises *"Linket kunne ikke kopieres.
  Kopiér adressen fra adresselinjen."*

Overskriften scroller med siden.

### Fælles statusmærkat

`STATUS_FARVE` flyttes fra `SagsTabel.tsx` til en ny komponent
`components/faelles/StatusMaerkat.tsx`. Den viser status og, ved `Afventer`, årsagen. Tabellen
og overskriften bruger den begge, så de ikke kan komme til at vise status forskelligt.

### Rettelse i `Metadata.tsx`

Adresselinjen under hver ejendom viser kun de dele, der har en værdi: "Matrikel 1234a",
"Lokalitet 751-00123", begge adskilt af " · ", eller ingenting. I dag vises
"Matrikel · Lokalitet" med tomme værdier.

---

## 5. Fejlhåndtering, test og udrulning

### Fejlhåndtering

| Situation | Håndtering |
|---|---|
| Ugyldig værdi i adressen | Standard. Ingen fejlbjælke, for det er ikke brugerens fejl |
| Browseren nægter adgang til udklipsholderen | Besked med henvisning til adresselinjen |
| Hentning af sager fejler | Som i dag. Filtrene står i adressen, så en genindlæsning bringer brugeren tilbage til samme visning |

### Tests (jest)

Samme linje som resten af projektet: de rene funktioner, hvor fejlene ikke giver nogen besked.
Ingen komponenttests, jf. det oprindelige design.

- **`visning.ts`:**
  - Adressen læses og bygges igen til det samme.
  - Standardværdier udelades.
  - Fremmede parametre bevares.
  - Gamle `#sag-`-links virker.
  - Ugyldige værdier giver standard.
  - Æ/ø/å og mellemrum i `q` overlever.
- **`tilbageHandling`:** går tilbage med portalens markør i `history.state`, lægger nyt trin
  uden den eller med `null`.
- **`filtrerSager`:**
  - Hvert udvalg og hver hvem-værdi.
  - Søgning på hvert af de fire felter, med store og små bogstaver og mellemrum omkring.
  - Rækkefølgen bevares.
- **`taelNoegletal`:** tæller kun aktive sager, uanset filtre.
- **Kortenes genveje og markering.**
- `tests/deepLink.test.ts` flyttes over i testene for `visning.ts`, så intet eksisterende
  tilfælde går tabt. Testene for `dashboardFilter` slettes sammen med funktionen.

### Browsertjek

Tilføjes i `OVERDRAGELSE.md`:

1. På den rigtige side: åbn en sag fra en filtreret oversigt og brug browserens tilbage-knap.
   Oversigten skal komme tilbage med filtrene. Tjek om siden genindlæses helt (risikoen i
   afsnit 2).
2. Sæt et filter og genindlæs siden. Filtret skal stå der stadig.
3. Åbn et sagslink i en ny fane (kold indlæsning) og klik "← Oversigten". Det skal give
   oversigten med standardfiltre, ikke forlade siden.
4. Klik hvert nøgletalskort og tjek, at listen og markeringen passer.
5. "Kopiér link", og indsæt linket i en ny fane.

### Udrulning og dokumentation

- Versionen hæves i `config/package-solution.json`, begge steder (`solution.version` og
  `solution.features[0].version`), jf. `DEPLOY.md`.
- De forkerte kommandoer rettes i `NAESTE-SKRIDT.md`, `OVERDRAGELSE.md` og `DEPLOY.md`:
  `npm run serve` bliver `npm start`, og `npm run package-solution -- --ship` fjernes, fordi
  `npm run build` allerede pakker løsningen til produktion.

---

## 6. Filer

| Fil | Ændring |
|---|---|
| `utils/visning.ts` | Ny. Afløser `utils/deepLink.ts` |
| `utils/deepLink.ts` | Slettes |
| `domaene/dashboard.ts` | Ny: `filtrerSager`, `taelNoegletal`, kortgenveje |
| `domaene/statusregler.ts` | Listen over afsluttede statusser |
| `domaene/forespoergsler.ts` | `dashboardFilter` og `IDashboardFilter` fjernes |
| `services/SagService.ts` | `hentAlleSager()` uden filter, `Grundejere` i oversigtsfelterne |
| `components/Jordportalen.tsx` | Visning fra adressen, `naviger`, `popstate` |
| `components/dashboard/Dashboard.tsx` | Filtrering i browseren, visning via props |
| `components/dashboard/Filtre.tsx` | Udvalg, hvem-knapper, nulstil |
| `components/dashboard/KpiKort.tsx` | Aktive-tal, klikbare kort |
| `components/dashboard/SagsTabel.tsx` | Ledig-mærkat, `StatusMaerkat`, tom tilstand |
| `components/detalje/SagHoved.tsx` | Ny |
| `components/detalje/SagDetalje.tsx` | Bruger `SagHoved` |
| `components/detalje/Metadata.tsx` | Matrikel/lokalitet |
| `components/faelles/StatusMaerkat.tsx` | Ny |
| `tests/visning.test.ts`, `tests/dashboard.test.ts` | Nye. `deepLink.test.ts` flyttes ind |
| `config/package-solution.json` | Versionen hæves |
| `OVERDRAGELSE.md`, `NAESTE-SKRIDT.md`, `DEPLOY.md` | Browsertjek og kommandoer |
