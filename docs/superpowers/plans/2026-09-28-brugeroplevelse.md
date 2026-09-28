# Brugeroplevelse, første runde — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboardet husker filtre og følger browserens tilbage-knap. Det viser aktive sager som standard og har nøgletal, der betyder det samme hver gang. Sagssiden har en overskrift, der siger, hvilken sag man står i.

**Architecture:** Adressen er den eneste kilde til visningen: åben sag, udvalg, hvem og søgning. Rene funktioner i `domaene/dashboard.ts` og `utils/visning.ts` gør alt det, der kan gå galt uden at give nogen fejl, og de er dækket af jest. Komponenterne er tynde og kalder dem. Dashboardet henter alle sager én gang og filtrerer i browseren.

**Tech Stack:** SPFx 1.23, React 17, TypeScript 5.8, Fluent UI React v9 (`@fluentui/react-components`), PnPjs v4, jest med ts-jest.

**Spec:** [`docs/superpowers/specs/2026-09-28-brugeroplevelse-design.md`](../specs/2026-09-28-brugeroplevelse-design.md)

## Global Constraints

- Alle kommandoer køres fra `C:\Users\azmda0l\Source\jordportalen`.
- Arbejd på branchen `brugeroplevelse`, ikke på `main`. `main` er beskyttet. **Push aldrig.** Brugeren pusher selv.
- Kildekommentarer skrives på dansk **uden** æ/ø/å (skriv ae, oe, aa). Strengværdier, som brugeren ser, har rigtige danske tegn.
- `tsconfig.test.json` har kun `es5`/`es2015`-lib. Brug **`indexOf(...) !== -1`**, ikke `Array.prototype.includes`, ligesom resten af koden.
- Komponenter kalder aldrig PnPjs direkte, kun services.
- Dropdowns skal have `mountNode={useMountNode()}`, ellers mister popuppen sin styling.
- Standardvisningen er `{ udvalg: 'aktive', hvem: 'alle', soeg: '' }`, og standardværdier skrives aldrig i adressen.
- Adresseparametrene hedder præcis `sag`, `status`, `hvem` og `q`.
- Afsluttede statusser er præcis `Afgjort` og `Afvist`.
- Ingen komponenttests. Komponenter verificeres med `npx tsc --noEmit -p tsconfig.json` og `npm run build`.
- Verifikation før hver commit: `npm test` (alle grønne) og `npx tsc --noEmit -p tsconfig.json` (ingen fejl).

## Review Focus

1. **Tomt personfelt kommer som `null` fra SharePoint, ikke `undefined`.** En sag med `AnsvarligId: null` skal tælle som ledig i både filter og nøgletal. Testen ligger i Task 1.
2. **Søgning med æ/ø/å og mellemrum** ("Nørre Allé") skal overleve turen gennem adressen og stadig give træf. Testen ligger i Task 2.
3. **SharePoints egne parametre i adressen**, fx `?Mode=Edit` eller `?env=WebView`, skal bevares, når portalen skriver adressen. Ellers kan redigeringstilstanden forsvinde. Testen ligger i Task 2.
4. **`history.state` ejet af SharePoint**, altså et objekt uden portalens markør, skal give "nyt trin" og ikke "gå tilbage". Ellers forlader "← Oversigten" siden. Portalens markør skal lægges oven i SharePoints state, ikke erstatte den. Testene ligger i Task 2.
5. **En ukendt status fra SharePoint**, fordi en administrator har tilføjet et valg, skal tælle som aktiv og ikke forsvinde fra både listen og nøgletallene. Testen ligger i Task 1.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/webparts/jordportalen/domaene/statusregler.ts` | + `AFSLUTTEDE_STATUS`, `erAfsluttet` |
| `src/webparts/jordportalen/domaene/dashboard.ts` | **Ny.** Visningstyper, `filtrerSager`, `taelNoegletal`, kortgenveje, `erStandard` |
| `src/webparts/jordportalen/domaene/formatering.ts` | **Ny.** `ejendomsDetaljer` |
| `src/webparts/jordportalen/utils/visning.ts` | **Ny.** `laesVisning`, `byggUrl`, `historikTilstand`, `tilbageHandling` |
| `src/webparts/jordportalen/utils/deepLink.ts` | **Slettes** i Task 6 |
| `src/webparts/jordportalen/domaene/forespoergsler.ts` | − `dashboardFilter`, `IDashboardFilter` |
| `src/webparts/jordportalen/services/SagService.ts` | `hentAlleSager()` uden filter, + `Grundejere` |
| `src/webparts/jordportalen/components/faelles/StatusMaerkat.tsx` | **Ny** |
| `src/webparts/jordportalen/components/dashboard/*.tsx` | Dashboard, Filtre, KpiKort, SagsTabel |
| `src/webparts/jordportalen/components/detalje/SagHoved.tsx` | **Ny** |
| `src/webparts/jordportalen/components/detalje/SagDetalje.tsx`, `Metadata.tsx` | Bruger SagHoved og ejendomsDetaljer |
| `src/webparts/jordportalen/components/Jordportalen.tsx` | Visning fra adressen, `naviger`, `popstate` |
| `tests/dashboard.test.ts`, `tests/visning.test.ts`, `tests/formatering.test.ts` | **Nye** |
| `tests/deepLink.test.ts` | **Slettes** i Task 6, efter at tilfældene er flyttet i Task 2 |
| `tests/forespoergsler.test.ts`, `tests/statusregler.test.ts` | Ændres |

---

### Task 0: Forbered branchen

**Files:** ingen kodeændringer.

- [ ] **Step 1: Se hvad der ligger ucommittet**

Run: `git status --short`
Expected: ændringerne fra adresseskiftet til `/teams/Jordportalen` (8 filer) plus `scripts/tjek-lister.js`, spec'en `docs/superpowers/specs/2026-09-28-brugeroplevelse-design.md` og denne plan.

- [ ] **Step 2: Spørg brugeren, før der committes noget**

Spørg brugeren, om de eksisterende ændringer må committes på den nye branch som to commits: "Flyt site til /teams/Jordportalen og tilføj tjek-lister.js" og "Tilføj spec og plan for brugeroplevelse". Commit ikke uden et ja.

- [ ] **Step 3: Opret branchen og commit (efter ja)**

```bash
git switch -c brugeroplevelse
git add OPRET-LISTER.md OVERDRAGELSE.md POWER-AUTOMATE.md SHAREPOINT-LISTER.md scripts/Opret-SharePointLister.ps1 scripts/tjek-lister.js tests/deepLink.test.ts docs/superpowers/plans/2026-09-24-jordportalen.md docs/superpowers/specs/2026-09-24-jordportalen-design.md
git commit -m "Flyt site til /teams/Jordportalen og tilfoej tjek-lister.js"
git add docs/superpowers/specs/2026-09-28-brugeroplevelse-design.md docs/superpowers/plans/2026-09-28-brugeroplevelse.md
git commit -m "Tilfoej spec og plan for brugeroplevelse"
```

- [ ] **Step 4: Bekræft udgangspunktet**

Run: `npm test`
Expected: `Tests: 56 passed, 56 total`

---

### Task 1: Domænelaget for dashboardet

**Files:**
- Modify: `src/webparts/jordportalen/domaene/statusregler.ts` (tilføj efter `TILLADTE_SKIFT`)
- Create: `src/webparts/jordportalen/domaene/dashboard.ts`
- Modify: `tests/statusregler.test.ts`
- Create: `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `ISag`, `SagStatus`, `ALLE_STATUS` fra `domaene/typer.ts`; `naeste` fra `domaene/statusregler.ts`
- Produces:
  - `statusregler.ts`: `AFSLUTTEDE_STATUS: readonly SagStatus[]`, `erAfsluttet(status: SagStatus): boolean`
  - `dashboard.ts`:
    - `type Udvalg = 'aktive' | 'afsluttede' | 'alle' | SagStatus`
    - `type Hvem = 'alle' | 'ledige' | 'mine'`
    - `interface IVisning { sag?: number; udvalg: Udvalg; hvem: Hvem; soeg: string }`
    - `STANDARD_VISNING: IVisning`
    - `ALLE_UDVALG: readonly Udvalg[]`, `ALLE_HVEM: readonly Hvem[]`
    - `filtrerSager(sager: ISag[], visning: IVisning, brugerId: number): ISag[]`
    - `interface INoegletal { aktive: number; ledige: number; mine: number; afventer: number }`
    - `taelNoegletal(sager: ISag[], brugerId: number): INoegletal`
    - `type Kort = 'aktive' | 'ledige' | 'mine' | 'afventer'`, `ALLE_KORT: readonly Kort[]`
    - `kortGenvej(kort: Kort, visning: IVisning): IVisning`
    - `erKortValgt(kort: Kort, visning: IVisning): boolean`
    - `erStandard(visning: IVisning): boolean`

- [ ] **Step 1: Skriv de fejlende tests for statusreglerne**

Tilføj nederst i `tests/statusregler.test.ts`, og udvid importen i toppen til
`import { erAfsluttet, maaSkifte, naeste, validerStatusskift } from '../src/webparts/jordportalen/domaene/statusregler';`
og `import { ALLE_STATUS, SagStatus } from '../src/webparts/jordportalen/domaene/typer';`:

```ts
describe('erAfsluttet', () => {
  it('er sand for Afgjort og Afvist', () => {
    expect(erAfsluttet('Afgjort')).toBe(true);
    expect(erAfsluttet('Afvist')).toBe(true);
  });

  it('er falsk for de tre aktive statusser', () => {
    expect(erAfsluttet('Ny')).toBe(false);
    expect(erAfsluttet('Under behandling')).toBe(false);
    expect(erAfsluttet('Afventer')).toBe(false);
  });

  it('stemmer med sagsgangen: afsluttet betyder ingen overgange', () => {
    // Vagt mod at de to lister glider fra hinanden, hvis sagsgangen aendres.
    for (const s of ALLE_STATUS) {
      expect(erAfsluttet(s)).toBe(naeste(s).length === 0);
    }
  });

  it('behandler en ukendt status som aktiv', () => {
    expect(erAfsluttet('Genoptaget' as SagStatus)).toBe(false);
  });
});
```

- [ ] **Step 2: Kør og se dem fejle**

Run: `npx jest tests/statusregler.test.ts`
Expected: FAIL — `erAfsluttet` is not exported / not a function.

- [ ] **Step 3: Implementér i `statusregler.ts`**

Tilføj lige efter `TILLADTE_SKIFT`-objektet:

```ts
/**
 * De to endelige statusser. Dashboardets "aktive" er alt andet.
 *
 * Ligger her sammen med sagsgangen, saa en aendring i TILLADTE_SKIFT og i
 * hvad der regnes som afsluttet sker samme sted. En test holder de to i trit.
 */
