import { AfventerAarsag, SagStatus } from './typer';

/**
 * Sagsgangen for en paragraf 8-ansoegning.
 *
 *   Ny -> Under behandling -> Afventer -> Afgjort eller Afvist
 *
 * Afventer og Under behandling kan skifte frem og tilbage, fordi materiale
 * kommer ind og sagen genoptages. Afgjort og Afvist er endelige - en afsluttet
 * sag genaabnes ikke, den faar en ny ansoegning.
 */
const TILLADTE_SKIFT: Record<SagStatus, SagStatus[]> = {
  'Ny': ['Under behandling', 'Afgjort', 'Afvist'],
  'Under behandling': ['Afventer', 'Afgjort', 'Afvist'],
  'Afventer': ['Under behandling', 'Afgjort', 'Afvist'],
  'Afgjort': [],
  'Afvist': [],
};

/**
 * De to endelige statusser. Dashboardets "aktive" er alt andet.
 *
 * Ligger her sammen med sagsgangen, saa en aendring i TILLADTE_SKIFT og i
 * hvad der regnes som afsluttet sker samme sted. En test holder de to i trit.
 */
export const AFSLUTTEDE_STATUS: readonly SagStatus[] = ['Afgjort', 'Afvist'];

/** Sand for Afgjort og Afvist. En ukendt status regnes som aktiv. */
export function erAfsluttet(status: SagStatus): boolean {
  return AFSLUTTEDE_STATUS.indexOf(status) !== -1;
}

/**
 * Slaar de tilladte overgange op for en status.
 *
 * Status kommer fra en SharePoint Choice-kolonne. Aendrer en administrator
 * eller tilfoejer et valg, kan `fra` vaere noget der ligger uden for
 * TypeScript-unionen paa kaeretidspunktet. Et ukendt status-navn skal give
 * "ingen overgange tilladt", ikke en TypeError fra et manglende opslag.
 */
function tilladteOvergange(fra: SagStatus): SagStatus[] | undefined {
  return TILLADTE_SKIFT[fra];
}

export function maaSkifte(fra: SagStatus, til: SagStatus): boolean {
  const tilladte = tilladteOvergange(fra);
  return tilladte !== undefined && tilladte.indexOf(til) !== -1;
}

export function naeste(fra: SagStatus): SagStatus[] {
  const tilladte = tilladteOvergange(fra);
  // Kopi, saa en kalder (fx en dropdown der tilfoejer en placeholder) ikke
  // kan mutere selve opslagstabellen og dermed oedelaegge den for resten af
  // sessionen.
  return tilladte !== undefined ? tilladte.slice() : [];
}

/**
 * Validerer et statusskift. Returnerer en laesbar fejlbesked, eller undefined
 * hvis skiftet er i orden.
 *
 * Aarsagen hoerer kun til Afventer. Uden den regel ville en sag kunne staa som
 * Afgjort med en afventer-aarsag haengende ved, og dashboardets filtre ville
 * vise noget forkert.
 */
export function validerStatusskift(
  fra: SagStatus,
  til: SagStatus,
  aarsag?: AfventerAarsag
): string | undefined {
  if (!maaSkifte(fra, til)) {
    return `Status kan ikke skifte fra ${fra} til ${til}.`;
  }
  if (til === 'Afventer' && !aarsag) {
    return 'Vælg en årsag når sagen sættes på afventende.';
  }
  if (til !== 'Afventer' && aarsag) {
    return 'Årsag kan kun angives sammen med status Afventer.';
  }
  return undefined;
}
