import * as React from 'react';
import { Button, Card, Input, Link, MessageBar, Title3, tokens } from '@fluentui/react-components';
import { ILink } from '../../domaene/typer';
import { LinkService } from '../../services/LinkService';

export interface ILinkPanelProps {
  sagId: number;
  links: ILink[];
  linkService: LinkService;
  onOpdateret: () => Promise<void>;
}

export const LinkPanel: React.FunctionComponent<ILinkPanelProps> = ({
  sagId,
  links,
  linkService,
  onOpdateret,
}) => {
  const [etiket, setEtiket] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const gyldig = etiket.trim() !== '' && /^https?:\/\/.+/.test(url.trim());

  const gem = async (): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await linkService.tilfoej(sagId, etiket.trim(), url.trim());
      setEtiket('');
      setUrl('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Links</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
        <Input
          placeholder="Etiket, fx GO-sag 2026-0041"
          value={etiket}
          disabled={arbejder}
          onChange={(_, d) => setEtiket(d.value)}
        />
        <Input
          placeholder="https://..."
          value={url}
          disabled={arbejder}
          onChange={(_, d) => setUrl(d.value)}
        />
        <Button disabled={!gyldig || arbejder} onClick={gem}>
          Tilføj link
        </Button>
      </div>

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {links.map((l) => (
          <div key={l.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Link href={l.Url?.Url} target="_blank">
              {l.Title}
            </Link>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={async () => {
                await linkService.slet(l.Id);
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