export const AFSLUTTEDE_STATUS: readonly SagStatus[] = ['Afgjort', 'Afvist'];

/** Sand for Afgjort og Afvist. En ukendt status regnes som aktiv. */
export function erAfsluttet(status: SagStatus): boolean {
  return AFSLUTTEDE_STATUS.indexOf(status) !== -1;
}
```

- [ ] **Step 4: Kør og se dem bestå**

Run: `npx jest tests/statusregler.test.ts`
Expected: PASS

- [ ] **Step 5: Skriv de fejlende tests for `dashboard.ts`**

Opret `tests/dashboard.test.ts`:

```ts
import {
  ALLE_KORT,
  erKortValgt,
  erStandard,
  filtrerSager,
  IVisning,
  kortGenvej,
  STANDARD_VISNING,
  taelNoegletal,
} from '../src/webparts/jordportalen/domaene/dashboard';
import { ISag, SagStatus } from '../src/webparts/jordportalen/domaene/typer';

const MIG = 7;
const KOLLEGA = 9;

function sag(felter: Partial<ISag>): ISag {
  return {
    Id: 1,
    Title: 'Ringvej 12, 8000 Aarhus C',
    SubmissionUUID: 'uuid',
    SubmissionSerial: 1,
    SubmissionSid: 1,
    FlereGrundejere: false,
    BygherreSammeSomGrundejer: false,
    Status: 'Ny',
    AntalAdresser: 1,
    AntalKontakter: 1,
    AntalVedhaeftninger: 0,
    ...felter,
  };
}

function visning(felter: Partial<IVisning>): IVisning {
  return { ...STANDARD_VISNING, ...felter };
}

const ids = (sager: ISag[]): number[] => sager.map((s) => s.Id);

const SAGER: ISag[] = [
  sag({ Id: 1, Status: 'Ny' }),
  sag({ Id: 2, Status: 'Under behandling', AnsvarligId: MIG }),
  sag({ Id: 3, Status: 'Afventer', AnsvarligId: KOLLEGA }),
  sag({ Id: 4, Status: 'Afgjort', AnsvarligId: MIG }),
  sag({ Id: 5, Status: 'Afvist' }),
];

describe('filtrerSager - udvalg', () => {
  it('viser aktive sager som standard', () => {
    expect(ids(filtrerSager(SAGER, STANDARD_VISNING, MIG))).toEqual([1, 2, 3]);
  });

  it('viser kun afsluttede', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'afsluttede' }), MIG))).toEqual([4, 5]);
  });

  it('viser alle', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'alle' }), MIG))).toEqual([1, 2, 3, 4, 5]);
  });

  it('viser en bestemt status', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'Afventer' }), MIG))).toEqual([3]);
  });

  it('viser en ukendt status fra SharePoint blandt de aktive', () => {
    const med = [...SAGER, sag({ Id: 6, Status: 'Genoptaget' as SagStatus })];
    expect(ids(filtrerSager(med, STANDARD_VISNING, MIG))).toEqual([1, 2, 3, 6]);
  });
});

describe('filtrerSager - hvem', () => {
  it('ledige er sager uden ansvarlig', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'ledige', udvalg: 'alle' }), MIG))).toEqual([1, 5]);
  });

  it('mine er sager med mig som ansvarlig', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'mine', udvalg: 'alle' }), MIG))).toEqual([2, 4]);
  });

  it('regner et tomt personfelt fra SharePoint (null) som ledigt', () => {
    // SharePoint returnerer null, ikke undefined, for et tomt personfelt.
    const nul = sag({ Id: 8, AnsvarligId: null as unknown as undefined });
    expect(ids(filtrerSager([nul], visning({ hvem: 'ledige' }), MIG))).toEqual([8]);
    expect(ids(filtrerSager([nul], visning({ hvem: 'mine' }), MIG))).toEqual([]);
  });

  it('kombinerer udvalg og hvem', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'mine' }), MIG))).toEqual([2]);
  });
});

describe('filtrerSager - soegning', () => {
  const sager = [
    sag({ Id: 1, SubmissionSerial: 75, Title: 'Nørre Allé 3', AdresserTekst: 'Nørre Allé 3\nVestergade 1' }),
    sag({ Id: 2, SubmissionSerial: 12, Title: 'Ringvej 12', Grundejere: 'Mette Hansen\nJens Jensen' }),
    sag({ Id: 3, SubmissionSerial: 13, Title: 'Havnegade 1', AdresserTekst: undefined, Grundejere: undefined }),
  ];

  it('rammer sagsnummeret', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '75' }), MIG))).toEqual([1]);
  });

  it('rammer titlen', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'havnegade' }), MIG))).toEqual([3]);
  });

  it('rammer en adresse ud over den foerste', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'Vestergade' }), MIG))).toEqual([1]);
  });

  it('rammer en grundejer', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'jens jensen' }), MIG))).toEqual([2]);
  });

  it('er ligeglad med store og smaa bogstaver og mellemrum omkring', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '  NØRRE ALLÉ  ' }), MIG))).toEqual([1]);
  });

  it('tom soegning filtrerer intet', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '   ' }), MIG))).toEqual([1, 2, 3]);
  });

  it('bevarer raekkefoelgen fra serveren', () => {
    const omvendt = [...sager].reverse();
    expect(ids(filtrerSager(omvendt, STANDARD_VISNING, MIG))).toEqual([3, 2, 1]);
  });
});

describe('taelNoegletal', () => {
  it('taeller kun aktive sager', () => {
    expect(taelNoegletal(SAGER, MIG)).toEqual({ aktive: 3, ledige: 1, mine: 1, afventer: 1 });
  });

  it('taeller null som ledig', () => {
    const nul = sag({ Id: 8, AnsvarligId: null as unknown as undefined });
    expect(taelNoegletal([nul], MIG).ledige).toBe(1);
  });

  it('giver nul overalt for en tom liste', () => {
    expect(taelNoegletal([], MIG)).toEqual({ aktive: 0, ledige: 0, mine: 0, afventer: 0 });
  });
});

describe('kortGenvej og erKortValgt', () => {
  it('saetter udvalg og hvem og bevarer soegningen', () => {
    const fra = visning({ udvalg: 'afsluttede', hvem: 'mine', soeg: 'Ringvej' });
    expect(kortGenvej('aktive', fra)).toEqual({ udvalg: 'aktive', hvem: 'alle', soeg: 'Ringvej' });
    expect(kortGenvej('ledige', fra)).toEqual({ udvalg: 'aktive', hvem: 'ledige', soeg: 'Ringvej' });
    expect(kortGenvej('mine', fra)).toEqual({ udvalg: 'aktive', hvem: 'mine', soeg: 'Ringvej' });
    expect(kortGenvej('afventer', fra)).toEqual({ udvalg: 'Afventer', hvem: 'alle', soeg: 'Ringvej' });
  });

  it('fjerner en aaben sag fra visningen', () => {
    expect(kortGenvej('aktive', visning({ sag: 42 })).sag).toBeUndefined();
  });

  it('markerer netop det kort der svarer til visningen', () => {
    const valgte = (v: IVisning): string[] => ALLE_KORT.filter((k) => erKortValgt(k, v));
    expect(valgte(STANDARD_VISNING)).toEqual(['aktive']);
    expect(valgte(visning({ hvem: 'ledige' }))).toEqual(['ledige']);
    expect(valgte(visning({ udvalg: 'Afventer' }))).toEqual(['afventer']);
    expect(valgte(visning({ udvalg: 'afsluttede' }))).toEqual([]);
    expect(valgte(visning({ udvalg: 'Afventer', hvem: 'mine' }))).toEqual([]);
  });

  it('markerer uanset soegning', () => {
    expect(erKortValgt('aktive', visning({ soeg: 'x' }))).toBe(true);
  });
});

