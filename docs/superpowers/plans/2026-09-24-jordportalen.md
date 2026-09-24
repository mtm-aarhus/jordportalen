# Jordportalen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Et SPFx-dashboard hvor sagsbehandlere i Jord og Grundvand kan se, tage og behandle §8-ansøgninger, som robotten har hentet fra OS2Forms til SharePoint.

**Architecture:** Én SPFx-webpart med intern routing mellem dashboard og detaljeside. Al SharePoint-kommunikation går gennem et servicelag, hvor hver service dækker én liste. Den logik, der kan gå galt — paginering, ETag-samtidighed, statusregler, forfatterfilter, deep-links — ligger i rene funktioner uden PnPjs-afhængighed, så den kan testes uden SharePoint. Detaljesiden er delt i selvstændige paneler frem for én stor komponent.

**Tech Stack:** SPFx 1.22, React 17, TypeScript 5.8, Fluent UI React v9, PnPjs v4, Jest + ts-jest, Node ≥ 22.14.

**Spec:** `docs/superpowers/specs/2026-09-24-jordportalen-design.md`

## Global Constraints

- **Node ≥ 22.14.0**, npm 10.x. Bekræftet installeret.
- **SharePoint-site:** `https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard`
- **Listenavne og kolonnenavne** er låst i `SHAREPOINT-LISTER.md` og må ikke afvige. De er rene ASCII uden æøå; **valgmuligheder** indeholder derimod danske tegn (`Rådgiver`, `Høring`) og skal matche byte for byte.
- **Komponenter kalder aldrig PnPjs direkte.** Kun services.
- **Deep-links bruger `?sag=<id>`**, aldrig `#sag-<id>` i genererede links.
- **Alle portal-baserede Fluent-komponenter** (`Dropdown`, `Combobox`, `Dialog`, `Menu`, `Tooltip`, `Popover`) skal have `mountNode` sat, ellers mister de deres styling.
- **Ingen Microsoft Graph.** Profildata hentes fra SharePoints egne kilder.
- **Robottens felter skrives aldrig fra frontenden.** Kun `Status`, `AfventerAarsag` og `Ansvarlig` på `P8Ansogninger`.
- **Versionsnummer bumpes to steder** i `config/package-solution.json` ved hver udrulning: i roden og inde i `solution`.

---

## Forudsætning før Task 1

De ni SharePoint-lister skal være oprettet, og de interne kolonnenavne skal være bekræftet identiske med visningsnavnene. Kør i browserens adresselinje, én liste ad gangen:

```
https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/_api/web/lists/getbytitle('P8Ansogninger')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false and ReadOnlyField eq false
```

Afviger et internt navn fra visningsnavnet, så stop. Koden skriver til interne navne, og en uoverensstemmelse giver ingen fejl — værdien forsvinder bare ud af syne.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/webparts/jordportalen/JordportalenWebPart.ts` | SPFx-indgang, PnPjs-init, tema |
| `src/webparts/jordportalen/domaene/typer.ts` | Listenavne, datatyper, felt-konstanter |
| `src/webparts/jordportalen/domaene/statusregler.ts` | Tilladte statusskift, validering |
| `src/webparts/jordportalen/domaene/paginering.ts` | Hent alle sider, detektér afkortning |
| `src/webparts/jordportalen/domaene/samtidighed.ts` | ETag-skrivning, 412-oversættelse |
| `src/webparts/jordportalen/domaene/forespoergsler.ts` | OData-filtre som rene funktioner |
| `src/webparts/jordportalen/utils/deepLink.ts` | Byg og parse `?sag=` |
| `src/webparts/jordportalen/services/SagService.ts` | `P8Ansogninger` + de tre læse-kun detaljelister |
| `src/webparts/jordportalen/services/LogService.ts` | `P8Log` |
| `src/webparts/jordportalen/services/NoteService.ts` | `P8Noter` |
| `src/webparts/jordportalen/services/OpgaveService.ts` | `P8Opgaver` |
| `src/webparts/jordportalen/services/LinkService.ts` | `P8Links` |
| `src/webparts/jordportalen/services/DokumentService.ts` | `P8Dokumenter` |
| `src/webparts/jordportalen/services/ProfilService.ts` | Brugersøgning og profildata |
| `src/webparts/jordportalen/components/Jordportalen.tsx` | Rod, routing |
| `src/webparts/jordportalen/components/faelles/MountNode.tsx` | Delt mountNode til Fluent-portaler |
| `src/webparts/jordportalen/components/faelles/PeoplePicker.tsx` | Brugervælger |
| `src/webparts/jordportalen/components/dashboard/*.tsx` | KpiKort, Filtre, SagsTabel |
| `src/webparts/jordportalen/components/detalje/*.tsx` | SagDetalje, Metadata, AnsvarligKort, syv paneler |
| `tests/*.test.ts` | Jest-tests af domænelaget |

---

### Task 1: Projektstillads og testopsætning

**Files:**
- Create: hele SPFx-projektet via Yeoman
- Create: `jest.config.js`
- Create: `tests/opsaetning.test.ts`
- Modify: `package.json`
- Modify: `config/package-solution.json`

**Interfaces:**
- Consumes: intet
- Produces: et projekt hvor `npm test` kører, og `npm run build` bygger

- [ ] **Step 1: Kør SPFx-generatoren**

Kør i `C:\Users\azmda0l\Source\jordportalen`:

```bash
npx --yes @microsoft/generator-sharepoint@latest
```

Svar:
- Solution name: `jordportalen`
- Component type: `WebPart`
- Web part name: `Jordportalen`
- Framework: `React`

Generatoren opretter i den eksisterende mappe. Eksisterende filer (`docs/`, `scripts/`, `*.md`) røres ikke.

- [ ] **Step 2: Bekræft at projektet bygger**

Run: `npm install && npm run build`
Expected: bygger uden fejl. Tager nogle minutter første gang.

- [ ] **Step 3: Installer testafhængigheder**

```bash
npm install --save-dev jest@29 ts-jest@29 @types/jest@29
```

- [ ] **Step 4: Opret jest.config.js**

```javascript
// Jest koerer uafhaengigt af SPFx' egen Heft-byggekaede. Det er bevidst:
// Heft-integrationen varierer mellem SPFx-versioner, og domaenelaget har
// ingen SPFx-afhaengigheder, saa det kan testes for sig.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/webparts/jordportalen/domaene/**/*.ts'],
};
```

- [ ] **Step 5: Tilføj test-script**

I `package.json`, under `scripts`, tilføj:

```json
"test": "jest"
```

- [ ] **Step 6: Skriv en test der beviser at opsætningen virker**

`tests/opsaetning.test.ts`:

```typescript
describe('testopsaetning', () => {
  it('koerer TypeScript', () => {
    const tal: number = 2 + 2;
    expect(tal).toBe(4);
  });
});
```

- [ ] **Step 7: Kør testen**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 8: Sæt udrulningsflag**

I `config/package-solution.json`, inde i `solution`, sæt:

```json
"includeClientSideAssets": true,
"skipFeatureDeployment": true
```

Uden dem opdateres UI ikke efter udrulning, hvilket ligner en cache-fejl og ikke er det.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Projektstillads: SPFx-webpart og Jest"
```

---

### Task 2: Domænetyper og listenavne

**Files:**
- Create: `src/webparts/jordportalen/domaene/typer.ts`
- Test: `tests/typer.test.ts`

**Interfaces:**
- Consumes: intet
- Produces: `LIST_NAMES`, `SagStatus`, `AfventerAarsag`, `KontaktType`, `ISag`, `IAdresse`, `IKontakt`, `IBilag`, `ILogPost`, `INote`, `IOpgave`, `ILink`, `IDokument`, `IPerson`, `ALLE_STATUS`, `ALLE_AARSAGER`

- [ ] **Step 1: Skriv den fejlende test**

`tests/typer.test.ts`:

```typescript
import { LIST_NAMES, ALLE_STATUS, ALLE_AARSAGER } from '../src/webparts/jordportalen/domaene/typer';

describe('typer', () => {
  it('navngiver alle ni lister', () => {
    expect(Object.keys(LIST_NAMES)).toHaveLength(9);
    expect(LIST_NAMES.SAGER).toBe('P8Ansogninger');
    expect(LIST_NAMES.DOKUMENTER).toBe('P8Dokumenter');
  });

  it('bruger rene ASCII-listenavne, da SharePoint koder specialtegn om', () => {
    Object.values(LIST_NAMES).forEach((navn) => {
      expect(navn).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  it('har de fem statusser i sagsgangens raekkefoelge', () => {
    expect(ALLE_STATUS).toEqual(['Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist']);
  });

  it('har de tre afventer-aarsager med danske tegn intakte', () => {
    expect(ALLE_AARSAGER).toEqual(['Materiale', 'Høring', 'Vurderingssvar']);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- typer`
Expected: FAIL — `Cannot find module '.../typer'`

- [ ] **Step 3: Skriv typer.ts**

```typescript
/**
 * Datatyper og listenavne for Jordportalen.
 *
 * Listenavne og feltnavne er laast i SHAREPOINT-LISTER.md. De er rene ASCII,
 * fordi SharePoint koder specialtegn om i det interne kolonnenavn og afkorter
 * ved 32 tegn - og det interne navn er laast fra oprettelsen.
 *
 * Valgmuligheder indeholder derimod danske tegn og skal matche byte for byte,
 * da vaerdierne kommer fra OS2Forms-blanketten.
 */

export const LIST_NAMES = {
  SAGER: 'P8Ansogninger',
  ADRESSER: 'P8Adresser',
  KONTAKTER: 'P8Kontakter',
  BILAG: 'P8Vedhaeftninger',
  LOG: 'P8Log',
  NOTER: 'P8Noter',
  OPGAVER: 'P8Opgaver',
  LINKS: 'P8Links',
  DOKUMENTER: 'P8Dokumenter',
} as const;

export const ALLE_STATUS = ['Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist'] as const;
export type SagStatus = (typeof ALLE_STATUS)[number];

export const ALLE_AARSAGER = ['Materiale', 'Høring', 'Vurderingssvar'] as const;
export type AfventerAarsag = (typeof ALLE_AARSAGER)[number];

export const ALLE_KONTAKTTYPER = ['Grundejer', 'Bygherre', 'Rådgiver'] as const;
export type KontaktType = (typeof ALLE_KONTAKTTYPER)[number];

export type Handling =
  | 'Statusskift'
  | 'Kommentar'
  | 'Sag taget'
  | 'Sag frigivet'
  | 'Opgave oprettet'
  | 'Opgave udført'
  | 'Dokument uploadet'
  | 'Link tilføjet';

export interface IPerson {
  Id: number;
  Title: string;
  EMail?: string;
}

export interface IUrlFelt {
  Url: string;
  Description?: string;
}

/** Én raekke i P8Ansogninger. */
export interface ISag {
  Id: number;
  Title: string;
  SubmissionUUID: string;
  SubmissionSerial: number;
  SubmissionSid: number;
  OS2FormsUrl?: IUrlFelt;
  Udfylder?: string;
  IndsendtAf?: KontaktType;
  AnsogningsDato?: string;
  Bemaerkninger?: string;
  ModtagetDato?: string;
  AfsluttetDato?: string;
  FlereGrundejere: boolean;
  BygherreSammeSomGrundejer: boolean;
  Status: SagStatus;
  AfventerAarsag?: AfventerAarsag;
  Ansvarlig?: IPerson;
  AnsvarligId?: number;
  AntalAdresser: number;
  AntalKontakter: number;
  AntalVedhaeftninger: number;
  AdresserTekst?: string;
  Grundejere?: string;
  /** SharePoints ETag. Bruges til at opdage samtidige aendringer. */
  etag?: string;
}

export interface IAdresse {
  Id: number;
  Title: string;
  Adresse?: string;
  Matrikel?: string;
  LokalitetsNummer?: string;
}

export interface IKontakt {
  Id: number;
  Title: string;
  KontaktType: KontaktType;
  ErUdfylder: boolean;
  Navn?: string;
  Firma?: string;
  CVR?: string;
  Email?: string;
  Telefon?: string;
  Adresse?: string;
}

export interface IBilag {
  Id: number;
  Title: string;
  FilId?: string;
  Filnavn?: string;
  FilUrl?: IUrlFelt;
}

export interface ILogPost {
  Id: number;
  Title: string;
  SagId: number;
  Handling: Handling;
  FraStatus?: string;
  TilStatus?: string;
  Kommentar?: string;
  TaggedeBrugere?: IPerson[];
  Created: string;
  Author: IPerson;
}

export interface INote {
  Id: number;
  SagId: number;
  Tekst: string;
  Created: string;
  Modified: string;
}

export interface IOpgave {
  Id: number;
  Title: string;
  SagId: number;
  Udfoert: boolean;
  Created: string;
}

export interface ILink {
  Id: number;
  Title: string;
  SagId: number;
  Url: IUrlFelt;
}

export interface IDokument {
  Id: number;
  Filnavn: string;
  ServerRelativeUrl: string;
  SagId: number;
  Modified: string;
}

/** Profildata til AnsvarligKort. Hentes uden Microsoft Graph. */
export interface IProfil {
  Id: number;
  Navn: string;
  Mail?: string;
  JobTitel?: string;
  Afdeling?: string;
  BilledeUrl: string;
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- typer`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/domaene/typer.ts tests/typer.test.ts
git commit -m "Domaenetyper og listenavne"
```

---

### Task 3: Statusregler

**Files:**
- Create: `src/webparts/jordportalen/domaene/statusregler.ts`
- Test: `tests/statusregler.test.ts`

**Interfaces:**
- Consumes: `SagStatus`, `AfventerAarsag` fra `typer.ts`
- Produces: `maaSkifte(fra: SagStatus, til: SagStatus): boolean`, `naeste(fra: SagStatus): SagStatus[]`, `validerStatusskift(fra: SagStatus, til: SagStatus, aarsag?: AfventerAarsag): string | undefined`

- [ ] **Step 1: Skriv den fejlende test**

`tests/statusregler.test.ts`:

```typescript
import { maaSkifte, naeste, validerStatusskift } from '../src/webparts/jordportalen/domaene/statusregler';

