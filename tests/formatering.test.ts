import { ejendomsDetaljer } from '../src/webparts/jordportalen/domaene/formatering';

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