describe('erStandard', () => {
  it('er sand for standardvisningen, ogsaa med en aaben sag eller blank soegning', () => {
    expect(erStandard(STANDARD_VISNING)).toBe(true);
    expect(erStandard(visning({ sag: 3, soeg: '  ' }))).toBe(true);
  });

  it('er falsk naar udvalg, hvem eller soegning afviger', () => {
    expect(erStandard(visning({ udvalg: 'alle' }))).toBe(false);
    expect(erStandard(visning({ hvem: 'mine' }))).toBe(false);
    expect(erStandard(visning({ soeg: 'x' }))).toBe(false);
  });
});
```

- [ ] **Step 6: Kør og se dem fejle**

Run: `npx jest tests/dashboard.test.ts`
Expected: FAIL — Cannot find module `../src/webparts/jordportalen/domaene/dashboard`.

- [ ] **Step 7: Implementér `domaene/dashboard.ts`**

```ts
import { ALLE_STATUS, ISag, SagStatus } from './typer';
import { erAfsluttet } from './statusregler';

/**
 * Dashboardets visning og filtrering som rene funktioner.
 *
 * Alle sager hentes én gang, og filtreringen sker her i browseren. Det
 * forudsaetter hoejst et par tusind sager - se spec'en for brugeroplevelse.
 */

export type Udvalg = 'aktive' | 'afsluttede' | 'alle' | SagStatus;
export type Hvem = 'alle' | 'ledige' | 'mine';

export interface IVisning {
  /** Aaben sag. Udeladt betyder dashboardet. */
  sag?: number;
  udvalg: Udvalg;
  hvem: Hvem;
  soeg: string;
}

export const STANDARD_VISNING: IVisning = { udvalg: 'aktive', hvem: 'alle', soeg: '' };

export const ALLE_UDVALG: readonly Udvalg[] = ['aktive', 'afsluttede', 'alle', ...ALLE_STATUS];
export const ALLE_HVEM: readonly Hvem[] = ['alle', 'ledige', 'mine'];

function iUdvalg(s: ISag, udvalg: Udvalg): boolean {
  switch (udvalg) {
    case 'aktive':
      return !erAfsluttet(s.Status);
    case 'afsluttede':
      return erAfsluttet(s.Status);
    case 'alle':
      return true;
    default:
      return s.Status === udvalg;
  }
}

// SharePoint returnerer null, ikke undefined, for et tomt personfelt. Derfor
// !AnsvarligId og ikke === undefined.
function erLedig(s: ISag): boolean {
  return !s.AnsvarligId;
}

function hvemPasser(s: ISag, hvem: Hvem, brugerId: number): boolean {
  switch (hvem) {
    case 'ledige':
      return erLedig(s);
    case 'mine':
      return s.AnsvarligId === brugerId;
    default:
      return true;
  }
}

function matcherSoegning(s: ISag, soeg: string): boolean {
  const q = soeg.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const felter = [String(s.SubmissionSerial ?? ''), s.Title, s.AdresserTekst, s.Grundejere];
  return felter.some((f) => (f || '').toLowerCase().indexOf(q) !== -1);
}

/** Sagerne i visningen, i den raekkefoelge serveren leverede dem. */
export function filtrerSager(sager: ISag[], visning: IVisning, brugerId: number): ISag[] {
  return sager.filter(
    (s) =>
      iUdvalg(s, visning.udvalg) &&
      hvemPasser(s, visning.hvem, brugerId) &&
      matcherSoegning(s, visning.soeg)
  );
}

export interface INoegletal {
  aktive: number;
  ledige: number;
  mine: number;
  afventer: number;
}

/**
 * Noegletal over de aktive sager, uafhaengigt af filtrene. Saa staar tallene
 * stille mens man filtrerer og betyder det samme hver gang.
 */
export function taelNoegletal(sager: ISag[], brugerId: number): INoegletal {
  const aktive = sager.filter((s) => !erAfsluttet(s.Status));
  return {
    aktive: aktive.length,
    ledige: aktive.filter(erLedig).length,
    mine: aktive.filter((s) => s.AnsvarligId === brugerId).length,
    afventer: aktive.filter((s) => s.Status === 'Afventer').length,
  };
}

export type Kort = 'aktive' | 'ledige' | 'mine' | 'afventer';
export const ALLE_KORT: readonly Kort[] = ['aktive', 'ledige', 'mine', 'afventer'];

/** Visningen et klik paa kortet giver. Soegningen bevares. */
export function kortGenvej(kort: Kort, visning: IVisning): IVisning {
  const soeg = visning.soeg;
  switch (kort) {
    case 'ledige':
      return { udvalg: 'aktive', hvem: 'ledige', soeg };
    case 'mine':
      return { udvalg: 'aktive', hvem: 'mine', soeg };
    case 'afventer':
      return { udvalg: 'Afventer', hvem: 'alle', soeg };
    default:
      return { udvalg: 'aktive', hvem: 'alle', soeg };
  }
}

/** Sand naar kortets genvej svarer til visningen (soegningen taeller ikke med). */
export function erKortValgt(kort: Kort, visning: IVisning): boolean {
  const genvej = kortGenvej(kort, visning);
  return genvej.udvalg === visning.udvalg && genvej.hvem === visning.hvem;
}

/** Sand naar udvalg, hvem og soegning staar til standard. En aaben sag taeller ikke med. */
export function erStandard(visning: IVisning): boolean {
  return (
    visning.udvalg === STANDARD_VISNING.udvalg &&
    visning.hvem === STANDARD_VISNING.hvem &&
    visning.soeg.trim() === ''
  );
}
```

- [ ] **Step 8: Kør og se dem bestå**

Run: `npx jest tests/dashboard.test.ts tests/statusregler.test.ts`
Expected: PASS

- [ ] **Step 9: Fuld verifikation og commit**

Run: `npm test` og `npx tsc --noEmit -p tsconfig.json`
Expected: alle grønne, ingen typefejl.

```bash
git add src/webparts/jordportalen/domaene/statusregler.ts src/webparts/jordportalen/domaene/dashboard.ts tests/statusregler.test.ts tests/dashboard.test.ts
git commit -m "Tilfoej filtrering og noegletal for dashboardet som rene funktioner"
```

---

### Task 2: Visningen i adressen

**Files:**
- Create: `src/webparts/jordportalen/utils/visning.ts`
- Create: `tests/visning.test.ts`

`utils/deepLink.ts` og `tests/deepLink.test.ts` røres **ikke** her. De slettes i Task 6, når intet længere bruger dem.

**Interfaces:**
- Consumes: `IVisning`, `STANDARD_VISNING`, `ALLE_UDVALG`, `ALLE_HVEM`, `Udvalg`, `Hvem` fra `domaene/dashboard.ts`
- Produces:
  - `laesVisning(url: string): IVisning`
  - `byggUrl(basisUrl: string, visning: IVisning): string`
  - `HISTORIK_MARKOER = 'jordportalen'`
  - `historikTilstand(eksisterende: unknown): Record<string, unknown>`
  - `tilbageHandling(historyState: unknown): 'gaa-tilbage' | 'nyt-trin'`

- [ ] **Step 1: Skriv de fejlende tests**

Opret `tests/visning.test.ts`. De fem første tilfælde er de eksisterende fra `tests/deepLink.test.ts`, oversat til de nye funktioner:

```ts
import {
  byggUrl,
  historikTilstand,
  laesVisning,
  tilbageHandling,
} from '../src/webparts/jordportalen/utils/visning';
import { IVisning, STANDARD_VISNING } from '../src/webparts/jordportalen/domaene/dashboard';

const SIDE = 'https://aarhuskommune.sharepoint.com/teams/Jordportalen/SitePages/Jord.aspx';

const med = (felter: Partial<IVisning>): IVisning => ({ ...STANDARD_VISNING, ...felter });

describe('byggUrl - sagslinks (overtaget fra deepLink)', () => {
  it('bruger query-parameter, ikke hash', () => {
    expect(byggUrl(SIDE, med({ sag: 42 }))).toBe(`${SIDE}?sag=42`);
  });

  it('tilfoejer til en URL der allerede har parametre', () => {
    expect(byggUrl(`${SIDE}?env=1`, med({ sag: 42 }))).toBe(`${SIDE}?env=1&sag=42`);
  });

  it('erstatter et eksisterende sag-parameter i stedet for at duplikere det', () => {
    expect(byggUrl(`${SIDE}?sag=7`, med({ sag: 42 }))).toBe(`${SIDE}?sag=42`);
  });
});

