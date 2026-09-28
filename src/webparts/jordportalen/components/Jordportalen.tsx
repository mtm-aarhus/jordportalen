import * as React from 'react';
import { FluentProvider, webLightTheme, Spinner, MessageBar } from '@fluentui/react-components';

import { IJordportalenProps } from './IJordportalenProps';
import { MountNodeProvider } from './faelles/MountNode';
import { Dashboard } from './dashboard/Dashboard';
import { SagDetalje } from './detalje/SagDetalje';
import { IVisning, STANDARD_VISNING } from '../domaene/dashboard';
import { byggUrl, historikTilstand, laesVisning, tilbageHandling } from '../utils/visning';
import { LogService } from '../services/LogService';
import { SagService } from '../services/SagService';
import { NoteService } from '../services/NoteService';
import { OpgaveService } from '../services/OpgaveService';
import { LinkService } from '../services/LinkService';
import { DokumentService } from '../services/DokumentService';
import { ProfilService } from '../services/ProfilService';

type Maade = 'nyt-trin' | 'erstat';

const Jordportalen: React.FunctionComponent<IJordportalenProps> = ({ sp, sideUrl }) => {
  const tjenester = React.useMemo(() => {
    const log = new LogService(sp);
    return {
      log,
      sag: new SagService(sp, log),
      note: new NoteService(sp),
      opgave: new OpgaveService(sp, log),
      link: new LinkService(sp, log),
      dokument: new DokumentService(sp, log),
      profil: new ProfilService(sp),
    };
  }, [sp]);

  // Adressen er den eneste kilde til visningen. State her er kun et spejl,
  // saa React tegner igen, naar adressen aendres.
  const [visning, setVisning] = React.useState<IVisning>(() => laesVisning(window.location.href));
  const [brugerId, setBrugerId] = React.useState<number | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    tjenester.profil
      .nuvaerendeBrugerId()
      .then(setBrugerId)
      .catch((e: Error) => setFejl(e.message));
  }, [tjenester]);

  // Browserens tilbage og frem: laes adressen igen.
  React.useEffect(() => {
    const vedPopstate = (): void => setVisning(laesVisning(window.location.href));
    window.addEventListener('popstate', vedPopstate);
    return () => window.removeEventListener('popstate', vedPopstate);
  }, []);

  /**
   * Den eneste vej til at aendre visningen.
   *
   * Bygger oven paa den aktuelle adresse (ikke sideUrl), saa SharePoints egne
   * parametre som Mode=Edit bevares. Et nyt trin bruges, naar en sag aabnes,
   * saa browserens tilbage-knap foerer til oversigten. Filtre og soegning
   * erstatter trinnet, saa tilbage-knappen ikke traeder gennem hvert tastetryk.
   */
  const naviger = React.useCallback((ny: IVisning, maade: Maade) => {
    const url = byggUrl(window.location.href, ny);
    if (maade === 'nyt-trin') {
      window.history.pushState(historikTilstand(window.history.state), '', url);
    } else {
      window.history.replaceState(window.history.state, '', url);
    }
    setVisning(ny);
  }, []);

  const aendrFiltre = React.useCallback(
    (ny: IVisning) => naviger({ ...ny, sag: undefined }, 'erstat'),
    [naviger]
  );

  const aabnSag = React.useCallback(
    (id: number) => naviger({ ...visning, sag: id }, 'nyt-trin'),
    [naviger, visning]
  );

  const tilOversigten = React.useCallback(() => {
    if (tilbageHandling(window.history.state) === 'gaa-tilbage') {
      // popstate-lytteren opdaterer visningen.
      window.history.back();
    } else {
      naviger({ ...visning, sag: undefined }, 'nyt-trin');
    }
  }, [naviger, visning]);

  return (
    <FluentProvider theme={webLightTheme}>
      <MountNodeProvider>
        {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
        {brugerId === undefined && !fejl && <Spinner label="Indlæser..." />}
        {brugerId !== undefined && (
          <div>
            {visning.sag === undefined ? (
              <Dashboard
                sag={tjenester.sag}
                brugerId={brugerId}
                visning={visning}
                onVisning={aendrFiltre}
                onVaelgSag={aabnSag}
              />
            ) : (
              <SagDetalje
                key={visning.sag}
                sagId={visning.sag}
                tjenester={tjenester}
                brugerId={brugerId}
                delingsLink={byggUrl(sideUrl, { ...STANDARD_VISNING, sag: visning.sag })}
                onTilbage={tilOversigten}
              />
            )}
          </div>
        )}
      </MountNodeProvider>
    </FluentProvider>
  );
};

export default Jordportalen;
