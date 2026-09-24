import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
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
    await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.add({
      Title: etiket,
      SagId: sagId,
      Url: { Url: url, Description: etiket },
    });

    await this.log.tilfoej({
      sagId,
      handling: 'Link tilføjet',
      titel: etiket,
    });
  }

  public async slet(linkId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.LINKS).items.getById(linkId).delete();
  }
}
