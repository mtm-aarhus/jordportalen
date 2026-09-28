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