describe('laesVisning - sagslinks (overtaget fra deepLink)', () => {
  it('laeser query-parameteren', () => {
    expect(laesVisning(`${SIDE}?sag=42`).sag).toBe(42);
  });

  it('laeser stadig gamle hash-links af hensyn til eksisterende mails', () => {
    expect(laesVisning(`${SIDE}#sag-42`).sag).toBe(42);
  });

  it('giver ingen sag naar der ikke er nogen i URL en', () => {
    expect(laesVisning(SIDE).sag).toBeUndefined();
  });

  it('giver ingen sag ved en vaerdi der ikke er et tal', () => {
    expect(laesVisning(`${SIDE}?sag=abc`).sag).toBeUndefined();
  });

  it('giver ingen sag ved et negativt id', () => {
    expect(laesVisning(`${SIDE}?sag=-1`).sag).toBeUndefined();
  });
});

describe('byggUrl - filtre', () => {
  it('skriver ingen parametre for standardvisningen', () => {
    expect(byggUrl(SIDE, STANDARD_VISNING)).toBe(SIDE);
  });

  it('skriver udvalg, hvem og soegning naar de afviger', () => {
    const url = byggUrl(SIDE, med({ udvalg: 'Afventer', hvem: 'mine', soeg: 'Ringvej' }));
    expect(url).toBe(`${SIDE}?status=Afventer&hvem=mine&q=Ringvej`);
  });

  it('udelader en soegning der kun er mellemrum', () => {
    expect(byggUrl(SIDE, med({ soeg: '   ' }))).toBe(SIDE);
  });

  it('fjerner portalens egne parametre der ikke laengere gaelder', () => {
    expect(byggUrl(`${SIDE}?status=alle&hvem=mine&q=x&sag=3`, STANDARD_VISNING)).toBe(SIDE);
  });

  it('bevarer SharePoints egne parametre', () => {
    const url = byggUrl(`${SIDE}?Mode=Edit&env=WebView`, med({ hvem: 'ledige' }));
    expect(url).toBe(`${SIDE}?Mode=Edit&env=WebView&hvem=ledige`);
  });

  it('smider et hash vaek', () => {
    expect(byggUrl(`${SIDE}#sag-42`, med({ sag: 42 }))).toBe(`${SIDE}?sag=42`);
  });
});

describe('laesVisning - filtre', () => {
  it('giver standard for en adresse uden parametre', () => {
    expect(laesVisning(SIDE)).toEqual(STANDARD_VISNING);
  });

  it('laeser udvalg, hvem og soegning', () => {
    expect(laesVisning(`${SIDE}?status=afsluttede&hvem=ledige&q=Havn`)).toEqual(
      med({ udvalg: 'afsluttede', hvem: 'ledige', soeg: 'Havn' })
    );
  });

  it('falder tilbage til standard ved ukendte vaerdier', () => {
    expect(laesVisning(`${SIDE}?status=Lukket&hvem=chefen`)).toEqual(STANDARD_VISNING);
  });

  it('laeser en status med mellemrum', () => {
    expect(laesVisning(byggUrl(SIDE, med({ udvalg: 'Under behandling' }))).udvalg).toBe('Under behandling');
  });
});

describe('rundtur gennem adressen', () => {
  const tilfaelde: IVisning[] = [
    STANDARD_VISNING,
    med({ sag: 12 }),
    med({ udvalg: 'Afventer', hvem: 'mine', soeg: 'Ringvej 12' }),
    med({ soeg: 'Nørre Allé & Co.' }),
    med({ udvalg: 'alle', hvem: 'ledige', sag: 5, soeg: 'æøå ÆØÅ' }),
  ];

  it.each(tilfaelde)('%o overlever byggUrl -> laesVisning', (v) => {
    expect(laesVisning(byggUrl(SIDE, v))).toEqual(v);
  });

  it('overlever ogsaa med SharePoint-parametre i adressen', () => {
    const v = med({ soeg: 'Nørre Allé' });
    expect(laesVisning(byggUrl(`${SIDE}?Mode=Edit`, v))).toEqual(v);
  });
});

describe('historikTilstand og tilbageHandling', () => {
  it('laegger portalens markoer oven i SharePoints state uden at fjerne den', () => {
    expect(historikTilstand({ spNav: 1 })).toEqual({ spNav: 1, jordportalen: true });
  });

  it('klarer at der ingen state er', () => {
    expect(historikTilstand(null)).toEqual({ jordportalen: true });
    expect(historikTilstand('tekst')).toEqual({ jordportalen: true });
  });

  it('gaar tilbage naar portalen selv har lagt trinnet', () => {
    expect(tilbageHandling(historikTilstand(null))).toBe('gaa-tilbage');
    expect(tilbageHandling(historikTilstand({ spNav: 1 }))).toBe('gaa-tilbage');
  });

  it('laegger et nyt trin naar sagen er aabnet udefra', () => {
    expect(tilbageHandling(null)).toBe('nyt-trin');
    expect(tilbageHandling(undefined)).toBe('nyt-trin');
    expect(tilbageHandling({ spNav: 1 })).toBe('nyt-trin');
    expect(tilbageHandling({ jordportalen: 'ja' })).toBe('nyt-trin');
  });
});
```

- [ ] **Step 2: Kør og se dem fejle**

Run: `npx jest tests/visning.test.ts`
Expected: FAIL — Cannot find module `../src/webparts/jordportalen/utils/visning`.

- [ ] **Step 3: Implementér `utils/visning.ts`**

```ts
/**
 * Hele visningen i adressen: aaben sag, udvalg, hvem og soegning.
 *
 * Adressen er den eneste kilde. Saa overlever filtrene baade skift mellem sag
 * og oversigt og en genindlaesning, og browserens tilbage-knap virker.
 *
 * Formatet er ?sag=<id>, ikke #sag-<id>. Et hash i den INITIELLE URL crasher
 * SharePoints eget side-bootstrap (sp-pages-assembly) ved koldt sideload -
 * altsaa netop naar nogen aabner et link fra en mail. Gamle hash-links
 * laeses fortsat, men genereres aldrig.
 *
 * Standardvaerdier skrives ikke, og fremmede parametre (fx SharePoints Mode=Edit)
 * bevares.
 */

import {
  ALLE_HVEM,
  ALLE_UDVALG,
  Hvem,
  IVisning,
  STANDARD_VISNING,
  Udvalg,
} from '../domaene/dashboard';

const P_SAG = 'sag';
const P_STATUS = 'status';
const P_HVEM = 'hvem';
const P_SOEG = 'q';
const EGNE_PARAMETRE = [P_SAG, P_STATUS, P_HVEM, P_SOEG];

const LEGACY_HASH = /#sag-(\d+)\b/;

export const HISTORIK_MARKOER = 'jordportalen';

function delAdresse(url: string): { adresse: string; parametre: URLSearchParams } {
  const [adresse, forespoergsel] = url.split('#')[0].split('?');
  return { adresse, parametre: new URLSearchParams(forespoergsel || '') };
}

function gyldigtId(raa: string | null | undefined): number | undefined {
  if (!raa || !/^\d+$/.test(raa)) {
    return undefined;
  }
  const id = parseInt(raa, 10);
  return id > 0 ? id : undefined;
}

function blandt<T extends string>(vaerdi: string | null, tilladte: readonly T[], standard: T): T {
  return vaerdi !== null && (tilladte as readonly string[]).indexOf(vaerdi) !== -1
    ? (vaerdi as T)
    : standard;
}

/** Laeser visningen. Ugyldige vaerdier giver stille standard. */
export function laesVisning(url: string): IVisning {
  const { parametre } = delAdresse(url);
  const legacy = LEGACY_HASH.exec(url);
  const raaSag = parametre.get(P_SAG);

  return {
    sag: gyldigtId(raaSag !== null ? raaSag : legacy ? legacy[1] : undefined),
    udvalg: blandt<Udvalg>(parametre.get(P_STATUS), ALLE_UDVALG, STANDARD_VISNING.udvalg),
    hvem: blandt<Hvem>(parametre.get(P_HVEM), ALLE_HVEM, STANDARD_VISNING.hvem),
    soeg: parametre.get(P_SOEG) ?? '',
  };
}

/**
 * Bygger adressen for en visning oven paa `basisUrl`.
 *
 * Portalens egne parametre erstattes, alle andre bevares i deres raekkefoelge.
 */
export function byggUrl(basisUrl: string, visning: IVisning): string {
  const { adresse, parametre } = delAdresse(basisUrl);
  EGNE_PARAMETRE.forEach((navn) => parametre.delete(navn));

  if (visning.udvalg !== STANDARD_VISNING.udvalg) {
    parametre.set(P_STATUS, visning.udvalg);
  }
  if (visning.hvem !== STANDARD_VISNING.hvem) {
    parametre.set(P_HVEM, visning.hvem);
  }
  if (visning.soeg.trim() !== '') {
    parametre.set(P_SOEG, visning.soeg);
  }
  if (visning.sag !== undefined) {
    parametre.set(P_SAG, String(visning.sag));
  }

  const forespoergsel = parametre.toString();
  return forespoergsel ? `${adresse}?${forespoergsel}` : adresse;
}

