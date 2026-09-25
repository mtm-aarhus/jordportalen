import * as React from 'react';
import { Button, MessageBar, Spinner, tokens } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { LogService } from '../../services/LogService';
import { NoteService } from '../../services/NoteService';
import { OpgaveService } from '../../services/OpgaveService';
import { LinkService } from '../../services/LinkService';
import { DokumentService } from '../../services/DokumentService';
import { ProfilService } from '../../services/ProfilService';
import {
  IAdresse,
  IBilag,
  IDokument,
  IKontakt,
  ILink,
  ILogPost,
  INote,
  IOpgave,
  IProfil,
  ISag,
} from '../../domaene/typer';
import { Metadata } from './Metadata';
import { AnsvarligKort } from './AnsvarligKort';

export interface ITjenester {
  sag: SagService;
  log: LogService;
  note: NoteService;
  opgave: OpgaveService;
  link: LinkService;
  dokument: DokumentService;
  profil: ProfilService;
}

export interface ISagData {
  sag: ISag;
  adresser: IAdresse[];
  kontakter: IKontakt[];
  bilag: IBilag[];
  logposter: ILogPost[];
  noter: INote[];
  opgaver: IOpgave[];
  links: ILink[];
  dokumenter: IDokument[];
  ansvarligProfil?: IProfil;
}

export interface ISagDetaljeProps {
  sagId: number;
  tjenester: ITjenester;
  brugerId: number;
  onTilbage: () => void;
}

export const SagDetalje: React.FunctionComponent<ISagDetaljeProps> = ({
  sagId,
  tjenester,
  brugerId,
  onTilbage,
}) => {
  const [data, setData] = React.useState<ISagData | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  /** Henter sagen og alle dens datasaet parallelt. */
  const hentAlt = React.useCallback(async (): Promise<void> => {
    const sag = await tjenester.sag.hentSag(sagId);

    const [adresser, kontakter, bilag, logposter, noter, opgaver, links, dokumenter] =
      await Promise.all([
        tjenester.sag.hentAdresser(sag.SubmissionUUID),
        tjenester.sag.hentKontakter(sag.SubmissionUUID),
        tjenester.sag.hentBilag(sag.SubmissionUUID),
        tjenester.log.hentForSag(sagId),
        tjenester.note.hentMine(sagId, brugerId),
        tjenester.opgave.hentForSag(sagId),
        tjenester.link.hentForSag(sagId),
        tjenester.dokument.hentForSag(sagId),
      ]);

    const ansvarligProfil = sag.AnsvarligId
      ? await tjenester.profil.hentProfil(sag.AnsvarligId)
      : undefined;

    setData({
      sag, adresser, kontakter, bilag, logposter, noter, opgaver, links, dokumenter, ansvarligProfil,
    });
  }, [sagId, tjenester, brugerId]);

  React.useEffect(() => {
    hentAlt().catch((e: Error) => setFejl(e.message));
  }, [hentAlt]);

  /**
   * Opdaterer kun ét datasaet efter en handling.
   *
   * En ny kommentar skal ikke faa adresser, kontakter og dokumenter til at
   * blinke. Panelerne kalder denne med netop det, de aendrede.
   */
  const opdater = React.useCallback(
    async (hvad: keyof ISagData): Promise<void> => {
      if (!data) { return; }

      switch (hvad) {
        case 'logposter':
          setData({ ...data, logposter: await tjenester.log.hentForSag(sagId) });
          break;
        case 'noter':
          setData({ ...data, noter: await tjenester.note.hentMine(sagId, brugerId) });
          break;
        case 'opgaver':
          setData({ ...data, opgaver: await tjenester.opgave.hentForSag(sagId) });
          break;
        case 'links':
          setData({ ...data, links: await tjenester.link.hentForSag(sagId) });
          break;
        case 'dokumenter':
          setData({ ...data, dokumenter: await tjenester.dokument.hentForSag(sagId) });
          break;
        default:
          // Status og ansvarlig aendrer sagen selv, og ETag'en skal fornyes.
          await hentAlt();
      }
    },
    [data, sagId, brugerId, tjenester, hentAlt]
  );

  if (fejl) {
    return (
      <div>
        <Button onClick={onTilbage}>Tilbage</Button>
        <MessageBar intent="error">{fejl}</MessageBar>
      </div>
    );
  }

  if (!data) {
    return <Spinner label="Henter sag..." />;
  }

  return (
    <div>
      <Button onClick={onTilbage} style={{ marginBottom: tokens.spacingVerticalM }}>
        Tilbage til oversigten
      </Button>

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', minWidth: '320px' }}>
          <AnsvarligKort
            sag={data.sag}
            profil={data.ansvarligProfil}
            brugerId={brugerId}
            onTag={async () => {
              await tjenester.sag.tagSag(data.sag, brugerId);
              await hentAlt();
            }}
            onFrigiv={async () => {
              await tjenester.sag.frigivSag(data.sag);
              await hentAlt();
            }}
          />
          <div style={{ height: tokens.spacingVerticalM }} />
          <Metadata
            sag={data.sag}
            adresser={data.adresser}
            kontakter={data.kontakter}
            bilag={data.bilag}
          />
        </div>

        <div style={{ flex: '1 1 420px', minWidth: '320px' }}>
          {/* De syv paneler indsaettes i Task 17 og 18. */}
          <p>Paneler kommer her. Opdateringsfunktion klar: {typeof opdater}</p>
        </div>
      </div>
    </div>
  );
};
