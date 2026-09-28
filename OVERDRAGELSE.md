# Overdragelse — Jordportalen

Alt der kræver et menneske, en browser eller et SharePoint-login. Ingen af punkterne
herunder kunne udføres automatisk, og to af dem afgør, om løsningen overhovedet
virker som designet.

Koden ligger på grenen `implementering`, 35 commits. Enhedstestene kører grønt
(47/47), typecheck er rent, og `npm run build` producerer en `.sppkg`.

---

## 1. Verificér ETag'en — gør dette først

**Hvis dette punkt fejler, er beskyttelsen mod at to sagsbehandlere tager den samme
sag slået fra, uden at noget fejler.**

SharePoint returnerer en ETag på hver sag. Koden sender den med ved hver skrivning,
så SharePoint kan afvise en ændring, hvis nogen anden nåede først. Men PnPjs sender
som standard headeren `odata=nometadata`, og så følger ETag'en ikke med. Er den
`undefined`, skriver `update()` **uden** samtidighedstjek og **uden at fejle**.

Sådan afgør du det:

1. Kør `npm run serve` og åbn workbench
2. Åbn browserkonsollen
3. Åbn en sag
4. Se efter om et `etag`-felt har en værdi

Er den tom, ligger løsningen klar i `src/webparts/jordportalen/services/SagService.ts`:
en udkommenteret variant af `hentSag` lige under den aktive, som beder eksplicit om
`minimalmetadata`. Skift til den og gentag testen.

**Bekræft derefter med to-faner-testen.** Åbn den samme ledige sag i to faner. Tryk
"Tag sagen" i den ene. Tryk så "Tag sagen" i den anden. Den skal svare *"Sagen blev
ændret af en anden, mens du arbejdede"* — ikke overskrive tavst.

Den test er den eneste, der beviser, at kæden virker hele vejen igennem.

---

## 2. Verificér de interne kolonnenavne

Kør én gang pr. liste i browserens adresselinje:

```
https://aarhuskommune.sharepoint.com/teams/Jordportalen/_api/web/lists/getbytitle('P8Ansogninger')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false and ReadOnlyField eq false
```

`Title` og `InternalName` skal være identiske. Kig efter `_x` i navnene, navne hugget
af ved 32 tegn, eller et tal sat bagpå som `Status0`.

Afviger et navn, skriver koden til en kolonne, ingen kan se — og der kommer ingen
fejlmeddelelse. Det interne navn kan ikke rettes; kolonnen skal slettes og oprettes
igen.

Gentag for `P8Adresser`, `P8Kontakter`, `P8Vedhaeftninger`, `P8Log`, `P8Noter`,
`P8Opgaver`, `P8Links` og `P8Dokumenter`.

---

## 3. Udrul løsningen

PnP PowerShell kan ikke forbinde i tenanten — appen er ikke godkendt. `deploy_spfx.ps1`
virker derfor ikke endnu. Upload i browseren i stedet:

1. `npm run build && npm run package-solution -- --ship`
2. Åbn App Catalog
3. Upload `sharepoint/solution/jordportalen.sppkg`
4. Vælg **Implementér**
5. Tilføj webparten på siden §8-Ansøgninger – Jord og Grundvand

Se `DEPLOY.md` for detaljer, herunder at versionsnummeret skal hæves **to steder**:
`solution.version` og `solution.features[0].version`.

---

## 4. Gennemgå funktionerne i browseren

| # | Hvad | Forventet |
|---|---|---|
| 1 | Åbn dashboardet | KPI-kort, filtre og en tabel med sager fra SharePoint |
| 2 | Klik på en adresse | Detaljesiden åbner, URL'en får `?sag=<id>` uden at siden genindlæses |
| 3 | Åbn filter-dropdownen | Den skal have **baggrund og korrekt styling**. Er den gennemsigtig, er `mountNode` ikke slået igennem |
| 4 | Tag en ledig sag | Knappen skifter til "Frigiv", og profilkortet viser dit navn og billede |
| 5 | To faner, tag samme sag | Den anden afvises med en læsbar besked — **se punkt 1** |
| 6 | Skift status som ikke-ansvarlig | Kontrollerne er deaktiverede med en forklarende besked |
| 7 | Vælg status `Afventer` | Et årsagsfelt dukker op. Gem uden årsag afvises med en læsbar besked |
| 8 | Skriv en kommentar og tag en kollega | Kommentaren gemmes, tagningen ryddes, og kollegaen får en mail — kræver punkt 5 nedenfor |
| 9 | Skriv en note, log ind som en anden | Den anden bruger ser et **tomt** notefelt |
| 10 | Opret en opgave, kryds den af | Begge dele dukker op i historikken |
| 11 | Upload en fil | Mappen `sag-<id>` oprettes i `P8Dokumenter` første gang |
| 12 | Tilføj et link | Knappen er deaktiveret, indtil URL'en starter med `http` |
| 13 | Send dig selv et deep-link | Linket åbner den rigtige sag fra en kold side-indlæsning |

Punkt 13 er værd at tage alvorligt. Deep-linket brugte oprindeligt en forkert
URL-sammensætning, der gav 404 på hvert eneste link — rettet, men kun verificeret i
kode.

---

## 5. Opsæt Power Automate-flowet

Tagning af en kollega sender ingen mail, før flowet findes. SharePoints egen
`SendEmail`-API er udfaset, så der er ingen reserveløsning i appen.

Følg `POWER-AUTOMATE.md`. Flowet lytter på nye elementer i `P8Log`, hvor
`TaggedeBrugere` ikke er tom.

---

## 6. Beslutninger, der stadig mangler

**Sagsgangen er gætværk på ét punkt.** `Ny → Under behandling → Afventer → Afgjort /
Afvist` kom fra dig, men ingen har bekræftet, at det svarer til, hvordan Jord og
Grundvand faktisk arbejder. Reglerne ligger samlet i
`src/webparts/jordportalen/domaene/statusregler.ts` og er dækket af tests, så en
ændring er billig — men den bliver dyrere, når der er sager i systemet.

**Filnavne på borgerens bilag mangler.** OS2Forms leverer kun fil-id'er.
REST-API'et har et `/entity/file/{file_id}`-endpoint, som ikke er afprøvet.
`P8Vedhaeftninger.Filnavn` og `FilUrl` står tomme indtil da, og dashboardet viser
fil-id'et.

**`navn_kontaktperson_2` findes ikke i blanketten.** Grundejer nr. 2 har adresse,
CVR, firma, mail og telefon, men intet navnefelt. Koden bruger firmanavnet. Det er en
mangel i OS2Forms, ikke i koden.

**PnP-godkendelse i tenanten.** Låser op for `deploy_spfx.ps1` og for automatiseret
oprettelse af lister. Godkendelses-URL'en ligger i `OPRET-LISTER.md`.

---

## 7. Kendte begrænsninger

**Egne noter er ikke teknisk private.** De filtreres på forfatter i selve
forespørgslen, så en ny ansvarlig ikke ser den forriges noter. Men listen har ingen
tilladelser pr. element, så en administrator kan læse dem. Derfor står der "Vises kun
for dig", ikke "Privat". Det er en bevidst formulering og bør ikke "forbedres".

**Tilbage-knappen fører ikke fra en sag til dashboardet.** URL'en opdateres med
`replaceState`, ikke `pushState`. Bevidst udskudt — at rette det kræver håndtering af
`popstate`.