/**
 * State til et historiktrin portalen selv laegger.
 *
 * Markoeren laegges OVEN I en eksisterende state i stedet for at erstatte den,
 * saa SharePoints egen navigation ikke mister noget den har gemt.
 */
export function historikTilstand(eksisterende: unknown): Record<string, unknown> {
  const basis =
    typeof eksisterende === 'object' && eksisterende !== null
      ? (eksisterende as Record<string, unknown>)
      : {};
  return { ...basis, [HISTORIK_MARKOER]: true };
}

/**
 * Hvad "Oversigten" skal goere fra en aaben sag.
 *
 * Har portalen selv lagt trinnet, ligger oversigten lige bagved, og et trin
 * tilbage undgaar dobbelte trin. Er sagen aabnet udefra (et link i en mail),
 * er der ingen oversigt bagved, og history.back() ville forlade siden.
 */
export function tilbageHandling(historyState: unknown): 'gaa-tilbage' | 'nyt-trin' {
  const erPortalens =
    typeof historyState === 'object' &&
    historyState !== null &&
    (historyState as Record<string, unknown>)[HISTORIK_MARKOER] === true;
  return erPortalens ? 'gaa-tilbage' : 'nyt-trin';
}
```

Rækkefølgen af parametre i `byggUrl` er `status`, `hvem`, `q` og til sidst `sag`, sådan som testen `?status=Afventer&hvem=mine&q=Ringvej` og `?env=1&sag=42` forventer.

- [ ] **Step 4: Kør og se dem bestå**

Run: `npx jest tests/visning.test.ts`
Expected: PASS. Fejler `bevarer SharePoints egne parametre` på indkodningen, så tjek, at `URLSearchParams.toString()` ikke ændrer `Mode=Edit`. Den ændrer kun tegn, der skal kodes.

- [ ] **Step 5: Fuld verifikation og commit**

Run: `npm test` og `npx tsc --noEmit -p tsconfig.json`
Expected: alle grønne, ingen typefejl.

```bash
git add src/webparts/jordportalen/utils/visning.ts tests/visning.test.ts
git commit -m "Tilfoej visningen i adressen: filtre, sag og historiktrin"
```

---

### Task 3: Fælles statusmærkat, tabellen og ejendomslinjen

**Files:**
- Create: `src/webparts/jordportalen/domaene/formatering.ts`
- Create: `tests/formatering.test.ts`
- Create: `src/webparts/jordportalen/components/faelles/StatusMaerkat.tsx`
- Modify: `src/webparts/jordportalen/components/dashboard/SagsTabel.tsx` (hele filen)
- Modify: `src/webparts/jordportalen/components/detalje/Metadata.tsx` (ejendomslinjen, ca. linje 66-72)

**Interfaces:**
- Consumes: `ISag`, `SagStatus`, `AfventerAarsag` fra `domaene/typer.ts`
- Produces:
  - `ejendomsDetaljer(matrikel?: string, lokalitet?: string): string`
  - `<StatusMaerkat status={SagStatus} aarsag={AfventerAarsag | undefined} />`
  - `<SagsTabel sager={ISag[]} onVaelgSag={(id: number) => void} tomBesked={string} onNulstil={(() => void) | undefined} />`

- [ ] **Step 1: Skriv den fejlende test for `ejendomsDetaljer`**

Opret `tests/formatering.test.ts`:

```ts
import { ejendomsDetaljer } from '../src/webparts/jordportalen/domaene/formatering';

describe('ejendomsDetaljer', () => {
  it('viser begge dele', () => {
    expect(ejendomsDetaljer('1234a', '751-00123')).toBe('Matrikel 1234a · Lokalitet 751-00123');
  });

  it('viser kun matriklen naar lokaliteten mangler', () => {
    expect(ejendomsDetaljer('1234a', undefined)).toBe('Matrikel 1234a');
  });

  it('viser kun lokaliteten naar matriklen mangler', () => {
    expect(ejendomsDetaljer(undefined, '751-00123')).toBe('Lokalitet 751-00123');
  });

  it('giver tom tekst naar begge mangler eller er blanke', () => {
    expect(ejendomsDetaljer(undefined, undefined)).toBe('');
    expect(ejendomsDetaljer('  ', '')).toBe('');
  });
});
```

- [ ] **Step 2: Kør og se den fejle**

Run: `npx jest tests/formatering.test.ts`
Expected: FAIL — Cannot find module.

- [ ] **Step 3: Implementér `domaene/formatering.ts`**

```ts
/**
 * Visningstekster der skal kunne testes uden React.
 */

/** "Matrikel X · Lokalitet Y" med kun de dele der har en vaerdi. */
export function ejendomsDetaljer(matrikel?: string, lokalitet?: string): string {
  const dele: string[] = [];
  if (matrikel && matrikel.trim()) {
    dele.push(`Matrikel ${matrikel.trim()}`);
  }
  if (lokalitet && lokalitet.trim()) {
    dele.push(`Lokalitet ${lokalitet.trim()}`);
  }
  return dele.join(' · ');
}
```

- [ ] **Step 4: Kør og se den bestå**

Run: `npx jest tests/formatering.test.ts`
Expected: PASS

- [ ] **Step 5: Opret `components/faelles/StatusMaerkat.tsx`**

```tsx
import * as React from 'react';
import { Badge } from '@fluentui/react-components';
import { AfventerAarsag, SagStatus } from '../../domaene/typer';

// Én kilde til statusfarver, saa tabellen og sagens overskrift ikke kan vise
// samme status forskelligt.
const STATUS_FARVE: Record<SagStatus, 'informative' | 'warning' | 'success' | 'danger'> = {
  'Ny': 'informative',
  'Under behandling': 'informative',
  'Afventer': 'warning',
  'Afgjort': 'success',
  'Afvist': 'danger',
};

export interface IStatusMaerkatProps {
  status: SagStatus;
  aarsag?: AfventerAarsag;
}

export const StatusMaerkat: React.FunctionComponent<IStatusMaerkatProps> = ({ status, aarsag }) => (
  // En ukendt status fra SharePoint faar en neutral farve i stedet for undefined.
  <Badge appearance="filled" color={STATUS_FARVE[status] ?? 'informative'}>
    {status}
    {status === 'Afventer' && aarsag ? `: ${aarsag}` : ''}
  </Badge>
);
```

- [ ] **Step 6: Erstat `components/dashboard/SagsTabel.tsx`**

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
  tokens,
} from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';
import { StatusMaerkat } from '../faelles/StatusMaerkat';

export interface ISagsTabelProps {
  sager: ISag[];
  onVaelgSag: (id: number) => void;
  /** Teksten naar der ingen raekker er. */
  tomBesked: string;
  /** Vises som "Nulstil filtre" ved tom tabel. Udelades naar visningen er standard. */
  onNulstil?: () => void;
}

export const SagsTabel: React.FunctionComponent<ISagsTabelProps> = ({
  sager,
  onVaelgSag,
  tomBesked,
  onNulstil,
}) => {
  if (sager.length === 0) {
    return (
      <div style={{ padding: `${tokens.spacingVerticalXXL} 0`, textAlign: 'center' }}>
        <Text block>{tomBesked}</Text>
        {onNulstil && (
          <Button appearance="secondary" onClick={onNulstil} style={{ marginTop: tokens.spacingVerticalM }}>
            Nulstil filtre
          </Button>
        )}
      </div>
    );
  }

  return (
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
              <StatusMaerkat status={s.Status} aarsag={s.AfventerAarsag} />
            </TableCell>
            <TableCell>
              {s.Ansvarlig ? (
                <Text>{s.Ansvarlig.Title}</Text>
              ) : (
                // En maerkat, ikke en knap: den tager ikke sagen.
                <Badge appearance="outline" color="subtle">
                  Ledig
                </Badge>
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
};
```

- [ ] **Step 7: Brug `ejendomsDetaljer` i `Metadata.tsx`**

Tilføj importen `import { ejendomsDetaljer } from '../../domaene/formatering';` og erstat ejendomslinjen:

```tsx
          <Text size={200} block>
            Matrikel {a.Matrikel} · Lokalitet {a.LokalitetsNummer}
          </Text>
```

med:

```tsx
          {ejendomsDetaljer(a.Matrikel, a.LokalitetsNummer) && (
            <Text size={200} block>
              {ejendomsDetaljer(a.Matrikel, a.LokalitetsNummer)}
            </Text>
          )}
```

- [ ] **Step 8: Tilpas det midlertidige kald i `Dashboard.tsx`**

`SagsTabel` kræver nu `tomBesked`. Indtil Task 4 omskriver dashboardet, sendes en fast tekst med. Erstat
`<SagsTabel sager={synlige} onVaelgSag={onVaelgSag} />` med
`<SagsTabel sager={synlige} onVaelgSag={onVaelgSag} tomBesked="Ingen sager matcher" />`.

- [ ] **Step 9: Verifikation og commit**

