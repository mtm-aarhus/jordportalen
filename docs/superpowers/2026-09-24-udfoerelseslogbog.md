# SDD ledger — plan: docs/superpowers/plans/2026-09-24-jordportalen.md

Spec: docs/superpowers/specs/2026-09-24-jordportalen-design.md (læst)
Branch: implementering (afgrenet fra main @ ca7adae)

## Preflight-scan

### Opgavepar der deler fil eller grænseflade

| Producent | Forbruger | Hvad | Fund |
|---|---|---|---|
| T2 typer.ts | T3,T6,T8,T9,T10,T11,T12,T13,T15,T16,T17,T18 | LIST_NAMES, ISag, ILogPost m.fl. | Rent. Alle ni LIST_NAMES-nøgler bruges med samme navn |
| T3 statusregler | T10 validerStatusskift, T17 naeste | Signaturer | Rent |
| T4 paginering | T8,T9,T11,T12 hentAlleSider; T15 ISideResultat.afkortet | Signatur + returtype | Rent |
| T5 samtidighed | T10 skrivMedEtag | (skriv, beskrivelse) | Rent |
| T6 forespoergsler | T8 sagIdFilter; T9 dashboardFilter+uuidFilter; T11 noteFilter; T12 sagIdFilter | Signaturer | Rent |
| T7 deepLink | T14 byggSagLink, parseSagId | Signaturer | Rent |
| T8 LogService | T10,T11,T12,T17 tilfoej(INyLogPost) | Feltnavne i INyLogPost | Rent |
| T9+T10 SagService | T14 konstruktion, T15,T16,T17 kald | (sp, log) efter T10 | Rent — T14 kommer efter T10 |
| T13 ProfilService | T14 nuvaerendeBrugerId, T16 hentProfil, T17 soegBrugere | Signaturer | Rent |
| T14 MountNode | T15 Filtre, T17 PeoplePicker+StatusPanel | useMountNode | Rent |
| T14 Jordportalen.tsx | T15 Step5, T16 Step4 ændrer den | Pladsholder erstattes | Rent — hver erstatning har navngivet opgave |
| T16 SagDetalje.tsx | T17 Step5, T18 Step5 ændrer den | Pladsholder erstattes | Rent |
| T16 ITjenester | T14 bygger objektet | 7 felter: log,sag,note,opgave,link,dokument,profil | Rent — samme form |
| T10 returtype | T16 AnsvarligKort onTag/onFrigiv | string \| undefined vs Promise<void> | **FUND A** |

### Opgaver mod sig selv

| Opgave | Tester det den bygger? Filer den rører? | Fund |
|---|---|---|
| T1 | Stillads + jest + én test | **FUND B** — generatoren er interaktiv |
| T2–T7 | Test først, så implementering, samme signaturer | Rent |
| T8, T11, T12, T13 | Ingen test — logikken ligger testet i T4/T6 | Rent, bevidst |
| T9 | Verifikationstrin kræver browserkonsol | **FUND D** |
| T10 | Ændrer konstruktør fra T9 før T14 bruger den | Rent |
| T14–T18 | Verifikation via `npm run serve` i workbench | **FUND C** |

---

## Rulings

**Ruling A: Logadvarsel droppes bevidst ved tag og frigiv.**
T10 returnerer `string | undefined` fra alle tre mutationer, men T16's
`AnsvarligKort` har `onTag: () => Promise<void>` og kasserer returværdien.
Statusskift viser advarslen, tag og frigiv gør ikke.
Begrundelse: ved tag og frigiv ændrer kortet sig synligt med det samme, så
brugeren ser at handlingen lykkedes og prøver ikke igen — hvilket var hele
grunden til advarslen. Ved statusskift er ændringen mindre iøjnefaldende.
Koster hvis forkert: en manglende historiklinje ved tag/frigiv opdages ikke.
Lav. Noteret som deferred minor til den afsluttende gennemgang.

**Ruling B: Task 1 køres non-interaktivt, ellers eskaleres den til mennesket.**
SPFx-generatoren stiller spørgsmål, som ingen subagent kan besvare.
Implementeren instrueres i at bruge flag:
`npx --yes @microsoft/generator-sharepoint --solution-name jordportalen
--component-type webpart --component-name Jordportalen --framework react
--skip-feature-deployment`
Nægter generatoren, rapporterer implementeren BLOCKED, og stilladset rejses
af mennesket. Koster hvis forkert: ét spildt dispatch. Lavt.

