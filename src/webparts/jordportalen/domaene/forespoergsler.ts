import { SagStatus } from './typer';

/**
 * OData-filtre som rene funktioner, saa de kan testes uden SharePoint.
 *
 * Filtrene ligger i selve forespoergslen frem for i frontenden. Det er
 * afgoerende for noter, hvor forfatterfiltret er en del af beskyttelsen og
 * ikke maa kunne omgaas ved at aendre noget i UI'et.
 */

/**
 * Escaper et apostrof, saa det ikke braekker OData-udtrykket, og omslutter
 * med anfoerselstegn.
 *
 * Eksporteret, saa det er den eneste udgave af denne sikkerhedslogik - to
 * kopier (fx en i ProfilService) risikerer at drifte fra hinanden.
 */
export function tekst(vaerdi: string): string {
  return `'${vaerdi.replace(/'/g, "''")}'`;
}

/**
 * Noter for én sag, skrevet af én bruger.
 *
 * Opgaveportalens tilsvarende filtrerer kun paa opgave-id og gater i UI'et.
 * Skifter en sag ansvarlig, ser den nye dermed den forriges noter. Her ligger
 * forfatteren i forespoergslen, saa det ikke kan ske.
 */
export function noteFilter(sagId: number, brugerId: number): string {
  return `SagId eq ${sagId} and Author/Id eq ${brugerId}`;
}

export function sagIdFilter(sagId: number): string {
  return `SagId eq ${sagId}`;
}

export function uuidFilter(uuid: string): string {
  return `SubmissionUUID eq ${tekst(uuid)}`;
}

export interface IDashboardFilter {
  status?: SagStatus;
  ansvarligId?: number;
  kunLedige?: boolean;
}

export function dashboardFilter(f: IDashboardFilter): string {
  const dele: string[] = [];

  if (f.status) {
    dele.push(`Status eq ${tekst(f.status)}`);
  }

  // Ledig og "mine sager" udelukker hinanden. Ledig vinder, saa filtret ikke
  // kan ende med at spoerge efter sager der baade er mine og ledige - det ville
  // altid give nul raekker og ligne en fejl.
  if (f.kunLedige) {
    dele.push('AnsvarligId eq null');
  } else if (typeof f.ansvarligId === 'number') {
    dele.push(`AnsvarligId eq ${f.ansvarligId}`);
  }

  return dele.join(' and ');
}