describe('statusregler', () => {
  it('tillader den normale vej gennem sagsgangen', () => {
    expect(maaSkifte('Ny', 'Under behandling')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afventer')).toBe(true);
    expect(maaSkifte('Afventer', 'Under behandling')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afgjort')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afvist')).toBe(true);
  });

  it('tillader at springe direkte fra Ny til afgoerelse', () => {
    expect(maaSkifte('Ny', 'Afvist')).toBe(true);
  });

  it('afviser skift fra en afsluttet sag', () => {
    expect(maaSkifte('Afgjort', 'Under behandling')).toBe(false);
    expect(maaSkifte('Afvist', 'Ny')).toBe(false);
  });

  it('afviser skift til samme status', () => {
    expect(maaSkifte('Ny', 'Ny')).toBe(false);
  });

  it('afviser at gaa tilbage til Ny', () => {
    expect(maaSkifte('Under behandling', 'Ny')).toBe(false);
  });

  it('opremser de mulige naeste statusser', () => {
    expect(naeste('Ny')).toEqual(['Under behandling', 'Afgjort', 'Afvist']);
    expect(naeste('Afgjort')).toEqual([]);
  });

  it('kraever en aarsag naar der skiftes til Afventer', () => {
    expect(validerStatusskift('Under behandling', 'Afventer')).toBe(
      'Vælg en årsag når sagen sættes på afventende.'
    );
    expect(validerStatusskift('Under behandling', 'Afventer', 'Høring')).toBeUndefined();
  });

  it('afviser en aarsag naar der ikke skiftes til Afventer', () => {
    expect(validerStatusskift('Afventer', 'Afgjort', 'Høring')).toBe(
      'Årsag kan kun angives sammen med status Afventer.'
    );
  });

  it('afviser et ulovligt skift med en laesbar besked', () => {
    expect(validerStatusskift('Afgjort', 'Ny')).toBe(
      'Status kan ikke skifte fra Afgjort til Ny.'
    );
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- statusregler`
Expected: FAIL — modulet findes ikke.

- [ ] **Step 3: Skriv statusregler.ts**

```typescript
import { AfventerAarsag, SagStatus } from './typer';

/**
 * Sagsgangen for en paragraf 8-ansoegning.
 *
 *   Ny -> Under behandling -> Afventer -> Afgjort eller Afvist
 *
 * Afventer og Under behandling kan skifte frem og tilbage, fordi materiale
 * kommer ind og sagen genoptages. Afgjort og Afvist er endelige - en afsluttet
 * sag genaabnes ikke, den faar en ny ansoegning.
 */
const TILLADTE_SKIFT: Record<SagStatus, SagStatus[]> = {
  'Ny': ['Under behandling', 'Afgjort', 'Afvist'],
  'Under behandling': ['Afventer', 'Afgjort', 'Afvist'],
  'Afventer': ['Under behandling', 'Afgjort', 'Afvist'],
  'Afgjort': [],
  'Afvist': [],
};

export function maaSkifte(fra: SagStatus, til: SagStatus): boolean {
  return TILLADTE_SKIFT[fra].indexOf(til) !== -1;
}

export function naeste(fra: SagStatus): SagStatus[] {
  return TILLADTE_SKIFT[fra];
}

/**
 * Validerer et statusskift. Returnerer en laesbar fejlbesked, eller undefined
 * hvis skiftet er i orden.
 *
 * Aarsagen hoerer kun til Afventer. Uden den regel ville en sag kunne staa som
 * Afgjort med en afventer-aarsag haengende ved, og dashboardets filtre ville
 * vise noget forkert.
 */
export function validerStatusskift(
  fra: SagStatus,
  til: SagStatus,
  aarsag?: AfventerAarsag
): string | undefined {
  if (!maaSkifte(fra, til)) {
    return `Status kan ikke skifte fra ${fra} til ${til}.`;
  }
  if (til === 'Afventer' && !aarsag) {
    return 'Vælg en årsag når sagen sættes på afventende.';
  }
  if (til !== 'Afventer' && aarsag) {
    return 'Årsag kan kun angives sammen med status Afventer.';
  }
  return undefined;
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- statusregler`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/domaene/statusregler.ts tests/statusregler.test.ts
git commit -m "Statusregler med validering af afventer-aarsag"
```

---

### Task 4: Paginering med synlig afkortning

**Files:**
- Create: `src/webparts/jordportalen/domaene/paginering.ts`
- Test: `tests/paginering.test.ts`

**Interfaces:**
- Consumes: intet
- Produces: `hentAlleSider<T>(hentSide: SideHenter<T>, sideStoerrelse?: number, maksAntal?: number): Promise<ISideResultat<T>>`, `ISideResultat<T>` med `{ elementer: T[]; afkortet: boolean }`, `SideHenter<T>`

- [ ] **Step 1: Skriv den fejlende test**

`tests/paginering.test.ts`:

```typescript
import { hentAlleSider } from '../src/webparts/jordportalen/domaene/paginering';

/** Laver en falsk sidehenter over et kendt datasaet. */
function falskHenter(antalIAlt: number): (skip: number, antal: number) => Promise<number[]> {
  const alle = Array.from({ length: antalIAlt }, (_, i) => i);
  return async (skip: number, antal: number) => alle.slice(skip, skip + antal);
}

describe('hentAlleSider', () => {
  it('henter alt naar det fylder mindre end én side', async () => {
    const r = await hentAlleSider(falskHenter(30), 100, 5000);
    expect(r.elementer).toHaveLength(30);
    expect(r.afkortet).toBe(false);
  });

  it('henter alle sider naar der er flere', async () => {
    const r = await hentAlleSider(falskHenter(250), 100, 5000);
    expect(r.elementer).toHaveLength(250);
    expect(r.afkortet).toBe(false);
  });

  it('haandterer at antallet gaar praecis op i sidestoerrelsen', async () => {
    const r = await hentAlleSider(falskHenter(200), 100, 5000);
    expect(r.elementer).toHaveLength(200);
    expect(r.afkortet).toBe(false);
  });

  it('markerer afkortning naar sikkerhedsgraensen rammes', async () => {
    const r = await hentAlleSider(falskHenter(1000), 100, 250);
    expect(r.elementer).toHaveLength(250);
    expect(r.afkortet).toBe(true);
  });

  it('henter ikke flere sider end noedvendigt', async () => {
    let kald = 0;
    const henter = async (skip: number, antal: number) => {
      kald++;
      return falskHenter(150)(skip, antal);
    };
    await hentAlleSider(henter, 100, 5000);
    // 100, saa 50, saa stop. Ikke et tomt kald mere.
    expect(kald).toBe(2);
  });

  it('haandterer et tomt resultat', async () => {
    const r = await hentAlleSider(falskHenter(0), 100, 5000);
    expect(r.elementer).toHaveLength(0);
    expect(r.afkortet).toBe(false);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- paginering`
Expected: FAIL — modulet findes ikke.

- [ ] **Step 3: Skriv paginering.ts**

```typescript
/**
 * Henter alle sider af et resultatsaet.
 *
 * Idéportalen og Opgaveportalen bruger .top(500) og afskaerer resten uden fejl.
 * Deres egen TROUBLESHOOTING.md kalder det "stille og roligt" - det er den
 * vaerste slags fejl, fordi data forsvinder uden at nogen opdager det.
 *
 * Her hentes alle sider, og hvis sikkerhedsgraensen rammes, siges det
 * eksplicit i returvaerdien, saa graensefladen kan vise det.
 */

export type SideHenter<T> = (skip: number, antal: number) => Promise<T[]>;

export interface ISideResultat<T> {
  elementer: T[];
  /** Sand hvis maksAntal blev naaet, og der kan vaere flere. */
  afkortet: boolean;
}

export const STANDARD_SIDESTOERRELSE = 100;
export const STANDARD_MAKSANTAL = 5000;

export async function hentAlleSider<T>(
  hentSide: SideHenter<T>,
  sideStoerrelse: number = STANDARD_SIDESTOERRELSE,
  maksAntal: number = STANDARD_MAKSANTAL
): Promise<ISideResultat<T>> {
  const elementer: T[] = [];

  while (elementer.length < maksAntal) {
    const resterende = maksAntal - elementer.length;
    const antal = Math.min(sideStoerrelse, resterende);
    const side = await hentSide(elementer.length, antal);

    elementer.push(...side);

    // En side der ikke er fuld betyder, at vi er ved enden. Uden dette tjek
    // ville vi lave ét ekstra, tomt kald ved hver koersel.
    if (side.length < antal) {
      return { elementer, afkortet: false };
    }
  }

  return { elementer, afkortet: true };
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- paginering`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/domaene/paginering.ts tests/paginering.test.ts
git commit -m "Paginering der goer afkortning synlig"
```

---

### Task 5: ETag-samtidighed

**Files:**
- Create: `src/webparts/jordportalen/domaene/samtidighed.ts`
- Test: `tests/samtidighed.test.ts`

**Interfaces:**
- Consumes: intet
- Produces: `SamtidighedsFejl` (klasse), `AdgangsFejl` (klasse), `skrivMedEtag<T>(skriv: () => Promise<T>, beskrivelse: string): Promise<T>`, `erSamtidighedsfejl(fejl: unknown): boolean`

- [ ] **Step 1: Skriv den fejlende test**

`tests/samtidighed.test.ts`:

```typescript
import {
  AdgangsFejl,
  SamtidighedsFejl,
  erSamtidighedsfejl,
  skrivMedEtag,
} from '../src/webparts/jordportalen/domaene/samtidighed';

/** Efterligner den fejl PnPjs kaster ved en HTTP-statuskode. */
function httpFejl(status: number): Error {
  const fejl = new Error(`Error making HttpClient request in queryable [${status}]`);
  (fejl as unknown as { status: number }).status = status;
  return fejl;
}

describe('skrivMedEtag', () => {
  it('returnerer resultatet naar skrivningen lykkes', async () => {
    const r = await skrivMedEtag(async () => 'ok', 'tage sagen');
    expect(r).toBe('ok');
  });

  it('oversaetter 412 til en samtidighedsfejl med laesbar besked', async () => {
    await expect(
      skrivMedEtag(async () => { throw httpFejl(412); }, 'tage sagen')
    ).rejects.toThrow(SamtidighedsFejl);

    try {
      await skrivMedEtag(async () => { throw httpFejl(412); }, 'tage sagen');
    } catch (e) {
      expect((e as Error).message).toBe(
        'Sagen blev ændret af en anden, mens du arbejdede. Genindlæs og prøv igen.'
      );
    }
  });

  it('oversaetter 403 til en adgangsfejl der naevner handlingen', async () => {
    try {
      await skrivMedEtag(async () => { throw httpFejl(403); }, 'tage sagen');
      fail('skulle have kastet');
    } catch (e) {
      expect(e).toBeInstanceOf(AdgangsFejl);
      expect((e as Error).message).toBe('Du har ikke rettigheder til at tage sagen.');
    }
  });

  it('sender andre fejl videre uroerte', async () => {
    const original = httpFejl(500);
    await expect(
      skrivMedEtag(async () => { throw original; }, 'tage sagen')
    ).rejects.toBe(original);
  });

  it('genkender en samtidighedsfejl', () => {
    expect(erSamtidighedsfejl(new SamtidighedsFejl('x'))).toBe(true);
    expect(erSamtidighedsfejl(new Error('x'))).toBe(false);
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- samtidighed`
Expected: FAIL — modulet findes ikke.

- [ ] **Step 3: Skriv samtidighed.ts**

```typescript
/**
 * Oversaetter SharePoints HTTP-fejl til noget en sagsbehandler kan forstaa.
 *
 * To sagsbehandlere kan klikke "Tag sagen" samtidig. Uden ETag lykkes begge
 * skrivninger, den sidste vinder, og den foerste tror han har sagen. Med ETag
 * afviser SharePoint den anden med 412, og brugeren faar det at vide med det
 * samme i stedet for at opdage det en time senere.
 */

export class SamtidighedsFejl extends Error {
  public constructor(besked: string) {
    super(besked);
    this.name = 'SamtidighedsFejl';
    // Noedvendigt naar der kompileres til ES5, ellers virker instanceof ikke.
    Object.setPrototypeOf(this, SamtidighedsFejl.prototype);
  }
}

export class AdgangsFejl extends Error {
  public constructor(besked: string) {
    super(besked);
    this.name = 'AdgangsFejl';
    Object.setPrototypeOf(this, AdgangsFejl.prototype);
  }
}

export function erSamtidighedsfejl(fejl: unknown): boolean {
  return fejl instanceof SamtidighedsFejl;
}

function statuskode(fejl: unknown): number | undefined {
  if (fejl && typeof fejl === 'object' && 'status' in fejl) {
    const status = (fejl as { status: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

/**
 * Koerer en skrivning og oversaetter de to fejl, brugere faktisk rammer.
 *
 * @param skriv Selve skrivningen, med ETag sat af kalderen.
 * @param beskrivelse Hvad brugeren forsoegte, i infinitiv: "tage sagen".
 *                    Indgaar i fejlbeskeden ved manglende rettigheder.
 */
export async function skrivMedEtag<T>(
  skriv: () => Promise<T>,
  beskrivelse: string
): Promise<T> {
  try {
    return await skriv();
  } catch (fejl) {
    const kode = statuskode(fejl);

    if (kode === 412) {
      throw new SamtidighedsFejl(
        'Sagen blev ændret af en anden, mens du arbejdede. Genindlæs og prøv igen.'
      );
    }
    if (kode === 403) {
      throw new AdgangsFejl(`Du har ikke rettigheder til at ${beskrivelse}.`);
    }
    throw fejl;
  }
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- samtidighed`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/domaene/samtidighed.ts tests/samtidighed.test.ts
git commit -m "ETag-samtidighed og oversaettelse af 403 og 412"
```

---

### Task 6: OData-filtre

**Files:**
- Create: `src/webparts/jordportalen/domaene/forespoergsler.ts`
- Test: `tests/forespoergsler.test.ts`

**Interfaces:**
- Consumes: `SagStatus` fra `typer.ts`
- Produces: `noteFilter(sagId: number, brugerId: number): string`, `sagIdFilter(sagId: number): string`, `uuidFilter(uuid: string): string`, `dashboardFilter(f: IDashboardFilter): string`, `IDashboardFilter`

- [ ] **Step 1: Skriv den fejlende test**

`tests/forespoergsler.test.ts`:

```typescript
import {
  dashboardFilter,
  noteFilter,
  sagIdFilter,
  uuidFilter,
} from '../src/webparts/jordportalen/domaene/forespoergsler';

describe('noteFilter', () => {
  it('filtrerer paa baade sag og forfatter', () => {
    // Forfatterfiltret ligger i selve forespoergslen, ikke kun i UI'et.
    // Uden det ville en ny ansvarlig se den forriges private noter.
    expect(noteFilter(42, 7)).toBe('SagId eq 42 and Author/Id eq 7');
  });
});

describe('sagIdFilter', () => {
  it('bruger tal uden anfoerselstegn', () => {
    expect(sagIdFilter(42)).toBe('SagId eq 42');
  });
});

describe('uuidFilter', () => {
  it('saetter anfoerselstegn om tekstvaerdien', () => {
    expect(uuidFilter('abc-123')).toBe("SubmissionUUID eq 'abc-123'");
  });

  it('undgaar at et apostrof braekker forespoergslen', () => {
    expect(uuidFilter("a'b")).toBe("SubmissionUUID eq 'a''b'");
  });
});

describe('dashboardFilter', () => {
  it('giver en tom streng naar intet er valgt', () => {
    expect(dashboardFilter({})).toBe('');
  });

  it('filtrerer paa status', () => {
    expect(dashboardFilter({ status: 'Afventer' })).toBe("Status eq 'Afventer'");
  });

  it('filtrerer paa mine sager', () => {
    expect(dashboardFilter({ ansvarligId: 7 })).toBe('AnsvarligId eq 7');
  });

  it('filtrerer paa ledige sager', () => {
    expect(dashboardFilter({ kunLedige: true })).toBe('AnsvarligId eq null');
  });

  it('kombinerer flere kriterier med and', () => {
    expect(dashboardFilter({ status: 'Ny', kunLedige: true })).toBe(
      "Status eq 'Ny' and AnsvarligId eq null"
    );
  });

  it('ignorerer ansvarligId naar kunLedige er sat, da de udelukker hinanden', () => {
    expect(dashboardFilter({ ansvarligId: 7, kunLedige: true })).toBe('AnsvarligId eq null');
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- forespoergsler`
Expected: FAIL — modulet findes ikke.

- [ ] **Step 3: Skriv forespoergsler.ts**

```typescript
import { SagStatus } from './typer';

/**
 * OData-filtre som rene funktioner, saa de kan testes uden SharePoint.
 *
 * Filtrene ligger i selve forespoergslen frem for i frontenden. Det er
 * afgoerende for noter, hvor forfatterfiltret er en del af beskyttelsen og
 * ikke maa kunne omgaas ved at aendre noget i UI'et.
 */

/** Escaper et apostrof, saa det ikke braekker OData-udtrykket. */
function tekst(vaerdi: string): string {
  return `'${vaerdi.replace(/'/g, "''")}'`;
}

/**
 * Noter for én sag, skrevet af én bruger.
 *
 * Opgaveportalens tilsvarende filtrerer kun paa opgave-id og gater i UI'et.
 * Skifter en sag ansvarlig, ser den nye dermed den forriges noter. Her ligger
 * forfatteren i forespoergslen, saa det ikke kan ske.
 */
export function noteFilter(sagId: number, brugerId: number): string {
  return `SagId eq ${sagId} and Author/Id eq ${brugerId}`;
}

export function sagIdFilter(sagId: number): string {
  return `SagId eq ${sagId}`;
}

export function uuidFilter(uuid: string): string {
  return `SubmissionUUID eq ${tekst(uuid)}`;
}

export interface IDashboardFilter {
  status?: SagStatus;
  ansvarligId?: number;
  kunLedige?: boolean;
}

export function dashboardFilter(f: IDashboardFilter): string {
  const dele: string[] = [];

  if (f.status) {
    dele.push(`Status eq ${tekst(f.status)}`);
  }

  // Ledig og "mine sager" udelukker hinanden. Ledig vinder, saa filtret ikke
  // kan ende med at spoerge efter sager der baade er mine og ledige - det ville
  // altid give nul raekker og ligne en fejl.
  if (f.kunLedige) {
    dele.push('AnsvarligId eq null');
  } else if (typeof f.ansvarligId === 'number') {
    dele.push(`AnsvarligId eq ${f.ansvarligId}`);
  }

  return dele.join(' and ');
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- forespoergsler`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/domaene/forespoergsler.ts tests/forespoergsler.test.ts
git commit -m "OData-filtre med forfatterfilter paa noter"
```

---

### Task 7: Deep-links

**Files:**
- Create: `src/webparts/jordportalen/utils/deepLink.ts`
- Test: `tests/deepLink.test.ts`

**Interfaces:**
- Consumes: intet
- Produces: `byggSagLink(sideUrl: string, sagId: number): string`, `parseSagId(url: string): number | undefined`

- [ ] **Step 1: Skriv den fejlende test**

`tests/deepLink.test.ts`:

```typescript
import { byggSagLink, parseSagId } from '../src/webparts/jordportalen/utils/deepLink';

const SIDE = 'https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/SitePages/Jord.aspx';

describe('byggSagLink', () => {
  it('bruger query-parameter, ikke hash', () => {
    expect(byggSagLink(SIDE, 42)).toBe(`${SIDE}?sag=42`);
  });

  it('tilfoejer til en URL der allerede har parametre', () => {
    expect(byggSagLink(`${SIDE}?env=1`, 42)).toBe(`${SIDE}?env=1&sag=42`);
  });

  it('erstatter et eksisterende sag-parameter i stedet for at duplikere det', () => {
    expect(byggSagLink(`${SIDE}?sag=7`, 42)).toBe(`${SIDE}?sag=42`);
  });
});

describe('parseSagId', () => {
  it('laeser query-parameteren', () => {
    expect(parseSagId(`${SIDE}?sag=42`)).toBe(42);
  });

  it('laeser stadig gamle hash-links af hensyn til eksisterende mails', () => {
    expect(parseSagId(`${SIDE}#sag-42`)).toBe(42);
  });

  it('giver undefined naar der ikke er nogen sag i URL en', () => {
    expect(parseSagId(SIDE)).toBeUndefined();
  });

  it('giver undefined ved en vaerdi der ikke er et tal', () => {
    expect(parseSagId(`${SIDE}?sag=abc`)).toBeUndefined();
  });

  it('giver undefined ved et negativt id', () => {
    expect(parseSagId(`${SIDE}?sag=-1`)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Kør testen og bekræft at den fejler**

Run: `npm test -- deepLink`
Expected: FAIL — modulet findes ikke.

- [ ] **Step 3: Skriv deepLink.ts**

```typescript
/**
 * Deep-links til en enkelt sag.
 *
 * Formatet er ?sag=<id>, ikke #sag-<id>. Et hash i den INITIELLE URL crasher
 * SharePoints eget side-bootstrap (sp-pages-assembly) ved koldt sideload -
 * altsaa netop naar nogen aabner et link fra en mail, foer webparten overhovedet
 * er mountet. Idéportalen har lært det; Opgaveportalen bruger stadig hash.
 *
 * Gamle hash-links parses fortsat, saa allerede udsendte mails virker, men
 * genereres aldrig.
 */

const PARAMETER = 'sag';
const LEGACY_HASH = /#sag-(\d+)\b/;

export function byggSagLink(sideUrl: string, sagId: number): string {
  const [basis, forespoergsel] = sideUrl.split('#')[0].split('?');

  const parametre = (forespoergsel ? forespoergsel.split('&') : []).filter(
    (p) => p.split('=')[0] !== PARAMETER
  );
  parametre.push(`${PARAMETER}=${sagId}`);

  return `${basis}?${parametre.join('&')}`;
}

export function parseSagId(url: string): number | undefined {
  const forespoergsel = url.split('#')[0].split('?')[1];

  if (forespoergsel) {
    for (const par of forespoergsel.split('&')) {
      const [navn, vaerdi] = par.split('=');
      if (navn === PARAMETER) {
        return gyldigtId(vaerdi);
      }
    }
  }

  const legacy = LEGACY_HASH.exec(url);
  return legacy ? gyldigtId(legacy[1]) : undefined;
}

function gyldigtId(raa: string | undefined): number | undefined {
  if (!raa || !/^\d+$/.test(raa)) {
    return undefined;
  }
  const id = parseInt(raa, 10);
  return id > 0 ? id : undefined;
}
```

- [ ] **Step 4: Kør testen og bekræft at den passerer**

Run: `npm test -- deepLink`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/utils/deepLink.ts tests/deepLink.test.ts
git commit -m "Deep-links med query-parameter frem for hash"
```

---

### Task 8: LogService

**Files:**
- Create: `src/webparts/jordportalen/services/LogService.ts`

**Interfaces:**
- Consumes: `LIST_NAMES`, `ILogPost`, `Handling`, `IPerson` fra `typer.ts`; `sagIdFilter` fra `forespoergsler.ts`; `hentAlleSider` fra `paginering.ts`
- Produces: `LogService` med `hentForSag(sagId: number): Promise<ILogPost[]>`, `tilfoej(post: INyLogPost): Promise<void>`, `INyLogPost`

- [ ] **Step 1: Skriv LogService.ts**

Servicen er tynd — al logik den kunne have, ligger allerede i `forespoergsler.ts` og `paginering.ts`, som er testet. Derfor ingen egen test her; den verificeres mod SharePoint i Task 16.

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { Handling, ILogPost, LIST_NAMES } from '../domaene/typer';

const FELTER = 'Id,Title,SagId,Handling,FraStatus,TilStatus,Kommentar,Created';
const UDVID = 'Author,TaggedeBrugere';
const UDVID_FELTER = 'Author/Id,Author/Title,Author/EMail,TaggedeBrugere/Id,TaggedeBrugere/Title,TaggedeBrugere/EMail';

export interface INyLogPost {
  sagId: number;
  handling: Handling;
  titel: string;
  fraStatus?: string;
  tilStatus?: string;
  kommentar?: string;
  /** SharePoint-bruger-id'er. Udloeser Power Automate-notifikationen. */
  taggedeBrugerIds?: number[];
}

/** Sagens faelles historik: statusskift, kommentarer og handlinger i én liste. */
export class LogService {
  public constructor(private readonly sp: SPFI) {}

  public async hentForSag(sagId: number): Promise<ILogPost[]> {
    const liste = this.sp.web.lists.getByTitle(LIST_NAMES.LOG);

    const resultat = await hentAlleSider<ILogPost>(async (skip, antal) =>
      liste.items
        .select(FELTER, UDVID_FELTER)
        .expand(UDVID)
        .filter(sagIdFilter(sagId))
        .orderBy('Created', false)
        .skip(skip)
        .top(antal)()
    );

    return resultat.elementer;
  }

  /**
   * Tilfoejer en logpost.
   *
   * Kastes en fejl her, maa kalderen IKKE rulle sin egen handling tilbage - et
   * statusskift der lykkedes, skal staa, selvom historikken mangler en linje.
   * Kalderen fanger fejlen og viser den i historik-panelet.
   */
  public async tilfoej(post: INyLogPost): Promise<void> {
    const vaerdier: Record<string, unknown> = {
      Title: post.titel,
      SagId: post.sagId,
      Handling: post.handling,
    };

    if (post.fraStatus) { vaerdier.FraStatus = post.fraStatus; }
    if (post.tilStatus) { vaerdier.TilStatus = post.tilStatus; }
    if (post.kommentar) { vaerdier.Kommentar = post.kommentar; }
    if (post.taggedeBrugerIds && post.taggedeBrugerIds.length > 0) {
      vaerdier.TaggedeBrugereId = { results: post.taggedeBrugerIds };
    }

    await this.sp.web.lists.getByTitle(LIST_NAMES.LOG).items.add(vaerdier);
  }
}
```

- [ ] **Step 2: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add src/webparts/jordportalen/services/LogService.ts
git commit -m "LogService: sagens faelles historik"
```

---

### Task 9: SagService — læsning

**Files:**
- Create: `src/webparts/jordportalen/services/SagService.ts`

**Interfaces:**
- Consumes: `LIST_NAMES`, `ISag`, `IAdresse`, `IKontakt`, `IBilag` fra `typer.ts`; `dashboardFilter`, `IDashboardFilter`, `uuidFilter` fra `forespoergsler.ts`; `hentAlleSider`, `ISideResultat` fra `paginering.ts`
- Produces: `SagService` med `hentAlleSager(filter: IDashboardFilter): Promise<ISideResultat<ISag>>`, `hentSag(id: number): Promise<ISag>`, `hentAdresser(uuid: string): Promise<IAdresse[]>`, `hentKontakter(uuid: string): Promise<IKontakt[]>`, `hentBilag(uuid: string): Promise<IBilag[]>`

- [ ] **Step 1: Skriv SagService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider, ISideResultat } from '../domaene/paginering';
import { dashboardFilter, IDashboardFilter, uuidFilter } from '../domaene/forespoergsler';
import { IAdresse, IBilag, IKontakt, ISag, LIST_NAMES } from '../domaene/typer';

/** Kun de felter dashboardet viser. Detaljerne hentes foerst naar en sag aabnes. */
const OVERSIGT_FELTER =
  'Id,Title,SubmissionSerial,Status,AfventerAarsag,ModtagetDato,AdresserTekst,AnsvarligId';

const SAG_FELTER =
  'Id,Title,SubmissionUUID,SubmissionSerial,SubmissionSid,OS2FormsUrl,Udfylder,IndsendtAf,' +
  'AnsogningsDato,Bemaerkninger,ModtagetDato,AfsluttetDato,FlereGrundejere,' +
  'BygherreSammeSomGrundejer,Status,AfventerAarsag,AnsvarligId,AntalAdresser,' +
  'AntalKontakter,AntalVedhaeftninger,AdresserTekst,Grundejere';

const ANSVARLIG_UDVID = 'Ansvarlig/Id,Ansvarlig/Title,Ansvarlig/EMail';

export class SagService {
  public constructor(private readonly sp: SPFI) {}

  /**
   * Henter sager til dashboardet.
   *
   * Filtret ligger server-side, saa sikkerhedsgraensen bruges paa relevante
   * raekker. Returvaerdien siger om resultatet blev afkortet - graensefladen
   * SKAL vise det, ellers forsvinder sager tavst.
   */
  public async hentAlleSager(filter: IDashboardFilter = {}): Promise<ISideResultat<ISag>> {
    const liste = this.sp.web.lists.getByTitle(LIST_NAMES.SAGER);
    const odata = dashboardFilter(filter);

    return hentAlleSider<ISag>(async (skip, antal) => {
      let forespoergsel = liste.items
        .select(OVERSIGT_FELTER, ANSVARLIG_UDVID)
        .expand('Ansvarlig')
        .orderBy('ModtagetDato', false)
        .skip(skip)
        .top(antal);

      if (odata) {
        forespoergsel = forespoergsel.filter(odata);
      }
      return forespoergsel();
    });
  }

  /**
   * Henter én sag med ETag.
   *
   * ETag'en foelger med, saa en senere skrivning kan opdage at en anden har
   * aendret sagen i mellemtiden. Uden den ville to samtidige "Tag sagen" begge
   * lykkes, og den foerste ville tro han havde sagen.
   */
  public async hentSag(id: number): Promise<ISag> {
    const svar = await this.sp.web.lists
      .getByTitle(LIST_NAMES.SAGER)
      .items.getById(id)
      .select(SAG_FELTER, ANSVARLIG_UDVID)
      .expand('Ansvarlig')();

    return { ...svar, etag: (svar as { __metadata?: { etag?: string } }).__metadata?.etag };
  }

  public async hentAdresser(uuid: string): Promise<IAdresse[]> {
    const r = await hentAlleSider<IAdresse>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.ADRESSER)
        .items.select('Id,Title,Adresse,Matrikel,LokalitetsNummer')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async hentKontakter(uuid: string): Promise<IKontakt[]> {
    const r = await hentAlleSider<IKontakt>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.KONTAKTER)
        .items.select('Id,Title,KontaktType,ErUdfylder,Navn,Firma,CVR,Email,Telefon,Adresse')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async hentBilag(uuid: string): Promise<IBilag[]> {
    const r = await hentAlleSider<IBilag>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.BILAG)
        .items.select('Id,Title,FilId,Filnavn,FilUrl')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }
}
```

- [ ] **Step 2: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 3: Bevis at ETag'en faktisk bliver hentet**

**Dette trin må ikke springes over.** PnPjs v4 sender som standard headeren
`odata=nometadata`, og så findes `__metadata` slet ikke i svaret. Er `etag`
`undefined`, springer `update()` samtidighedstjekket helt over **uden at fejle** —
og så er ETag-beskyttelsen i Task 10 stille slået fra, uden at noget afslører det.

Tilføj midlertidigt i `Jordportalen.tsx`s `useEffect`:

```typescript
    tjenester.sag.hentSag(1).then((s) => console.log('ETAG:', s.etag)).catch(() => undefined);
```

Run: `npm run serve` og åbn browserkonsollen.
Expected: `ETAG: "1"` eller lignende. **Er værdien `undefined`, så stop her.**

Er den `undefined`, hent i stedet ETag'en med en eksplicit header. Erstat kroppen
i `hentSag`:

```typescript
  public async hentSag(id: number): Promise<ISag> {
    const item = this.sp.web.lists.getByTitle(LIST_NAMES.SAGER).items.getById(id);

    // Beder eksplicit om metadata, da PnPjs ellers stripper ETag'en bort.
    const svar = await item
      .select(SAG_FELTER, ANSVARLIG_UDVID)
      .expand('Ansvarlig')
      .using((instance) => {
        instance.on.pre(async (url, init, result) => {
          init.headers = { ...init.headers, Accept: 'application/json;odata=minimalmetadata' };
          return [url, init, result];
        });
        return instance;
      })();

    const etag =
      (svar as { 'odata.etag'?: string })['odata.etag'] ??
      (svar as { __metadata?: { etag?: string } }).__metadata?.etag;

    return { ...svar, etag };
  }
```

Kør konsoltjekket igen og bekræft at `etag` nu har en værdi. Fjern derefter
console.log-linjen.

- [ ] **Step 4: Commit**

```bash
git add src/webparts/jordportalen/services/SagService.ts
git commit -m "SagService: laesning af sager, med verificeret ETag"
```

---

### Task 10: SagService — statusskift, tag og frigiv

**Files:**
- Modify: `src/webparts/jordportalen/services/SagService.ts`

**Interfaces:**
- Consumes: `validerStatusskift` fra `statusregler.ts`; `skrivMedEtag` fra `samtidighed.ts`; `LogService`, `INyLogPost` fra `LogService.ts`
- Produces: `SagService.skiftStatus(sag, nyStatus, aarsag?, kommentar?)`, `SagService.tagSag(sag, brugerId)`, `SagService.frigivSag(sag)`

- [ ] **Step 1: Udvid konstruktøren med LogService**

Erstat konstruktøren i `SagService.ts`:

```typescript
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}
```

Og tilføj importen øverst:

```typescript
import { validerStatusskift } from '../domaene/statusregler';
import { skrivMedEtag } from '../domaene/samtidighed';
import { LogService } from './LogService';
import { AfventerAarsag, SagStatus } from '../domaene/typer';
```

`LogService` injiceres frem for at komponenterne selv skal huske at logge. Koordineringen ligger dermed ét sted.

- [ ] **Step 2: Tilføj de tre mutationer**

Tilføj i `SagService`-klassen:

```typescript
  /**
   * Skriver en logpost uden at lade en fejl vaelte selve handlingen.
   *
   * Specifikationen er klar: en fejlet logskrivning maa aldrig rulle et
   * statusskift tilbage. Men den maa heller ikke se ud som om handlingen
   * mislykkedes - saa ville brugeren proeve igen og skifte status to gange.
   *
   * Derfor returneres en advarsel i stedet for at kaste. Kalderen viser den som
   * en advarsel ved siden af den gennemfoerte handling, ikke som en fejl.
   */
  private async logUdenAtBlokere(post: INyLogPost): Promise<string | undefined> {
    try {
      await this.log.tilfoej(post);
      return undefined;
    } catch (e) {
      // Konsollen beholder den fulde fejl; brugeren faar det korte.
      console.warn('Logposten kunne ikke skrives', e);
      return 'Handlingen blev gennemført, men den kunne ikke skrives i historikken.';
    }
  }

  /**
   * Skifter status og skriver en logpost.
   *
   * Valideringen sker foer skrivningen, saa en ulovlig kombination aldrig naar
   * SharePoint.
   *
   * @returns En advarsel hvis logningen fejlede. Statussen er skiftet uanset.
   */
  public async skiftStatus(
    sag: ISag,
    nyStatus: SagStatus,
    aarsag?: AfventerAarsag,
    kommentar?: string
  ): Promise<string | undefined> {
    const fejl = validerStatusskift(sag.Status, nyStatus, aarsag);
    if (fejl) {
      throw new Error(fejl);
    }

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ Status: nyStatus, AfventerAarsag: aarsag ?? null }, sag.etag),
      'skifte status'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Statusskift',
      titel: `${sag.Status} → ${nyStatus}`,
      fraStatus: sag.Status,
      tilStatus: nyStatus,
      kommentar,
    });
  }

  /**
   * Tager sagen.
   *
   * ETag'en er det eneste, der forhindrer to sagsbehandlere i begge at tro, de
   * har sagen. Uden den vinder den sidste skrivning tavst.
   */
  public async tagSag(sag: ISag, brugerId: number): Promise<string | undefined> {
    if (sag.AnsvarligId) {
      throw new Error('Sagen er allerede taget.');
    }

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: brugerId }, sag.etag),
      'tage sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag taget',
      titel: 'Sagen blev taget',
    });
  }

  public async frigivSag(sag: ISag): Promise<string | undefined> {
    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: null }, sag.etag),
      'frigive sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag frigivet',
      titel: 'Sagen blev frigivet',
    });
  }
```

Tilføj `INyLogPost` til importen fra `./LogService`.

- [ ] **Step 3: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 4: Kør hele testsuiten**

Run: `npm test`
Expected: PASS, alle tests fra Task 2-7.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/services/SagService.ts
git commit -m "SagService: statusskift, tag og frigiv med ETag"
```

---

### Task 11: NoteService, OpgaveService og LinkService

**Files:**
- Create: `src/webparts/jordportalen/services/NoteService.ts`
- Create: `src/webparts/jordportalen/services/OpgaveService.ts`
- Create: `src/webparts/jordportalen/services/LinkService.ts`

**Interfaces:**
- Consumes: `noteFilter`, `sagIdFilter` fra `forespoergsler.ts`; `hentAlleSider` fra `paginering.ts`; `LogService`
- Produces: `NoteService` (`hentMine`, `tilfoej`, `opdater`, `slet`), `OpgaveService` (`hentForSag`, `opret`, `saetUdfoert`, `slet`), `LinkService` (`hentForSag`, `tilfoej`, `slet`)

- [ ] **Step 1: Skriv NoteService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { noteFilter } from '../domaene/forespoergsler';
import { INote, LIST_NAMES } from '../domaene/typer';

/**
 * Sagsbehandlerens egne arbejdsnoter.
 *
 * Filtret paa forfatter ligger i selve forespoergslen, ikke kun i UI'et. Det
 * betyder, at en ny ansvarlig ikke ser den forriges noter - i modsaetning til
 * Opgaveportalen, hvor getNoter kun filtrerer paa opgave-id.
 *
 * Noterne er ikke teknisk private: listen har ingen tilladelser pr. element, saa
 * en administrator kan laese dem. Graensefladen skal derfor sige "Vises kun for
 * dig", ikke "Privat".
 */
export class NoteService {
  public constructor(private readonly sp: SPFI) {}

  public async hentMine(sagId: number, brugerId: number): Promise<INote[]> {
    const r = await hentAlleSider<INote>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.NOTER)
        .items.select('Id,SagId,Tekst,Created,Modified')
        .filter(noteFilter(sagId, brugerId))
        .orderBy('Created', false)
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async tilfoej(sagId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.add({
      Title: `Note – sag ${sagId}`,
      SagId: sagId,
      Tekst: tekst,
    });
  }

  public async opdater(noteId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.getById(noteId).update({ Tekst: tekst });
  }

  public async slet(noteId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.getById(noteId).delete();
  }
}
```

- [ ] **Step 2: Skriv OpgaveService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { IOpgave, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/** Underopgaver paa en sag. Bevidst uden ansvarlig og frist - sagen har allerede én ansvarlig. */
export class OpgaveService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public async hentForSag(sagId: number): Promise<IOpgave[]> {
    const r = await hentAlleSider<IOpgave>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.OPGAVER)
        .items.select('Id,Title,SagId,Udfoert,Created')
        .filter(sagIdFilter(sagId))
        .orderBy('Created', true)
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async opret(sagId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.OPGAVER).items.add({
      Title: tekst,
      SagId: sagId,
      Udfoert: false,
    });

    await this.log.tilfoej({
      sagId,
      handling: 'Opgave oprettet',
      titel: tekst,
    });
  }

  public async saetUdfoert(opgave: IOpgave, udfoert: boolean): Promise<void> {
    await this.sp.web.lists
      .getByTitle(LIST_NAMES.OPGAVER)
      .items.getById(opgave.Id)
      .update({ Udfoert: udfoert });

    // Kun afkrydsning logges. En fortrydelse er ikke en begivenhed, der er
    // vaerd at fylde historikken med.
    if (udfoert) {
      await this.log.tilfoej({
        sagId: opgave.SagId,
        handling: 'Opgave udført',
        titel: opgave.Title,
      });
    }
  }

  public async slet(opgaveId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.OPGAVER).items.getById(opgaveId).delete();
  }
}
```

- [ ] **Step 3: Skriv LinkService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { ILink, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/** Henvisninger fra en sag til andre systemer, typisk GO-sagen. */
export class LinkService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public async hentForSag(sagId: number): Promise<ILink[]> {
    const r = await hentAlleSider<ILink>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.LINKS)
        .items.select('Id,Title,SagId,Url')
        .filter(sagIdFilter(sagId))
        .orderBy('Created', true)
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async tilfoej(sagId: number, etiket: string, url: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.add({
      Title: etiket,
      SagId: sagId,
      Url: { Url: url, Description: etiket },
    });

    await this.log.tilfoej({
      sagId,
      handling: 'Link tilføjet',
      titel: etiket,
    });
  }

  public async slet(linkId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.getById(linkId).delete();
  }
}
```

- [ ] **Step 4: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/services/NoteService.ts src/webparts/jordportalen/services/OpgaveService.ts src/webparts/jordportalen/services/LinkService.ts
git commit -m "NoteService, OpgaveService og LinkService"
```

---

### Task 12: DokumentService

**Files:**
- Create: `src/webparts/jordportalen/services/DokumentService.ts`

**Interfaces:**
- Consumes: `LIST_NAMES`, `IDokument` fra `typer.ts`; `sagIdFilter` fra `forespoergsler.ts`; `hentAlleSider`; `LogService`
- Produces: `DokumentService` med `hentForSag(sagId): Promise<IDokument[]>`, `upload(sagId, fil: File): Promise<void>`, `slet(serverRelativUrl: string): Promise<void>`, `mappeNavn(sagId: number): string`

- [ ] **Step 1: Skriv DokumentService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { IDokument, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/**
 * Sagsbehandlerens egne dokumenter. Ikke borgerens bilag fra OS2Forms - de
 * ligger i P8Vedhaeftninger og er laese-kun.
 *
 * Filerne lægges i en mappe pr. sag. Mapperne oprettes efter behov, foerste gang
 * der uploades til en sag: de kan ikke laves paa forhaand, da sag-id'et foerst
 * findes naar robotten har oprettet ansoegningen.
 *
 * SagId-kolonnen ligger ved siden af mappestrukturen, saa en sags filer kan
 * hentes med én forespoergsel uden at traversere mapper.
 */
export class DokumentService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public mappeNavn(sagId: number): string {
    return `sag-${sagId}`;
  }

  public async hentForSag(sagId: number): Promise<IDokument[]> {
    const raa = await hentAlleSider<{
      Id: number;
      SagId: number;
      Modified: string;
      FileLeafRef: string;
      FileRef: string;
    }>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.DOKUMENTER)
        .items.select('Id,SagId,Modified,FileLeafRef,FileRef')
        .filter(sagIdFilter(sagId))
        .orderBy('Modified', false)
        .skip(skip)
        .top(antal)()
    );

    return raa.elementer.map((f) => ({
      Id: f.Id,
      Filnavn: f.FileLeafRef,
      ServerRelativeUrl: f.FileRef,
      SagId: f.SagId,
      Modified: f.Modified,
    }));
  }

  public async upload(sagId: number, fil: File): Promise<void> {
    const bibliotek = this.sp.web.lists.getByTitle(LIST_NAMES.DOKUMENTER);
    const rod = await bibliotek.rootFolder();
    const mappe = `${rod.ServerRelativeUrl}/${this.mappeNavn(sagId)}`;

    // Opret mappen hvis den mangler. addUsingPath fejler hvis mappen allerede
    // findes, saa fejlen sluges bevidst - vi vil kun sikre at den er der.
    try {
      await this.sp.web.folders.addUsingPath(mappe);
    } catch {
      // Mappen fandtes allerede.
    }

    const uploadet = await this.sp.web
      .getFolderByServerRelativePath(mappe)
      .files.addUsingPath(fil.name, fil, { Overwrite: false });

    // SagId saettes paa selve list-elementet, saa filen kan findes uden at
    // traversere mapper.
    const element = await this.sp.web.getFileByServerRelativePath(uploadet.ServerRelativeUrl).getItem();
    await element.update({ SagId: sagId });

    await this.log.tilfoej({
      sagId,
      handling: 'Dokument uploadet',
      titel: fil.name,
    });
  }

  public async slet(serverRelativUrl: string): Promise<void> {
    await this.sp.web.getFileByServerRelativePath(serverRelativUrl).recycle();
  }
}
```

- [ ] **Step 2: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add src/webparts/jordportalen/services/DokumentService.ts
git commit -m "DokumentService med mappe pr. sag"
```

---

### Task 13: ProfilService

**Files:**
- Create: `src/webparts/jordportalen/services/ProfilService.ts`

**Interfaces:**
- Consumes: `IProfil`, `IPerson` fra `typer.ts`
- Produces: `ProfilService` med `hentProfil(brugerId: number): Promise<IProfil>`, `soegBrugere(tekst: string): Promise<IPerson[]>`, `nuvaerendeBrugerId(): Promise<number>`

- [ ] **Step 1: Skriv ProfilService.ts**

```typescript
import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import '@pnp/sp/profiles';

import { IPerson, IProfil } from '../domaene/typer';

/**
 * Profildata til AnsvarligKort og brugersoegning.
 *
 * Bevidst UDEN Microsoft Graph. Graph kraever API-tilladelser godkendt af en
 * administrator, og det er samme mur, PnP PowerShell allerede er loebet ind i i
 * denne tenant. Alt herunder virker med almindelig SharePoint-adgang.
 *
 * Profiler caches for sessionen: en oversigt med tyve sager af samme ansvarlige
 * skal ikke lave tyve opslag.
 */
export class ProfilService {
  private readonly cache = new Map<number, Promise<IProfil>>();

  public constructor(private readonly sp: SPFI) {}

  public async nuvaerendeBrugerId(): Promise<number> {
    const bruger = await this.sp.web.currentUser();
    return bruger.Id;
  }

  public hentProfil(brugerId: number): Promise<IProfil> {
    const cachet = this.cache.get(brugerId);
    if (cachet) {
      return cachet;
    }

    const opslag = this.hentUdenCache(brugerId);
    this.cache.set(brugerId, opslag);
    return opslag;
  }

  private async hentUdenCache(brugerId: number): Promise<IProfil> {
    const bruger = await this.sp.web.siteUsers.getById(brugerId)();
    const mail = bruger.Email || undefined;

    const profil: IProfil = {
      Id: brugerId,
      Navn: bruger.Title,
      Mail: mail,
      BilledeUrl: mail
        ? `/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(mail)}`
        : '',
    };

    // Jobtitel og afdeling er en bekvemmelighed, ikke et krav. Er
    // brugerprofiltjenesten ikke tilgaengelig, vises kortet med navn og billede
    // alene frem for at fejle.
    if (mail) {
      try {
        const egenskaber = await this.sp.profiles.getPropertiesFor(`i:0#.f|membership|${mail}`);
        profil.JobTitel = laesEgenskab(egenskaber, 'Title');
        profil.Afdeling = laesEgenskab(egenskaber, 'Department');
      } catch {
        // Ingen profiltjeneste. Kortet klarer sig uden.
      }
    }

    return profil;
  }

  public async soegBrugere(tekst: string): Promise<IPerson[]> {
    if (tekst.trim().length < 3) {
      return [];
    }

    const brugere = await this.sp.web.siteUsers
      .filter(`substringof('${tekst.replace(/'/g, "''")}', Title)`)
      .top(20)();

    return brugere
      .filter((b) => b.PrincipalType === 1 && b.Email)
      .map((b) => ({ Id: b.Id, Title: b.Title, EMail: b.Email }));
  }
}

function laesEgenskab(
  egenskaber: { UserProfileProperties?: { Key: string; Value: string }[] },
  noegle: string
): string | undefined {
  const fundet = (egenskaber.UserProfileProperties || []).filter((p) => p.Key === noegle)[0];
  return fundet && fundet.Value ? fundet.Value : undefined;
}
```

- [ ] **Step 2: Bekræft at det kompilerer**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: ingen fejl.

- [ ] **Step 3: Commit**

```bash
git add src/webparts/jordportalen/services/ProfilService.ts
git commit -m "ProfilService uden Microsoft Graph"
```

---

### Task 14: WebPart-indgang, mountNode og routing

**Files:**
- Modify: `src/webparts/jordportalen/JordportalenWebPart.ts`
- Create: `src/webparts/jordportalen/components/faelles/MountNode.tsx`
- Create: `src/webparts/jordportalen/components/Jordportalen.tsx`
- Create: `src/webparts/jordportalen/components/IJordportalenProps.ts`

**Interfaces:**
- Consumes: alle services; `parseSagId`, `byggSagLink`
- Produces: `IJordportalenProps` med `{ sp: SPFI; sideUrl: string }`, `MountNodeProvider`, `useMountNode(): HTMLDivElement | undefined`

- [ ] **Step 1: Skriv MountNode.tsx**

```tsx
import * as React from 'react';

/**
 * Faelles monteringspunkt for Fluent UI's portal-baserede komponenter.
 *
 * Dropdown, Combobox, Dialog, Menu, Tooltip og Popover renderer som standard
 * via en portal til document.body - altsaa UDEN FOR den DOM-node hvor
 * FluentProvider har defineret temaets CSS-variabler. Resultatet er en ustylet
 * popup med gennemsigtig baggrund.
 *
 * Det ligner et cache-problem og er det ikke. Opgaveportalens TROUBLESHOOTING.md
 * beskriver det, og loesningen er at give hver saadan komponent en mountNode
 * inde i providerens eget traee. Her ligger den ét sted, saa ingen kan glemme det.
 */
const MountNodeContext = React.createContext<HTMLDivElement | undefined>(undefined);

export function useMountNode(): HTMLDivElement | undefined {
  return React.useContext(MountNodeContext);
}

export const MountNodeProvider: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [node, setNode] = React.useState<HTMLDivElement | undefined>(undefined);

  return (
    <MountNodeContext.Provider value={node}>
      {children}
      <div ref={(el) => setNode(el ?? undefined)} style={{ position: 'fixed', zIndex: 1000000 }} />
    </MountNodeContext.Provider>
  );
};
```

- [ ] **Step 2: Skriv IJordportalenProps.ts**

```typescript
import { SPFI } from '@pnp/sp';

export interface IJordportalenProps {
  sp: SPFI;
  /** Sidens egen URL uden parametre. Bruges til at bygge deep-links. */
  sideUrl: string;
}
```

- [ ] **Step 3: Erstat webpart-indgangen**

`JordportalenWebPart.ts`:

```typescript
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';

import Jordportalen from './components/Jordportalen';
import { IJordportalenProps } from './components/IJordportalenProps';

export interface IJordportalenWebPartProps {}

export default class JordportalenWebPart extends BaseClientSideWebPart<IJordportalenWebPartProps> {
  private _sp!: SPFI;

  protected async onInit(): Promise<void> {
    await super.onInit();
    this._sp = spfi().using(SPFx(this.context));
  }

  public render(): void {
    const element = React.createElement<IJordportalenProps>(Jordportalen, {
      sp: this._sp,
      sideUrl: this.context.pageContext.web.absoluteUrl + window.location.pathname,
    });
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [] };
  }
}
```

Tilføj `import { Version } from '@microsoft/sp-core-library';` øverst.

- [ ] **Step 4: Skriv rodkomponenten**

`components/Jordportalen.tsx`:

```tsx
import * as React from 'react';
import { FluentProvider, webLightTheme, Spinner, MessageBar } from '@fluentui/react-components';

import { IJordportalenProps } from './IJordportalenProps';
import { MountNodeProvider } from './faelles/MountNode';
import { byggSagLink, parseSagId } from '../utils/deepLink';
import { LogService } from '../services/LogService';
import { SagService } from '../services/SagService';
import { NoteService } from '../services/NoteService';
import { OpgaveService } from '../services/OpgaveService';
import { LinkService } from '../services/LinkService';
import { DokumentService } from '../services/DokumentService';
import { ProfilService } from '../services/ProfilService';

const Jordportalen: React.FunctionComponent<IJordportalenProps> = ({ sp, sideUrl }) => {
  const tjenester = React.useMemo(() => {
    const log = new LogService(sp);
    return {
      log,
      sag: new SagService(sp, log),
      note: new NoteService(sp),
      opgave: new OpgaveService(sp, log),
      link: new LinkService(sp, log),
      dokument: new DokumentService(sp, log),
      profil: new ProfilService(sp),
    };
  }, [sp]);

  const [valgtSagId, setValgtSagId] = React.useState<number | undefined>(() =>
    parseSagId(window.location.href)
  );
  const [brugerId, setBrugerId] = React.useState<number | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    tjenester.profil
      .nuvaerendeBrugerId()
      .then(setBrugerId)
      .catch((e: Error) => setFejl(e.message));
  }, [tjenester]);

  // Holder URL'en i takt med valget, saa en sag kan bogmaerkes og deles.
  const vaelgSag = React.useCallback(
    (id: number | undefined) => {
      setValgtSagId(id);
      const url = id ? byggSagLink(sideUrl, id) : sideUrl;
      window.history.replaceState({}, '', url);
    },
    [sideUrl]
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <MountNodeProvider>
        {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
        {brugerId === undefined && !fejl && <Spinner label="Indlæser..." />}
        {brugerId !== undefined && (
          <div data-valgt-sag={valgtSagId ?? ''}>
            {/* Dashboard og detaljeside indsaettes i Task 15 og 16. */}
            <p>Bruger {brugerId}. Valgt sag: {valgtSagId ?? 'ingen'}.</p>
            <button onClick={() => vaelgSag(valgtSagId ? undefined : 1)}>Skift visning</button>
          </div>
        )}
      </MountNodeProvider>
    </FluentProvider>
  );
};

export default Jordportalen;
```

- [ ] **Step 5: Byg og kør lokalt**

Run: `npm run build && npm run serve`
Expected: workbench åbner. Webparten viser bruger-id og "Valgt sag: ingen". Klik på knappen skal ændre URL'en til `?sag=1` uden at siden genindlæses.

- [ ] **Step 6: Commit**

```bash
git add src/webparts/jordportalen
git commit -m "Webpart-indgang, mountNode-provider og deep-link-routing"
```

---

### Task 15: Dashboard

**Files:**
- Create: `src/webparts/jordportalen/components/dashboard/Dashboard.tsx`
- Create: `src/webparts/jordportalen/components/dashboard/KpiKort.tsx`
- Create: `src/webparts/jordportalen/components/dashboard/Filtre.tsx`
- Create: `src/webparts/jordportalen/components/dashboard/SagsTabel.tsx`
- Modify: `src/webparts/jordportalen/components/Jordportalen.tsx`

**Interfaces:**
- Consumes: `SagService.hentAlleSager`, `ProfilService.hentProfil`, `IDashboardFilter`, `ISag`, `ISideResultat`
- Produces: `Dashboard` med props `{ sag: SagService; profil: ProfilService; brugerId: number; onVaelgSag: (id: number) => void }`

- [ ] **Step 1: Skriv KpiKort.tsx**

```tsx
import * as React from 'react';
import { Card, Text, Title2, tokens } from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';

export interface IKpiKortProps {
  sager: ISag[];
  brugerId: number;
}

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({ sager, brugerId }) => {
  const tal = React.useMemo(
    () => ({
      ialt: sager.length,
      ledige: sager.filter((s) => !s.AnsvarligId).length,
      mine: sager.filter((s) => s.AnsvarligId === brugerId).length,
      afventer: sager.filter((s) => s.Status === 'Afventer').length,
    }),
    [sager, brugerId]
  );

  const kort: { etiket: string; vaerdi: number }[] = [
    { etiket: 'Sager i alt', vaerdi: tal.ialt },
    { etiket: 'Ledige', vaerdi: tal.ledige },
    { etiket: 'Mine sager', vaerdi: tal.mine },
    { etiket: 'Afventer', vaerdi: tal.afventer },
  ];

  return (
    <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
      {kort.map((k) => (
        <Card key={k.etiket} style={{ minWidth: '140px', padding: tokens.spacingVerticalM }}>
          <Title2>{k.vaerdi}</Title2>
          <Text size={200}>{k.etiket}</Text>
        </Card>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Skriv Filtre.tsx**

```tsx
import * as React from 'react';
import { Dropdown, Option, Switch, Input, tokens } from '@fluentui/react-components';
import { ALLE_STATUS, SagStatus } from '../../domaene/typer';
import { useMountNode } from '../faelles/MountNode';

export interface IFiltreProps {
  status?: SagStatus;
  kunLedige: boolean;
  kunMine: boolean;
  soegning: string;
  onAendret: (aendring: {
    status?: SagStatus;
    kunLedige?: boolean;
    kunMine?: boolean;
    soegning?: string;
  }) => void;
}

export const Filtre: React.FunctionComponent<IFiltreProps> = (p) => {
  // Uden mountNode mister dropdownens popup sin styling. Se MountNode.tsx.
  const mountNode = useMountNode();

  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacingHorizontalM,
        alignItems: 'center',
        flexWrap: 'wrap',
        margin: `${tokens.spacingVerticalM} 0`,
      }}
    >
      <Input
        placeholder="Søg i adresse eller titel"
        value={p.soegning}
        onChange={(_, d) => p.onAendret({ soegning: d.value })}
        style={{ minWidth: '260px' }}
      />

      <Dropdown
        placeholder="Alle statusser"
        value={p.status ?? ''}
        selectedOptions={p.status ? [p.status] : []}
        mountNode={mountNode}
        onOptionSelect={(_, d) =>
          p.onAendret({ status: (d.optionValue as SagStatus) || undefined })
        }
      >
        <Option value="">Alle statusser</Option>
        {ALLE_STATUS.map((s) => (
          <Option key={s} value={s}>
            {s}
          </Option>
        ))}
      </Dropdown>

      <Switch
        label="Kun ledige"
        checked={p.kunLedige}
        onChange={(_, d) => p.onAendret({ kunLedige: d.checked, kunMine: false })}
      />
      <Switch
        label="Mine sager"
        checked={p.kunMine}
        onChange={(_, d) => p.onAendret({ kunMine: d.checked, kunLedige: false })}
      />
    </div>
  );
};
```

- [ ] **Step 3: Skriv SagsTabel.tsx**

```tsx
import * as React from 'react';
import {
  Badge,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from '@fluentui/react-components';
import { ISag, SagStatus } from '../../domaene/typer';

const STATUS_FARVE: Record<SagStatus, 'informative' | 'warning' | 'success' | 'danger'> = {
  'Ny': 'informative',
  'Under behandling': 'informative',
  'Afventer': 'warning',
  'Afgjort': 'success',
  'Afvist': 'danger',
};

export interface ISagsTabelProps {
  sager: ISag[];
  onVaelgSag: (id: number) => void;
}

export const SagsTabel: React.FunctionComponent<ISagsTabelProps> = ({ sager, onVaelgSag }) => (
  <Table aria-label="Sager">
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Nr.</TableHeaderCell>
        <TableHeaderCell>Adresse</TableHeaderCell>
        <TableHeaderCell>Status</TableHeaderCell>
        <TableHeaderCell>Ansvarlig</TableHeaderCell>
        <TableHeaderCell>Modtaget</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {sager.map((s) => (
        <TableRow key={s.Id}>
          <TableCell>{s.SubmissionSerial}</TableCell>
          <TableCell>
            <Link onClick={() => onVaelgSag(s.Id)}>{s.Title}</Link>
          </TableCell>
          <TableCell>
            <Badge appearance="filled" color={STATUS_FARVE[s.Status]}>
              {s.Status}
              {s.Status === 'Afventer' && s.AfventerAarsag ? `: ${s.AfventerAarsag}` : ''}
            </Badge>
          </TableCell>
          <TableCell>
            {s.Ansvarlig ? (
              <Text>{s.Ansvarlig.Title}</Text>
            ) : (
              <Button size="small" appearance="subtle" onClick={() => onVaelgSag(s.Id)}>
                Ledig
              </Button>
            )}
          </TableCell>
          <TableCell>
            {s.ModtagetDato ? new Date(s.ModtagetDato).toLocaleDateString('da-DK') : ''}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
```

- [ ] **Step 4: Skriv Dashboard.tsx**

```tsx
import * as React from 'react';
import { MessageBar, Spinner } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { IDashboardFilter } from '../../domaene/forespoergsler';
import { ISag, SagStatus } from '../../domaene/typer';
import { KpiKort } from './KpiKort';
import { Filtre } from './Filtre';
import { SagsTabel } from './SagsTabel';

export interface IDashboardProps {
  sag: SagService;
  brugerId: number;
  onVaelgSag: (id: number) => void;
}

export const Dashboard: React.FunctionComponent<IDashboardProps> = ({
  sag,
  brugerId,
  onVaelgSag,
}) => {
  const [sager, setSager] = React.useState<ISag[]>([]);
  const [afkortet, setAfkortet] = React.useState(false);
  const [indlaeser, setIndlaeser] = React.useState(true);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const [status, setStatus] = React.useState<SagStatus | undefined>(undefined);
  const [kunLedige, setKunLedige] = React.useState(false);
  const [kunMine, setKunMine] = React.useState(false);
  const [soegning, setSoegning] = React.useState('');

  React.useEffect(() => {
    const filter: IDashboardFilter = {
      status,
      kunLedige,
      ansvarligId: kunMine ? brugerId : undefined,
    };

    setIndlaeser(true);
    sag
      .hentAlleSager(filter)
      .then((r) => {
        setSager(r.elementer);
        setAfkortet(r.afkortet);
        setFejl(undefined);
      })
      .catch((e: Error) => setFejl(e.message))
      .then(() => setIndlaeser(false));
  }, [sag, status, kunLedige, kunMine, brugerId]);

  // Fritekstsoegningen sker i frontenden, fordi den skal kunne ramme
  // AdresserTekst, som er flerlinjet og ikke kan filtreres server-side i OData.
  const synlige = React.useMemo(() => {
    const s = soegning.trim().toLowerCase();
    if (!s) {
      return sager;
    }
    return sager.filter(
      (sa) =>
        sa.Title.toLowerCase().indexOf(s) !== -1 ||
        (sa.AdresserTekst || '').toLowerCase().indexOf(s) !== -1
    );
  }, [sager, soegning]);

  return (
    <div>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {/* Afkortning SKAL vises. Idéportalen og Opgaveportalen afskaerer tavst. */}
      {afkortet && (
        <MessageBar intent="warning">
          Der er flere sager, end der kan vises. Brug filtrene for at indsnævre listen.
        </MessageBar>
      )}

      <KpiKort sager={sager} brugerId={brugerId} />

      <Filtre
        status={status}
        kunLedige={kunLedige}
        kunMine={kunMine}
        soegning={soegning}
        onAendret={(a) => {
          if (a.status !== undefined || 'status' in a) { setStatus(a.status); }
          if (a.kunLedige !== undefined) { setKunLedige(a.kunLedige); }
          if (a.kunMine !== undefined) { setKunMine(a.kunMine); }
          if (a.soegning !== undefined) { setSoegning(a.soegning); }
        }}
      />

      {indlaeser ? (
        <Spinner label="Henter sager..." />
      ) : (
        <SagsTabel sager={synlige} onVaelgSag={onVaelgSag} />
      )}
    </div>
  );
};
```

- [ ] **Step 5: Kobl dashboardet ind i rodkomponenten**

I `Jordportalen.tsx`, erstat placeholder-`<div data-valgt-sag=...>` med:

```tsx
          <div>
            {valgtSagId === undefined ? (
              <Dashboard sag={tjenester.sag} brugerId={brugerId} onVaelgSag={vaelgSag} />
            ) : (
              <p>Detaljeside for sag {valgtSagId} — indsættes i Task 16.</p>
            )}
          </div>
```

Og tilføj importen: `import { Dashboard } from './dashboard/Dashboard';`

- [ ] **Step 6: Byg og verificér i workbench**

Run: `npm run serve`
Expected: dashboardet viser KPI-kort, filtre og en tabel med sagerne fra SharePoint. Klik på en adresse skifter til placeholder-teksten, og URL'en får `?sag=<id>`.

- [ ] **Step 7: Commit**

```bash
git add src/webparts/jordportalen/components
git commit -m "Dashboard med KPI-kort, filtre og sagstabel"
```

---

### Task 16: Detaljeside — layout, metadata og ansvarligkort

**Files:**
- Create: `src/webparts/jordportalen/components/detalje/SagDetalje.tsx`
- Create: `src/webparts/jordportalen/components/detalje/Metadata.tsx`
- Create: `src/webparts/jordportalen/components/detalje/AnsvarligKort.tsx`
- Modify: `src/webparts/jordportalen/components/Jordportalen.tsx`

**Interfaces:**
- Consumes: alle services; `ISag`, `IAdresse`, `IKontakt`, `IBilag`, `ILogPost`, `INote`, `IOpgave`, `ILink`, `IDokument`, `IProfil`
- Produces: `SagDetalje` med props `{ sagId: number; tjenester: ITjenester; brugerId: number; onTilbage: () => void }`, `ISagData`

- [ ] **Step 1: Skriv AnsvarligKort.tsx**

```tsx
import * as React from 'react';
import {
  Avatar,
  Button,
  Card,
  Link,
  MessageBar,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { IProfil, ISag } from '../../domaene/typer';

export interface IAnsvarligKortProps {
  sag: ISag;
  profil?: IProfil;
  brugerId: number;
  onTag: () => Promise<void>;
  onFrigiv: () => Promise<void>;
}

export const AnsvarligKort: React.FunctionComponent<IAnsvarligKortProps> = ({
  sag,
  profil,
  brugerId,
  onTag,
  onFrigiv,
}) => {
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const erMin = sag.AnsvarligId === brugerId;
  const erLedig = !sag.AnsvarligId;

  const udfoer = async (handling: () => Promise<void>): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await handling();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ansvarlig</Title3>

      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {erLedig ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM }}>
          <Text>Sagen er ledig.</Text>
          <Button appearance="primary" disabled={arbejder} onClick={() => udfoer(onTag)}>
            Tag sagen
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' }}>
          <Avatar
            name={profil?.Navn ?? sag.Ansvarlig?.Title}
            image={profil?.BilledeUrl ? { src: profil.BilledeUrl } : undefined}
            size={48}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text weight="semibold">{profil?.Navn ?? sag.Ansvarlig?.Title}</Text>
            {profil?.JobTitel && <Text size={200}>{profil.JobTitel}</Text>}
            {profil?.Afdeling && <Text size={200}>{profil.Afdeling}</Text>}
            {profil?.Mail && (
              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
                <Link href={`mailto:${profil.Mail}`}>Mail</Link>
                <Link
                  href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(profil.Mail)}`}
                  target="_blank"
                >
                  Teams
                </Link>
              </div>
            )}
          </div>
          {erMin && (
            <Button disabled={arbejder} onClick={() => udfoer(onFrigiv)}>
              Frigiv
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Skriv Metadata.tsx**

```tsx
import * as React from 'react';
import { Card, Link, Text, Title3, tokens } from '@fluentui/react-components';
import { IAdresse, IBilag, IKontakt, ISag } from '../../domaene/typer';

export interface IMetadataProps {
  sag: ISag;
  adresser: IAdresse[];
  kontakter: IKontakt[];
  bilag: IBilag[];
}

const Felt: React.FunctionComponent<{ etiket: string; vaerdi?: string }> = ({ etiket, vaerdi }) =>
  vaerdi ? (
    <div style={{ marginBottom: tokens.spacingVerticalS }}>
      <Text size={200} block>
        {etiket}
      </Text>
      <Text block>{vaerdi}</Text>
    </div>
  ) : null;

export const Metadata: React.FunctionComponent<IMetadataProps> = ({
  sag,
  adresser,
  kontakter,
  bilag,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ansøgning</Title3>
      <Felt etiket="Sagsnummer" vaerdi={String(sag.SubmissionSerial)} />
      <Felt etiket="Udfyldt af" vaerdi={sag.Udfylder} />
      <Felt etiket="Indsendt af" vaerdi={sag.IndsendtAf} />
      <Felt
        etiket="Ansøgningsdato"
        vaerdi={sag.AnsogningsDato ? new Date(sag.AnsogningsDato).toLocaleDateString('da-DK') : undefined}
      />
      <Felt
        etiket="Modtaget"
        vaerdi={sag.ModtagetDato ? new Date(sag.ModtagetDato).toLocaleString('da-DK') : undefined}
      />
      <Felt etiket="Bemærkninger" vaerdi={sag.Bemaerkninger} />
      {sag.OS2FormsUrl?.Url && (
        <Link href={sag.OS2FormsUrl.Url} target="_blank">
          Se original i OS2Forms
        </Link>
      )}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ejendomme ({adresser.length})</Title3>
      {adresser.map((a) => (
        <div key={a.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text block weight="semibold">
            {a.Adresse}
          </Text>
          <Text size={200} block>
            Matrikel {a.Matrikel} · Lokalitet {a.LokalitetsNummer}
          </Text>
        </div>
      ))}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Kontakter ({kontakter.length})</Title3>
      {/* KontaktType er ikke unik - der kan vaere to grundejere paa samme sag. */}
      {kontakter.map((k) => (
        <div key={k.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text block weight="semibold">
            {k.KontaktType}
            {k.ErUdfylder ? ' (udfylder)' : ''}
          </Text>
          <Text block>{k.Navn || k.Firma}</Text>
          {k.Email && <Link href={`mailto:${k.Email}`}>{k.Email}</Link>}
          {k.Telefon && <Text size={200} block>{k.Telefon}</Text>}
        </div>
      ))}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Bilag fra ansøger ({bilag.length})</Title3>
      {bilag.map((b) => (
        <div key={b.Id}>
          {b.FilUrl?.Url ? (
            <Link href={b.FilUrl.Url} target="_blank">
              {b.Filnavn || b.FilId}
            </Link>
          ) : (
            <Text block>{b.Filnavn || `Fil ${b.FilId}`}</Text>
          )}
        </div>
      ))}
    </Card>
  </div>
);
```

- [ ] **Step 3: Skriv SagDetalje.tsx**

```tsx
import * as React from 'react';
import { Button, MessageBar, Spinner, tokens } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { LogService } from '../../services/LogService';
import { NoteService } from '../../services/NoteService';
import { OpgaveService } from '../../services/OpgaveService';
import { LinkService } from '../../services/LinkService';
import { DokumentService } from '../../services/DokumentService';
import { ProfilService } from '../../services/ProfilService';
import {
  IAdresse,
  IBilag,
  IDokument,
  IKontakt,
  ILink,
  ILogPost,
  INote,
  IOpgave,
  IProfil,
  ISag,
} from '../../domaene/typer';
import { Metadata } from './Metadata';
import { AnsvarligKort } from './AnsvarligKort';

export interface ITjenester {
  sag: SagService;
  log: LogService;
  note: NoteService;
  opgave: OpgaveService;
  link: LinkService;
  dokument: DokumentService;
  profil: ProfilService;
}

export interface ISagData {
  sag: ISag;
  adresser: IAdresse[];
  kontakter: IKontakt[];
  bilag: IBilag[];
  logposter: ILogPost[];
  noter: INote[];
  opgaver: IOpgave[];
  links: ILink[];
  dokumenter: IDokument[];
  ansvarligProfil?: IProfil;
}

export interface ISagDetaljeProps {
  sagId: number;
  tjenester: ITjenester;
  brugerId: number;
  onTilbage: () => void;
}

export const SagDetalje: React.FunctionComponent<ISagDetaljeProps> = ({
  sagId,
  tjenester,
  brugerId,
  onTilbage,
}) => {
  const [data, setData] = React.useState<ISagData | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  /** Henter sagen og alle dens datasaet parallelt. */
  const hentAlt = React.useCallback(async (): Promise<void> => {
    const sag = await tjenester.sag.hentSag(sagId);

    const [adresser, kontakter, bilag, logposter, noter, opgaver, links, dokumenter] =
      await Promise.all([
        tjenester.sag.hentAdresser(sag.SubmissionUUID),
        tjenester.sag.hentKontakter(sag.SubmissionUUID),
        tjenester.sag.hentBilag(sag.SubmissionUUID),
        tjenester.log.hentForSag(sagId),
        tjenester.note.hentMine(sagId, brugerId),
        tjenester.opgave.hentForSag(sagId),
        tjenester.link.hentForSag(sagId),
        tjenester.dokument.hentForSag(sagId),
      ]);

    const ansvarligProfil = sag.AnsvarligId
      ? await tjenester.profil.hentProfil(sag.AnsvarligId)
      : undefined;

    setData({
      sag, adresser, kontakter, bilag, logposter, noter, opgaver, links, dokumenter, ansvarligProfil,
    });
  }, [sagId, tjenester, brugerId]);

  React.useEffect(() => {
    hentAlt().catch((e: Error) => setFejl(e.message));
  }, [hentAlt]);

  /**
   * Opdaterer kun ét datasaet efter en handling.
   *
   * En ny kommentar skal ikke faa adresser, kontakter og dokumenter til at
   * blinke. Panelerne kalder denne med netop det, de aendrede.
   */
  const opdater = React.useCallback(
    async (hvad: keyof ISagData): Promise<void> => {
      if (!data) { return; }

      switch (hvad) {
        case 'logposter':
          setData({ ...data, logposter: await tjenester.log.hentForSag(sagId) });
          break;
        case 'noter':
          setData({ ...data, noter: await tjenester.note.hentMine(sagId, brugerId) });
          break;
        case 'opgaver':
          setData({ ...data, opgaver: await tjenester.opgave.hentForSag(sagId) });
          break;
        case 'links':
          setData({ ...data, links: await tjenester.link.hentForSag(sagId) });
          break;
        case 'dokumenter':
          setData({ ...data, dokumenter: await tjenester.dokument.hentForSag(sagId) });
          break;
        default:
          // Status og ansvarlig aendrer sagen selv, og ETag'en skal fornyes.
          await hentAlt();
      }
    },
    [data, sagId, brugerId, tjenester, hentAlt]
  );

  if (fejl) {
    return (
      <div>
        <Button onClick={onTilbage}>Tilbage</Button>
        <MessageBar intent="error">{fejl}</MessageBar>
      </div>
    );
  }

  if (!data) {
    return <Spinner label="Henter sag..." />;
  }

  return (
    <div>
      <Button onClick={onTilbage} style={{ marginBottom: tokens.spacingVerticalM }}>
        Tilbage til oversigten
      </Button>

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', minWidth: '320px' }}>
          <AnsvarligKort
            sag={data.sag}
            profil={data.ansvarligProfil}
            brugerId={brugerId}
            onTag={async () => {
              await tjenester.sag.tagSag(data.sag, brugerId);
              await hentAlt();
            }}
            onFrigiv={async () => {
              await tjenester.sag.frigivSag(data.sag);
              await hentAlt();
            }}
          />
          <div style={{ height: tokens.spacingVerticalM }} />
          <Metadata
            sag={data.sag}
            adresser={data.adresser}
            kontakter={data.kontakter}
            bilag={data.bilag}
          />
        </div>

        <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
          {/* De syv paneler indsaettes i Task 17 og 18. */}
          <p>Paneler kommer her. Opdateringsfunktion klar: {typeof opdater}</p>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Kobl detaljesiden ind i rodkomponenten**

I `Jordportalen.tsx`, erstat `<p>Detaljeside for sag {valgtSagId} — indsættes i Task 16.</p>` med:

```tsx
              <SagDetalje
                sagId={valgtSagId}
                tjenester={tjenester}
                brugerId={brugerId}
                onTilbage={() => vaelgSag(undefined)}
              />
```

Og tilføj importen: `import { SagDetalje } from './detalje/SagDetalje';`

- [ ] **Step 5: Byg og verificér i workbench**

Run: `npm run serve`
Expected: klik på en sag viser metadata til venstre og ansvarligkortet øverst. En ledig sag kan tages; knappen skifter til "Frigiv". Åbn samme sag i to faner, tag den i den ene, og tryk "Tag sagen" i den anden — den skal give beskeden om at sagen blev ændret af en anden, ikke overskrive tavst.

- [ ] **Step 6: Commit**

```bash
git add src/webparts/jordportalen/components/detalje
git commit -m "Detaljeside med metadata og ansvarligkort"
```

---

### Task 17: Paneler — status, kommentarer og egne noter

**Files:**
- Create: `src/webparts/jordportalen/components/detalje/StatusPanel.tsx`
- Create: `src/webparts/jordportalen/components/detalje/KommentarPanel.tsx`
- Create: `src/webparts/jordportalen/components/detalje/NoterPanel.tsx`
- Create: `src/webparts/jordportalen/components/faelles/PeoplePicker.tsx`
- Modify: `src/webparts/jordportalen/components/detalje/SagDetalje.tsx`

**Interfaces:**
- Consumes: `naeste` fra `statusregler.ts`; `ALLE_AARSAGER`; `ProfilService.soegBrugere`; `useMountNode`
- Produces: `StatusPanel`, `KommentarPanel`, `NoterPanel`, `PeoplePicker` med props `{ profil: ProfilService; valgte: IPerson[]; onAendret: (p: IPerson[]) => void }`

- [ ] **Step 1: Skriv PeoplePicker.tsx**

```tsx
import * as React from 'react';
import { Combobox, Option, Tag, TagGroup, tokens } from '@fluentui/react-components';
import { ProfilService } from '../../services/ProfilService';
import { IPerson } from '../../domaene/typer';
import { useMountNode } from './MountNode';

export interface IPeoplePickerProps {
  profil: ProfilService;
  valgte: IPerson[];
  onAendret: (personer: IPerson[]) => void;
}

export const PeoplePicker: React.FunctionComponent<IPeoplePickerProps> = ({
  profil,
  valgte,
  onAendret,
}) => {
  const mountNode = useMountNode();
  const [tekst, setTekst] = React.useState('');
  const [fundne, setFundne] = React.useState<IPerson[]>([]);

  // Debounce, saa hvert tastetryk ikke rammer SharePoint.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      profil.soegBrugere(tekst).then(setFundne).catch(() => setFundne([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [tekst, profil]);

  return (
    <div>
      {valgte.length > 0 && (
        <TagGroup
          onDismiss={(_, d) => onAendret(valgte.filter((p) => String(p.Id) !== d.value))}
          style={{ marginBottom: tokens.spacingVerticalXS }}
        >
          {valgte.map((p) => (
            <Tag key={p.Id} value={String(p.Id)} dismissible>
              {p.Title}
            </Tag>
          ))}
        </TagGroup>
      )}

      <Combobox
        placeholder="Tag en kollega..."
        value={tekst}
        mountNode={mountNode}
        onChange={(e) => setTekst(e.target.value)}
        onOptionSelect={(_, d) => {
          const valgt = fundne.filter((p) => String(p.Id) === d.optionValue)[0];
          if (valgt && !valgte.some((v) => v.Id === valgt.Id)) {
            onAendret([...valgte, valgt]);
          }
          setTekst('');
        }}
      >
        {fundne.map((p) => (
          <Option key={p.Id} value={String(p.Id)}>
            {p.Title}
          </Option>
        ))}
      </Combobox>
    </div>
  );
};
```

- [ ] **Step 2: Skriv StatusPanel.tsx**

```tsx
import * as React from 'react';
import {
  Button,
  Card,
  Dropdown,
  MessageBar,
  Option,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { naeste } from '../../domaene/statusregler';
import { AfventerAarsag, ALLE_AARSAGER, ISag, SagStatus } from '../../domaene/typer';
import { SagService } from '../../services/SagService';
import { useMountNode } from '../faelles/MountNode';

export interface IStatusPanelProps {
  sag: ISag;
  sagService: SagService;
  brugerId: number;
  onOpdateret: () => Promise<void>;
}

export const StatusPanel: React.FunctionComponent<IStatusPanelProps> = ({
  sag,
  sagService,
  brugerId,
  onOpdateret,
}) => {
  const mountNode = useMountNode();
  const [nyStatus, setNyStatus] = React.useState<SagStatus | undefined>(undefined);
  const [aarsag, setAarsag] = React.useState<AfventerAarsag | undefined>(undefined);
  const [kommentar, setKommentar] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  // Kun den ansvarlige maa skifte status. Alt andet paa sagen er aabent for alle.
  const erMin = sag.AnsvarligId === brugerId;
  const muligheder = naeste(sag.Status);

  const gem = async (): Promise<void> => {
    if (!nyStatus) { return; }
    setArbejder(true);
    setFejl(undefined);
    setAdvarsel(undefined);
    try {
      // Returvaerdien er en advarsel om manglende logning, ikke en fejl.
      // Statussen er skiftet uanset - brugeren maa ikke tro det modsatte og
      // proeve igen.
      const logAdvarsel = await sagService.skiftStatus(sag, nyStatus, aarsag, kommentar || undefined);
      setAdvarsel(logAdvarsel);
      setNyStatus(undefined);
      setAarsag(undefined);
      setKommentar('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Status</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      {!erMin && (
        <MessageBar intent="info">
          {sag.AnsvarligId
            ? 'Kun den ansvarlige kan skifte status.'
            : 'Tag sagen for at kunne skifte status.'}
        </MessageBar>
      )}

      {muligheder.length === 0 ? (
        <MessageBar intent="info">Sagen er afsluttet og kan ikke skifte status.</MessageBar>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
          <Dropdown
            placeholder="Vælg ny status"
            disabled={!erMin || arbejder}
            value={nyStatus ?? ''}
            selectedOptions={nyStatus ? [nyStatus] : []}
            mountNode={mountNode}
            onOptionSelect={(_, d) => {
              setNyStatus(d.optionValue as SagStatus);
              if (d.optionValue !== 'Afventer') { setAarsag(undefined); }
            }}
          >
            {muligheder.map((s) => (
              <Option key={s} value={s}>
                {s}
              </Option>
            ))}
          </Dropdown>

          {/* Aarsagen hoerer kun til Afventer - servicelaget afviser alt andet. */}
          {nyStatus === 'Afventer' && (
            <Dropdown
              placeholder="Vælg årsag"
              disabled={arbejder}
              value={aarsag ?? ''}
              selectedOptions={aarsag ? [aarsag] : []}
              mountNode={mountNode}
              onOptionSelect={(_, d) => setAarsag(d.optionValue as AfventerAarsag)}
            >
              {ALLE_AARSAGER.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Dropdown>
          )}

          <Textarea
            placeholder="Bemærkning til statusskiftet (valgfri)"
            value={kommentar}
            disabled={!erMin || arbejder}
            onChange={(_, d) => setKommentar(d.value)}
          />

          <Button appearance="primary" disabled={!erMin || !nyStatus || arbejder} onClick={gem}>
            Skift status
          </Button>
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 3: Skriv KommentarPanel.tsx**

```tsx
import * as React from 'react';
import {
  Button,
  Card,
  MessageBar,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { ILogPost, IPerson } from '../../domaene/typer';
import { LogService } from '../../services/LogService';
import { ProfilService } from '../../services/ProfilService';
import { PeoplePicker } from '../faelles/PeoplePicker';

export interface IKommentarPanelProps {
  sagId: number;
  logposter: ILogPost[];
  logService: LogService;
  profil: ProfilService;
  onOpdateret: () => Promise<void>;
}

export const KommentarPanel: React.FunctionComponent<IKommentarPanelProps> = ({
  sagId,
  logposter,
  logService,
  profil,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [taggede, setTaggede] = React.useState<IPerson[]>([]);
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const kommentarer = logposter.filter((l) => l.Handling === 'Kommentar');

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await logService.tilfoej({
        sagId,
        handling: 'Kommentar',
        titel: tekst.substring(0, 80),
        kommentar: tekst,
        // TaggedeBrugere udloeser Power Automate-notifikationen. Se Task 19.
        taggedeBrugerIds: taggede.map((p) => p.Id),
      });
      setTekst('');
      setTaggede([]);
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Kommentarer</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en kommentar..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <PeoplePicker profil={profil} valgte={taggede} onAendret={setTaggede} />
        <Button appearance="primary" disabled={!tekst.trim() || arbejder} onClick={gem}>
          Tilføj kommentar
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {kommentarer.map((k) => (
          <div key={k.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
            <Text size={200} block>
              {k.Author?.Title} · {new Date(k.Created).toLocaleString('da-DK')}
            </Text>
            <Text block style={{ whiteSpace: 'pre-wrap' }}>
              {k.Kommentar}
            </Text>
            {k.TaggedeBrugere && k.TaggedeBrugere.length > 0 && (
              <Text size={200} block>
                Taggede: {k.TaggedeBrugere.map((t) => t.Title).join(', ')}
              </Text>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
```

- [ ] **Step 4: Skriv NoterPanel.tsx**

```tsx
import * as React from 'react';
import {
  Button,
  Caption1,
  Card,
  MessageBar,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { INote } from '../../domaene/typer';
import { NoteService } from '../../services/NoteService';

export interface INoterPanelProps {
  sagId: number;
  noter: INote[];
  noteService: NoteService;
  onOpdateret: () => Promise<void>;
}

export const NoterPanel: React.FunctionComponent<INoterPanelProps> = ({
  sagId,
  noter,
  noteService,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await noteService.tilfoej(sagId, tekst);
      setTekst('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Egne noter</Title3>

      {/*
        Teksten siger bevidst "Vises kun for dig", ikke "Privat". Noterne
        filtreres paa forfatter i selve forespoergslen, men listen har ingen
        tilladelser pr. element - en administrator kan laese dem.
      */}
      <Caption1>Vises kun for dig. Ikke en del af sagens fælles historik.</Caption1>

      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en note..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <Button disabled={!tekst.trim() || arbejder} onClick={gem}>
          Gem note
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {noter.map((n) => (
          <div key={n.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
            <Text size={200} block>
              {new Date(n.Created).toLocaleString('da-DK')}
            </Text>
            <Text block style={{ whiteSpace: 'pre-wrap' }}>
              {n.Tekst}
            </Text>
            <Button
              size="small"
              appearance="subtle"
              onClick={async () => {
                await noteService.slet(n.Id);
                await onOpdateret();
              }}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

- [ ] **Step 5: Indsæt de tre paneler i SagDetalje**

Erstat `<p>Paneler kommer her. Opdateringsfunktion klar: {typeof opdater}</p>` med:

```tsx
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
            <StatusPanel
              sag={data.sag}
              sagService={tjenester.sag}
              brugerId={brugerId}
              onOpdateret={hentAlt}
            />
            <KommentarPanel
              sagId={sagId}
              logposter={data.logposter}
              logService={tjenester.log}
              profil={tjenester.profil}
              onOpdateret={() => opdater('logposter')}
            />
            <NoterPanel
              sagId={sagId}
              noter={data.noter}
              noteService={tjenester.note}
              onOpdateret={() => opdater('noter')}
            />
          </div>
```

Tilføj importerne:

```typescript
import { StatusPanel } from './StatusPanel';
import { KommentarPanel } from './KommentarPanel';
import { NoterPanel } from './NoterPanel';
```

- [ ] **Step 6: Byg og verificér i workbench**

Run: `npm run serve`
Expected: statusskift virker kun for den ansvarlige; vælges Afventer dukker årsagsfeltet op, og gem uden årsag afvises med en læsbar besked. Kommentarer kan skrives og tagges. Noter vises kun for den, der skrev dem — log ind som en anden bruger og bekræft, at panelet er tomt.

- [ ] **Step 7: Commit**

```bash
git add src/webparts/jordportalen/components
git commit -m "Paneler: status, kommentarer med tagning og egne noter"
```

---

### Task 18: Paneler — opgaver, dokumenter, links og historik

**Files:**
- Create: `src/webparts/jordportalen/components/detalje/OpgavePanel.tsx`
- Create: `src/webparts/jordportalen/components/detalje/DokumentPanel.tsx`
- Create: `src/webparts/jordportalen/components/detalje/LinkPanel.tsx`
- Create: `src/webparts/jordportalen/components/detalje/HistorikPanel.tsx`
- Modify: `src/webparts/jordportalen/components/detalje/SagDetalje.tsx`

**Interfaces:**
- Consumes: `OpgaveService`, `DokumentService`, `LinkService`; `IOpgave`, `IDokument`, `ILink`, `ILogPost`
- Produces: `OpgavePanel`, `DokumentPanel`, `LinkPanel`, `HistorikPanel`

- [ ] **Step 1: Skriv OpgavePanel.tsx**

```tsx
import * as React from 'react';
import { Button, Card, Checkbox, Input, MessageBar, Title3, tokens } from '@fluentui/react-components';
import { IOpgave } from '../../domaene/typer';
import { OpgaveService } from '../../services/OpgaveService';

export interface IOpgavePanelProps {
  sagId: number;
  opgaver: IOpgave[];
  opgaveService: OpgaveService;
  onOpdateret: () => Promise<void>;
}

export const OpgavePanel: React.FunctionComponent<IOpgavePanelProps> = ({
  sagId,
  opgaver,
  opgaveService,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const koer = async (handling: () => Promise<void>): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await handling();
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Opgaver</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
        <Input
          placeholder="Ny opgave..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
          style={{ flex: 1 }}
        />
        <Button
          disabled={!tekst.trim() || arbejder}
          onClick={() => koer(async () => {
            await opgaveService.opret(sagId, tekst);
            setTekst('');
          })}
        >
          Tilføj
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {opgaver.map((o) => (
          <div key={o.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Checkbox
              checked={o.Udfoert}
              label={o.Title}
              disabled={arbejder}
              onChange={(_, d) => koer(() => opgaveService.saetUdfoert(o, !!d.checked))}
            />
            <Button
              size="small"
              appearance="subtle"
              onClick={() => koer(() => opgaveService.slet(o.Id))}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

- [ ] **Step 2: Skriv DokumentPanel.tsx**

```tsx
import * as React from 'react';
import { Button, Card, Link, MessageBar, Text, Title3, tokens } from '@fluentui/react-components';
import { IDokument } from '../../domaene/typer';
import { DokumentService } from '../../services/DokumentService';

export interface IDokumentPanelProps {
  sagId: number;
  dokumenter: IDokument[];
  dokumentService: DokumentService;
  onOpdateret: () => Promise<void>;
}

export const DokumentPanel: React.FunctionComponent<IDokumentPanelProps> = ({
  sagId,
  dokumenter,
  dokumentService,
  onOpdateret,
}) => {
  const filInput = React.useRef<HTMLInputElement>(null);
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const upload = async (fil: File): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await dokumentService.upload(sagId, fil);
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
      if (filInput.current) { filInput.current.value = ''; }
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Dokumenter</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <input
        ref={filInput}
        type="file"
        disabled={arbejder}
        onChange={(e) => {
          const fil = e.target.files?.[0];
          if (fil) { upload(fil).catch(() => undefined); }
        }}
      />

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {dokumenter.map((d) => (
          <div key={d.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Link href={d.ServerRelativeUrl} target="_blank">
              {d.Filnavn}
            </Link>
            <Text size={200}>{new Date(d.Modified).toLocaleDateString('da-DK')}</Text>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={async () => {
                await dokumentService.slet(d.ServerRelativeUrl);
                await onOpdateret();
              }}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

- [ ] **Step 3: Skriv LinkPanel.tsx**

```tsx
import * as React from 'react';
import { Button, Card, Input, Link, MessageBar, Title3, tokens } from '@fluentui/react-components';
import { ILink } from '../../domaene/typer';
import { LinkService } from '../../services/LinkService';

export interface ILinkPanelProps {
  sagId: number;
  links: ILink[];
  linkService: LinkService;
  onOpdateret: () => Promise<void>;
}

export const LinkPanel: React.FunctionComponent<ILinkPanelProps> = ({
  sagId,
  links,
  linkService,
  onOpdateret,
}) => {
  const [etiket, setEtiket] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const gyldig = etiket.trim() !== '' && /^https?:\/\/.+/.test(url.trim());

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await linkService.tilfoej(sagId, etiket.trim(), url.trim());
      setEtiket('');
      setUrl('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Links</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Input
          placeholder="Etiket, fx GO-sag 2026-0041"
          value={etiket}
          disabled={arbejder}
          onChange={(_, d) => setEtiket(d.value)}
        />
        <Input
          placeholder="https://..."
          value={url}
          disabled={arbejder}
          onChange={(_, d) => setUrl(d.value)}
        />
        <Button disabled={!gyldig || arbejder} onClick={gem}>
          Tilføj link
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {links.map((l) => (
          <div key={l.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Link href={l.Url?.Url} target="_blank">
              {l.Title}
            </Link>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={async () => {
                await linkService.slet(l.Id);
                await onOpdateret();
              }}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

- [ ] **Step 4: Skriv HistorikPanel.tsx**

```tsx
import * as React from 'react';
import { Card, Text, Title3, tokens } from '@fluentui/react-components';
import { ILogPost } from '../../domaene/typer';

export interface IHistorikPanelProps {
  logposter: ILogPost[];
}

export const HistorikPanel: React.FunctionComponent<IHistorikPanelProps> = ({ logposter }) => (
  <Card style={{ padding: tokens.spacingVerticalM }}>
    <Title3>Historik</Title3>
    <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
      {logposter.map((l) => (
        <div key={l.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text size={200} block>
            {new Date(l.Created).toLocaleString('da-DK')} · {l.Author?.Title}
          </Text>
          <Text block weight="semibold">
            {l.Handling}
          </Text>
          <Text block>{l.Title}</Text>
        </div>
      ))}
    </div>
  </Card>
);
```

- [ ] **Step 5: Indsæt de fire paneler i SagDetalje**

Tilføj efter `<NoterPanel ... />` inde i panelkolonnen:

```tsx
            <OpgavePanel
              sagId={sagId}
              opgaver={data.opgaver}
              opgaveService={tjenester.opgave}
              onOpdateret={() => opdater('opgaver')}
            />
            <DokumentPanel
              sagId={sagId}
              dokumenter={data.dokumenter}
              dokumentService={tjenester.dokument}
              onOpdateret={() => opdater('dokumenter')}
            />
            <LinkPanel
              sagId={sagId}
              links={data.links}
              linkService={tjenester.link}
              onOpdateret={() => opdater('links')}
            />
            <HistorikPanel logposter={data.logposter} />
```

Tilføj importerne:

```typescript
import { OpgavePanel } from './OpgavePanel';
import { DokumentPanel } from './DokumentPanel';
import { LinkPanel } from './LinkPanel';
import { HistorikPanel } from './HistorikPanel';
```

- [ ] **Step 6: Byg og verificér i workbench**

Run: `npm run serve`
Expected: opgaver kan oprettes og krydses af. Upload af en fil opretter mappen `sag-<id>` i `P8Dokumenter` første gang. Links kan tilføjes, og knappen er deaktiveret indtil URL'en starter med http. Alle handlinger dukker op i historikken.

- [ ] **Step 7: Kør hele testsuiten og commit**

```bash
npm test
git add src/webparts/jordportalen/components
git commit -m "Paneler: opgaver, dokumenter, links og historik"
```

---

### Task 19: Power Automate-notifikation og udrulning

**Files:**
- Create: `POWER-AUTOMATE.md`
- Create: `DEPLOY.md`
- Modify: `config/package-solution.json`

**Interfaces:**
- Consumes: `P8Log.TaggedeBrugere`
- Produces: dokumentation; ingen kode

- [ ] **Step 1: Skriv POWER-AUTOMATE.md**

```markdown
# Notifikation ved tagning

Når en sagsbehandler tagger en kollega i en kommentar, gemmes det i
`TaggedeBrugere` på `P8Log`. Selve mailen kan **ikke** sendes fra appen:
SharePoints `SendEmail`-API er udfaset af Microsoft. Derfor dette flow.

## Opret flowet

1. Gå til https://make.powerautomate.com
2. **Opret → Automatiseret cloudflow**
3. Navn: `Jordportalen – Tag-notifikation`
4. Trigger: **When an item is created** (SharePoint)

## Trigger

- Site Address: `https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard`
- List Name: `P8Log`

## Betingelse

Tilføj **Condition**. Venstre side indtastes som **Udtryk**, ikke som felt:

    length(triggerBody()?['TaggedeBrugere'])

Operator `is greater than`, højre side `0`.

Der filtreres bevidst **ikke** på `Handling`. Så virker tagning i enhver
sammenhæng, der bruger feltet, uden at flowet skal ændres.

## Handling ved Ja

**Apply to each** over `TaggedeBrugere`, med **Send an email (V2)** indeni:

- To: `Current item Email`
- Subject: `Du er tagget i en §8-sag`
- Body: link til sagen, bygget som
  `https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/SitePages/§8-Ansøgninger---Jord-og-Grundvand.aspx?sag=` efterfulgt af `SagId` fra triggeren.

Brug `?sag=`, ikke `#sag-`. Et hash i URL'en crasher SharePoints side-bootstrap,
når linket åbnes fra en mail.
```

- [ ] **Step 2: Skriv DEPLOY.md**

```markdown
# Udrulning

## Byg pakken

    npm run build
    npm run package-solution -- --ship

Resultatet ligger i `sharepoint/solution/jordportalen.sppkg`.

## Bump versionen først

I `config/package-solution.json` skal versionen hæves **to steder**: i roden og
inde i `solution`. Gør man det kun ét sted, udrulles pakken uden at ændre noget,
og det ligner en cache-fejl.

## Upload

PnP PowerShell kan ikke forbinde i denne tenant — appen
`31359c7f-bd7e-475c-86db-fdb8c937548e` er ikke godkendt, og `-UseWebLogin` åbner
et Internet Explorer-vindue, SharePoint Online afviser. `deploy_spfx.ps1` virker
derfor ikke, før godkendelsen er på plads.

Indtil da uploades pakken i browseren:

1. Åbn App Catalog for tenanten
2. Upload `sharepoint/solution/jordportalen.sppkg`
3. Vælg **Implementér**
4. Tilføj webparten på siden §8-Ansøgninger – Jord og Grundvand

Det kræver ingen særlige rettigheder ud over adgang til App Catalog.
```

- [ ] **Step 3: Bekræft at versionsfelterne står rigtigt**

Åbn `config/package-solution.json` og bekræft at `version` findes både i roden og inde i `solution`, og at `includeClientSideAssets` og `skipFeatureDeployment` er `true` (sat i Task 1).

- [ ] **Step 4: Byg pakken og bekræft at den dannes**

Run: `npm run build && npm run package-solution -- --ship`
Expected: `sharepoint/solution/jordportalen.sppkg` findes.

- [ ] **Step 5: Commit**

```bash
git add POWER-AUTOMATE.md DEPLOY.md config/package-solution.json
git commit -m "Power Automate-notifikation og udrulningsvejledning"
```

---

## Efter planen

Tre punkter fra specifikationen står stadig åbne og kræver information udefra:

1. **Filnavne på OS2Forms-bilag.** `P8Vedhaeftninger.Filnavn` og `FilUrl` er tomme, indtil robotten kan slå fil-id'er op via `/entity/file/{file_id}`. `DokumentPanel` viser fil-id'et i mellemtiden.
2. **`navn_kontaktperson_2` mangler i blanketten.** Grundejer nr. 2 vises med firmanavn.
3. **PnP-godkendelse i tenanten.** Låser op for `deploy_spfx.ps1` og for automatiseret listeoprettelse.
