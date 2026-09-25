import * as React from 'react';
import {
  Avatar,
  Button,
  Card,
  Link,
  MessageBar,
  Text,
  Title3,
  tokens,
} from '@fluentui/react-components';
import { IProfil, ISag } from '../../domaene/typer';

export interface IAnsvarligKortProps {
  sag: ISag;
  profil?: IProfil;
  brugerId: number;
  onTag: () => Promise<void>;
  onFrigiv: () => Promise<void>;
}

export const AnsvarligKort: React.FunctionComponent<IAnsvarligKortProps> = ({
  sag,
  profil,
  brugerId,
  onTag,
  onFrigiv,
}) => {
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const erMin = sag.AnsvarligId === brugerId;
  const erLedig = !sag.AnsvarligId;

  const udfoer = async (handling: () => Promise<void>): Promise<void> => {
    setArbejder(true);
    setFejl(undefined);
    try {
      await handling();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ansvarlig</Title3>

      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {erLedig ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM }}>
          <Text>Sagen er ledig.</Text>
          <Button appearance="primary" disabled={arbejder} onClick={() => udfoer(onTag)}>
            Tag sagen
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' }}>
          <Avatar
            name={profil?.Navn ?? sag.Ansvarlig?.Title}
            image={profil?.BilledeUrl ? { src: profil.BilledeUrl } : undefined}
            size={48}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Text weight="semibold">{profil?.Navn ?? sag.Ansvarlig?.Title}</Text>
            {profil?.JobTitel && <Text size={200}>{profil.JobTitel}</Text>}
            {profil?.Afdeling && <Text size={200}>{profil.Afdeling}</Text>}
            {profil?.Mail && (
              <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
                <Link href={`mailto:${profil.Mail}`}>Mail</Link>
                <Link
                  href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(profil.Mail)}`}
                  target="_blank"
                >
                  Teams
                </Link>
              </div>
            )}
          </div>
          {erMin && (
            <Button disabled={arbejder} onClick={() => udfoer(onFrigiv)}>
              Frigiv
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
