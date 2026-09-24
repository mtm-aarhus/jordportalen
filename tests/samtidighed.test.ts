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
