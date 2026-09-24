import { hentAlleSider } from '../src/webparts/jordportalen/domaene/paginering';

/**
 * En asynkron iterator over faste sider, der taeller hvor mange gange der
 * reelt hentes en side. Efterligner PnPjs' `[Symbol.asyncIterator]()`: naar
 * siderne er brugt op, returneres `done: true` uden yderligere "netvaerkskald".
 */
function falskeSider<T>(sider: T[][]): { iterable: AsyncIterable<T[]>; antalHentet: () => number } {
  let indeks = 0;
  let kald = 0;

  const iterable: AsyncIterable<T[]> = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<T[]>> {
          if (indeks >= sider.length) {
            return { done: true, value: undefined };
          }
          kald++;
          const side = sider[indeks];
          indeks++;
          return { done: false, value: side };
        },
      };
    },
  };

  return { iterable, antalHentet: () => kald };
}

/** Deler et fortloebende talomraade op i sider af en given stoerrelse. */
function tilSider(antalIAlt: number, sideStoerrelse: number): number[][] {
  const alle = Array.from({ length: antalIAlt }, (_, i) => i);
  const sider: number[][] = [];
  for (let i = 0; i < alle.length; i += sideStoerrelse) {
    sider.push(alle.slice(i, i + sideStoerrelse));
  }
  return sider;
}

describe('hentAlleSider', () => {
  it('henter alt naar det fylder mindre end én side', async () => {
    const { iterable } = falskeSider(tilSider(30, 100));
    const r = await hentAlleSider(iterable, 5000);
    expect(r.elementer).toHaveLength(30);
    expect(r.afkortet).toBe(false);
  });

  it('henter alle sider naar der er flere, inklusiv en delvis sidste side', async () => {
    const { iterable } = falskeSider(tilSider(250, 100));
    const r = await hentAlleSider(iterable, 5000);
    expect(r.elementer).toHaveLength(250);
    expect(r.elementer[249]).toBe(249);
    expect(r.afkortet).toBe(false);
  });

  it('markerer ikke afkortning naar totalen praecis rammer maksAntal, men der ikke er mere', async () => {
    // 200 raekker i to fulde sider af 100, maksAntal er ogsaa 200. Uden det
    // ekstra opslag ville dette fejlagtigt blive markeret afkortet.
    const { iterable, antalHentet } = falskeSider(tilSider(200, 100));
    const r = await hentAlleSider(iterable, 200);
    expect(r.elementer).toHaveLength(200);
    expect(r.afkortet).toBe(false);
    // Kontroltjekket koster intet ekstra kald her: ligesom PnPjs' egen
    // iterator (som saetter _next til null uden netvaerkskald, naar sidste
    // side allerede fortalte at der ikke er flere) ved den falske iterator
    // det med det samme uden at taelle et nyt "kald".
    expect(antalHentet()).toBe(2);
  });

  it('markerer afkortning naar maksAntal rammes midt i en side', async () => {
    const { iterable } = falskeSider(tilSider(1000, 100));
    const r = await hentAlleSider(iterable, 250);
    expect(r.elementer).toHaveLength(250);
    expect(r.elementer[249]).toBe(249);
    expect(r.afkortet).toBe(true);
  });

  it('markerer afkortning naar maksAntal rammes praecis ved en sidegraense, og der er mere', async () => {
    const { iterable } = falskeSider(tilSider(300, 100));
    const r = await hentAlleSider(iterable, 200);
    expect(r.elementer).toHaveLength(200);
    expect(r.afkortet).toBe(true);
  });

  it('henter ikke flere sider end noedvendigt', async () => {
    const { iterable, antalHentet } = falskeSider(tilSider(150, 100));
    await hentAlleSider(iterable, 5000);
    // 100, saa 50, saa stop - ikke et tomt kald mere, fordi den delvise
    // sidste side allerede fortaeller at der ikke er mere.
    expect(antalHentet()).toBe(2);
  });

  it('haandterer et tomt resultat', async () => {
    const { iterable } = falskeSider([]);
    const r = await hentAlleSider(iterable, 5000);
    expect(r.elementer).toHaveLength(0);
    expect(r.afkortet).toBe(false);
  });

  it('kaster en klar fejl ved en ikke-positiv maksAntal i stedet for at loebe uendeligt', async () => {
    const { iterable: a } = falskeSider(tilSider(10, 100));
    await expect(hentAlleSider(a, 0)).rejects.toThrow('maksAntal skal vaere et positivt tal.');

    const { iterable: b } = falskeSider(tilSider(10, 100));
    await expect(hentAlleSider(b, -1)).rejects.toThrow(Error);
  });
});