**Ruling C: Workbench-verifikation flyttes til en overdragelsestjekliste.**
T14–T18 har trin af formen "Run: npm run serve" med forventninger, der
kræver en browser og et SharePoint-login. Ingen subagent kan gøre det.
Implementerne verificerer i stedet med `npx tsc --noEmit` og `npm test`, og
hvert workbench-trin samles i en tjekliste, mennesket kører til sidst.
Begrundelse: alternativet er at stoppe planen fem gange og vente.
Koster hvis forkert: integrationsfejl, som kun ses i browseren, opdages
først til sidst i stedet for undervejs. Moderat — men de ville under alle
omstændigheder kræve mennesket.

**Ruling D: ETag-verifikationen i T9 Step 3 udsættes, men blokerer ikke.**
Trinnet kræver browserkonsollen. Implementeren skriver begge varianter af
`hentSag` — standardvarianten aktiv, minimalmetadata-varianten som en
kommenteret blok lige under med instruktion om hvornår den skal bruges.
Verifikationen står øverst på overdragelsestjeklisten.
Begrundelse: ETag-beskyttelsen fejler tavst, hvis den ikke virker, så den må
ikke gå uverificeret i drift — men den kan skrives færdig nu.
Koster hvis forkert: samtidighedsbeskyttelsen er slået fra, indtil
tjeklisten køres. Derfor står den som punkt ét.

---

## Fremdrift

Task 1: implementer DONE — commit 278496a (parent ca7adae). npm test PASS 1/1, npm run build OK.
  Note: generatoren tvang en undermappe; implementeren flyttede filerne op i roden manuelt.
  Note: review-package var 872 KB pga. package-lock.json — erstattet af task-1-review.diff (29 KB) uden den.
  Ruling: package-lock.json udelades af alle review-pakker. 840 KB genereret indhold giver
    ingen gennemgangsvaerdi og fortraenger den kode der skal laeses. Koster hvis forkert:
    en aendring i laasefilen gaar ugennemset igennem. Lavt — den er genereret.
Task 1: review — spec ❌, 1 Critical: manglende rodfelt "version" i package-solution.json.
  Ruling: Findet afvises — constrainten var forkert, ikke koden. SPFx-skemaet har intet
    rodfelt; topniveau er $schema, solution, paths. De to version-felter er
    solution.version og solution.features[0].version. Verificeret mod droemmefanger
    (linje 6 og 33), opgaveportalen og mtm-master-dashboard — alle tre har samme
    topniveau-noegler som det nye stillads, og stilladset har allerede begge felter.
    Fejlen stammer fra Idéportalens TEKNISK-SPECIFIKATION, der skriver "i roden", og
    som jeg kopierede til Global Constraints uden at efterproeve.
    Rettet tre steder i planen: Global Constraints, Task 19 DEPLOY.md og Task 19 Step 3.
    Koster hvis forkert: en udrulning der ikke slaar igennem. Men paastanden er
    efterproevet mod tre koerende projekter, saa risikoen er lav.
  Oevrigt i gennemgangen: godkendt. Mappeflytningen er kontrolleret — alle stier i
    config/, tsconfig.json, jest.config.js og .vscode/ er rod-relative og upaavirkede.
Task 1: complete (commits ca7adae..278496a, 1 finding afvist med ruling)
Task 2: implementer DONE — commit 795987f. npm test PASS 4/4, danske tegn verificeret intakte.
  Controller-verifikation: npm run build exit 0 efter tsconfig-aendringen.
Task 2: review — spec ❌, 1 Critical: tsconfig.json aendret i stedet for tsconfig.test.json.
  Typer, listenavne og danske valgvaerdier verificeret byte-for-byte korrekte.
  Findet staar ved magt: SPFx' base laaser lib til es5-aeraen med vilje, og
  overskrivningen lader produktionskode typetjekke mod ES2017-API'er uden polyfills.
  Byggeriet lykkes i dag — det er netop derfor det er vaerd at rette nu.
