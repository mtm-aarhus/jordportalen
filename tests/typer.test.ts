import { LIST_NAMES, ALLE_STATUS, ALLE_AARSAGER } from '../src/webparts/jordportalen/domaene/typer';

describe('typer', () => {
  it('navngiver alle ni lister', () => {
    expect(Object.keys(LIST_NAMES)).toHaveLength(9);
    expect(LIST_NAMES.SAGER).toBe('P8Ansogninger');
    expect(LIST_NAMES.DOKUMENTER).toBe('P8Dokumenter');
  });

  it('bruger rene ASCII-listenavne, da SharePoint koder specialtegn om', () => {
    Object.values(LIST_NAMES).forEach((navn) => {
      expect(navn).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  it('har de fem statusser i sagsgangens raekkefoelge', () => {
    expect(ALLE_STATUS).toEqual(['Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist']);
  });

  it('har de tre afventer-aarsager med danske tegn intakte', () => {
    expect(ALLE_AARSAGER).toEqual(['Materiale', 'Høring', 'Vurderingssvar']);
  });
});
