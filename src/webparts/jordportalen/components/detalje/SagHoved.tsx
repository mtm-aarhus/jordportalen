import * as React from 'react';
import { Button, makeStyles, Text, Title2, tokens } from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';
import { StatusMaerkat } from '../faelles/StatusMaerkat';

export interface ISagHovedProps {
  sag: ISag;
  /** Sagens link uden filtre, til "Kopiér link". */
  delingsLink: string;
  onTilbage: () => void;
}

type Kopiering = 'ingen' | 'kopieret' | 'fejlet';

const useStyles = makeStyles({
  hoved: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalXL,
  },
  topRaekke: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  tilbage: {
    marginLeft: `calc(-1 * ${tokens.spacingHorizontalS})`,
  },
  nummer: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  metaRaekke: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    flexWrap: 'wrap',
    color: tokens.colorNeutralForeground2,
  },
  fejlTekst: {
    color: tokens.colorPaletteRedForeground1,
  },
});

export const SagHoved: React.FunctionComponent<ISagHovedProps> = ({ sag, delingsLink, onTilbage }) => {
  const styles = useStyles();
  const [kopiering, setKopiering] = React.useState<Kopiering>('ingen');

  // "Link kopieret" staar paa knappen et oejeblik og forsvinder saa igen.
  React.useEffect(() => {
    if (kopiering !== 'kopieret') { return undefined; }
    const timer = setTimeout(() => setKopiering('ingen'), 2000);
    return () => clearTimeout(timer);
  }, [kopiering]);

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
    <header className={styles.hoved}>
      <div className={styles.topRaekke}>
        <Button appearance="subtle" onClick={onTilbage} className={styles.tilbage}>
          ← Oversigten
        </Button>
        <Button appearance="secondary" onClick={kopier}>
          {kopiering === 'kopieret' ? 'Link kopieret ✓' : 'Kopiér link'}
        </Button>
      </div>

      {kopiering === 'fejlet' && (
        <Text size={200} block className={styles.fejlTekst}>
          Linket kunne ikke kopieres. Kopiér adressen fra adresselinjen.
        </Text>
      )}

      <Title2 as="h2" block>
        <span className={styles.nummer}>Sag {sag.SubmissionSerial} · </span>
        {sag.Title}
      </Title2>

      <div className={styles.metaRaekke}>
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
    </header>
  );
};
