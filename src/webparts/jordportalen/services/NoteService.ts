import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { noteFilter } from '../domaene/forespoergsler';
import { INote, LIST_NAMES } from '../domaene/typer';

/**
 * Sagsbehandlerens egne arbejdsnoter.
 *
 * Filtret paa forfatter ligger i selve forespoergslen, ikke kun i UI'et. Det
 * betyder, at en ny ansvarlig ikke ser den forriges noter - i modsaetning til
 * Opgaveportalen, hvor getNoter kun filtrerer paa opgave-id.
 *
 * Noterne er ikke teknisk private: listen har ingen tilladelser pr. element, saa
 * en administrator kan laese dem. Graensefladen skal derfor sige "Vises kun for
 * dig", ikke "Privat".
 */
export class NoteService {
  public constructor(private readonly sp: SPFI) {}

  public async hentMine(sagId: number, brugerId: number): Promise<INote[]> {
    const r = await hentAlleSider<INote>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.NOTER)
        // Author SKAL udvides. Filtret indeholder 'Author/Id eq N', og uden
        // expand afviser SharePoint forespoergslen med 400 - hvorved hele
        // forfatterbeskyttelsen fejler i stedet for at filtrere.
        .items.select('Id,SagId,Tekst,Created,Modified', 'Author/Id')
        .expand('Author')
        .filter(noteFilter(sagId, brugerId))
        .orderBy('Created', false)
        .top(100)
    );
    return r.elementer;
  }

  public async tilfoej(sagId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.add({
      Title: `Note – sag ${sagId}`,
      SagId: sagId,
      Tekst: tekst,
    });
  }

  public async opdater(noteId: number, tekst: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.getById(noteId).update({ Tekst: tekst });
  }

  public async slet(noteId: number): Promise<void> {
    await this.sp.web.lists.getByTitle(LIST_NAMES.NOTER).items.getById(noteId).delete();
  }
}
