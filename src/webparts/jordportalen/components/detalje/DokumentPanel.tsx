import * as React from 'react';
import { Button, Link, MessageBar } from '@fluentui/react-components';
import { IDokument } from '../../domaene/typer';
import { DokumentService } from '../../services/DokumentService';
import { Liste, ListeRaekke, MetaTekst, Panel } from '../faelles/Panel';

export interface IDokumentPanelProps {
  sagId: number;
  dokumenter: IDokument[];
  dokumentService: DokumentService;
  onOpdateret: () => Promise<void>;
  /** Kaldes ud over onOpdateret, naar handlingen ogsaa har skrevet en logpost. */
  onHistorikOpdateret: () => Promise<void>;
}

export const DokumentPanel: React.FunctionComponent<IDokumentPanelProps> = ({
  sagId,
  dokumenter,
  dokumentService,
  onOpdateret,
  onHistorikOpdateret,
}) => {
  const filInput = React.useRef<HTMLInputElement>(null);
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  /**
   * Koerer en skrivehandling og opdaterer derefter listen (og historikken,
   * hvis handlingen ogsaa logger). Fejler skrivningen er det en fejl -
   * handlingen skete ikke. Fejler kun den efterfoelgende genindlaesning, er
   * handlingen alligevel gennemfoert, og det vises som en advarsel, ikke en
   * fejl, som ville faa brugeren til at proeve igen.
   */
  const koer = async (handling: () => Promise<void>, medHistorik = false): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    setAdvarsel(undefined);
    try {
      await handling();
    } catch (e) {
      setFejl((e as Error).message);
      setArbejder(false);
      return;
    }
    try {
      await onOpdateret();
      if (medHistorik) { await onHistorikOpdateret(); }
    } catch (e) {
      setAdvarsel(`Handlingen lykkedes, men listen kunne ikke opdateres: ${(e as Error).message}`);
    } finally {
      setArbejder(false);
    }
  };

  const upload = async (fil: File): Promise<void> => {
    try {
      await koer(async () => {
        await dokumentService.upload(sagId, fil);
      }, true);
    } finally {
      if (filInput.current) { filInput.current.value = ''; }
    }
  };

  return (
    <Panel titel="Dokumenter" antal={dokumenter.length}>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      {/* Browserens eget filfelt er skjult; knappen aabner det. */}
      <input
        ref={filInput}
        type="file"
        hidden
        disabled={arbejder}
        onChange={(e) => {
          const fil = e.target.files?.[0];
          if (fil) { upload(fil).catch(() => undefined); }
        }}
      />
      <Button
        disabled={arbejder}
        onClick={() => filInput.current?.click()}
        style={{ alignSelf: 'flex-start' }}
      >
        Upload dokument
      </Button>

      <Liste tom="Ingen dokumenter endnu.">
        {dokumenter.map((d) => (
          <ListeRaekke key={d.Id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link href={d.ServerRelativeUrl} target="_blank">
                {d.Filnavn}
              </Link>
              <MetaTekst>Ændret {new Date(d.Modified).toLocaleDateString('da-DK')}</MetaTekst>
            </div>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={() => koer(() => dokumentService.slet(sagId, d.ServerRelativeUrl))}
            >
              Slet
            </Button>
          </ListeRaekke>
        ))}
      </Liste>
    </Panel>
  );
};
