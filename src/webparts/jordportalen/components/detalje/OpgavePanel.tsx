import * as React from 'react';
import { Button, Card, Checkbox, Input, MessageBar, Title3, tokens } from '@fluentui/react-components';
import { IOpgave } from '../../domaene/typer';
import { OpgaveService } from '../../services/OpgaveService';

export interface IOpgavePanelProps {
  sagId: number;
  opgaver: IOpgave[];
  opgaveService: OpgaveService;
  onOpdateret: () => Promise<void>;
}

export const OpgavePanel: React.FunctionComponent<IOpgavePanelProps> = ({
  sagId,
  opgaver,
  opgaveService,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const koer = async (handling: () => Promise<void>): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await handling();
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Opgaver</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

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
          })}
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
