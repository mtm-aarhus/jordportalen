import * as React from 'react';
import { Button, Text, Title2, tokens } from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';
import { StatusMaerkat } from '../faelles/StatusMaerkat';

export interface ISagHovedProps {
  sag: ISag;
  /** Sagens link uden filtre, til "Kopiér link". */
  delingsLink: string;
  onTilbage: () => void;
}

type Kopiering = 'ingen' | 'kopieret' | 'fejlet';

export const SagHoved: React.FunctionComponent<ISagHovedProps> = ({ sag, delingsLink, onTilbage }) => {
  const [kopiering, setKopiering] = React.useState<Kopiering>('ingen');

  const kopier = (): void => {
    // navigator.clipboard findes ikke altid (fx uden https eller naar
    // browseren naegter), og writeText kan afvise. Begge dele skal give en
    // besked, ikke en ubehandlet fejl.
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard) {
      setKopiering('fejlet');
      return;
    }
    clipboard
      .writeText(delingsLink)
      .then(() => setKopiering('kopieret'))
      .catch(() => setKopiering('fejlet'));
  };

  return (
    <div style={{ marginBottom: tokens.spacingVerticalL }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button appearance="subtle" onClick={onTilbage}>
          ← Oversigten
        </Button>
        <Button appearance="secondary" onClick={kopier}>
          Kopiér link
        </Button>
      </div>

      {kopiering === 'kopieret' && <Text size={200} block>Link kopieret</Text>}
      {kopiering === 'fejlet' && (
        <Text size={200} block>
          Linket kunne ikke kopieres. Kopiér adressen fra adresselinjen.
        </Text>
      )}

      <Title2 block style={{ marginTop: tokens.spacingVerticalS }}>
        Sag {sag.SubmissionSerial} · {sag.Title}
      </Title2>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacingHorizontalL,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: tokens.spacingVerticalS,
        }}
      >
        <StatusMaerkat status={sag.Status} aarsag={sag.AfventerAarsag} />
        <Text>Ansvarlig: {sag.Ansvarlig?.Title ?? 'Ledig'}</Text>
        {sag.ModtagetDato && (
          <Text>
            Modtaget{' '}
            {new Date(sag.ModtagetDato).toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </div>
    </div>
  );
};
