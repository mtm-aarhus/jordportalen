import * as React from 'react';
import { FluentProvider, webLightTheme, Spinner, MessageBar } from '@fluentui/react-components';

import { IJordportalenProps } from './IJordportalenProps';
import { MountNodeProvider } from './faelles/MountNode';
import { Dashboard } from './dashboard/Dashboard';
import { SagDetalje } from './detalje/SagDetalje';
import { byggSagLink, parseSagId } from '../utils/deepLink';
import { IVisning } from '../domaene/dashboard';
import { laesVisning } from '../utils/visning';
import { LogService } from '../services/LogService';
import { SagService } from '../services/SagService';
import { NoteService } from '../services/NoteService';
import { OpgaveService } from '../services/OpgaveService';
import { LinkService } from '../services/LinkService';
import { DokumentService } from '../services/DokumentService';
import { ProfilService } from '../services/ProfilService';

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

  const [valgtSagId, setValgtSagId] = React.useState<number | undefined>(() =>
    parseSagId(window.location.href)
  );
  const [visning, setVisning] = React.useState<IVisning>(() => laesVisning(window.location.href));
  const [brugerId, setBrugerId] = React.useState<number | undefined>(undefined);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    tjenester.profil
      .nuvaerendeBrugerId()
      .then(setBrugerId)
      .catch((e: Error) => setFejl(e.message));
  }, [tjenester]);

  // Holder URL'en i takt med valget, saa en sag kan bogmaerkes og deles.
  const vaelgSag = React.useCallback(
    (id: number | undefined) => {
      setValgtSagId(id);
      const url = id ? byggSagLink(sideUrl, id) : sideUrl;
      window.history.replaceState({}, '', url);
    },
    [sideUrl]
  );

  return (
    <FluentProvider theme={webLightTheme}>
      <MountNodeProvider>
        {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
        {brugerId === undefined && !fejl && <Spinner label="Indlæser..." />}
        {brugerId !== undefined && (
          <div>
            {valgtSagId === undefined ? (
              <Dashboard
                sag={tjenester.sag}
                brugerId={brugerId}
                visning={visning}
                onVisning={setVisning}
                onVaelgSag={vaelgSag}
              />
            ) : (
              <SagDetalje
                sagId={valgtSagId}
                tjenester={tjenester}
                brugerId={brugerId}
                onTilbage={() => vaelgSag(undefined)}
              />
            )}
          </div>
        )}
      </MountNodeProvider>
    </FluentProvider>
  );
};

export default Jordportalen;
