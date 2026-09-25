import * as React from 'react';
import { MessageBar, Spinner } from '@fluentui/react-components';

import { SagService } from '../../services/SagService';
import { IDashboardFilter } from '../../domaene/forespoergsler';
import { ISag, SagStatus } from '../../domaene/typer';
import { KpiKort } from './KpiKort';
import { Filtre } from './Filtre';
import { SagsTabel } from './SagsTabel';

export interface IDashboardProps {
  sag: SagService;
  brugerId: number;
  onVaelgSag: (id: number) => void;
}

export const Dashboard: React.FunctionComponent<IDashboardProps> = ({
  sag,
  brugerId,
  onVaelgSag,
}) => {
  const [sager, setSager] = React.useState<ISag[]>([]);
  const [afkortet, setAfkortet] = React.useState(false);
  const [indlaeser, setIndlaeser] = React.useState(true);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  const [status, setStatus] = React.useState<SagStatus | undefined>(undefined);
  const [kunLedige, setKunLedige] = React.useState(false);
  const [kunMine, setKunMine] = React.useState(false);
  const [soegning, setSoegning] = React.useState('');

  React.useEffect(() => {
    let foraeldet = false; // saettes naar effekten ryddes op, dvs. naar
    // filtrene aendrer sig eller komponenten unmountes

    const filter: IDashboardFilter = {
      status,
      kunLedige,
      ansvarligId: kunMine ? brugerId : undefined,
    };

    setIndlaeser(true);
    // Kaeden afsluttes med .catch() (ikke et afsluttende .then()), saa
    // lint (no-floating-promises) betragter den som haandteret uden et
    // eksplicit void.
    sag
      .hentAlleSager(filter)
      .then((r) => {
        if (foraeldet) { return; } // et senere kald har overhalet dette
        setSager(r.elementer);
        setAfkortet(r.afkortet);
        setFejl(undefined);
        setIndlaeser(false);
      })
      .catch((e: Error) => {
        if (foraeldet) { return; }
        // Fejler genindlaesningen, skal de gamle raekker ikke blive staaende
        // under fejlbjaelken - ellers viser KPI-kortene, tabellen og
        // afkortningsbjaelken stadig det forrige filters resultat.
        setFejl(e.message);
        setSager([]);
        setAfkortet(false);
        setIndlaeser(false);
      });

    return () => {
      foraeldet = true;
    };
  }, [sag, status, kunLedige, kunMine, brugerId]);

  // Fritekstsoegningen sker i frontenden, fordi den skal kunne ramme
  // AdresserTekst, som er flerlinjet og ikke kan filtreres server-side i OData.
  const synlige = React.useMemo(() => {
    const s = soegning.trim().toLowerCase();
    if (!s) {
      return sager;
    }
    return sager.filter(
      (sa) =>
        sa.Title.toLowerCase().indexOf(s) !== -1 ||
        (sa.AdresserTekst || '').toLowerCase().indexOf(s) !== -1
    );
  }, [sager, soegning]);

  return (
    <div>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}

      {/* Afkortning SKAL vises. Idéportalen og Opgaveportalen afskaerer tavst. */}
      {afkortet && (
        <MessageBar intent="warning">
          Der er flere sager, end der kan vises. Brug filtrene for at indsnævre listen.
        </MessageBar>
      )}

      <KpiKort sager={sager} brugerId={brugerId} afkortet={afkortet} />

      <Filtre
        status={status}
        kunLedige={kunLedige}
        kunMine={kunMine}
        soegning={soegning}
        onAendret={(a) => {
          if (a.status !== undefined || 'status' in a) { setStatus(a.status); }
          if (a.kunLedige !== undefined) { setKunLedige(a.kunLedige); }
          if (a.kunMine !== undefined) { setKunMine(a.kunMine); }
          if (a.soegning !== undefined) { setSoegning(a.soegning); }
        }}
      />

      {indlaeser ? (
        <Spinner label="Henter sager..." />
      ) : (
        <SagsTabel sager={synlige} onVaelgSag={onVaelgSag} />
      )}
    </div>
  );
};
