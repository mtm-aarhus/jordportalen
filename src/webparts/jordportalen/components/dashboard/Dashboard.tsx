import * as React from 'react';
import { MessageBar, Spinner } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { ISag } from '../../domaene/typer';
import { erStandard, filtrerSager, IVisning, STANDARD_VISNING } from '../../domaene/dashboard';
import { KpiKort } from './KpiKort';
import { Filtre } from './Filtre';
import { SagsTabel } from './SagsTabel';

export interface IDashboardProps {
  sag: SagService;
  brugerId: number;
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
  onVaelgSag: (id: number) => void;
}

export const Dashboard: React.FunctionComponent<IDashboardProps> = ({
  sag,
  brugerId,
  visning,
  onVisning,
  onVaelgSag,
}) => {
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
  const nulstil = (): void => onVisning({ ...STANDARD_VISNING });

  return (
    <div>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {/* Afkortning SKAL vises. Idéportalen og Opgaveportalen afskaerer tavst. */}
      {afkortet && (
        <MessageBar intent="warning">
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
