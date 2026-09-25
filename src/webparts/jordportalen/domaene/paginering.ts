/**
 * Henter alle sider af et resultatsaet via PnPjs' asynkrone iterator.
 *
 * `_Items.skip()` i @pnp/sp tager IKKE en offset. Den saetter
 * `$skiptoken=Paged=TRUE&p_ID=<id>`, hvor `<id>` er det Id siden skal
 * fortsaette EFTER (se node_modules/@pnp/sp/items/types.js). Det virker kun
 * ved en tilfaeldighed, naar Id'er er taette og resultatet er sorteret paa
 * Id. Sorteres der paa `ModtagetDato` eller `Created` (som SagService og
 * LogService goer), giver et offset-baseret skip tavse huller eller
 * gentagne raekker.
 *
 * Den korrekte mekanisme er PnPjs' `[Symbol.asyncIterator]()`, som foelger
 * `odata.nextLink` og bevarer $top/$select/$expand/$filter/$orderby paa
 * tvaers af sider. Denne funktion konsumerer derfor en asynkron iterator af
 * sider frem for selv at styre skip/top.
 *
 * Idéportalen og Opgaveportalen bruger .top(500) og afskaerer resten uden fejl.
 * Deres egen TROUBLESHOOTING.md kalder det "stille og roligt" - det er den
 * vaerste slags fejl, fordi data forsvinder uden at nogen opdager det.
 *
 * Her hentes alle sider, og hvis sikkerhedsgraensen rammes, siges det
 * eksplicit i returvaerdien, saa graensefladen kan vise det.
 */

export interface ISideResultat<T> {
  elementer: T[];
  /** Sand hvis maksAntal blev naaet, og der kan vaere flere. */
  afkortet: boolean;
}

export const STANDARD_MAKSANTAL = 5000;

/**
 * @param sider En asynkron iterator af sider, typisk selve PnPjs-samlingen
 *              (`liste.items.select(...).filter(...).top(100)`), som allerede
 *              har fastlagt sidestoerrelsen via `.top()`.
 * @param maksAntal Sikkerhedsgraense for hvor mange raekker der hentes i alt.
 */
export async function hentAlleSider<T>(
  sider: AsyncIterable<T[]>,
  maksAntal: number = STANDARD_MAKSANTAL
): Promise<ISideResultat<T>> {
  // Uden dette tjek kan graensen aldrig naas naar maksAntal er 0 eller
  // negativ, og loekken herunder koerer for evigt og fanen dor.
  if (maksAntal <= 0) {
    throw new Error('maksAntal skal vaere et positivt tal.');
  }

  const elementer: T[] = [];
  const iterator = sider[Symbol.asyncIterator]();

  for (;;) {
    const resultat = await iterator.next();
    if (resultat.done) {
      return { elementer, afkortet: false };
    }

    const side = resultat.value;
    if (side.length === 0) {
      // Tomt resultatsaet fra start: naeste kald giver done, og loekken
      // slutter naturligt uden at markere afkortning.
      continue;
    }

    const overskydende = elementer.length + side.length - maksAntal;

    if (overskydende < 0) {
      elementer.push(...side);
      continue;
    }

    // Graensen naas i denne side. Tag kun det, der er plads til.
    elementer.push(...side.slice(0, side.length - overskydende));

    if (overskydende > 0) {
      // Siden selv indeholdt mere end graensen tillod - der er
      // umiskendeligt mere tilbage, ingen grund til at spoerge.
      return { elementer, afkortet: true };
    }

    // Graensen ramt praecis ved sidens slutning. Det er umuligt at vide om
    // der er mere uden at spoerge - saa her, og kun her, hentes én side
    // ekstra for at afgoere det korrekt i stedet for at gaette.
    const naeste = await iterator.next();
    const erMereTilbage = !naeste.done && naeste.value.length > 0;
    return { elementer, afkortet: erMereTilbage };
  }
}
