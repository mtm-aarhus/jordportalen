import { byggSagLink, parseSagId } from '../src/webparts/jordportalen/utils/deepLink';

const SIDE = 'https://aarhuskommune.sharepoint.com/teams/NaturogMiljDashboard/SitePages/Jord.aspx';

describe('byggSagLink', () => {
  it('bruger query-parameter, ikke hash', () => {
    expect(byggSagLink(SIDE, 42)).toBe(`${SIDE}?sag=42`);
  });

  it('tilfoejer til en URL der allerede har parametre', () => {
    expect(byggSagLink(`${SIDE}?env=1`, 42)).toBe(`${SIDE}?env=1&sag=42`);
  });

  it('erstatter et eksisterende sag-parameter i stedet for at duplikere det', () => {
    expect(byggSagLink(`${SIDE}?sag=7`, 42)).toBe(`${SIDE}?sag=42`);
  });
});

describe('parseSagId', () => {
  it('laeser query-parameteren', () => {
    expect(parseSagId(`${SIDE}?sag=42`)).toBe(42);
  });

  it('laeser stadig gamle hash-links af hensyn til eksisterende mails', () => {
    expect(parseSagId(`${SIDE}#sag-42`)).toBe(42);
  });

  it('giver undefined naar der ikke er nogen sag i URL en', () => {
    expect(parseSagId(SIDE)).toBeUndefined();
  });

  it('giver undefined ved en vaerdi der ikke er et tal', () => {
    expect(parseSagId(`${SIDE}?sag=abc`)).toBeUndefined();
  });

  it('giver undefined ved et negativt id', () => {
    expect(parseSagId(`${SIDE}?sag=-1`)).toBeUndefined();
  });
});
