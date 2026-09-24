/**
 * Deep-links til en enkelt sag.
 *
 * Formatet er ?sag=<id>, ikke #sag-<id>. Et hash i den INITIELLE URL crasher
 * SharePoints eget side-bootstrap (sp-pages-assembly) ved koldt sideload -
 * altsaa netop naar nogen aabner et link fra en mail, foer webparten overhovedet
 * er mountet. Idéportalen har lært det; Opgaveportalen bruger stadig hash.
 *
 * Gamle hash-links parses fortsat, saa allerede udsendte mails virker, men
 * genereres aldrig.
 */

const PARAMETER = 'sag';
const LEGACY_HASH = /#sag-(\d+)\b/;

export function byggSagLink(sideUrl: string, sagId: number): string {
  const [basis, forespoergsel] = sideUrl.split('#')[0].split('?');

  const parametre = (forespoergsel ? forespoergsel.split('&') : []).filter(
    (p) => p.split('=')[0] !== PARAMETER
  );
  parametre.push(`${PARAMETER}=${sagId}`);

  return `${basis}?${parametre.join('&')}`;
}

export function parseSagId(url: string): number | undefined {
  const forespoergsel = url.split('#')[0].split('?')[1];

  if (forespoergsel) {
    for (const par of forespoergsel.split('&')) {
      const [navn, vaerdi] = par.split('=');
      if (navn === PARAMETER) {
        return gyldigtId(vaerdi);
      }
    }
  }

  const legacy = LEGACY_HASH.exec(url);
  return legacy ? gyldigtId(legacy[1]) : undefined;
}

function gyldigtId(raa: string | undefined): number | undefined {
  if (!raa || !/^\d+$/.test(raa)) {
    return undefined;
  }
  const id = parseInt(raa, 10);
  return id > 0 ? id : undefined;
}
