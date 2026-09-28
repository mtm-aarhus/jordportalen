# Udrulning

## Byg pakken

    npm run build

Resultatet ligger i `sharepoint/solution/jordportalen.sppkg`.

## Bump versionen først

I `config/package-solution.json` skal versionen hæves **to steder**:
`solution.version` og `solution.features[0].version`. Gør man det kun ét sted,
udrulles pakken uden at ændre noget, og det ligner en cache-fejl.

Bemærk at Idéportalens dokumentation kalder det andet sted "roden". Det er
upræcist — SPFx-skemaet har intet rodfelt, kun `$schema`, `solution` og `paths`.
Felterne ligger begge inde i `solution`.

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