Task 2: fix round 1/5 dispatchet — FIX_BASE 795987f
Task 2: fix round 1/5 (1 addressed, 0 open; commits 795987f..5905366)
Task 2: complete (commits 8680f7c..5905366, review clean efter 1 fix-runde)
Task 3-7: batchet i ét dispatch — fem rene funktionsmoduler af samme form
  (statusregler, paginering, samtidighed, forespoergsler, deepLink), hver med
  fuld kode i planen og egen TDD-cyklus. Ingen indbyrdes afhaengigheder ud over
  typer.ts. BASE 5905366.
Task 3-7: implementer DONE — commits a38c112, 013a4b9, a36fc34, adfa380, f960cd6.
  43 tests groenne (38 nye + 5 fra task 1-2). Root tsconfig.json uroert.
  Implementeren fangede en taellefejl i min brief: task 6 lovede 9 tests, testfilen
  har 10. Rettet i planen (commit f4a411c); statusregler har korrekt 9.
Task 3-7: review dispatchet paa opus — hoejeste indsats, da alt bygger paa dette lag
  og logikken (pagineringsaritmetik, ETag-klassificering, forfatterfilter) er subtil.
Task 3-7: review — spec ✅ x5, kvalitet godkendt med fund. Alle fire tavse-fejl-vaern
  verificeret sunde: pagineringsaritmetikken gennemregnet i haanden for alle fire
  tilfaelde, Object.setPrototypeOf til stede i begge fejlklasser (og es5-maalet
  bekraeftet, saa instanceof-testene faktisk proever downlevel-stien), forfatterfiltret
  ligger reelt i OData-strengen, og byggSagLink kan ikke udsende et hash.
  Ruling: pagineringens uendelige loekke ved sideStoerrelse<=0 haeves fra Minor til
    Important og rettes. Gennemgangen kaldte den Minor, men fejltilstanden er en
    haengt browserfane og rettelsen er én linje. Koster hvis forkert: intet.
  Ruling: expand(Author) manglede i planens NoteService (commit efter denne linje).
    Load-bearing — uden den fejler forfatterbeskyttelsen paa private noter med 400
    i stedet for at filtrere. Rettet i planen foer Task 11 dispatches.
    Koster hvis forkert: intet, rettelsen er additiv.
