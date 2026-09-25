import * as React from 'react';
import { Button, Card, Checkbox, Input, MessageBar, Title3, tokens } from '@fluentui/react-components';
import { IOpgave } from '../../domaene/typer';
import { OpgaveService } from '../../services/OpgaveService';

export interface IOpgavePanelProps {
  sagId: number;
  opgaver: IOpgave[];
  opgaveService: OpgaveService;
  onOpdateret: () => Promise<void>;
  /** Kaldes ud over onOpdateret, naar handlingen ogsaa har skrevet en logpost. */
  onHistorikOpdateret: () => Promise<void>;
}

export const OpgavePanel: React.FunctionComponent<IOpgavePanelProps> = ({
  sagId,
  opgaver,
  opgaveService,
  onOpdateret,
  onHistorikOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
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

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Opgaver</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
        <Input
          placeholder="Ny opgave..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
          style={{ flex: 1 }}
        />
        <Button
          disabled={!tekst.trim() || arbejder}
          onClick={() => koer(async () => {
            await opgaveService.opret(sagId, tekst);
            setTekst('');
          }, true)}
        >
          Tilføj
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {opgaver.map((o) => (
          <div key={o.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Checkbox
              checked={o.Udfoert}
              label={o.Title}
              disabled={arbejder}
              onChange={(_, d) => koer(() => opgaveService.saetUdfoert(o, !!d.checked))}
            />
            <Button
              size="small"
              appearance="subtle"
              onClick={() => koer(() => opgaveService.slet(o.Id))}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
