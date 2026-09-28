import {
  byggUrl,
  historikTilstand,
  laesVisning,
  skrivHistorik,
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

describe('skrivHistorik', () => {
  type Kald = { metode: string; state: unknown; url: string };

  function falskHistorik(kaster: boolean) {
    const kald: Kald[] = [];
    const registrer = (metode: string) => (state: unknown, _titel: string, url: string): void => {
      if (kaster) {
        throw new Error('SecurityError: Too many calls to Location or History APIs');
      }
      kald.push({ metode, state, url });
    };
    return {
      kald,
      historik: { state: { spNav: 1 }, pushState: registrer('push'), replaceState: registrer('replace') },
    };
  }

  it('laegger et nyt trin med portalens markoer oven i den eksisterende state', () => {
    const { kald, historik } = falskHistorik(false);
    expect(skrivHistorik(historik, '/side?sag=1', 'nyt-trin')).toBe(true);
    expect(kald).toEqual([{ metode: 'push', state: { spNav: 1, jordportalen: true }, url: '/side?sag=1' }]);
  });

  it('erstatter trinnet og sender den eksisterende state uaendret videre', () => {
    const { kald, historik } = falskHistorik(false);
    expect(skrivHistorik(historik, '/side?q=a', 'erstat')).toBe(true);
    expect(kald).toEqual([{ metode: 'replace', state: { spNav: 1 }, url: '/side?q=a' }]);
  });

  it('kaster ikke naar browseren afviser kaldet, men melder det tilbage', () => {
    // Firefox og Safari kaster SecurityError ved mange kald paa kort tid -
    // fx replaceState ved hvert tastetryk i soegefeltet.
    const { historik } = falskHistorik(true);
    expect(() => skrivHistorik(historik, '/side', 'erstat')).not.toThrow();
    expect(skrivHistorik(historik, '/side', 'nyt-trin')).toBe(false);
  });
});
