import * as React from 'react';
import {
  Button,
  MessageBar,
  Text,
  Textarea,
  tokens,
} from '@fluentui/react-components';

import { ILogPost, IPerson } from '../../domaene/typer';
import { LogService } from '../../services/LogService';
import { ProfilService } from '../../services/ProfilService';
import { PeoplePicker } from '../faelles/PeoplePicker';
import { Liste, ListeRaekke, MetaTekst, Panel } from '../faelles/Panel';

export interface IKommentarPanelProps {
  sagId: number;
  logposter: ILogPost[];
  logService: LogService;
  profil: ProfilService;
  onOpdateret: () => Promise<void>;
}

export const KommentarPanel: React.FunctionComponent<IKommentarPanelProps> = ({
  sagId,
  logposter,
  logService,
  profil,
  onOpdateret,
}) => {
  const [tekst, setTekst] = React.useState('');
  const [taggede, setTaggede] = React.useState<IPerson[]>([]);
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  const kommentarer = logposter.filter((l) => l.Handling === 'Kommentar');

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    setAdvarsel(undefined);
    try {
      await logService.tilfoej({
        sagId,
        handling: 'Kommentar',
        titel: tekst.substring(0, 80),
        kommentar: tekst,
        // TaggedeBrugere udloeser Power Automate-notifikationen. Se Task 19.
        taggedeBrugerIds: taggede.map((p) => p.Id),
      });
      setTekst('');
      setTaggede([]);
    } catch (e) {
      setFejl((e as Error).message);
      setArbejder(false);
      return;
    }

    // Kommentaren er gemt - fejler kun genindlaesningen, er det ikke en fejl i
    // selve handlingen. Vises som advarsel, ikke fejl.
    try {
      await onOpdateret();
    } catch (e) {
      setAdvarsel(`Kommentaren blev gemt, men listen kunne ikke opdateres: ${(e as Error).message}`);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Panel titel="Kommentarer" antal={kommentarer.length}>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en kommentar..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <PeoplePicker profil={profil} valgte={taggede} onAendret={setTaggede} />
        <Button
          appearance="primary"
          disabled={!tekst.trim() || arbejder}
          onClick={gem}
          style={{ alignSelf: 'flex-end' }}
        >
          Tilføj kommentar
        </Button>
      </div>

      <Liste tom="Ingen kommentarer endnu.">
        {kommentarer.map((k) => (
          <ListeRaekke key={k.Id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <MetaTekst>
                <Text size={200} weight="semibold">{k.Author?.Title}</Text>
                {' · '}
                {new Date(k.Created).toLocaleString('da-DK')}
              </MetaTekst>
              <Text block style={{ whiteSpace: 'pre-wrap' }}>
                {k.Kommentar}
              </Text>
              {k.TaggedeBrugere && k.TaggedeBrugere.length > 0 && (
                <MetaTekst>Taggede: {k.TaggedeBrugere.map((t) => t.Title).join(', ')}</MetaTekst>
              )}
            </div>
          </ListeRaekke>
        ))}
      </Liste>
    </Panel>
  );
};
