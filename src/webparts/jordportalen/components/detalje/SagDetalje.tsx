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
import { StatusPanel } from './StatusPanel';
import { KommentarPanel } from './KommentarPanel';
import { NoterPanel } from './NoterPanel';
import { OpgavePanel } from './OpgavePanel';
import { DokumentPanel } from './DokumentPanel';
import { LinkPanel } from './LinkPanel';
import { HistorikPanel } from './HistorikPanel';

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

  // Holder styr paa om komponenten (eller sagId'en) er skiftet ud, saa et svar
  // fra en foraeldet hentning eller handling ikke skriver til en tilstand,
  // der ikke laengere hoerer til denne sag / dette mount. Nulstilles naar
  // sagId aendrer sig, og saettes i oprydningen for indlaesningseffekten.
  const foraeldet = React.useRef(false);

  React.useEffect(() => {
    foraeldet.current = false;
    return () => {
      foraeldet.current = true;
    };
  }, [sagId]);

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

    // Profilopslaget er en bekvemmelighed, ikke et krav - en sag skal kunne
    // aabnes, selv om den ansvarliges profil ikke kan slaas op (fx en bruger
    // der er fjernet fra sitet). AnsvarligKort haandterer allerede en
    // manglende profil.
    const ansvarligProfil = sag.AnsvarligId
      ? await tjenester.profil.hentProfil(sag.AnsvarligId).catch(() => undefined)
      : undefined;

    if (foraeldet.current) { return; }
    setData({
      sag, adresser, kontakter, bilag, logposter, noter, opgaver, links, dokumenter, ansvarligProfil,
    });
  }, [sagId, tjenester, brugerId]);

  React.useEffect(() => {
    hentAlt().catch((e: Error) => {
      if (!foraeldet.current) { setFejl(e.message); }
    });
  }, [hentAlt]);

  /**
   * Opdaterer kun ét datasaet efter en handling.
   *
   * En ny kommentar skal ikke faa adresser, kontakter og dokumenter til at
   * blinke. Panelerne kalder denne med netop det, de aendrede.
   */
  const opdater = React.useCallback(
    async (hvad: keyof ISagData): Promise<void> => {
      switch (hvad) {
        case 'logposter': {
          const logposter = await tjenester.log.hentForSag(sagId);
          if (foraeldet.current) { return; }
          setData((d) => (d ? { ...d, logposter } : d));
          break;
        }
        case 'noter': {
          const noter = await tjenester.note.hentMine(sagId, brugerId);
          if (foraeldet.current) { return; }
          setData((d) => (d ? { ...d, noter } : d));
          break;
        }
        case 'opgaver': {
          const opgaver = await tjenester.opgave.hentForSag(sagId);
          if (foraeldet.current) { return; }
          setData((d) => (d ? { ...d, opgaver } : d));
          break;
        }
        case 'links': {
          const links = await tjenester.link.hentForSag(sagId);
          if (foraeldet.current) { return; }
          setData((d) => (d ? { ...d, links } : d));
          break;
        }
        case 'dokumenter': {
          const dokumenter = await tjenester.dokument.hentForSag(sagId);
          if (foraeldet.current) { return; }
          setData((d) => (d ? { ...d, dokumenter } : d));
          break;
        }
        default:
          // Status og ansvarlig aendrer sagen selv, og ETag'en skal fornyes.
          await hentAlt();
      }
    },
    [sagId, brugerId, tjenester, hentAlt]
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
            onTag={() => tjenester.sag.tagSag(data.sag, brugerId)}
            onFrigiv={() => tjenester.sag.frigivSag(data.sag)}
            onOpdateret={hentAlt}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
            <StatusPanel
              sag={data.sag}
              sagService={tjenester.sag}
              brugerId={brugerId}
              onOpdateret={hentAlt}
            />
            <KommentarPanel
              sagId={sagId}
              logposter={data.logposter}
              logService={tjenester.log}
              profil={tjenester.profil}
              onOpdateret={() => opdater('logposter')}
            />
            <NoterPanel
              sagId={sagId}
              noter={data.noter}
              noteService={tjenester.note}
              onOpdateret={() => opdater('noter')}
            />
            <OpgavePanel
              sagId={sagId}
              opgaver={data.opgaver}
              opgaveService={tjenester.opgave}
              onOpdateret={() => opdater('opgaver')}
              onHistorikOpdateret={() => opdater('logposter')}
            />
            <DokumentPanel
              sagId={sagId}
              dokumenter={data.dokumenter}
              dokumentService={tjenester.dokument}
              onOpdateret={() => opdater('dokumenter')}
              onHistorikOpdateret={() => opdater('logposter')}
            />
            <LinkPanel
              sagId={sagId}
              links={data.links}
              linkService={tjenester.link}
              onOpdateret={() => opdater('links')}
              onHistorikOpdateret={() => opdater('logposter')}
            />
            <HistorikPanel logposter={data.logposter} />
          </div>
        </div>
      </div>
    </div>
  );
};
