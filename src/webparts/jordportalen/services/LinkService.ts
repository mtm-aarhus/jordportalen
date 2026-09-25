import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { oversaetFejl } from '../domaene/samtidighed';
import { sikkerUrl } from '../domaene/sikkerhed';
import { ILink, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/** Henvisninger fra en sag til andre systemer, typisk GO-sagen. */
export class LinkService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public async hentForSag(sagId: number): Promise<ILink[]> {
    const r = await hentAlleSider<ILink>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.LINKS)
        .items.select('Id,Title,SagId,Url')
        .filter(sagIdFilter(sagId))
        .orderBy('Created', true)
        .top(100)
    );
    return r.elementer;
  }

  public async tilfoej(sagId: number, etiket: string, url: string): Promise<void> {
    // Samme tjek som render-siderne bruger til at afvise et javascript:-link -
    // her afvises det foer det overhovedet naar listen, saa det ikke ligger og
    // venter paa en anden sagsbehandlers klik.
    const sikker = sikkerUrl(url);
    if (!sikker) {
      throw new Error('Linket skal starte med http:// eller https://.');
    }

    try {
      await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.add({
        Title: etiket,
        SagId: sagId,
        Url: { Url: sikker, Description: etiket },
      });
    } catch (fejl) {
      throw oversaetFejl(fejl, 'tilføje linket');
    }

    await this.log.tilfoej({
      sagId,
      handling: 'Link tilføjet',
      titel: etiket,
    });
  }

  public async slet(linkId: number): Promise<void> {
    try {
      await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.getById(linkId).delete();
    } catch (fejl) {
      throw oversaetFejl(fejl, 'slette linket');
    }
  }
}
