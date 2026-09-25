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
    expect.assertions(2);
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
    expect.assertions(2);
    try {
      await skrivMedEtag(async () => { throw httpFejl(403); }, 'tage sagen');
      fail('skulle have kastet');
    } catch (e) {
      expect(e).toBeInstanceOf(AdgangsFejl);
      expect((e as Error).message).toBe('Du har ikke rettigheder til at tage sagen.');
    }
  });

  it('oversaetter andre fejl til en generisk besked, men bevarer originalen som cause', async () => {
    expect.assertions(3);
    const original = httpFejl(500);
    try {
      await skrivMedEtag(async () => { throw original; }, 'tage sagen');
      fail('skulle have kastet');
    } catch (e) {
      // Den originale HttpRequestError kan baere request-URL, svartekst og
      // SharePoints korrelations-id - det skal ikke vises for brugeren.
      expect((e as Error).message).not.toBe(original.message);
      expect((e as Error).message).toBe(
        'Der opstod en fejl, da du forsøgte at tage sagen. Prøv igen, eller kontakt IT-support hvis problemet fortsætter.'
      );
      expect((e as Error).cause).toBe(original);
    }
  });

  it('genkender en samtidighedsfejl', () => {
    expect(erSamtidighedsfejl(new SamtidighedsFejl('x'))).toBe(true);
    expect(erSamtidighedsfejl(new Error('x'))).toBe(false);
  });
});