Task 3-7: deferred minors til den afsluttende gennemgang:
  - paginering: falsk afkortet=true naar total praecis rammer maksAntal
  - paginering: ét ekstra tomt kald ved praecise multipla; kald-taellingstesten
    bruger kun 150, saa det tilfaelde er uasserteret
  - paginering: push(...side) spreder en side som kaldsargumenter
  - tests/samtidighed 412-case: bar try/catch uden expect.assertions()
  - tests/statusregler: Ny→Afgjort, Afventer→Afgjort, Afventer→Afvist uasserteret
  - forespoergsler: dashboardFilter({}) returnerer '' — udokumenteret kontrakt
    (haandteret i Task 9's kode, som kun kalder .filter naar strengen er ikke-tom)
Task 3-7: fix round 1/5 dispatchet — FIX_BASE f960cd6, 4 Important
Task 3-7: fix round 1/5 (4 addressed, 0 open; commits f960cd6..f5e6a5f). 47 tests.
  Re-gennemgangen bekraeftede at mutationstesten faktisk ville fejle uden .slice(),
  og at ingen dansk strengvaerdi blev aendret under ASCII-rettelsen.
Task 3-7: complete (commits 5905366..f5e6a5f, review clean efter 1 fix-runde)
Task 8-10: batchet — LogService, saa SagService laesning, saa SagService mutationer.
  Taet koblet: T10 aendrer T9's fil, og T9/T10 afhaenger begge af T8. BASE f5e6a5f.
Task 8-10: implementer DONE — commits 117afa3, adf8551, f918b12.
  npx tsc --noEmit rent. npm test 47/47 (ingen nye tests, som instrueret).
  Implementeren fandt at @pnp/sp aldrig var installeret — SPFx-generatoren leverer
  den ikke, og planen bad aldrig om den. Installerede @pnp/sp@4.21.0.
  Ruling: plandefekt, rettet i Task 1 Step 3 saa planen er korrekt ved en genkoersel.
    Koster hvis forkert: intet, rettelsen er additiv og allerede bevist noedvendig.
  Task 9 Step 3 (ETag i browserkonsol) sprunget over per Ruling D. Begge varianter
    af hentSag ligger i filen — aktiv laeser __metadata.etag, kommenteret
    minimalmetadata-variant under med dansk forklaring. Punkt ét paa overdragelsen.
Task 8-10: review — spec ✅ x3, 2 Important. Begge strukturelle, ikke implementeringsfejl.
  Ruling: pagineringen er forkert og skal skrives om til PnPjs' async-iterator.
    Gennemgangen paastod skip() saetter $skip. Efterproevet i node_modules: forkert
    — _Items OVERSKRIVER skip() og saetter $skiptoken=Paged=TRUE&p_ID=n. Men
    konklusionen holder alligevel, og aarsagen er vaerre: p_ID er et element-id,
    ikke en offset. hentAlleSider sender en offset, og forespoergslerne sorterer
    efter ModtagetDato/Created, ikke Id. Sider springes over eller gentages uden
    fejl. _Items har Symbol.asyncIterator som foelger odata.nextLink korrekt.
    Rammer paginering.ts (testet modul), dets tests, og fem kaldsteder.
    Koster hvis forkert: en omskrivning af et modul der virkede. Men beviset ligger
    i node_modules og i JSDoc'en: "The starting id where the page should start".
  Ruling: mutationerne skal afvise en sag uden etag frem for at fortsaette.
    PnPjs v4 har update(properties, eTag = "*") — undefined bliver til IF-Match: *,
    og skrivningen lykkes uden samtidighedstjek og uden fejl. hentAlleSager saetter
    ingen etag, saa enhver fremtidig kaldsvej derfra ville tavst miste beskyttelsen.
    Fejl hoejlydt frem for at stole paa at hver laesevej husker etag'en.
    Koster hvis forkert: intet, det er en ekstra vagt.
  Global Constraint tilfoejet: .skip() forbudt til paginering (commit foer denne linje).
Task 8-10: fix round 1/5 dispatchet — FIX_BASE f918b12, 2 Important + 2 Minor
Task 8-10: fix round 1/5 (4 addressed, 0 open; commits f918b12..339ff85). 47 tests, tsc rent.
  Re-gennemgangen sporede afkortet-flaget i haanden gennem alle fem stier og
  verificerede PnPjs-iteratorens "free lookahead" mod kildekoden.
  Ruling: den haandskrevne typings/asynkron-iterator.d.ts erstattes af et snaevert
    lib-tillaeg i rod-tsconfig. Jeg ophaever min egen tidligere instruks for netop
    dette tilfaelde. Begrundelse: filen type-tjekker Symbol.asyncIterator IDENTISK
    med TypeScripts egen, saa den koeber ingen sikkerhed — kun risiko for at drive
    fra hinanden. Den er allerede ufuldstaendig (mangler AsyncIterableIterator), og
    tsconfig.test.json overskriver lib til noget uden es2018.asynciterable, saa de
    to konfigurationer er uenige om hvordan typen ankommer. Forbuddet gjaldt den
    tidligere WHOLESALE override der fjernede es5-vaernet; et additivt tillaeg er
    noget andet, og opgaveportalen goer praecis det samme.
    Koster hvis forkert: produktionskoden kan type-tjekke mod Symbol.asyncIterator.
    Det gjorde den allerede via den ambiente fil, saa eksponeringen er uaendret.
  Planrettelse: syv kaldsteder rettet til den nye API. Vigtigst DokumentService i
    Task 12, som ikke er koert endnu og ellers havde arvet fejlen. Task 4's kodeblok
    markeret som afloest frem for slettet — den er historik.
  Deferred minor: to .skip(skip) staar stadig i planens Task 8 og 9, som allerede er
    implementeret korrekt. Dokumentationsgaeld, ikke en faelde.
Task 8-10: fix round 2/5 dispatchet — FIX_BASE 339ff85, 1 aendring (lib-tillaeg)
Task 8-10: fix round 2/5 (1 addressed, 0 open; commits 339ff85..9f4ba9a).
  lib-listen verificeret element for element mod SPFx-basen: alle syv + praecis
  es2018.asynciterable, intet ekstra. Ambient-filen reelt slettet.
  npm run build gennemfoert end to end (TypeScript, ESLint, Webpack, package-solution).
Task 8-10: complete (commits f5e6a5f..9f4ba9a, review clean efter 2 fix-runder)
Task 11-13: batchet — NoteService+OpgaveService+LinkService, DokumentService,
  ProfilService. Tre uafhaengige services uden delte filer. BASE 9f4ba9a.
Task 11-13: implementer DONE — commits cf8ca9c, bee575b, eb71b17. tsc rent.
Task 11-13: review — spec ✅ x3, kvalitet godkendt, INGEN fund. Diffen verificeret
  byte-for-byte identisk med briefs. expand(Author) paa plads, ingen .skip(),
  ingen Graph-import, SagId saettes paa det uploadede element, alle feltnavne
  matcher SHAREPOINT-LISTER.md.
Task 11-13: complete (commits 9f4ba9a..eb71b17, review clean, 0 fix-runder)
Task 14-15: batchet — webpart-indgang + mountNode + routing, saa dashboardet.
  T15 aendrer T14's fil, saa de hoerer sammen. BASE eb71b17.
Task 14-15: implementeren HANG i 16 timer paa `npm run build` og naaede aldrig at
  committe eller skrive rapport. Stoppet af controlleren. Sidste udsagn:
  "Typecheck passes for Task 15 too. Now let's check for stray @pnp/sp imports
  and run the full build." Alt arbejde laa uncommittet paa disk.
  Ruling: arbejdet bevares og faerdiggoeres frem for at kasseres og genkoeres.
    Controller-verifikation af det uncommittede: mountNode wired i Filtre,
    afkortet vist i Dashboard, ingen PnPjs-kald i komponenter (kun SPFI som type
    i props, hvilket planen selv foreskriver). Typecheck bestod ifoelge agenten.
    Koster hvis forkert: en halvfaerdig commit. Men gennemgangen fanger det.
  Plandefekt: @fluentui/react-components manglede i Task 1's afhaengigheder.
    Generatoren leverer v8; hele loesningen bygger paa v9, en separat pakke.
    Samme slags hul som @pnp/sp. Rettet i planen.
Task 14-15: arbejdet reddet fra den haengte agent og committet som 1aab1ef + af6f3cd.
  Controller-verifikation: npm run build exit 0 med tidsgraense.
Task 14-15: review (opus, ekstra grundig da koden aldrig har vaeret gennem
  implementerens selvkontrol) — spec ✅ x2, 1 Critical, 1 Important, 4 Minor.
  Ruling: Critical er MIN plankode, ikke implementerens. sideUrl sammensatte
    web.absoluteUrl med window.location.pathname; begge indeholder site-stien, saa
    hvert deep-link pegede paa /sites/x/sites/x/... altsaa 404. replaceState skrev
    den doede URL i adresselinjen uden at fejle. Rettet i planen (cd33ff9) og i koden.
    Koster hvis forkert: intet, origin+pathname er entydigt rigtigt.
  Ruling: Important om forældede svar rettes. Uden vagt kan et langsomt tidligere
    svar overhale et senere og rydde afkortet-advarslen mens data FAKTISK er
    afkortet — den tavse datatab-fejl fra den anden side. Koster: intet.
  Ruling: fix dispatches til en FRISK implementer, ikke den oprindelige. Skillen
    siger runde 1-3 genoptager den oprindelige, men den hang i 16 timer og at
    genoptage den risikerer det samme. Koster hvis forkert: tabt kontekst, opvejet
    af briefs og rapport.
Task 14-15: deferred minors:
  - Dashboard.catch nulstiller ikke sager/afkortet, saa gamle data staar under fejlbaren
  - KPI-kort regner over det afkortede saet men er maerket som absolutter
  - manifest description + loc/-strenge er forældede generatorrester
  - replaceState frem for pushState: Back foerer ikke fra sag tilbage til dashboard.
    Planbestemt. Reelt brugsproblem i en sagsbehandlerportal, men ikke tavst eller
    farligt, og pushState kraever popstate-haandtering. Udskudt til final review.
Task 14-15: fix round 1/5 dispatchet — FIX_BASE cd33ff9
Task 14-15: fix round 1/5 (3 addressed, 0 open; commits cd33ff9..3392122).
  Flaget verificeret tjekket i alle fire grene inkl. cleanup-returnering.
Task 14-15: complete (commits eb71b17..3392122, review clean efter 1 fix-runde)
Task 16: detaljeside — layout, Metadata, AnsvarligKort. BASE 3392122.
Task 16: implementer DONE — commit a03a51c. tsc rent, build exit 0, npm test 47/47.
Task 16: review (opus) — spec ✅, 1 Critical, 1 Important, 2 Minor.
  Ruling: Critical rettes. opdater spreder en forældet data; lander en maalrettet
    opdatering mens et statusskift er undervejs, genindsaettes den gamle sag
    INKLUSIVE dens gamle etag, og naeste skrivning kaster SamtidighedsFejl selvom
    ingen har aendret noget. Samtidighedsbeskyttelsen ville producere falske
    konflikter — vaerre end ingen beskyttelse, fordi brugeren ikke kan skelne.
    Rettes med funktionel setState i alle fem grene. Koster hvis forkert: intet.
  Ruling: Important rettes. Samme forældet-svar-hazard som dashboardet blev rettet
    for i Task 15, her ogsaa paa unmount. Koster: intet.
  Ruling: JEG OMGOER MIN EGEN RULING A fra preflight. Jeg besluttede dengang at
    kassere logadvarslen ved tag og frigiv, fordi kortet aendrer sig synligt saa
    brugeren ikke proever igen. Gennemgangen fandt punktet uafhaengigt, og min
    begrundelse var for tynd: advarslen handler ikke om at undgaa gentagelse, men
    om at et hul i sagens historik skal vaere synligt. AnsvarligKort har allerede
    en state-plads til det. Koster hvis forkert: intet, det er en ekstra besked.
Task 16: deferred minor: pladsholdertekst i panelkolonnen er live UI indtil Task 17.
Task 16: fix round 1/5 dispatchet — FIX_BASE a03a51c
Task 16: fix round 1/5 (3 addressed, 0 open; commits a03a51c..cf8280e).
  Verificeret: ingen await inde i en setData-updater, data ude af deps, og
  foraeldet-flaget nulstilles ved sagsskift foer genindlaesningen starter.
Task 16: complete (commits 3392122..cf8280e, review clean efter 1 fix-runde)
Task 16: deferred minor: opdater fyrer nu et kald selv foer initial load er faerdig;
  resultatet kasseres tavst. Spild, ikke en korrekthedsfejl.
Task 17-18: batchet — syv paneler. Begge aendrer SagDetalje.tsx, saa de hoerer
  sammen. BASE cf8280e.
Task 17-18: implementer DONE — commits 95d9b92, 92340cf. tsc rent, 47/47, build exit 0.
  Controller-verifikation: mountNode paa 2 af 2 aabne tags i StatusPanel og 1 af 1
  i PeoplePicker. Pladsholdertekst fjernet. "Privat" optraeder kun i kommentaren
  der forklarer hvorfor ordet IKKE bruges.
Task 17-18: review (opus) — spec ✅ x2, alle syv kontrolpunkter bestaaet.
  2 Important, 3 Minor.
  Ruling: Important 1 rettes. onOpdateret() ligger inde i samme try som selve
    skrivningen, saa en fejlet genindlaesning vises som en fejlet handling. Vaerre
    end kosmetisk: et gentagelsesforsoeg sender den nu forældede ETag og fejler med
    en konflikt, saa brugeren faar to gange at vide at noget gik galt naar intet
    gjorde. Koster hvis forkert: intet.
  Ruling: Important 2 rettes. Opgave-, dokument- og link-handlinger skriver en
    logpost, men panelerne genindlaeser kun deres eget datasaet, saa historikken
    er forældet indtil noget urelateret opdaterer den. Modsiger Task 18's egen
    verifikation "alle handlinger dukker op i historikken". Koster: intet.
  Ruling: Minor om tavse sletninger HAEVES og rettes. Skillen siger minors ikke
    kommer i loekken, men en sletning der fejler uden feedback efterlader raekken
    paa skaermen — i et sagssystem er det et tillidsproblem, ikke kosmetik.
    Moensteret findes allerede i OpgavePanel. Koster: intet.
Task 17-18: deferred minors: PeoplePicker-debounce uden forældet-vagt (ingen risiko
  for fejlattribuering ifoelge gennemgangen); aarsag-Dropdown mangler !erMin-gate
  (uopnaaeligt i dag).
Task 17-18: fix round 1/5 dispatchet — FIX_BASE 92340cf
Task 17-18: fix round 1/5 (3 addressed, 0 open; commits 92340cf..4706569).
  Verificeret: seks paneler har nu reelt adskilte fejlstier, ikke to catch-blokke
  der begge skriver til fejl. Historik-opdateringen bruger maalrettet
  opdater('logposter'), ikke hentAlt. Sletteknapper faktisk disabled under arbejde.
Task 17-18: complete (commits cf8280e..4706569, review clean efter 1 fix-runde)
Task 19: Power Automate-vejledning og udrulningsdokumentation. BASE 4706569.
Task 19: implementer DONE — commit 5a07c3e. Build OK, .sppkg 153 KB.
  solution.version og solution.features[0].version begge 1.0.0.0, intet rodfelt.
Task 19: review — spec ✅, kvalitet godkendt, ingen fund.
Task 19: complete (commits 4706569..5a07c3e, review clean, 0 fix-runder)

=== ALLE 19 OPGAVER LUKKET ===
Final review dispatchet paa opus. Pakke afgraenset til skreven kode (130 KB),
generatorens stillads udeladt.

=== FINAL REVIEW (opus, hele grenen) ===
Ingen Critical. Fire Important, alle tre foerste paa samme soemkant: en skrivning
der lykkes efterfulgt af en laesning der fejler.
  1. AnsvarligKort mangler den fejl/advarsel-opdeling de syv paneler fik i Task 17-18.
     Bygget i Task 16 og aldrig revideret. Kan give roed fejl paa en gennemfoert
     handling, og derefter en falsk 412 ved gentagelse.
  2. ProfilService cacher afviste promises. Ét fejlet opslag forgifter sessionen og
     braekker HELE detaljesiden for hver sag tildelt den bruger.
  3. 403-oversaettelsen daekker 3 skrivninger ud af ca. 12. Seks af syv paneler
     viser raa SharePoint-fejl til brugeren.
  4. KPI-kortet maerker et afkortet tal som absolut ("Sager i alt").
Plus fix-before-merge: expect.assertions() paa to tests der ikke kan fejle;
  Dashboard.catch nulstiller ikke; no-void rettes frem for at tie; de to .skip(skip)
  i planen (rettet af controlleren).
  Ruling: testen for at skiftStatus rydder AfventerAarsag udskydes. Den ville kraeve
    det foerste service-mock i projektet og bryde "ingen service-tests"-designet.
    Reglen selv ER testet i validerStatusskift; kun oprydningen (aarsag ?? null) er
    utestet, og den er aabenlyst korrekt ved gennemlaesning.
    Koster hvis forkert: en forældet aarsag kunne forstyrre dashboardets filtre.
Final fix wave dispatchet — FIX_BASE 5a07c3e, 7 punkter i ét dispatch
Final fix wave: 7 addressed, 0 open (commits 5a07c3e..a6a4b32). tsc rent, 47/47,
  build exit 0, no-void vaek, eslint rent. expect.assertions-tallene verificeret
  korrekte (2 og 2 mod faktisk naabare assertions).
  Parked: log.tilfoej ligger uden for den vagtede try i OpgaveService.opret,
    LinkService.tilfoej og DokumentService.upload. En 403 paa P8Log viser derfor
    en fejl efter en skrivning der lykkedes, og et gentagelsesforsoeg kan give en
    dublet opgave eller link. Ruling: parkeres. Det er samme soemkant som Important
    1, men kraever at en bruger mangler rettigheder paa P8Log og HAR dem paa
    P8Opgaver — listerne arver sitets rettigheder, saa udloeseren er sjaelden.
    Ingen anden opgave bygger paa det. Koster hvis forkert: dublerede opgaver eller
    links ved gentagelse under en usaedvanlig rettighedsopsaetning.
  Parked: Ledige/Mine sager/Afventer er stadig absolutte tal over det afkortede
    saet. Ruling: parkeres. Kun "Sager i alt" paastod at vaere en total; de tre
    oevrige laeses naturligt som "af de viste". Koster: lille misvisning ved over
    5000 sager.
=== GRENEN FAERDIG: 38 commits, alle 19 opgaver, final review clean ===
