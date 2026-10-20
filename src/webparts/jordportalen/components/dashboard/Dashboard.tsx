import * as React from 'react';
import { makeStyles, MessageBar, Spinner, Text, Title2, ToggleButton, tokens } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { ISag } from '../../domaene/typer';
import { erStandard, filtrerSager, IVisning, kanbanKolonner, Layout, nulstilFiltre } from '../../domaene/dashboard';
import { KpiKort } from './KpiKort';
import { Filtre } from './Filtre';
import { SagsTabel } from './SagsTabel';
import { KanbanTavle } from './KanbanTavle';

export interface IDashboardProps {
  sag: SagService;
  brugerId: number;
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
  onVaelgSag: (id: number) => void;
}

const useStyles = makeStyles({
  hoved: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
  },
  hoejre: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
  },
  antal: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  // Samme samlede kontrol som Alle/Ledige/Mine i filtrene.
  segment: {
    display: 'flex',
    '& > button:not(:first-child)': {
      marginLeft: '-1px',
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    '& > button:not(:last-child)': {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
  },
  besked: {
    marginBottom: tokens.spacingVerticalM,
  },
});

export const Dashboard: React.FunctionComponent<IDashboardProps> = ({
  sag,
  brugerId,
  visning,
  onVisning,
  onVaelgSag,
}) => {
  const styles = useStyles();
  const [sager, setSager] = React.useState<ISag[]>([]);
  const [afkortet, setAfkortet] = React.useState(false);
  const [indlaeser, setIndlaeser] = React.useState(true);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  // Alt hentes én gang pr. visning af dashboardet. Filtrene skifter i
  // browseren uden nyt kald. Ved tilbagevenden fra en sag mountes
  // dashboardet igen og henter paany, saa et statusskift ses med det samme.
  React.useEffect(() => {
    let foraeldet = false;
    setIndlaeser(true);
    sag
      .hentAlleSager()
      .then((r) => {
        if (foraeldet) { return; }
        setSager(r.elementer);
        setAfkortet(r.afkortet);
        setFejl(undefined);
        setIndlaeser(false);
      })
      .catch((e: Error) => {
        if (foraeldet) { return; }
        setFejl(e.message);
        setSager([]);
        setAfkortet(false);
        setIndlaeser(false);
      });
    return () => {
      foraeldet = true;
    };
  }, [sag]);

  const synlige = React.useMemo(
    () => filtrerSager(sager, visning, brugerId),
    [sager, visning, brugerId]
  );

  const standard = erStandard(visning);
  const nulstil = (): void => onVisning(nulstilFiltre(visning));
  const layout: Layout = visning.layout ?? 'tabel';
  const saetLayout = (l: Layout): void => onVisning({ ...visning, layout: l === 'tabel' ? undefined : l });

  return (
    <div>
      <div className={styles.hoved}>
        <Title2 as="h2">§8 Ansøgninger</Title2>
        <div className={styles.hoejre}>
          {!indlaeser && !fejl && (
            <Text className={styles.antal}>
              Viser {synlige.length.toLocaleString('da-DK')} af {sager.length.toLocaleString('da-DK')}
            </Text>
          )}
          <div role="group" aria-label="Visning" className={styles.segment}>
            <ToggleButton size="small" checked={layout === 'tabel'} onClick={() => saetLayout('tabel')}>
              Tabel
            </ToggleButton>
            <ToggleButton size="small" checked={layout === 'kanban'} onClick={() => saetLayout('kanban')}>
              Kanban
            </ToggleButton>
          </div>
        </div>
      </div>

      {fejl && <MessageBar intent="error" className={styles.besked}>{fejl}</MessageBar>}

      {/* Afkortning SKAL vises. Idéportalen og Opgaveportalen afskaerer tavst. */}
      {afkortet && (
        <MessageBar intent="warning" className={styles.besked}>
          Der er flere sager, end der kan vises. Brug filtrene for at indsnævre listen.
        </MessageBar>
      )}

      <KpiKort
        sager={sager}
        brugerId={brugerId}
        afkortet={afkortet}
        visning={visning}
        onVisning={onVisning}
      />

      <Filtre visning={visning} onVisning={onVisning} />

      {indlaeser ? (
        <Spinner label="Henter sager..." />
      ) : layout === 'kanban' ? (
        <KanbanTavle kolonner={kanbanKolonner(synlige, visning.udvalg)} onVaelgSag={onVaelgSag} />
      ) : (
        <SagsTabel
          sager={synlige}
          onVaelgSag={onVaelgSag}
          tomBesked={standard ? 'Ingen aktive sager' : 'Ingen sager matcher'}
          onNulstil={standard ? undefined : nulstil}
        />
      )}
    </div>
  );
};
