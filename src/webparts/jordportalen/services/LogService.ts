import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { Handling, ILogPost, LIST_NAMES } from '../domaene/typer';

const FELTER = 'Id,Title,SagId,Handling,FraStatus,TilStatus,Kommentar,Created';
const UDVID = 'Author,TaggedeBrugere';
const UDVID_FELTER = 'Author/Id,Author/Title,Author/EMail,TaggedeBrugere/Id,TaggedeBrugere/Title,TaggedeBrugere/EMail';

export interface INyLogPost {
  sagId: number;
  handling: Handling;
  titel: string;
  fraStatus?: string;
  tilStatus?: string;
  kommentar?: string;
  /** SharePoint-bruger-id'er. Udloeser Power Automate-notifikationen. */
  taggedeBrugerIds?: number[];
}

/** Sagens faelles historik: statusskift, kommentarer og handlinger i én liste. */
export class LogService {
  public constructor(private readonly sp: SPFI) {}

  public async hentForSag(sagId: number): Promise<ILogPost[]> {
    const liste = this.sp.web.lists.getByTitle(LIST_NAMES.LOG);

    const resultat = await hentAlleSider<ILogPost>(
      liste.items
        .select(FELTER, UDVID_FELTER)
        .expand(UDVID)
        .filter(sagIdFilter(sagId))
        .orderBy('Created', false)
        .top(100)
    );

    return resultat.elementer;
  }

  /**
   * Tilfoejer en logpost.
   *
   * Kastes en fejl her, maa kalderen IKKE rulle sin egen handling tilbage - et
   * statusskift der lykkedes, skal staa, selvom historikken mangler en linje.
   * Kalderen fanger fejlen og viser den i historik-panelet.
   */
  public async tilfoej(post: INyLogPost): Promise<void> {
    const vaerdier: Record<string, unknown> = {
      Title: post.titel,
      SagId: post.sagId,
      Handling: post.handling,
    };

    if (post.fraStatus) { vaerdier.FraStatus = post.fraStatus; }
    if (post.tilStatus) { vaerdier.TilStatus = post.tilStatus; }
    if (post.kommentar) { vaerdier.Kommentar = post.kommentar; }
    if (post.taggedeBrugerIds && post.taggedeBrugerIds.length > 0) {
      vaerdier.TaggedeBrugereId = { results: post.taggedeBrugerIds };
    }

    await this.sp.web.lists.getByTitle(LIST_NAMES.LOG).items.add(vaerdier);
  }
}
