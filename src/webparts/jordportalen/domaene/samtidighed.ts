/**
 * Oversaetter SharePoints HTTP-fejl til noget en sagsbehandler kan forstaa.
 *
 * To sagsbehandlere kan klikke "Tag sagen" samtidig. Uden ETag lykkes begge
 * skrivninger, den sidste vinder, og den foerste tror han har sagen. Med ETag
 * afviser SharePoint den anden med 412, og brugeren faar det at vide med det
 * samme i stedet for at opdage det en time senere.
 */

export class SamtidighedsFejl extends Error {
  public constructor(besked: string) {
    super(besked);
    this.name = 'SamtidighedsFejl';
    // Noedvendigt naar der kompileres til ES5, ellers virker instanceof ikke.
    Object.setPrototypeOf(this, SamtidighedsFejl.prototype);
  }
}

export class AdgangsFejl extends Error {
  public constructor(besked: string) {
    super(besked);
    this.name = 'AdgangsFejl';
    Object.setPrototypeOf(this, AdgangsFejl.prototype);
  }
}

export function erSamtidighedsfejl(fejl: unknown): boolean {
  return fejl instanceof SamtidighedsFejl;
}

function statuskode(fejl: unknown): number | undefined {
  if (fejl && typeof fejl === 'object' && 'status' in fejl) {
    const status = (fejl as { status: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

/**
 * Oversaetter en fejl til de to varianter, brugere faktisk rammer.
 *
 * Delt mellem alle skrivende tjenester - ikke kun dem, der bruger ETag - saa
 * en 403 giver samme laesbare besked, uanset om det er et statusskift eller
 * en note, der blev afvist.
 *
 * @param fejl Den fangede fejl, typisk en HttpRequestError fra PnPjs.
 * @param beskrivelse Hvad brugeren forsoegte, i infinitiv: "tage sagen".
 *                    Indgaar i fejlbeskeden ved manglende rettigheder.
 */
export function oversaetFejl(fejl: unknown, beskrivelse: string): Error {
  const kode = statuskode(fejl);

  if (kode === 412) {
    return new SamtidighedsFejl(
      'Sagen blev ændret af en anden, mens du arbejdede. Genindlæs og prøv igen.'
    );
  }
  if (kode === 403) {
    return new AdgangsFejl(`Du har ikke rettigheder til at ${beskrivelse}.`);
  }

  // Alt andet - typisk en HttpRequestError fra PnPjs - rendres direkte i en
  // MessageBar af de kaldende paneler. Den fulde fejl indeholder request-URL,
  // svarteksten og SharePoints korrelations-id, som ikke skal vises for en
  // bruger der måske deler skærm. Beskeden erstattes, men originalen følger
  // med som `cause`, saa den stadig kan ses i konsollen ved fejlsoegning.
  return new Error(
    `Der opstod en fejl, da du forsøgte at ${beskrivelse}. Prøv igen, eller kontakt IT-support hvis problemet fortsætter.`,
    { cause: fejl }
  );
}

/**
 * Koerer en skrivning og oversaetter de to fejl, brugere faktisk rammer.
 *
 * @param skriv Selve skrivningen, med ETag sat af kalderen.
 * @param beskrivelse Hvad brugeren forsoegte, i infinitiv: "tage sagen".
 *                    Indgaar i fejlbeskeden ved manglende rettigheder.
 */
export async function skrivMedEtag<T>(
  skriv: () => Promise<T>,
  beskrivelse: string
): Promise<T> {
  try {
    return await skriv();
  } catch (fejl) {
    throw oversaetFejl(fejl, beskrivelse);
  }
}
