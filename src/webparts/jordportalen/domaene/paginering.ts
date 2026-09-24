/**
 * Henter alle sider af et resultatsaet.
 *
 * Idéportalen og Opgaveportalen bruger .top(500) og afskaerer resten uden fejl.
 * Deres egen TROUBLESHOOTING.md kalder det "stille og roligt" - det er den
 * vaerste slags fejl, fordi data forsvinder uden at nogen opdager det.
 *
 * Her hentes alle sider, og hvis sikkerhedsgraensen rammes, siges det
 * eksplicit i returvaerdien, saa graensefladen kan vise det.
 */

export type SideHenter<T> = (skip: number, antal: number) => Promise<T[]>;

export interface ISideResultat<T> {
  elementer: T[];
  /** Sand hvis maksAntal blev naaet, og der kan vaere flere. */
  afkortet: boolean;
}

export const STANDARD_SIDESTOERRELSE = 100;
export const STANDARD_MAKSANTAL = 5000;

export async function hentAlleSider<T>(
  hentSide: SideHenter<T>,
  sideStoerrelse: number = STANDARD_SIDESTOERRELSE,
  maksAntal: number = STANDARD_MAKSANTAL
): Promise<ISideResultat<T>> {
  const elementer: T[] = [];

  while (elementer.length < maksAntal) {
    const resterende = maksAntal - elementer.length;
    const antal = Math.min(sideStoerrelse, resterende);
    const side = await hentSide(elementer.length, antal);

    elementer.push(...side);

    // En side der ikke er fuld betyder, at vi er ved enden. Uden dette tjek
    // ville vi lave ét ekstra, tomt kald ved hver koersel.
    if (side.length < antal) {
      return { elementer, afkortet: false };
    }
  }

  return { elementer, afkortet: true };
}
