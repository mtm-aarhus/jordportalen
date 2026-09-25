# Sikkerhedsrettelser — afslutning

Branch: implementering. Overtog uncommittet arbejde fra en agent, der blev
afbrudt af rate-limit. Vurderede hvert punkt mod findings-listen og
færdiggjorde det manglende.

## Fundet allerede komplet

1. **Stored `javascript:` XSS.** `domaene/sikkerhed.ts` (`sikkerUrl`) fandtes,
   brugt korrekt i `LinkPanel.tsx`, `Metadata.tsx` (OS2Forms-link og
   bilag-links) og `LinkService.tilfoej`. `tests/sikkerhed.test.ts` dækkede
   alle krævede cases, inkl. `"  javascript:alert(1)"` med indledende
   whitespace.
2. **Raw SharePoint-fejl.** `oversaetFejl` i `domaene/samtidighed.ts` pakkede
   allerede uigenkendte fejl i en ny `Error` med generisk dansk besked +
   `cause`. 412/403 uændrede. `tests/samtidighed.test.ts` opdateret til at
   verificere dette.
3. **Løse ender:**
   - `ProfilService` importerede allerede `tekst()` fra `forespoergsler.ts`.
   - `SagService.frigivSag` havde allerede en ejerskabsvagt
     (`sag.AnsvarligId !== brugerId`), og `SagDetalje.tsx` sendte allerede
     `brugerId` med.
   - `DokumentService.slet(sagId, serverRelativUrl)` havde allerede
     scope-tjekket (kræver sti under `<rod>/sag-<id>/`).

## Færdiggjort her

- **Kaldestedet i `DokumentPanel.tsx`** var ikke opdateret til den nye
  signatur — kaldte stadig `dokumentService.slet(d.ServerRelativeUrl)`.
  Rettet til `dokumentService.slet(sagId, d.ServerRelativeUrl)` (linje 92).
  Dette var det uafsluttede punkt agenten arbejdede på.
- **`tsconfig.test.json`** manglede `"es2022.error"` i sin egen `lib`-liste
  (den erstatter, ligesom `tsconfig.json`, og var ikke opdateret sammen med
  den). Uden det fejlede `tests/samtidighed.test.ts` compilation med
  TS2550 på `.cause`. Tilføjet samme post, samme begrundelse som i
  `tsconfig.json`. `tsconfig.json` selv er urørt, som instrueret.

## Verifikation

- `npx tsc --noEmit -p tsconfig.json` — ren, ingen fejl.
- `npm test` — 56/56 (var 47/47 før). 8 test-suites, alle bestået.
- `npm run build` (`heft test --clean --production && heft package-solution --production`)
  — færdig på ca. 2,5 minut, ingen fejl, `.sppkg` produceret.

## Ikke rørt (som instrueret)

`erMin`-gating i UI, `mailto:`-opbygning, `rel="noopener"` på
`target="_blank"`-links, og `tsconfig.json`s indhold ud over hvad agenten
allerede havde tilføjet.
