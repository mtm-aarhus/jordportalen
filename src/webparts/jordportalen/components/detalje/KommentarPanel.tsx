import * as React from 'react';
import {
  Button,
  Card,
  MessageBar,
  Text,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { ILogPost, IPerson } from '../../domaene/typer';
import { LogService } from '../../services/LogService';
import { ProfilService } from '../../services/ProfilService';
import { PeoplePicker } from '../faelles/PeoplePicker';

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

  const kommentarer = logposter.filter((l) => l.Handling === 'Kommentar');

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
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
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Kommentarer</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Textarea
          placeholder="Skriv en kommentar..."
          value={tekst}
          disabled={arbejder}
          onChange={(_, d) => setTekst(d.value)}
        />
        <PeoplePicker profil={profil} valgte={taggede} onAendret={setTaggede} />
        <Button appearance="primary" disabled={!tekst.trim() || arbejder} onClick={gem}>
          Tilføj kommentar
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {kommentarer.map((k) => (
          <div key={k.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
            <Text size={200} block>
              {k.Author?.Title} · {new Date(k.Created).toLocaleString('da-DK')}
            </Text>
            <Text block style={{ whiteSpace: 'pre-wrap' }}>
              {k.Kommentar}
            </Text>
            {k.TaggedeBrugere && k.TaggedeBrugere.length > 0 && (
              <Text size={200} block>
                Taggede: {k.TaggedeBrugere.map((t) => t.Title).join(', ')}
              </Text>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