Run: `npm test` og `npx tsc --noEmit -p tsconfig.json`
Expected: alle grønne, ingen typefejl.

```bash
git add src/webparts/jordportalen/domaene/formatering.ts tests/formatering.test.ts src/webparts/jordportalen/components/faelles/StatusMaerkat.tsx src/webparts/jordportalen/components/dashboard/SagsTabel.tsx src/webparts/jordportalen/components/dashboard/Dashboard.tsx src/webparts/jordportalen/components/detalje/Metadata.tsx
git commit -m "Faelles statusmaerkat, ledig som maerkat og tom tilstand i tabellen"
```

---

### Task 4: Dashboardet filtrerer i browseren

**Files:**
- Modify: `src/webparts/jordportalen/domaene/forespoergsler.ts` (fjern `IDashboardFilter` og `dashboardFilter`)
- Modify: `tests/forespoergsler.test.ts` (fjern `describe('dashboardFilter', ...)` og importen)
- Modify: `src/webparts/jordportalen/services/SagService.ts` (`OVERSIGT_FELTER`, `hentAlleSager`, import)
- Modify: `src/webparts/jordportalen/components/dashboard/Dashboard.tsx` (hele filen)
- Modify: `src/webparts/jordportalen/components/dashboard/Filtre.tsx` (hele filen)
- Modify: `src/webparts/jordportalen/components/dashboard/KpiKort.tsx` (hele filen)
- Modify: `src/webparts/jordportalen/components/Jordportalen.tsx` (midlertidig visningstilstand)

**Interfaces:**
- Consumes: alt fra `domaene/dashboard.ts` (Task 1); `laesVisning` (Task 2); `SagsTabel` med `tomBesked` og `onNulstil` (Task 3)
- Produces:
  - `SagService.hentAlleSager(): Promise<ISideResultat<ISag>>` (ingen parameter)
  - `<Dashboard sag={SagService} brugerId={number} visning={IVisning} onVisning={(v: IVisning) => void} onVaelgSag={(id: number) => void} />`
  - `<Filtre visning={IVisning} onVisning={(v: IVisning) => void} />`
  - `<KpiKort sager={ISag[]} brugerId={number} afkortet={boolean} visning={IVisning} onVisning={(v: IVisning) => void} />`

- [ ] **Step 1: Fjern `dashboardFilter` og dens tests**

Slet i `src/webparts/jordportalen/domaene/forespoergsler.ts` alt fra `export interface IDashboardFilter {` til og med slutningen af `dashboardFilter`-funktionen. Fjern `SagStatus`-importen i toppen, hvis den ikke bruges længere.

Slet i `tests/forespoergsler.test.ts` hele `describe('dashboardFilter', ...)`-blokken og fjern `dashboardFilter` fra importen.

- [ ] **Step 2: Tilpas `SagService.ts`**

Ret importen til `import { uuidFilter } from '../domaene/forespoergsler';`.

Tilføj `Grundejere` i `OVERSIGT_FELTER`:

```ts
const OVERSIGT_FELTER =
  'Id,Title,SubmissionSerial,Status,AfventerAarsag,ModtagetDato,AdresserTekst,Grundejere,AnsvarligId';
```

Erstat `hentAlleSager`:

```ts
  /**
   * Henter alle sager til dashboardet.
   *
   * Filtreringen sker i browseren (domaene/dashboard.ts), saa noegletallene
   * altid taeller det hele. Returvaerdien siger om resultatet blev afkortet -
   * graensefladen SKAL vise det, ellers forsvinder sager tavst.
   */
  public async hentAlleSager(): Promise<ISideResultat<ISag>> {
    const forespoergsel = this.sp.web.lists
      .getByTitle(LIST_NAMES.SAGER)
      .items.select(OVERSIGT_FELTER, ANSVARLIG_UDVID)
      .expand('Ansvarlig')
      .orderBy('ModtagetDato', false)
      .top(100);

    return hentAlleSider<ISag>(forespoergsel);
  }
```

- [ ] **Step 3: Kør testene**

Run: `npm test`
Expected: PASS. `forespoergsler.test.ts` har færre tests, og intet andet fejler.

- [ ] **Step 4: Erstat `components/dashboard/KpiKort.tsx`**

