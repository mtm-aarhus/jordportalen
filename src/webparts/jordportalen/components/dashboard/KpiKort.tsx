import * as React from 'react';
import { Button, Text, Title2, tokens } from '@fluentui/react-components';
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

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({
  sager,
  brugerId,
  afkortet,
  visning,
  onVisning,
}) => {
  const tal = React.useMemo(() => taelNoegletal(sager, brugerId), [sager, brugerId]);

  // "Aktive" maa aldrig se ud som et facit, naar listen er afkortet.
  const vaerdi = (k: Kort): string =>
    k === 'aktive' && afkortet ? `${STANDARD_MAKSANTAL.toLocaleString('da-DK')}+` : String(tal[k]);

  return (
    <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
      {ALLE_KORT.map((k) => {
        const valgt = erKortValgt(k, visning);
        return (
          // Rigtige knapper, saa kortene kan bruges med tastaturet.
          <Button
            key={k}
            appearance={valgt ? 'primary' : 'secondary'}
            aria-pressed={valgt}
            onClick={() => onVisning(kortGenvej(k, visning))}
            style={{
              minWidth: '140px',
              padding: tokens.spacingVerticalM,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <Title2>{vaerdi(k)}</Title2>
            <Text size={200}>{ETIKET[k]}</Text>
          </Button>
        );
      })}
    </div>
  );
};
