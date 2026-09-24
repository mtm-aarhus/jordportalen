import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { IOpgave, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/** Underopgaver paa en sag. Bevidst uden ansvarlig og frist - sagen har allerede én ansvarlig. */
export class OpgaveService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public async hentForSag(sagId: number): Promise<IOpgave[]> {
    const r = await hentAlleSider<IOpgave>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.OPGAVER)
        .items.select('Id,Title,SagId,Udfoert,Created')
        .filter(sagIdFilter(sagId))
        .orderBy('Created', true)
        .top(100)
    );
    return r.elementer;
  }

  public async opret(sagId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.OPGAVER).items.add({
      Title: tekst,
      SagId: sagId,
      Udfoert: false,
    });

    await this.log.tilfoej({
      sagId,
      handling: 'Opgave oprettet',
      titel: tekst,
    });
  }

  public async saetUdfoert(opgave: IOpgave, udfoert: boolean): Promise<void> {
    await this.sp.web.lists
      .getByTitle(LIST_NAMES.OPGAVER)
      .items.getById(opgave.Id)
      .update({ Udfoert: udfoert });

    // Kun afkrydsning logges. En fortrydelse er ikke en begivenhed, der er
    // vaerd at fylde historikken med.
    if (udfoert) {
      await this.log.tilfoej({
        sagId: opgave.SagId,
        handling: 'Opgave udført',
        titel: opgave.Title,
      });
    }
  }

  public async slet(opgaveId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.OPGAVER).items.getById(opgaveId).delete();
  }
}
