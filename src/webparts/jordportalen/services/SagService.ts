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

    let forespoergsel = liste.items
      .select(OVERSIGT_FELTER, ANSVARLIG_UDVID)
      .expand('Ansvarlig')
      .orderBy('ModtagetDato', false)
      .top(100);

    if (odata) {
      forespoergsel = forespoergsel.filter(odata);
    }

    return hentAlleSider<ISag>(forespoergsel);
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
  // ovenfor med denne variant, der beder eksplicit om minimalmetadata.
  //
  // Bemaerk: `on.pre`s parametre skal have eksplicitte typer (`url: string`,
  // `init: RequestInit`, `result: unknown`) - ellers fejler kompileringen
  // paa implicit any (`noImplicitAny`), da PnPjs' egen typeinferens ikke
  // naar ind i callbacken her. Verificeret ved en proeve-kompilering.
  //
  // public async hentSag(id: number): Promise<ISag> {
  //   const item = this.sp.web.lists.getByTitle(LIST_NAMES.SAGER).items.getById(id);
  //
  //   // Beder eksplicit om metadata, da PnPjs ellers stripper ETag'en bort.
  //   const svar = await item
  //     .select(SAG_FELTER, ANSVARLIG_UDVID)
  //     .expand('Ansvarlig')
  //     .using((instance) => {
  //       instance.on.pre(async (url: string, init: RequestInit, result: unknown) => {
  //         init.headers = {
  //           ...(init.headers as Record<string, string> | undefined),
  //           Accept: 'application/json;odata=minimalmetadata',
  //         };
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
    const r = await hentAlleSider<IAdresse>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.ADRESSER)
        .items.select('Id,Title,Adresse,Matrikel,LokalitetsNummer')
        .filter(uuidFilter(uuid))
        .top(100)
    );
    return r.elementer;
  }

  public async hentKontakter(uuid: string): Promise<IKontakt[]> {
    const r = await hentAlleSider<IKontakt>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.KONTAKTER)
        .items.select('Id,Title,KontaktType,ErUdfylder,Navn,Firma,CVR,Email,Telefon,Adresse')
        .filter(uuidFilter(uuid))
        .top(100)
    );
    return r.elementer;
  }

  public async hentBilag(uuid: string): Promise<IBilag[]> {
    const r = await hentAlleSider<IBilag>(
      this.sp.web.lists
        .getByTitle(LIST_NAMES.BILAG)
        .items.select('Id,Title,FilId,Filnavn,FilUrl')
        .filter(uuidFilter(uuid))
        .top(100)
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
   * Kraever en ETag foer en skrivning.
   *
   * Kun `hentSag()` saetter `etag` - `hentAlleSager()` goer det bevidst ikke,
   * for dashboardets oversigtsfelter er ikke nok til en sikker skrivning.
   * PnPjs' `update()` bruger "*" som IF-Match naar `eTag` er `undefined`, saa
   * en manglende ETag fejler IKKE i sig selv - den slaar bare
   * samtidighedstjekket fra uden en lyd. Det er praecis den tavse fejl,
   * ETag-beskyttelsen findes for at forhindre, saa her fejles der hoejt i
   * stedet for at stole paa at enhver fremtidig laesevej husker at hente den.
   */
  private kraevEtag(sag: ISag): string {
    if (!sag.etag) {
      throw new Error(
        `Sagen mangler en ETag. Hent sagen med hentSag(${sag.Id}) foer den aendres.`
      );
    }
    return sag.etag;
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
    const etag = this.kraevEtag(sag);

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ Status: nyStatus, AfventerAarsag: aarsag ?? null }, etag),
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
    const etag = this.kraevEtag(sag);

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: brugerId }, etag),
      'tage sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag taget',
      titel: 'Sagen blev taget',
    });
  }

  public async frigivSag(sag: ISag): Promise<string | undefined> {
    const etag = this.kraevEtag(sag);

    await skrivMedEtag(
      () =>
        this.sp.web.lists
          .getByTitle(LIST_NAMES.SAGER)
          .items.getById(sag.Id)
          .update({ AnsvarligId: null }, etag),
      'frigive sagen'
    );

    return this.logUdenAtBlokere({
      sagId: sag.Id,
      handling: 'Sag frigivet',
      titel: 'Sagen blev frigivet',
    });
  }
}
