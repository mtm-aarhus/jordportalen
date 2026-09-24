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
    const kode = statuskode(fejl);

    if (kode === 412) {
      throw new SamtidighedsFejl(
        'Sagen blev ændret af en anden, mens du arbejdede. Genindlæs og prøv igen.'
      );
    }
    if (kode === 403) {
      throw new AdgangsFejl(`Du har ikke rettigheder til at ${beskrivelse}.`);
    }
    throw fejl;
  }
}
