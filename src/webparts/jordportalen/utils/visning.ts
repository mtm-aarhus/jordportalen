/**
 * Hele visningen i adressen: aaben sag, udvalg, hvem og soegning.
 *
 * Adressen er den eneste kilde. Saa overlever filtrene baade skift mellem sag
 * og oversigt og en genindlaesning, og browserens tilbage-knap virker.
 *
 * Formatet er ?sag=<id>, ikke #sag-<id>. Et hash i den INITIELLE URL crasher
 * SharePoints eget side-bootstrap (sp-pages-assembly) ved koldt sideload -
 * altsaa netop naar nogen aabner et link fra en mail. Gamle hash-links
 * laeses fortsat, men genereres aldrig.
 *
 * Standardvaerdier skrives ikke, og fremmede parametre (fx SharePoints Mode=Edit)
 * bevares.
 */

import {
  ALLE_HVEM,
  ALLE_UDVALG,
  Hvem,
  IVisning,
  STANDARD_VISNING,
  Udvalg,
} from '../domaene/dashboard';

const P_SAG = 'sag';
const P_STATUS = 'status';
const P_HVEM = 'hvem';
const P_SOEG = 'q';
const EGNE_PARAMETRE = [P_SAG, P_STATUS, P_HVEM, P_SOEG];

const LEGACY_HASH = /#sag-(\d+)\b/;

export const HISTORIK_MARKOER = 'jordportalen';

function delAdresse(url: string): { adresse: string; parametre: URLSearchParams } {
  const [adresse, forespoergsel] = url.split('#')[0].split('?');
  return { adresse, parametre: new URLSearchParams(forespoergsel || '') };
}

function gyldigtId(raa: string | undefined): number | undefined {
  if (!raa || !/^\d+$/.test(raa)) {
    return undefined;
  }
  const id = parseInt(raa, 10);
  return id > 0 ? id : undefined;
}

function blandt<T extends string>(vaerdi: string | undefined, tilladte: readonly T[], standard: T): T {
  return vaerdi !== undefined && (tilladte as readonly string[]).indexOf(vaerdi) !== -1
    ? (vaerdi as T)
    : standard;
}

/** Laeser visningen. Ugyldige vaerdier giver stille standard. */
export function laesVisning(url: string): IVisning {
  const { parametre } = delAdresse(url);
  // URLSearchParams.get giver null for en manglende parameter. Det
  // oversaettes her en gang, saa resten af modulet kun kender undefined.
  const hent = (navn: string): string | undefined => parametre.get(navn) ?? undefined;
  const legacy = LEGACY_HASH.exec(url);
  const raaSag = hent(P_SAG);

  return {
    sag: gyldigtId(raaSag !== undefined ? raaSag : legacy ? legacy[1] : undefined),
    udvalg: blandt<Udvalg>(hent(P_STATUS), ALLE_UDVALG, STANDARD_VISNING.udvalg),
    hvem: blandt<Hvem>(hent(P_HVEM), ALLE_HVEM, STANDARD_VISNING.hvem),
    soeg: hent(P_SOEG) ?? '',
  };
}

/**
 * Bygger adressen for en visning oven paa `basisUrl`.
 *
 * Portalens egne parametre erstattes, alle andre bevares i deres raekkefoelge.
 */
export function byggUrl(basisUrl: string, visning: IVisning): string {
  const { adresse, parametre } = delAdresse(basisUrl);
  EGNE_PARAMETRE.forEach((navn) => parametre.delete(navn));

  if (visning.udvalg !== STANDARD_VISNING.udvalg) {
    parametre.set(P_STATUS, visning.udvalg);
  }
  if (visning.hvem !== STANDARD_VISNING.hvem) {
    parametre.set(P_HVEM, visning.hvem);
  }
  if (visning.soeg.trim() !== '') {
    parametre.set(P_SOEG, visning.soeg);
  }
  if (visning.sag !== undefined) {
    parametre.set(P_SAG, String(visning.sag));
  }

  const forespoergsel = parametre.toString();
  return forespoergsel ? `${adresse}?${forespoergsel}` : adresse;
}

/**
 * State til et historiktrin portalen selv laegger.
 *
 * Markoeren laegges OVEN I en eksisterende state i stedet for at erstatte den,
 * saa SharePoints egen navigation ikke mister noget den har gemt.
 */
export function historikTilstand(eksisterende: unknown): Record<string, unknown> {
  const basis =
    typeof eksisterende === 'object' && eksisterende !== null
      ? (eksisterende as Record<string, unknown>)
      : {};
  return { ...basis, [HISTORIK_MARKOER]: true };
}

/**
 * Hvad "Oversigten" skal goere fra en aaben sag.
 *
 * Har portalen selv lagt trinnet, ligger oversigten lige bagved, og et trin
 * tilbage undgaar dobbelte trin. Er sagen aabnet udefra (et link i en mail),
 * er der ingen oversigt bagved, og history.back() ville forlade siden.
 */
export function tilbageHandling(historyState: unknown): 'gaa-tilbage' | 'nyt-trin' {
  const erPortalens =
    typeof historyState === 'object' &&
    historyState !== null &&
    (historyState as Record<string, unknown>)[HISTORIK_MARKOER] === true;
  return erPortalens ? 'gaa-tilbage' : 'nyt-trin';
}

/** Den del af window.history, skrivHistorik bruger. Et interface, saa det kan testes. */
export interface IHistorik {
  state: unknown;
  pushState(state: unknown, titel: string, url: string): void;
  replaceState(state: unknown, titel: string, url: string): void;
}

/**
 * Skriver adressen i browserens historik uden at kunne kaste.
 *
 * Firefox og Safari kaster SecurityError ved mange kald paa kort tid, og
 * soegefeltet erstatter trinnet ved hvert tastetryk. En fejl her maa ikke
 * stoppe visningen - saa staar kun adressen et oejeblik bagud.
 *
 * @returns false hvis browseren afviste kaldet.
 */
export function skrivHistorik(historik: IHistorik, url: string, maade: 'nyt-trin' | 'erstat'): boolean {
  try {
    if (maade === 'nyt-trin') {
      historik.pushState(historikTilstand(historik.state), '', url);
    } else {
      historik.replaceState(historik.state, '', url);
    }
    return true;
  } catch {
    return false;
  }
}
