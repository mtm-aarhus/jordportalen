/*
 * Tjekker de ni §8-lister paa Jordportalen-sitet mod det skema, koden forventer
 * (samme skema som scripts/Opret-SharePointLister.ps1 opretter).
 *
 * Koeres i browserens konsol (F12 -> Konsol) paa en hvilken som helst side paa
 * https://aarhuskommune.sharepoint.com, mens man er logget ind. Scriptet LAESER
 * kun — det aendrer intet. Det bruger ens egen indlogning.
 *
 * Det fanger de fejl, der ellers ikke giver nogen fejlmeddelelse:
 *   - interne kolonnenavne der afviger fra visningsnavnet (_x00f8_, Status0, afkortning)
 *   - forkert kolonnetype
 *   - valgmuligheder der ikke staves praecis som koden skriver dem
 *   - opslagskolonner der peger paa en anden liste end P8Ansogninger
 *   - rig tekst slaaet til, dato med/uden klokkeslaet, billede i stedet for hyperlink
 *   - manglende indeks, versionering og tidszone
 */
(async () => {
  const SITE = 'https://aarhuskommune.sharepoint.com/teams/Jordportalen';

  const tekst = { type: 'Text' };
  const tal = { type: 'Number' };
  const note = { type: 'Note', richText: false };
  const jaNej = { type: 'Boolean' };
  const link = { type: 'URL', hyperlink: true };
  const dato = { type: 'DateTime', medKlokkeslaet: false };
  const datoTid = { type: 'DateTime', medKlokkeslaet: true };
  const indekseret = (f) => ({ ...f, indeks: true });
  const valg = (choices, ekstra = {}) => ({ type: 'Choice', choices, ...ekstra });
  const opslag = { type: 'Lookup', opslagTil: 'P8Ansogninger', opslagFelt: 'Title' };
  const kontaktTyper = ['Grundejer', 'Bygherre', 'Rådgiver'];

  const LISTER = {
    P8Ansogninger: {
      bibliotek: false,
      felter: {
        SubmissionUUID: indekseret(tekst),
        SubmissionSerial: tal,
        SubmissionSid: tal,
        OS2FormsUrl: link,
        Udfylder: tekst,
        IndsendtAf: valg(kontaktTyper),
        AnsogningsDato: dato,
        Bemaerkninger: note,
        ModtagetDato: datoTid,
        AfsluttetDato: datoTid,
        FlereGrundejere: jaNej,
        BygherreSammeSomGrundejer: jaNej,
        Status: valg(['Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist'], { indeks: true, standard: 'Ny' }),
        AfventerAarsag: valg(['Materiale', 'Høring', 'Vurderingssvar']),
        Ansvarlig: { type: 'User', indeks: true, flere: false },
        AntalAdresser: tal,
        AntalKontakter: tal,
        AntalVedhaeftninger: tal,
        AdresserTekst: note,
        Grundejere: note,
      },
    },
    P8Adresser: {
      bibliotek: false,
      felter: {
        Ansogning: opslag,
        SubmissionUUID: indekseret(tekst),
        Adresse: tekst,
        Matrikel: tekst,
        LokalitetsNummer: tekst,
      },
    },
    P8Kontakter: {
      bibliotek: false,
      felter: {
        Ansogning: opslag,
        SubmissionUUID: indekseret(tekst),
        KontaktType: valg(kontaktTyper),
        ErUdfylder: jaNej,
        Navn: tekst,
        Firma: tekst,
        CVR: tekst,
        Email: tekst,
        Telefon: tekst,
        Adresse: tekst,
      },
    },
    P8Vedhaeftninger: {
      bibliotek: false,
      felter: {
        Ansogning: opslag,
        SubmissionUUID: indekseret(tekst),
        FilId: tekst,
        Filnavn: tekst,
        FilUrl: link,
      },
    },
    P8Log: {
      bibliotek: false,
      felter: {
        SagId: indekseret(tal),
        Handling: valg(['Statusskift', 'Kommentar', 'Sag taget', 'Sag frigivet', 'Opgave oprettet',
          'Opgave udført', 'Dokument uploadet', 'Link tilføjet']),
        FraStatus: tekst,
        TilStatus: tekst,
        Kommentar: note,
        TaggedeBrugere: { type: 'UserMulti', flere: true },
      },
    },
    P8Noter: { bibliotek: false, egneElementer: true, felter: { SagId: indekseret(tal), Tekst: note } },
    P8Opgaver: { bibliotek: false, felter: { SagId: indekseret(tal), Udfoert: jaNej } },
    P8Links: { bibliotek: false, felter: { SagId: indekseret(tal), Url: link } },
    P8Dokumenter: { bibliotek: true, versionering: true, felter: { SagId: indekseret(tal) } },
  };

  const fejl = [];
  const advarsler = [];
  const fejlAt = (sted, besked) => fejl.push({ sted, besked });
  const advarAt = (sted, besked) => advarsler.push({ sted, besked });

  const hent = async (sti) => {
    const svar = await fetch(SITE + sti, {
      headers: { Accept: 'application/json;odata=nometadata' },
      credentials: 'include',
    });
    if (svar.status === 404) return null;
    if (!svar.ok) throw new Error(`${svar.status} ${svar.statusText} for ${sti}`);
    return svar.json();
  };
  const guid = (v) => String(v || '').replace(/[{}]/g, '').toLowerCase();
  const liste = (navn) => `/_api/web/lists/getbytitle('${navn}')`;

  // --- Site ---
  const tidszone = await hent('/_api/web/RegionalSettings/TimeZone');
  const tzNavn = tidszone ? tidszone.Description : '(ukendt)';
  if (!/copenhagen|københavn|kobenhavn/i.test(tzNavn)) {
    fejlAt('Site', `Tidszonen er "${tzNavn}". Den skal være (UTC+01:00) Bruxelles, København, Madrid, Paris, ellers vises datoer en dag for tidligt.`);
  }

  // --- Lister ---
  const listeIder = {};
  for (const [navn, spec] of Object.entries(LISTER)) {
    const info = await hent(`${liste(navn)}?$select=Id,BaseTemplate,EnableVersioning,ReadSecurity,WriteSecurity`);
    if (!info) {
      fejlAt(navn, 'Listen findes ikke (eller hedder noget andet).');
      continue;
    }
    listeIder[navn] = guid(info.Id);
    spec.info = info;

    if (spec.bibliotek && info.BaseTemplate !== 101) fejlAt(navn, 'Skal være et dokumentbibliotek, er en liste.');
    if (!spec.bibliotek && info.BaseTemplate !== 100) fejlAt(navn, `Skal være en brugerdefineret liste (skabelon 100), er ${info.BaseTemplate}.`);
    if (spec.versionering && !info.EnableVersioning) fejlAt(navn, 'Versionering er ikke slået til.');
    if (spec.egneElementer && (info.ReadSecurity !== 2 || info.WriteSecurity !== 2)) {
      advarAt(navn, 'Elementniveautilladelser er ikke sat til "kun egne elementer" for både læsning og redigering. Uden dem kan kolleger læse og slette hinandens noter.');
    }
  }

  // --- Kolonner ---
  for (const [navn, spec] of Object.entries(LISTER)) {
    if (!spec.info) continue;
    const svar = await hent(`${liste(navn)}/fields?$filter=Hidden eq false`);
    const felter = svar.value;
    const efterInterntNavn = Object.fromEntries(felter.map((f) => [f.InternalName, f]));

    for (const [interntNavn, forventet] of Object.entries(spec.felter)) {
      const sted = `${navn}.${interntNavn}`;
      const felt = efterInterntNavn[interntNavn];

      if (!felt) {
        const samme = felter.filter((f) => f.Title === interntNavn && !f.FromBaseType);
        if (samme.length) {
          fejlAt(sted, `Findes med visningsnavnet, men det interne navn er "${samme.map((f) => f.InternalName).join('", "')}". Koden skriver til "${interntNavn}" — slet kolonnen og opret den igen med præcis det navn.`);
        } else {
          fejlAt(sted, 'Kolonnen mangler.');
        }
        continue;
      }

      if (felt.TypeAsString !== forventet.type) {
        fejlAt(sted, `Typen er ${felt.TypeAsString}, skal være ${forventet.type}.`);
      }
      if (forventet.indeks && !felt.Indexed) fejlAt(sted, 'Er ikke indekseret.');
      if (forventet.richText === false && felt.RichText) fejlAt(sted, 'Rig tekst er slået til — skal være almindelig tekst.');
      if (forventet.hyperlink && felt.DisplayFormat !== 0) fejlAt(sted, 'Er sat til Billede — skal være Hyperlink.');
      if (forventet.medKlokkeslaet === true && felt.DisplayFormat !== 1) fejlAt(sted, 'Skal inkludere klokkeslæt.');
      if (forventet.medKlokkeslaet === false && felt.DisplayFormat !== 0) fejlAt(sted, 'Må ikke inkludere klokkeslæt (kun dato).');
      if (forventet.flere !== undefined && Boolean(felt.AllowMultipleValues) !== forventet.flere) {
        fejlAt(sted, forventet.flere ? 'Skal tillade flere valg.' : 'Må kun tillade én bruger.');
      }
      if (forventet.type.startsWith('User') && felt.SelectionMode !== 0) {
        advarAt(sted, 'Tillader også grupper — skal være "Kun personer".');
      }
      if (forventet.choices) {
        const faktiske = felt.Choices || [];
        const mangler = forventet.choices.filter((c) => !faktiske.includes(c));
        const ekstra = faktiske.filter((c) => !forventet.choices.includes(c));
        if (mangler.length) fejlAt(sted, `Mangler valgmulighed(er): ${mangler.map((c) => `"${c}"`).join(', ')}. Stavningen skal være præcis den samme.`);
        if (ekstra.length) advarAt(sted, `Har valgmulighed(er), koden ikke kender: ${ekstra.map((c) => `"${c}"`).join(', ')}.`);
      }
      if (forventet.standard !== undefined && felt.DefaultValue !== forventet.standard) {
        advarAt(sted, `Standardværdien er "${felt.DefaultValue ?? ''}", skal være "${forventet.standard}".`);
      }
      if (forventet.opslagTil) {
        const maal = listeIder[forventet.opslagTil];
        if (maal && guid(felt.LookupList) !== maal) {
          fejlAt(sted, `Opslaget peger på en anden liste end ${forventet.opslagTil} på dette site (fx den gamle liste på det tidligere site). Slet kolonnen og opret den igen.`);
        }
        if (felt.LookupField !== forventet.opslagFelt) fejlAt(sted, `Opslaget henter "${felt.LookupField}", skal hente "${forventet.opslagFelt}".`);
      }
    }

    // Kolonner der ligner en fejloprettelse: tal bagpaa eller kodede tegn
    for (const f of felter) {
      if (f.FromBaseType || f.ReadOnlyField) continue;
      if (spec.felter[f.InternalName] || f.InternalName === 'Title') continue;
      if (/_x[0-9a-f]{4}_|\d$/i.test(f.InternalName)) {
        advarAt(`${navn}.${f.InternalName}`, `Ekstra kolonne "${f.Title}" med et internt navn, der ligner en fejloprettelse. Kan slettes, hvis den ikke bruges.`);
      }
    }
  }

  // --- Resultat ---
  console.log(`%cTjek af ${SITE}`, 'font-weight:bold;font-size:14px');
  console.log(`Tidszone: ${tzNavn}`);
  if (fejl.length) {
    console.log(`%c${fejl.length} fejl — skal rettes:`, 'color:#c00;font-weight:bold');
    console.table(fejl);
  }
  if (advarsler.length) {
    console.log(`%c${advarsler.length} advarsler:`, 'color:#b60;font-weight:bold');
    console.table(advarsler);
  }
  if (!fejl.length && !advarsler.length) {
    console.log('%cAlt stemmer med det forventede skema.', 'color:#080;font-weight:bold');
  }
  return { fejl, advarsler };
})();
