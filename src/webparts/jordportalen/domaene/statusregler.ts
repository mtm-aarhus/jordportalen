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

export function maaSkifte(fra: SagStatus, til: SagStatus): boolean {
  return TILLADTE_SKIFT[fra].indexOf(til) !== -1;
}

export function naeste(fra: SagStatus): SagStatus[] {
  return TILLADTE_SKIFT[fra];
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
