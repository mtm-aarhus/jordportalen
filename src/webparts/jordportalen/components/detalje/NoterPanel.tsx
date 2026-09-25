import * as React from 'react';
import {
  Button,
  Caption1,
  Card,
  MessageBar,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { INote } from '../../domaene/typer';
import { NoteService } from '../../services/NoteService';

export interface INoterPanelProps {
  sagId: number;
  noter: INote[];
  noteService: NoteService;
  onOpdateret: () => Promise<void>;
}

export const NoterPanel: React.FunctionComponent<INoterPanelProps> = ({
  sagId,
  noter,
  noteService,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await noteService.tilfoej(sagId, tekst);
      setTekst('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Egne noter</Title3>

      {/*
        Teksten siger bevidst "Vises kun for dig", ikke "Privat". Noterne
        filtreres paa forfatter i selve forespoergslen, men listen har ingen
        tilladelser pr. element - en administrator kan laese dem.
      */}
      <Caption1>Vises kun for dig. Ikke en del af sagens fælles historik.</Caption1>

      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en note..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <Button disabled={!tekst.trim() || arbejder} onClick={gem}>
          Gem note
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {noter.map((n) => (
          <div key={n.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
            <Text size={200} block>
              {new Date(n.Created).toLocaleString('da-DK')}
            </Text>
            <Text block style={{ whiteSpace: 'pre-wrap' }}>
              {n.Tekst}
            </Text>
            <Button
              size="small"
              appearance="subtle"
              onClick={async () => {
                await noteService.slet(n.Id);
                await onOpdateret();
              }}
            >
              Slet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
