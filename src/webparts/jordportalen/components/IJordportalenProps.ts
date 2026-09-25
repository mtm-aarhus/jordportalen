import type { SPFI } from '@pnp/sp';

export interface IJordportalenProps {
  sp: SPFI;
  /** Sidens egen URL uden parametre. Bruges til at bygge deep-links. */
  sideUrl: string;
}
