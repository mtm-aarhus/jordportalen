import * as React from 'react';
import { Button, Card, Link, MessageBar, Text, Title3, tokens } from '@fluentui/react-components';
import { IDokument } from '../../domaene/typer';
import { DokumentService } from '../../services/DokumentService';

export interface IDokumentPanelProps {
  sagId: number;
  dokumenter: IDokument[];
  dokumentService: DokumentService;
  onOpdateret: () => Promise<void>;
}

export const DokumentPanel: React.FunctionComponent<IDokumentPanelProps> = ({
  sagId,
  dokumenter,
  dokumentService,
  onOpdateret,
}) => {
  const filInput = React.useRef<HTMLInputElement>(null);
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const upload = async (fil: File): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await dokumentService.upload(sagId, fil);
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
      if (filInput.current) { filInput.current.value = ''; }
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Dokumenter</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      <input
        ref={filInput}
        type="file"
        disabled={arbejder}
        onChange={(e) => {
          const fil = e.target.files?.[0];
          if (fil) { upload(fil).catch(() => undefined); }
        }}
      />

      <div style={{ marginTop: tokens.spacingVerticalM }}>
        {dokumenter.map((d) => (
          <div key={d.Id} style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <Link href={d.ServerRelativeUrl} target="_blank">
              {d.Filnavn}
            </Link>
            <Text size={200}>{new Date(d.Modified).toLocaleDateString('da-DK')}</Text>
            <Button
              size="small"
              appearance="subtle"
              disabled={arbejder}
              onClick={async () => {
                await dokumentService.slet(d.ServerRelativeUrl);
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
