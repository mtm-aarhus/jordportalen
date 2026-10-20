import { ALLE_STATUS, ISag, SagStatus } from './typer';
import { erAfsluttet } from './statusregler';

/**
 * Dashboardets visning og filtrering som rene funktioner.
 *
 * Alle sager hentes én gang, og filtreringen sker her i browseren. Det
 * forudsaetter hoejst et par tusind sager (forventet ca. 500 om aaret).
 */

export type Udvalg = 'aktive' | 'afsluttede' | 'alle' | SagStatus;
export type Hvem = 'alle' | 'ledige' | 'mine';
export type Layout = 'tabel' | 'kanban';

export interface IVisning {
  /** Aaben sag. Udeladt betyder dashboardet. */
  sag?: number;
  udvalg: Udvalg;
  hvem: Hvem;
  soeg: string;
  /** Tabel eller kanban. Udeladt betyder tabel. Et visningsvalg, ikke et filter. */
  layout?: Layout;
}

export const STANDARD_VISNING: IVisning = { udvalg: 'aktive', hvem: 'alle', soeg: '' };

export const ALLE_UDVALG: readonly Udvalg[] = ['aktive', 'afsluttede', 'alle', ...ALLE_STATUS];
export const ALLE_HVEM: readonly Hvem[] = ['alle', 'ledige', 'mine'];
export const ALLE_LAYOUTS: readonly Layout[] = ['tabel', 'kanban'];

/** Filtrene til standard. Layoutet er et valg af visning og bliver staaende. */
export function nulstilFiltre(visning: IVisning): IVisning {
  return { ...STANDARD_VISNING, layout: visning.layout };
}

function iUdvalg(s: ISag, udvalg: Udvalg): boolean {
  switch (udvalg) {
    case 'aktive':
      return !erAfsluttet(s.Status);
    case 'afsluttede':
      return erAfsluttet(s.Status);
    case 'alle':
      return true;
    default:
      return s.Status === udvalg;
  }
}

// SharePoint returnerer null, ikke undefined, for et tomt personfelt. Derfor
// !AnsvarligId og ikke === undefined.
function erLedig(s: ISag): boolean {
  return !s.AnsvarligId;
}

function hvemPasser(s: ISag, hvem: Hvem, brugerId: number): boolean {
  switch (hvem) {
    case 'ledige':
      return erLedig(s);
    case 'mine':
      return s.AnsvarligId === brugerId;
    default:
      return true;
  }
}

function matcherSoegning(s: ISag, soeg: string): boolean {
  const q = soeg.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const felter = [String(s.SubmissionSerial ?? ''), s.Title, s.AdresserTekst, s.Grundejere];
  return felter.some((f) => (f || '').toLowerCase().indexOf(q) !== -1);
}

/** Sagerne i visningen, i den raekkefoelge serveren leverede dem. */
export function filtrerSager(sager: ISag[], visning: IVisning, brugerId: number): ISag[] {
  return sager.filter(
    (s) =>
      iUdvalg(s, visning.udvalg) &&
      hvemPasser(s, visning.hvem, brugerId) &&
      matcherSoegning(s, visning.soeg)
  );
}

export interface INoegletal {
  aktive: number;
  ledige: number;
  mine: number;
  afventer: number;
}

/**
 * Noegletal over de aktive sager, uafhaengigt af filtrene. Saa staar tallene
 * stille mens man filtrerer og betyder det samme hver gang.
 */
export function taelNoegletal(sager: ISag[], brugerId: number): INoegletal {
  const aktive = sager.filter((s) => !erAfsluttet(s.Status));
  return {
    aktive: aktive.length,
    ledige: aktive.filter(erLedig).length,
    mine: aktive.filter((s) => s.AnsvarligId === brugerId).length,
    afventer: aktive.filter((s) => s.Status === 'Afventer').length,
  };
}

export type Kort = 'aktive' | 'ledige' | 'mine' | 'afventer';
export const ALLE_KORT: readonly Kort[] = ['aktive', 'ledige', 'mine', 'afventer'];

/** Visningen et klik paa kortet giver. Soegningen og layoutet bevares. */
export function kortGenvej(kort: Kort, visning: IVisning): IVisning {
  const { soeg, layout } = visning;
  switch (kort) {
    case 'ledige':
      return { udvalg: 'aktive', hvem: 'ledige', soeg, layout };
    case 'mine':
      return { udvalg: 'aktive', hvem: 'mine', soeg, layout };
    case 'afventer':
      return { udvalg: 'Afventer', hvem: 'alle', soeg, layout };
    default:
      return { udvalg: 'aktive', hvem: 'alle', soeg, layout };
  }
}

/** Sand naar kortets genvej svarer til visningen (soegningen taeller ikke med). */
export function erKortValgt(kort: Kort, visning: IVisning): boolean {
  const genvej = kortGenvej(kort, visning);
  return genvej.udvalg === visning.udvalg && genvej.hvem === visning.hvem;
}

/** Sand naar udvalg, hvem og soegning staar til standard. En aaben sag taeller ikke med. */
export function erStandard(visning: IVisning): boolean {
  return (
    visning.udvalg === STANDARD_VISNING.udvalg &&
    visning.hvem === STANDARD_VISNING.hvem &&
    visning.soeg.trim() === ''
  );
}

export interface IKanbanKolonne {
  status: SagStatus;
  sager: ISag[];
}

/**
 * Kanban-kolonnerne for de (allerede filtrerede) sager.
 *
 * Kolonnerne foelger udvalget, ogsaa naar en kolonne er tom, saa tavlen
 * ikke skifter form, mens man filtrerer. En status, koden ikke kender (fx et
 * nyt valg tilfoejet i SharePoint), faar sin egen kolonne til sidst i stedet
 * for at sagen forsvinder fra tavlen.
 */
export function kanbanKolonner(sager: ISag[], udvalg: Udvalg): IKanbanKolonne[] {
  const statusser: SagStatus[] = ALLE_STATUS.filter((status) =>
    iUdvalg({ Status: status } as ISag, udvalg)
  );
  sager.forEach((s) => {
    if (statusser.indexOf(s.Status) === -1) {
      statusser.push(s.Status);
    }
  });
  return statusser.map((status) => ({ status, sager: sager.filter((s) => s.Status === status) }));
}
