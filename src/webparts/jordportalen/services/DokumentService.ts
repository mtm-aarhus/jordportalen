import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/files';
import '@pnp/sp/folders';

import { hentAlleSider } from '../domaene/paginering';
import { sagIdFilter } from '../domaene/forespoergsler';
import { oversaetFejl } from '../domaene/samtidighed';
import { IDokument, LIST_NAMES } from '../domaene/typer';
import { LogService } from './LogService';

/**
 * Sagsbehandlerens egne dokumenter. Ikke borgerens bilag fra OS2Forms - de
 * ligger i P8Vedhaeftninger og er laese-kun.
 *
 * Filerne lægges i en mappe pr. sag. Mapperne oprettes efter behov, foerste gang
 * der uploades til en sag: de kan ikke laves paa forhaand, da sag-id'et foerst
 * findes naar robotten har oprettet ansoegningen.
 *
 * SagId-kolonnen ligger ved siden af mappestrukturen, saa en sags filer kan
 * hentes med én forespoergsel uden at traversere mapper.
 */
export class DokumentService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  public mappeNavn(sagId: number): string {
    return `sag-${sagId}`;
  }

  public async hentForSag(sagId: number): Promise<IDokument[]> {
    const raa = await hentAlleSider<{
      Id: number;
      SagId: number;
      Modified: string;
      FileLeafRef: string;
      FileRef: string;
    }>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.DOKUMENTER)
        .items.select('Id,SagId,Modified,FileLeafRef,FileRef')
        .filter(sagIdFilter(sagId))
        .orderBy('Modified', false)
        .top(100)
    );

    return raa.elementer.map((f) => ({
      Id: f.Id,
      Filnavn: f.FileLeafRef,
      ServerRelativeUrl: f.FileRef,
      SagId: f.SagId,
      Modified: f.Modified,
    }));
  }

  public async upload(sagId: number, fil: File): Promise<void> {
    const bibliotek = this.sp.web.lists.getByTitle(LIST_NAMES.DOKUMENTER);
    const rod = await bibliotek.rootFolder();
    const mappe = `${rod.ServerRelativeUrl}/${this.mappeNavn(sagId)}`;

    // Opret mappen hvis den mangler. addUsingPath fejler hvis mappen allerede
    // findes, saa fejlen sluges bevidst - vi vil kun sikre at den er der.
    try {
      await this.sp.web.folders.addUsingPath(mappe);
    } catch {
      // Mappen fandtes allerede.
    }

    let uploadet;
    try {
      uploadet = await this.sp.web
        .getFolderByServerRelativePath(mappe)
        .files.addUsingPath(fil.name, fil, { Overwrite: false });

      // SagId saettes paa selve list-elementet, saa filen kan findes uden at
      // traversere mapper.
      const element = await this.sp.web.getFileByServerRelativePath(uploadet.ServerRelativeUrl).getItem();
      await element.update({ SagId: sagId });
    } catch (fejl) {
      throw oversaetFejl(fejl, 'uploade dokumentet');
    }

    await this.log.tilfoej({
      sagId,
      handling: 'Dokument uploadet',
      titel: fil.name,
    });
  }

  public async slet(serverRelativUrl: string): Promise<void> {
    try {
      await this.sp.web.getFileByServerRelativePath(serverRelativUrl).recycle();
    } catch (fejl) {
      throw oversaetFejl(fejl, 'slette dokumentet');
    }
  }
}
