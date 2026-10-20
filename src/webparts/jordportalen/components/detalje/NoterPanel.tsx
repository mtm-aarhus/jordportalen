import * as React from 'react';
import {
  Button,
  MessageBar,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';

import { INote } from '../../domaene/typer';
import { NoteService } from '../../services/NoteService';
import { Liste, ListeRaekke, MetaTekst, Panel } from '../faelles/Panel';

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
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  /**
   * Koerer en skrivehandling og opdaterer derefter listen. Fejler skrivningen
   * er det en fejl (handlingen skete ikke). Fejler kun den efterfoelgende
   * genindlaesning, er handlingen alligevel gennemfoert, og det vises som en
   * advarsel - ikke en fejl, som ville faa brugeren til at proeve igen.
   */
  const koer = async (handling: () => Promise<void>): Promise<void> => {
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
    } catch (e) {
      setAdvarsel(`Handlingen lykkedes, men listen kunne ikke opdateres: ${(e as Error).message}`);
    } finally {
      setArbejder(false);
    }
  };

  const gem = (): Promise<void> => koer(async () => {
    await noteService.tilfoej(sagId, tekst);
    setTekst('');
  });

  return (
    // Teksten siger bevidst "Vises kun for dig", ikke "Privat". Noterne
    // filtreres paa forfatter i selve forespoergslen, men listen har ingen
    // tilladelser pr. element - en administrator kan laese dem.
    <Panel
      titel="Egne noter"
      antal={noter.length}
      undertekst="Vises kun for dig. Ikke en del af sagens fælles historik."
    >

      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en note..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <Button disabled={!tekst.trim() || arbejder} onClick={gem} style={{ alignSelf: 'flex-end' }}>
          Gem note
        </Button>
      </div>

      <Liste tom="Ingen noter endnu.">
        {noter.map((n) => (
          <ListeRaekke key={n.Id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MetaTekst>{new Date(n.Created).toLocaleString('da-DK')}</MetaTekst>
              <Text block style={{ whiteSpace: 'pre-wrap' }}>
                {n.Tekst}
              </Text>
            </div>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={() => koer(() => noteService.slet(n.Id))}
            >
              Slet
            </Button>
          </ListeRaekke>
        ))}
      </Liste>
    </Panel>
  );
};
