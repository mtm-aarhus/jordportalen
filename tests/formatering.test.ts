import { alderTekst, dageSiden, ejendomsDetaljer } from '../src/webparts/jordportalen/domaene/formatering';

describe('ejendomsDetaljer', () => {
  it('viser begge dele', () => {
    expect(ejendomsDetaljer('1234a', '751-00123')).toBe('Matrikel 1234a · Lokalitet 751-00123');
  });

  it('viser kun matriklen naar lokaliteten mangler', () => {
    expect(ejendomsDetaljer('1234a', undefined)).toBe('Matrikel 1234a');
  });

  it('viser kun lokaliteten naar matriklen mangler', () => {
    expect(ejendomsDetaljer(undefined, '751-00123')).toBe('Lokalitet 751-00123');
  });

  it('giver tom tekst naar begge mangler eller er blanke', () => {
    expect(ejendomsDetaljer(undefined, undefined)).toBe('');
    expect(ejendomsDetaljer('  ', '')).toBe('');
  });
});

describe('dageSiden', () => {
  const nu = new Date(2026, 9, 19, 8, 0);

  it('taeller kalenderdage, ikke 24-timers perioder', () => {
    expect(dageSiden(new Date(2026, 9, 18, 23, 59).toISOString(), nu)).toBe(1);
    expect(dageSiden(new Date(2026, 9, 19, 0, 1).toISOString(), nu)).toBe(0);
  });

  it('klarer skiftet fra sommertid', () => {
    expect(dageSiden(new Date(2026, 9, 24, 12, 0).toISOString(), new Date(2026, 9, 26, 12, 0))).toBe(2);
  });
});

describe('alderTekst', () => {
  it.each([
    [0, 'I dag'],
    [1, 'I går'],
    [5, '5 dage'],
  ])('%i dage -> %s', (dage, tekst) => {
    expect(alderTekst(dage)).toBe(tekst);
  });
});
