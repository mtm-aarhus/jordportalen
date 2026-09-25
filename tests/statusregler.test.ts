import { maaSkifte, naeste, validerStatusskift } from '../src/webparts/jordportalen/domaene/statusregler';
import { SagStatus } from '../src/webparts/jordportalen/domaene/typer';

describe('statusregler', () => {
  it('tillader den normale vej gennem sagsgangen', () => {
    expect(maaSkifte('Ny', 'Under behandling')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afventer')).toBe(true);
    expect(maaSkifte('Afventer', 'Under behandling')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afgjort')).toBe(true);
    expect(maaSkifte('Under behandling', 'Afvist')).toBe(true);
  });

  it('tillader at springe direkte fra Ny til afgoerelse', () => {
    expect(maaSkifte('Ny', 'Afvist')).toBe(true);
  });

  it('afviser skift fra en afsluttet sag', () => {
    expect(maaSkifte('Afgjort', 'Under behandling')).toBe(false);
    expect(maaSkifte('Afvist', 'Ny')).toBe(false);
  });

  it('afviser skift til samme status', () => {
    expect(maaSkifte('Ny', 'Ny')).toBe(false);
  });

  it('afviser at gaa tilbage til Ny', () => {
    expect(maaSkifte('Under behandling', 'Ny')).toBe(false);
  });

  it('opremser de mulige naeste statusser', () => {
    expect(naeste('Ny')).toEqual(['Under behandling', 'Afgjort', 'Afvist']);
    expect(naeste('Afgjort')).toEqual([]);
  });

  it('lader ikke en kalder odelaegge opslagstabellen ved at mutere det returnerede array', () => {
    const foerste = naeste('Ny');
    foerste.push('Afventer');
    foerste.sort();

    // Et helt nyt kald skal stadig give den oprindelige, upaavirkede raekkefoelge.
    expect(naeste('Ny')).toEqual(['Under behandling', 'Afgjort', 'Afvist']);
    expect(maaSkifte('Ny', 'Under behandling')).toBe(true);
  });

  it('degraderer til "ingen overgange" for en status uden for unionen, i stedet for at kaste', () => {
    const ukendt = 'Lukket' as unknown as SagStatus;
    expect(maaSkifte(ukendt, 'Ny')).toBe(false);
    expect(naeste(ukendt)).toEqual([]);
  });

  it('kraever en aarsag naar der skiftes til Afventer', () => {
    expect(validerStatusskift('Under behandling', 'Afventer')).toBe(
      'Vælg en årsag når sagen sættes på afventende.'
    );
    expect(validerStatusskift('Under behandling', 'Afventer', 'Høring')).toBeUndefined();
  });

  it('afviser en aarsag naar der ikke skiftes til Afventer', () => {
    expect(validerStatusskift('Afventer', 'Afgjort', 'Høring')).toBe(
      'Årsag kan kun angives sammen med status Afventer.'
    );
  });

  it('afviser et ulovligt skift med en laesbar besked', () => {
    expect(validerStatusskift('Afgjort', 'Ny')).toBe(
      'Status kan ikke skifte fra Afgjort til Ny.'
    );
  });
});
