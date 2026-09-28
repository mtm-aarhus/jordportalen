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

- Site Address: `https://aarhuskommune.sharepoint.com/teams/Jordportalen`
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
  `https://aarhuskommune.sharepoint.com/teams/Jordportalen/SitePages/§8-Ansøgninger---Jord-og-Grundvand.aspx?sag=` efterfulgt af `SagId` fra triggeren.

Brug `?sag=`, ikke `#sag-`. Et hash i URL'en crasher SharePoints side-bootstrap,
når linket åbnes fra en mail.
