import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

import { hentAlleSider, ISideResultat } from '../domaene/paginering';
import { dashboardFilter, IDashboardFilter, uuidFilter } from '../domaene/forespoergsler';
import { AfventerAarsag, IAdresse, IBilag, IKontakt, ISag, LIST_NAMES, SagStatus } from '../domaene/typer';
import { validerStatusskift } from '../domaene/statusregler';
import { skrivMedEtag } from '../domaene/samtidighed';
import { INyLogPost, LogService } from './LogService';

/** Kun de felter dashboardet viser. Detaljerne hentes foerst naar en sag aabnes. */
const OVERSIGT_FELTER =
  'Id,Title,SubmissionSerial,Status,AfventerAarsag,ModtagetDato,AdresserTekst,AnsvarligId';

const SAG_FELTER =
  'Id,Title,SubmissionUUID,SubmissionSerial,SubmissionSid,OS2FormsUrl,Udfylder,IndsendtAf,' +
  'AnsogningsDato,Bemaerkninger,ModtagetDato,AfsluttetDato,FlereGrundejere,' +
  'BygherreSammeSomGrundejer,Status,AfventerAarsag,AnsvarligId,AntalAdresser,' +
  'AntalKontakter,AntalVedhaeftninger,AdresserTekst,Grundejere';

const ANSVARLIG_UDVID = 'Ansvarlig/Id,Ansvarlig/Title,Ansvarlig/EMail';

export class SagService {
  public constructor(
    private readonly sp: SPFI,
    private readonly log: LogService
  ) {}

  /**
   * Henter sager til dashboardet.
   *
   * Filtret ligger server-side, saa sikkerhedsgraensen bruges paa relevante
   * raekker. Returvaerdien siger om resultatet blev afkortet - graensefladen
   * SKAL vise det, ellers forsvinder sager tavst.
   */
  public async hentAlleSager(filter: IDashboardFilter = {}): Promise<ISideResultat<ISag>> {
    const liste = this.sp.web.lists.getByTitle(LIST_NAMES.SAGER);
    const odata = dashboardFilter(filter);

    return hentAlleSider<ISag>(async (skip, antal) => {
      let forespoergsel = liste.items
        .select(OVERSIGT_FELTER, ANSVARLIG_UDVID)
        .expand('Ansvarlig')
        .orderBy('ModtagetDato', false)
        .skip(skip)
        .top(antal);

      if (odata) {
        forespoergsel = forespoergsel.filter(odata);
      }
      return forespoergsel();
    });
  }

  /**
   * Henter én sag med ETag.
   *
   * ETag'en foelger med, saa en senere skrivning kan opdage at en anden har
   * aendret sagen i mellemtiden. Uden den ville to samtidige "Tag sagen" begge
   * lykkes, og den foerste ville tro han havde sagen.
   */
  public async hentSag(id: number): Promise<ISag> {
    const svar = await this.sp.web.lists
      .getByTitle(LIST_NAMES.SAGER)
      .items.getById(id)
      .select(SAG_FELTER, ANSVARLIG_UDVID)
      .expand('Ansvarlig')();

    return { ...svar, etag: (svar as { __metadata?: { etag?: string } }).__metadata?.etag };
  }

  // ETag'en SKAL verificeres i browserkonsollen, foer denne kode gaar i drift
  // (se overdragelsestjeklisten). PnPjs v4 sender som standard headeren
  // `odata=nometadata`, og saa findes `__metadata` slet ikke i svaret ovenfor.
  // Logger konsollen `ETAG: undefined`, springer `update()` samtidighedstjekket
  // over UDEN at fejle - og saa er ETag-beskyttelsen i Task 10 stille slaaet
  // fra, uden at noget afsloerer det. Er det tilfaeldet, erstat `hentSag`
  // ovenfor med denne variant, der beder eksplicit om minimalmetadata:
  //
  // public async hentSag(id: number): Promise<ISag> {
  //   const item = this.sp.web.lists.getByTitle(LIST_NAMES.SAGER).items.getById(id);
  //
  //   // Beder eksplicit om metadata, da PnPjs ellers stripper ETag'en bort.
  //   const svar = await item
  //     .select(SAG_FELTER, ANSVARLIG_UDVID)
  //     .expand('Ansvarlig')
  //     .using((instance) => {
  //       instance.on.pre(async (url, init, result) => {
  //         init.headers = { ...init.headers, Accept: 'application/json;odata=minimalmetadata' };
  //         return [url, init, result];
  //       });
  //       return instance;
  //     })();
  //
  //   const etag =
  //     (svar as { 'odata.etag'?: string })['odata.etag'] ??
  //     (svar as { __metadata?: { etag?: string } }).__metadata?.etag;
  //
  //   return { ...svar, etag };
  // }

