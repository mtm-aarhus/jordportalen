import * as React from 'react';
import { Caption1, CounterBadge, makeStyles, Subtitle2, Text, tokens } from '@fluentui/react-components';

// Én flade til alle sagens paneler, saa de ligner dashboardets kort og
// hinanden: samme kant, skygge, afstand og overskrift.
const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    minWidth: 0,
  },
  hoved: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  titelRaekke: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  undertekst: {
    color: tokens.colorNeutralForeground3,
  },
  liste: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
  raekke: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    minWidth: 0,
    ':not(:first-child)': {
      borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    },
  },
  tom: {
    color: tokens.colorNeutralForeground3,
  },
  metaTekst: {
    color: tokens.colorNeutralForeground3,
  },
});

export interface IPanelProps {
  titel: string;
  /** Vises som et lille tal ved titlen. Udelades, naar et antal ikke giver mening. */
  antal?: number;
  undertekst?: string;
  children?: React.ReactNode;
}

export const Panel: React.FunctionComponent<IPanelProps> = ({ titel, antal, undertekst, children }) => {
  const styles = useStyles();
  return (
    <section className={styles.panel} aria-label={titel}>
      <div className={styles.hoved}>
        <div className={styles.titelRaekke}>
          <Subtitle2 as="h3">{titel}</Subtitle2>
          {antal !== undefined && antal > 0 && (
            <CounterBadge count={antal} overflowCount={999} appearance="ghost" color="informative" />
          )}
        </div>
        {undertekst && <Caption1 className={styles.undertekst}>{undertekst}</Caption1>}
      </div>
      {children}
    </section>
  );
};

/** En liste med en tynd streg mellem raekkerne. Viser `tom`, naar der ingen raekker er. */
export const Liste: React.FunctionComponent<{ tom: string; children?: React.ReactNode }> = ({ tom, children }) => {
  const styles = useStyles();
  if (React.Children.count(children) === 0) {
    return <Text className={styles.tom}>{tom}</Text>;
  }
  return <ul className={styles.liste}>{children}</ul>;
};

export const ListeRaekke: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => {
  const styles = useStyles();
  return <li className={styles.raekke}>{children}</li>;
};

/** Den lille graa tekst over et indlaeg: forfatter, dato og lignende. */
export const MetaTekst: React.FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => {
  const styles = useStyles();
  return (
    <Caption1 block className={styles.metaTekst}>
      {children}
    </Caption1>
  );
};
