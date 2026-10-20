/**
 * Visningstekster der skal kunne testes uden React.
 */

/** "Matrikel X · Lokalitet Y" med kun de dele der har en vaerdi. */
export function ejendomsDetaljer(matrikel?: string, lokalitet?: string): string {
  const dele: string[] = [];
  if (matrikel && matrikel.trim()) {
    dele.push(`Matrikel ${matrikel.trim()}`);
  }
  if (lokalitet && lokalitet.trim()) {
    dele.push(`Lokalitet ${lokalitet.trim()}`);
  }
  return dele.join(' · ');
}

const DAG_MS = 24 * 60 * 60 * 1000;

/**
 * Hele kalenderdage fra `dato` til `nu` i lokal tid. En sag modtaget kl. 23.59
 * i gaar er 1 dag gammel kl. 8 i dag. Afrundingen klarer, at dagen ved skift
 * til og fra sommertid er 23 eller 25 timer.
 */
export function dageSiden(dato: string, nu: Date = new Date()): number {
  const fra = new Date(dato);
  const start = new Date(fra.getFullYear(), fra.getMonth(), fra.getDate()).getTime();
  const slut = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()).getTime();
  return Math.round((slut - start) / DAG_MS);
}

/** "I dag", "I går" eller "5 dage". */
export function alderTekst(dage: number): string {
  if (dage <= 0) {
    return 'I dag';
  }
  if (dage === 1) {
    return 'I går';
  }
  return `${dage} dage`;
}