```tsx
import * as React from 'react';
import { Button, Text, Title2, tokens } from '@fluentui/react-components';
import { STANDARD_MAKSANTAL } from '../../domaene/paginering';
import { ISag } from '../../domaene/typer';
import {
  ALLE_KORT,
  erKortValgt,
  IVisning,
  Kort,
  kortGenvej,
  taelNoegletal,
} from '../../domaene/dashboard';

export interface IKpiKortProps {
  sager: ISag[];
  brugerId: number;
  /** Sand hvis `sager` er afkortet af sikkerhedsgraensen i hentAlleSager. */
  afkortet: boolean;
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
}

const ETIKET: Record<Kort, string> = {
  aktive: 'Aktive sager',
  ledige: 'Ledige',
  mine: 'Mine sager',
  afventer: 'Afventer',
};

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({
  sager,
  brugerId,
  afkortet,
  visning,
  onVisning,
}) => {
  const tal = React.useMemo(() => taelNoegletal(sager, brugerId), [sager, brugerId]);

  // "Aktive" maa aldrig se ud som et facit, naar listen er afkortet.
  const vaerdi = (k: Kort): string =>
    k === 'aktive' && afkortet ? `${STANDARD_MAKSANTAL.toLocaleString('da-DK')}+` : String(tal[k]);

  return (
    <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
      {ALLE_KORT.map((k) => {
        const valgt = erKortValgt(k, visning);
        return (
          // Rigtige knapper, saa kortene kan bruges med tastaturet.
          <Button
            key={k}
            appearance={valgt ? 'primary' : 'secondary'}
            aria-pressed={valgt}
            onClick={() => onVisning(kortGenvej(k, visning))}
            style={{
              minWidth: '140px',
              padding: tokens.spacingVerticalM,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Title2>{vaerdi(k)}</Title2>
            <Text size={200}>{ETIKET[k]}</Text>
          </Button>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 5: Erstat `components/dashboard/Filtre.tsx`**

```tsx
import * as React from 'react';
import {
  Button,
  Dropdown,
  Input,
  Option,
  OptionGroup,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import { ALLE_STATUS } from '../../domaene/typer';
import { erStandard, Hvem, IVisning, STANDARD_VISNING, Udvalg } from '../../domaene/dashboard';
import { useMountNode } from '../faelles/MountNode';

export interface IFiltreProps {
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
}

const UDVALG_ETIKET: Record<string, string> = {
  aktive: 'Aktive sager',
  afsluttede: 'Afsluttede',
  alle: 'Alle',
};

const HVEM_ETIKET: Record<Hvem, string> = { alle: 'Alle', ledige: 'Ledige', mine: 'Mine' };
const HVEM_RAEKKEFOELGE: Hvem[] = ['alle', 'ledige', 'mine'];

const etiketFor = (u: Udvalg): string => UDVALG_ETIKET[u] ?? u;

export const Filtre: React.FunctionComponent<IFiltreProps> = ({ visning, onVisning }) => {
  // Uden mountNode mister dropdownens popup sin styling. Se MountNode.tsx.
  const mountNode = useMountNode();
  const saet = (aendring: Partial<IVisning>): void => onVisning({ ...visning, ...aendring });

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
        placeholder="Søg på sagsnummer, adresse eller grundejer"
        value={visning.soeg}
        onChange={(_, d) => saet({ soeg: d.value })}
        style={{ minWidth: '300px' }}
      />

      <Dropdown
        aria-label="Udvalg"
        value={etiketFor(visning.udvalg)}
        selectedOptions={[visning.udvalg]}
        mountNode={mountNode}
        onOptionSelect={(_, d) => {
          if (d.optionValue) {
            saet({ udvalg: d.optionValue as Udvalg });
          }
        }}
      >
        <Option value="aktive">Aktive sager</Option>
        <Option value="afsluttede">Afsluttede</Option>
        <Option value="alle">Alle</Option>
        <OptionGroup label="Status">
          {ALLE_STATUS.map((s) => (
            <Option key={s} value={s}>
              {s}
            </Option>
          ))}
        </OptionGroup>
      </Dropdown>

      <div role="group" aria-label="Hvem" style={{ display: 'flex' }}>
        {HVEM_RAEKKEFOELGE.map((h) => (
          <ToggleButton
            key={h}
            checked={visning.hvem === h}
            onClick={() => saet({ hvem: h })}
          >
            {HVEM_ETIKET[h]}
          </ToggleButton>
        ))}
      </div>

      {!erStandard(visning) && (
        <Button appearance="subtle" onClick={() => onVisning({ ...STANDARD_VISNING })}>
          Nulstil
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 6: Erstat `components/dashboard/Dashboard.tsx`**

```tsx
import * as React from 'react';
import { MessageBar, Spinner } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { ISag } from '../../domaene/typer';
import { erStandard, filtrerSager, IVisning, STANDARD_VISNING } from '../../domaene/dashboard';
import { KpiKort } from './KpiKort';
import { Filtre } from './Filtre';
import { SagsTabel } from './SagsTabel';

export interface IDashboardProps {
  sag: SagService;
  brugerId: number;
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
  onVaelgSag: (id: number) => void;
}

export const Dashboard: React.FunctionComponent<IDashboardProps> = ({
  sag,
  brugerId,
  visning,
  onVisning,
  onVaelgSag,
}) => {
  const [sager, setSager] = React.useState<ISag[]>([]);
  const [afkortet, setAfkortet] = React.useState(false);
  const [indlaeser, setIndlaeser] = React.useState(true);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  // Alt hentes én gang pr. visning af dashboardet. Filtrene skifter i
  // browseren uden nyt kald. Ved tilbagevenden fra en sag mountes
  // dashboardet igen og henter paany, saa et statusskift ses med det samme.
  React.useEffect(() => {
    let foraeldet = false;
    setIndlaeser(true);
    sag
      .hentAlleSager()
      .then((r) => {
        if (foraeldet) { return; }
        setSager(r.elementer);
        setAfkortet(r.afkortet);
        setFejl(undefined);
        setIndlaeser(false);
      })
      .catch((e: Error) => {
        if (foraeldet) { return; }
        setFejl(e.message);
        setSager([]);
        setAfkortet(false);
        setIndlaeser(false);
      });
    return () => {
      foraeldet = true;
    };
  }, [sag]);

  const synlige = React.useMemo(
    () => filtrerSager(sager, visning, brugerId),
    [sager, visning, brugerId]
  );

  const standard = erStandard(visning);
  const nulstil = (): void => onVisning({ ...STANDARD_VISNING });

  return (
    <div>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {/* Afkortning SKAL vises. Idéportalen og Opgaveportalen afskaerer tavst. */}
      {afkortet && (
        <MessageBar intent="warning">
          Der er flere sager, end der kan vises. Brug filtrene for at indsnævre listen.
        </MessageBar>
      )}

      <KpiKort
        sager={sager}
        brugerId={brugerId}
        afkortet={afkortet}
        visning={visning}
        onVisning={onVisning}
      />

      <Filtre visning={visning} onVisning={onVisning} />

      {indlaeser ? (
        <Spinner label="Henter sager..." />
      ) : (
        <SagsTabel
          sager={synlige}
          onVaelgSag={onVaelgSag}
          tomBesked={standard ? 'Ingen aktive sager' : 'Ingen sager matcher'}
          onNulstil={standard ? undefined : nulstil}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 7: Midlertidig visningstilstand i `Jordportalen.tsx`**

Task 6 laver den rigtige navigation. Indtil da holder roden visningen i state, så alt kompilerer. Tilføj importerne

```tsx
import { IVisning } from '../domaene/dashboard';
import { laesVisning } from '../utils/visning';
```

tilføj under `valgtSagId`-state:

```tsx
  const [visning, setVisning] = React.useState<IVisning>(() => laesVisning(window.location.href));
```

og erstat `<Dashboard sag={tjenester.sag} brugerId={brugerId} onVaelgSag={vaelgSag} />` med:

```tsx
              <Dashboard
                sag={tjenester.sag}
                brugerId={brugerId}
                visning={visning}
                onVisning={setVisning}
                onVaelgSag={vaelgSag}
              />
```

- [ ] **Step 8: Verifikation**

Run: `npm test` og `npx tsc --noEmit -p tsconfig.json`
Expected: alle grønne, ingen typefejl.

Run: `npm run build`
Expected: exit 0. Heft kører også eslint. Retter du lint-fejl, så hold dig til den eksisterende stil i filerne.

- [ ] **Step 9: Commit**

```bash
git add src/webparts/jordportalen/domaene/forespoergsler.ts tests/forespoergsler.test.ts src/webparts/jordportalen/services/SagService.ts src/webparts/jordportalen/components/dashboard/Dashboard.tsx src/webparts/jordportalen/components/dashboard/Filtre.tsx src/webparts/jordportalen/components/dashboard/KpiKort.tsx src/webparts/jordportalen/components/Jordportalen.tsx
git commit -m "Dashboardet henter alt én gang, aktive som standard og klikbare noegletal"
```

---

### Task 5: Sagens overskrift

**Files:**
- Create: `src/webparts/jordportalen/components/detalje/SagHoved.tsx`
- Modify: `src/webparts/jordportalen/components/detalje/SagDetalje.tsx` (props, fejlvisning og "Tilbage"-knappen)
- Modify: `src/webparts/jordportalen/components/Jordportalen.tsx` (send `delingsLink` med)

**Interfaces:**
- Consumes: `StatusMaerkat` (Task 3); `byggUrl`, `STANDARD_VISNING` (Task 1–2)
- Produces:
  - `<SagHoved sag={ISag} delingsLink={string} onTilbage={() => void} />`
  - `ISagDetaljeProps` får `delingsLink: string`

- [ ] **Step 1: Opret `components/detalje/SagHoved.tsx`**

```tsx
import * as React from 'react';
import { Button, Text, Title2, tokens } from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';
import { StatusMaerkat } from '../faelles/StatusMaerkat';

export interface ISagHovedProps {
  sag: ISag;
  /** Sagens link uden filtre, til "Kopiér link". */
  delingsLink: string;
  onTilbage: () => void;
}

type Kopiering = 'ingen' | 'kopieret' | 'fejlet';

export const SagHoved: React.FunctionComponent<ISagHovedProps> = ({ sag, delingsLink, onTilbage }) => {
  const [kopiering, setKopiering] = React.useState<Kopiering>('ingen');

  const kopier = (): void => {
    // navigator.clipboard findes ikke altid (fx uden https eller naar
    // browseren naegter), og writeText kan afvise. Begge dele skal give en
    // besked, ikke en ubehandlet fejl.
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      setKopiering('fejlet');
      return;
    }
    clipboard
      .writeText(delingsLink)
      .then(() => setKopiering('kopieret'))
      .catch(() => setKopiering('fejlet'));
  };

  return (
    <div style={{ marginBottom: tokens.spacingVerticalL }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button appearance="subtle" onClick={onTilbage}>
          ← Oversigten
        </Button>
        <Button appearance="secondary" onClick={kopier}>
          Kopiér link
        </Button>
      </div>

      {kopiering === 'kopieret' && <Text size={200} block>Link kopieret</Text>}
      {kopiering === 'fejlet' && (
        <Text size={200} block>
          Linket kunne ikke kopieres. Kopiér adressen fra adresselinjen.
        </Text>
      )}

      <Title2 block style={{ marginTop: tokens.spacingVerticalS }}>
        Sag {sag.SubmissionSerial} · {sag.Title}
      </Title2>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacingHorizontalL,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: tokens.spacingVerticalS,
        }}
      >
        <StatusMaerkat status={sag.Status} aarsag={sag.AfventerAarsag} />
        <Text>Ansvarlig: {sag.Ansvarlig?.Title ?? 'Ledig'}</Text>
        {sag.ModtagetDato && (
          <Text>
            Modtaget{' '}
            {new Date(sag.ModtagetDato).toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Brug `SagHoved` i `SagDetalje.tsx`**

Tilføj `import { SagHoved } from './SagHoved';`. Tilføj `delingsLink: string;` i `ISagDetaljeProps` og `delingsLink,` i destruktureringen af props.

Erstat fejlvisningens knap

```tsx
        <Button onClick={onTilbage}>Tilbage</Button>
```

med

```tsx
        <Button appearance="subtle" onClick={onTilbage}>← Oversigten</Button>
```

Erstat

```tsx
      <Button onClick={onTilbage} style={{ marginBottom: tokens.spacingVerticalM }}>
        Tilbage til oversigten
      </Button>
```

med

```tsx
      <SagHoved sag={data.sag} delingsLink={delingsLink} onTilbage={onTilbage} />
```

- [ ] **Step 3: Send `delingsLink` fra `Jordportalen.tsx`**

Tilføj `byggUrl` til importen fra `'../utils/visning'` og `STANDARD_VISNING` til importen fra `'../domaene/dashboard'`. Tilføj `delingsLink` på `<SagDetalje ... />`:

```tsx
                delingsLink={byggUrl(sideUrl, { ...STANDARD_VISNING, sag: valgtSagId })}
```

`sideUrl` er sidens adresse uden parametre (se `JordportalenWebPart.ts`). Det delte link får derfor kun `?sag=<id>` og ikke de filtre, man selv stod med.

- [ ] **Step 4: Verifikation og commit**

Run: `npm test`, `npx tsc --noEmit -p tsconfig.json` og `npm run build`
Expected: alle grønne, ingen typefejl, build exit 0.

```bash
git add src/webparts/jordportalen/components/detalje/SagHoved.tsx src/webparts/jordportalen/components/detalje/SagDetalje.tsx src/webparts/jordportalen/components/Jordportalen.tsx
git commit -m "Tilfoej overskrift paa sagssiden med status, ansvarlig og kopiér link"
```

---

### Task 6: Navigation via adressen og browserens tilbage-knap

**Files:**
- Modify: `src/webparts/jordportalen/components/Jordportalen.tsx` (hele filen)
- Delete: `src/webparts/jordportalen/utils/deepLink.ts`
- Delete: `tests/deepLink.test.ts`

**Interfaces:**
- Consumes: `laesVisning`, `byggUrl`, `historikTilstand`, `tilbageHandling` (Task 2); `IVisning`, `STANDARD_VISNING` (Task 1); Dashboard-props (Task 4); `delingsLink` (Task 5)
- Produces: intet nyt, som andre bygger på.

- [ ] **Step 1: Bekræft at deepLink kun bruges af roden**

Run: `git grep -n "deepLink\|byggSagLink\|parseSagId" -- src tests`
Expected: kun `components/Jordportalen.tsx`, `utils/deepLink.ts` og `tests/deepLink.test.ts`. Står der andre filer, skal de også flyttes over på `utils/visning.ts`, før der slettes.

- [ ] **Step 2: Erstat `components/Jordportalen.tsx`**

```tsx
import * as React from 'react';
import { FluentProvider, webLightTheme, Spinner, MessageBar } from '@fluentui/react-components';

import { IJordportalenProps } from './IJordportalenProps';
import { MountNodeProvider } from './faelles/MountNode';
import { Dashboard } from './dashboard/Dashboard';
import { SagDetalje } from './detalje/SagDetalje';
import { IVisning, STANDARD_VISNING } from '../domaene/dashboard';
import { byggUrl, historikTilstand, laesVisning, tilbageHandling } from '../utils/visning';
import { LogService } from '../services/LogService';
import { SagService } from '../services/SagService';
import { NoteService } from '../services/NoteService';
import { OpgaveService } from '../services/OpgaveService';
import { LinkService } from '../services/LinkService';
import { DokumentService } from '../services/DokumentService';
import { ProfilService } from '../services/ProfilService';

type Maade = 'nyt-trin' | 'erstat';

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

  // Adressen er den eneste kilde til visningen. State her er kun et spejl,
  // saa React tegner igen, naar adressen aendres.
  const [visning, setVisning] = React.useState<IVisning>(() => laesVisning(window.location.href));
  const [brugerId, setBrugerId] = React.useState<number | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    tjenester.profil
      .nuvaerendeBrugerId()
      .then(setBrugerId)
      .catch((e: Error) => setFejl(e.message));
  }, [tjenester]);

  // Browserens tilbage og frem: laes adressen igen.
  React.useEffect(() => {
    const vedPopstate = (): void => setVisning(laesVisning(window.location.href));
    window.addEventListener('popstate', vedPopstate);
    return () => window.removeEventListener('popstate', vedPopstate);
  }, []);

  /**
   * Den eneste vej til at aendre visningen.
   *
   * Bygger oven paa den aktuelle adresse (ikke sideUrl), saa SharePoints egne
   * parametre som Mode=Edit bevares. Et nyt trin bruges, naar en sag aabnes,
   * saa browserens tilbage-knap foerer til oversigten. Filtre og soegning
   * erstatter trinnet, saa tilbage-knappen ikke traeder gennem hvert tastetryk.
   */
  const naviger = React.useCallback((ny: IVisning, maade: Maade) => {
    const url = byggUrl(window.location.href, ny);
    if (maade === 'nyt-trin') {
      window.history.pushState(historikTilstand(window.history.state), '', url);
    } else {
      window.history.replaceState(window.history.state, '', url);
    }
    setVisning(ny);
  }, []);

  const aendrFiltre = React.useCallback(
    (ny: IVisning) => naviger({ ...ny, sag: undefined }, 'erstat'),
    [naviger]
  );

  const aabnSag = React.useCallback(
    (id: number) => naviger({ ...visning, sag: id }, 'nyt-trin'),
    [naviger, visning]
  );

  const tilOversigten = React.useCallback(() => {
    if (tilbageHandling(window.history.state) === 'gaa-tilbage') {
      // popstate-lytteren opdaterer visningen.
      window.history.back();
    } else {
      naviger({ ...visning, sag: undefined }, 'nyt-trin');
    }
  }, [naviger, visning]);

  return (
    <FluentProvider theme={webLightTheme}>
      <MountNodeProvider>
        {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
        {brugerId === undefined && !fejl && <Spinner label="Indlæser..." />}
        {brugerId !== undefined && (
          <div>
            {visning.sag === undefined ? (
              <Dashboard
                sag={tjenester.sag}
                brugerId={brugerId}
                visning={visning}
                onVisning={aendrFiltre}
                onVaelgSag={aabnSag}
              />
            ) : (
              <SagDetalje
                key={visning.sag}
                sagId={visning.sag}
                tjenester={tjenester}
                brugerId={brugerId}
                delingsLink={byggUrl(sideUrl, { ...STANDARD_VISNING, sag: visning.sag })}
                onTilbage={tilOversigten}
              />
            )}
          </div>
        )}
      </MountNodeProvider>
    </FluentProvider>
  );
};

export default Jordportalen;
```

`key={visning.sag}` sørger for, at en ny sag fra browserens frem-knap giver en frisk `SagDetalje` og ikke genbruger den forrige sags tilstand.

- [ ] **Step 3: Slet deepLink**

```bash
git rm src/webparts/jordportalen/utils/deepLink.ts tests/deepLink.test.ts
```

- [ ] **Step 4: Verifikation**

Run: `git grep -n "deepLink\|byggSagLink\|parseSagId" -- src tests`
Expected: ingen træf.

Run: `npm test`, `npx tsc --noEmit -p tsconfig.json` og `npm run build`
Expected: alle grønne, ingen typefejl, build exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/webparts/jordportalen/components/Jordportalen.tsx
git commit -m "Navigation via adressen: filtre huskes og browserens tilbage-knap virker"
```

---

### Task 7: Version, dokumentation og browsertjek

**Files:**
- Modify: `config/package-solution.json` (`solution.version` og `solution.features[0].version`)
- Modify: `OVERDRAGELSE.md` (linje 24, linje 66 og tabellen i afsnit 4)
- Modify: `NAESTE-SKRIDT.md` (linje 12 og 28)
- Modify: `DEPLOY.md` (linje 5-6)

- [ ] **Step 1: Hæv versionen to steder**

I `config/package-solution.json` ændres begge `"version": "1.0.0.0"` til `"version": "1.0.1.0"`, både `solution.version` og `solution.features[0].version`. Gøres det kun ét sted, udrulles pakken uden at ændre noget.

Run: `git grep -n '"version"' config/package-solution.json`
Expected: to linjer, begge `1.0.1.0`.

- [ ] **Step 2: Ret kommandoerne**

- `OVERDRAGELSE.md` linje 24: `1. Kør \`npm run serve\` og åbn workbench` → `1. Kør \`npm start\` og åbn \`https://aarhuskommune.sharepoint.com/teams/Jordportalen/_layouts/15/workbench.aspx\``
- `OVERDRAGELSE.md` linje 66: `1. \`npm run build && npm run package-solution -- --ship\`` → `1. \`npm run build\` (bygger og pakker til produktion)`
- `NAESTE-SKRIDT.md` linje 28: `` `npm run serve` `` → `` `npm start` og workbench på Jordportalen-sitet ``
- `DEPLOY.md` linje 5-6: fjern linjen `    npm run package-solution -- --ship`, så kun `    npm run build` står tilbage.

Run: `git grep -n "npm run serve\|package-solution -- --ship"`
Expected: kun træf i `docs/superpowers/` (historiske dokumenter), ingen i de tre filer.

- [ ] **Step 3: Tilføj browsertjekkene i `OVERDRAGELSE.md`**

Tilføj efter række 13 i tabellen i afsnit 4:

```markdown
| 14 | Filtrér på `Afventer`, åbn en sag, brug **browserens** tilbage-knap | Oversigten kommer tilbage med filtret. Notér om siden genindlæses helt — i så fald reagerer SharePoints navigation på `popstate` (se spec for brugeroplevelse, afsnit 2) |
| 15 | Sæt et filter og genindlæs siden | Filtret står der stadig |
| 16 | Åbn et sagslink i en ny fane, klik "← Oversigten" | Oversigten med standardfiltre — siden forlades ikke |
| 17 | Klik hvert nøgletalskort | Listen og markeringen passer, og tallene står stille |
| 18 | "Kopiér link", indsæt i en ny fane | Samme sag åbner, uden de filtre man selv stod med |
```

- [ ] **Step 4: Endelig verifikation**

Run: `npm test`, `npx tsc --noEmit -p tsconfig.json` og `npm run build`
Expected: alle grønne, ingen typefejl, build exit 0. `sharepoint/solution/jordportalen.sppkg` har nyt tidsstempel.

- [ ] **Step 5: Commit**

```bash
git add config/package-solution.json OVERDRAGELSE.md NAESTE-SKRIDT.md DEPLOY.md
git commit -m "Haev version til 1.0.1.0, ret kommandoer og tilfoej browsertjek"
```

Push ikke. Fortæl brugeren, at branchen `brugeroplevelse` er klar, og hvor `.sppkg`-filen ligger.
