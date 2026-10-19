import * as React from 'react';
import { Button, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';
import { STANDARD_MAKSANTAL } from '../../domaene/paginering';
import { ISag } from '../../domaene/typer';
import {
  ALLE_KORT,
  erKortValgt,
  IVisning,
  Kort,
  kortGenvej,
  taelNoegletal,
} from '../../domaene/dashboard';

export interface IKpiKortProps {
  sager: ISag[];
  brugerId: number;
  /** Sand hvis `sager` er afkortet af sikkerhedsgraensen i hentAlleSager. */
  afkortet: boolean;
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
}

const ETIKET: Record<Kort, string> = {
  aktive: 'Aktive sager',
  ledige: 'Ledige',
  mine: 'Mine sager',
  afventer: 'Afventer',
};

const useStyles = makeStyles({
  // Kortene deler kolonnens bredde ligeligt og brydes til flere raekker,
  // naar der ikke er plads (fx i en smal kolonne eller paa mobil).
  gitter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  kort: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: tokens.spacingVerticalXS,
    minHeight: '96px',
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    textAlign: 'left',
    // Kun de egenskaber der faktisk skifter, aldrig `all`.
    transitionProperty: 'transform, box-shadow, background-color, border-color',
    transitionDuration: '160ms',
    transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
    // Fluents egne hover/active-farver overskrives, saa kortet ikke blinker graat.
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1,
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    ':hover:active': {
      backgroundColor: tokens.colorNeutralBackground1,
      transform: 'scale(0.98)',
    },
    '@media (hover: hover) and (pointer: fine)': {
      ':hover': { boxShadow: tokens.shadow8 },
    },
    '@media (prefers-reduced-motion: reduce)': {
      ':hover:active': { transform: 'none' },
    },
  },
  valgt: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      border: `1px solid ${tokens.colorBrandStroke1}`,
    },
    ':hover:active': { backgroundColor: tokens.colorBrandBackground2Pressed },
  },
  tal: {
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: 'tabular-nums',
    color: tokens.colorNeutralForeground1,
  },
  talValgt: {
    color: tokens.colorBrandForeground1,
  },
  etiket: {
    color: tokens.colorNeutralForeground2,
  },
});

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({
  sager,
  brugerId,
  afkortet,
  visning,
  onVisning,
}) => {
  const styles = useStyles();
  const tal = React.useMemo(() => taelNoegletal(sager, brugerId), [sager, brugerId]);

  // "Aktive" maa aldrig se ud som et facit, naar listen er afkortet.
  const vaerdi = (k: Kort): string =>
    k === 'aktive' && afkortet ? `${STANDARD_MAKSANTAL.toLocaleString('da-DK')}+` : String(tal[k]);

  return (
    <div className={styles.gitter}>
      {ALLE_KORT.map((k) => {
        const valgt = erKortValgt(k, visning);
        return (
          // Rigtige knapper, saa kortene kan bruges med tastaturet.
          <Button
            key={k}
            appearance="secondary"
            aria-pressed={valgt}
            onClick={() => onVisning(kortGenvej(k, visning))}
            className={mergeClasses(styles.kort, valgt && styles.valgt)}
          >
            <span className={mergeClasses(styles.tal, valgt && styles.talValgt)}>{vaerdi(k)}</span>
            <Text size={300} weight={valgt ? 'semibold' : 'regular'} className={styles.etiket}>
              {ETIKET[k]}
            </Text>
          </Button>
        );
      })}
    </div>
  );
};
