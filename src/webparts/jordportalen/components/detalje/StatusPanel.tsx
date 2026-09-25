import * as React from 'react';
import {
  Button,
  Card,
  Dropdown,
  MessageBar,
  Option,
  Textarea,
  Title3,
  tokens,
} from '@fluentui/react-components';

import { naeste } from '../../domaene/statusregler';
import { AfventerAarsag, ALLE_AARSAGER, ISag, SagStatus } from '../../domaene/typer';
import { SagService } from '../../services/SagService';
import { useMountNode } from '../faelles/MountNode';

export interface IStatusPanelProps {
  sag: ISag;
  sagService: SagService;
  brugerId: number;
  onOpdateret: () => Promise<void>;
}

export const StatusPanel: React.FunctionComponent<IStatusPanelProps> = ({
  sag,
  sagService,
  brugerId,
  onOpdateret,
}) => {
  const mountNode = useMountNode();
  const [nyStatus, setNyStatus] = React.useState<SagStatus | undefined>(undefined);
  const [aarsag, setAarsag] = React.useState<AfventerAarsag | undefined>(undefined);
  const [kommentar, setKommentar] = React.useState('');
  const [arbejder, setArbejder] = React.useState(false);
  const [fejl, setFejl] = React.useState<string | undefined>(undefined);
  const [advarsel, setAdvarsel] = React.useState<string | undefined>(undefined);

  // Kun den ansvarlige maa skifte status. Alt andet paa sagen er aabent for alle.
  const erMin = sag.AnsvarligId === brugerId;
  const muligheder = naeste(sag.Status);

  const gem = async (): Promise<void> => {
    if (!nyStatus) { return; }
    setArbejder(true);
    setFejl(undefined);
    setAdvarsel(undefined);
    try {
      // Returvaerdien er en advarsel om manglende logning, ikke en fejl.
      // Statussen er skiftet uanset - brugeren maa ikke tro det modsatte og
      // proeve igen.
      const logAdvarsel = await sagService.skiftStatus(sag, nyStatus, aarsag, kommentar || undefined);
      setAdvarsel(logAdvarsel);
      setNyStatus(undefined);
      setAarsag(undefined);
      setKommentar('');
      await onOpdateret();
    } catch (e) {
      setFejl((e as Error).message);
    } finally {
      setArbejder(false);
    }
  };

  return (
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Status</Title3>
      {fejl && <MessageBar intent="error">{fejl}</MessageBar>}
      {advarsel && <MessageBar intent="warning">{advarsel}</MessageBar>}

      {!erMin && (
        <MessageBar intent="info">
          {sag.AnsvarligId
            ? 'Kun den ansvarlige kan skifte status.'
            : 'Tag sagen for at kunne skifte status.'}
        </MessageBar>
      )}

      {muligheder.length === 0 ? (
        <MessageBar intent="info">Sagen er afsluttet og kan ikke skifte status.</MessageBar>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS }}>
          <Dropdown
            placeholder="Vælg ny status"
            disabled={!erMin || arbejder}
            value={nyStatus ?? ''}
            selectedOptions={nyStatus ? [nyStatus] : []}
            mountNode={mountNode}
            onOptionSelect={(_, d) => {
              setNyStatus(d.optionValue as SagStatus);
              if (d.optionValue !== 'Afventer') { setAarsag(undefined); }
            }}
          >
            {muligheder.map((s) => (
              <Option key={s} value={s}>
                {s}
              </Option>
            ))}
          </Dropdown>

          {/* Aarsagen hoerer kun til Afventer - servicelaget afviser alt andet. */}
          {nyStatus === 'Afventer' && (
            <Dropdown
              placeholder="Vælg årsag"
              disabled={arbejder}
              value={aarsag ?? ''}
              selectedOptions={aarsag ? [aarsag] : []}
              mountNode={mountNode}
              onOptionSelect={(_, d) => setAarsag(d.optionValue as AfventerAarsag)}
            >
              {ALLE_AARSAGER.map((a) => (
                <Option key={a} value={a}>
                  {a}
                </Option>
              ))}
            </Dropdown>
          )}

          <Textarea
            placeholder="Bemærkning til statusskiftet (valgfri)"
            value={kommentar}
            disabled={!erMin || arbejder}
            onChange={(_, d) => setKommentar(d.value)}
          />

          <Button appearance="primary" disabled={!erMin || !nyStatus || arbejder} onClick={gem}>
            Skift status
          </Button>
        </div>
      )}
    </Card>
  );
};
