import { SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/site-users';
import '@pnp/sp/profiles';

import { IPerson, IProfil } from '../domaene/typer';

/**
 * Profildata til AnsvarligKort og brugersoegning.
 *
 * Bevidst UDEN Microsoft Graph. Graph kraever API-tilladelser godkendt af en
 * administrator, og det er samme mur, PnP PowerShell allerede er loebet ind i i
 * denne tenant. Alt herunder virker med almindelig SharePoint-adgang.
 *
 * Profiler caches for sessionen: en oversigt med tyve sager af samme ansvarlige
 * skal ikke lave tyve opslag.
 */
export class ProfilService {
  private readonly cache = new Map<number, Promise<IProfil>>();

  public constructor(private readonly sp: SPFI) {}

  public async nuvaerendeBrugerId(): Promise<number> {
    const bruger = await this.sp.web.currentUser();
    return bruger.Id;
  }

  public hentProfil(brugerId: number): Promise<IProfil> {
    const cachet = this.cache.get(brugerId);
    if (cachet) {
      return cachet;
    }

    const opslag = this.hentUdenCache(brugerId);
    this.cache.set(brugerId, opslag);
    return opslag;
  }

  private async hentUdenCache(brugerId: number): Promise<IProfil> {
    const bruger = await this.sp.web.siteUsers.getById(brugerId)();
    const mail = bruger.Email || undefined;

    const profil: IProfil = {
      Id: brugerId,
      Navn: bruger.Title,
      Mail: mail,
      BilledeUrl: mail
        ? `/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(mail)}`
        : '',
    };

    // Jobtitel og afdeling er en bekvemmelighed, ikke et krav. Er
    // brugerprofiltjenesten ikke tilgaengelig, vises kortet med navn og billede
    // alene frem for at fejle.
    if (mail) {
      try {
        const egenskaber = await this.sp.profiles.getPropertiesFor(`i:0#.f|membership|${mail}`);
        profil.JobTitel = laesEgenskab(egenskaber, 'Title');
        profil.Afdeling = laesEgenskab(egenskaber, 'Department');
      } catch {
        // Ingen profiltjeneste. Kortet klarer sig uden.
      }
    }

    return profil;
  }

  public async soegBrugere(tekst: string): Promise<IPerson[]> {
    if (tekst.trim().length < 3) {
      return [];
    }

    const brugere = await this.sp.web.siteUsers
      .filter(`substringof('${tekst.replace(/'/g, "''")}', Title)`)
      .top(20)();

    return brugere
      .filter((b) => b.PrincipalType === 1 && b.Email)
      .map((b) => ({ Id: b.Id, Title: b.Title, EMail: b.Email }));
  }
}

function laesEgenskab(
  egenskaber: { UserProfileProperties?: { Key: string; Value: string }[] },
  noegle: string
): string | undefined {
  const fundet = (egenskaber.UserProfileProperties || []).filter((p) => p.Key === noegle)[0];
  return fundet && fundet.Value ? fundet.Value : undefined;
}
