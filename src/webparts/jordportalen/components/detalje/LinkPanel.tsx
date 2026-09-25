import * as React from 'react';
import { Button, Card, Input, Link, MessageBar, Text, Title3, tokens } from '@fluentui/react-components';
import { ILink } from '../../domaene/typer';
import { sikkerUrl } from '../../domaene/sikkerhed';
import { LinkService } from '../../services/LinkService';

export interface ILinkPanelProps {
  sagId: number;
  links: ILink[];
  linkService: LinkService;
  onOpdateret: () => Promise<void>;
  /** Kaldes ud over onOpdateret, naar handlingen ogsaa har skrevet en logpost. */
  onHistorikOpdateret: () => Promise<void>;
}

export const LinkPanel: React.FunctionComponent<ILinkPanelProps> = ({
  sagId,
  links,
  linkService,
  onOpdateret,
  onHistorikOpdateret,
}) => {
  const [etiket, setEtiket] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  const gyldig = etiket.trim() !== '' && /^https?:\/\/.+/.test(url.trim());

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

  const gem = (): Promise<void> => koer(async () => {
    await linkService.tilfoej(sagId, etiket.trim(), url.trim());
    setEtiket('');
    setUrl('');
  }, true);

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Links</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

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
        {links.map((l) => {
          const href = sikkerUrl(l.Url?.Url);
          return (
            <div key={l.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
              {href ? (
                <Link href={href} target="_blank">
                  {l.Title}
                </Link>
              ) : (
                <Text>{l.Title}</Text>
              )}
              <Button
                size="small"
                appearance="subtle"
                disabled={arbejder}
                onClick={() => koer(() => linkService.slet(l.Id))}
              >
                Slet
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