  public async hentAdresser(uuid: string): Promise<IAdresse[]> {
    const r = await hentAlleSider<IAdresse>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.ADRESSER)
        .items.select('Id,Title,Adresse,Matrikel,LokalitetsNummer')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async hentKontakter(uuid: string): Promise<IKontakt[]> {
    const r = await hentAlleSider<IKontakt>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.KONTAKTER)
        .items.select('Id,Title,KontaktType,ErUdfylder,Navn,Firma,CVR,Email,Telefon,Adresse')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  public async hentBilag(uuid: string): Promise<IBilag[]> {
    const r = await hentAlleSider<IBilag>(async (skip, antal) =>
      this.sp.web.lists
        .getByTitle(LIST_NAMES.BILAG)
        .items.select('Id,Title,FilId,Filnavn,FilUrl')
        .filter(uuidFilter(uuid))
        .skip(skip)
        .top(antal)()
    );
    return r.elementer;
  }

  /**
   * Skriver en logpost uden at lade en fejl vaelte selve handlingen.
   *
   * Specifikationen er klar: en fejlet logskrivning maa aldrig rulle et
   * statusskift tilbage. Men den maa heller ikke se ud som om handlingen
   * mislykkedes - saa ville brugeren proeve igen og skifte status to gange.
   *
   * Derfor returneres en advarsel i stedet for at kaste. Kalderen viser den som
   * en advarsel ved siden af den gennemfoerte handling, ikke som en fejl.
   */
  private async logUdenAtBlokere(post: INyLogPost): Promise<string | undefined> {
    try {
      await this.log.tilfoej(post);
      return undefined;
    } catch (e) {
      // Konsollen beholder den fulde fejl; brugeren faar det korte.
      console.warn('Logposten kunne ikke skrives', e);
      return 'Handlingen blev gennemført, men den kunne ikke skrives i historikken.';
    }
  }

  /**
   * Skifter status og skriver en logpost.
   *
   * Valideringen sker foer skrivningen, saa en ulovlig kombination aldrig naar
   * SharePoint.
   *
   * @returns En advarsel hvis logningen fejlede. Statussen er skiftet uanset.
   */
  public async skiftStatus(
    sag: ISag,
    nyStatus: SagStatus,
    aarsag?: AfventerAarsag,
    kommentar?: string
  ): Promise<string | undefined> {
    const fejl = validerStatusskift(sag.Status, nyStatus, aarsag);
    if (fejl) {
      throw new Error(fejl);
    }

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ Status: nyStatus, AfventerAarsag: aarsag ?? null }, sag.etag),
      'skifte status'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Statusskift',
      titel: `${sag.Status} → ${nyStatus}`,
      fraStatus: sag.Status,
      tilStatus: nyStatus,
      kommentar,
    });
  }

  /**
   * Tager sagen.
   *
   * ETag'en er det eneste, der forhindrer to sagsbehandlere i begge at tro, de
   * har sagen. Uden den vinder den sidste skrivning tavst.
   */
  public async tagSag(sag: ISag, brugerId: number): Promise<string | undefined> {
    if (sag.AnsvarligId) {
      throw new Error('Sagen er allerede taget.');
    }

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: brugerId }, sag.etag),
      'tage sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag taget',
      titel: 'Sagen blev taget',
    });
  }

  public async frigivSag(sag: ISag): Promise<string | undefined> {
    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: null }, sag.etag),
      'frigive sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag frigivet',
      titel: 'Sagen blev frigivet',
    });
  }
}
