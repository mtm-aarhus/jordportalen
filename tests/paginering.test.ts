import { hentAlleSider } from '../src/webparts/jordportalen/domaene/paginering';

/** Laver en falsk sidehenter over et kendt datasaet. */
function falskHenter(antalIAlt: number): (skip: number, antal: number) => Promise<number[]> {
  const alle = Array.from({ length: antalIAlt }, (_, i) => i);
  return async (skip: number, antal: number) => alle.slice(skip, skip + antal);
}

describe('hentAlleSider', () => {
  it('henter alt naar det fylder mindre end én side', async () => {
    const r = await hentAlleSider(falskHenter(30), 100, 5000);
    expect(r.elementer).toHaveLength(30);
    expect(r.afkortet).toBe(false);
  });

  it('henter alle sider naar der er flere', async () => {
    const r = await hentAlleSider(falskHenter(250), 100, 5000);
    expect(r.elementer).toHaveLength(250);
    expect(r.afkortet).toBe(false);
  });

  it('haandterer at antallet gaar praecis op i sidestoerrelsen', async () => {
    const r = await hentAlleSider(falskHenter(200), 100, 5000);
    expect(r.elementer).toHaveLength(200);
    expect(r.afkortet).toBe(false);
  });

  it('markerer afkortning naar sikkerhedsgraensen rammes', async () => {
    const r = await hentAlleSider(falskHenter(1000), 100, 250);
    expect(r.elementer).toHaveLength(250);
    expect(r.afkortet).toBe(true);
  });

  it('henter ikke flere sider end noedvendigt', async () => {
    let kald = 0;
    const henter = async (skip: number, antal: number) => {
      kald++;
      return falskHenter(150)(skip, antal);
    };
    await hentAlleSider(henter, 100, 5000);
    // 100, saa 50, saa stop. Ikke et tomt kald mere.
    expect(kald).toBe(2);
  });

  it('haandterer et tomt resultat', async () => {
    const r = await hentAlleSider(falskHenter(0), 100, 5000);
    expect(r.elementer).toHaveLength(0);
    expect(r.afkortet).toBe(false);
  });

  it('kaster en klar fejl ved en ikke-positiv sideStoerrelse i stedet for at loebe uendeligt', async () => {
    await expect(hentAlleSider(falskHenter(10), 0, 5000)).rejects.toThrow(
      'sideStoerrelse skal vaere et positivt tal.'
    );
    await expect(hentAlleSider(falskHenter(10), -1, 5000)).rejects.toThrow(Error);
  });

  it('kaster en klar fejl ved en ikke-positiv maksAntal i stedet for at loebe uendeligt', async () => {
    await expect(hentAlleSider(falskHenter(10), 100, 0)).rejects.toThrow(
      'maksAntal skal vaere et positivt tal.'
    );
    await expect(hentAlleSider(falskHenter(10), 100, -1)).rejects.toThrow(Error);
  });
});
