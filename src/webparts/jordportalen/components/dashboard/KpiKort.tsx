import * as React from 'react';
import { Card, Text, Title2, tokens } from '@fluentui/react-components';
import { STANDARD_MAKSANTAL } from '../../domaene/paginering';
import { ISag } from '../../domaene/typer';

export interface IKpiKortProps {
  sager: ISag[];
  brugerId: number;
  /** Sand hvis `sager` er afkortet af sikkerhedsgraensen i hentAlleSager. */
  afkortet: boolean;
}

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({ sager, brugerId, afkortet }) => {
  const tal = React.useMemo(
    () => ({
      ialt: sager.length,
      ledige: sager.filter((s) => !s.AnsvarligId).length,
      mine: sager.filter((s) => s.AnsvarligId === brugerId).length,
      afventer: sager.filter((s) => s.Status === 'Afventer').length,
    }),
    [sager, brugerId]
  );

  // "Sager i alt" maa aldrig se ud som et facit, naar det kun er de foerste
  // STANDARD_MAKSANTAL. Er resultatet afkortet, vises graensen med et "+" i
  // stedet for det tal, listen faktisk blev afkortet ved.
  const ialtVaerdi = afkortet
    ? `${STANDARD_MAKSANTAL.toLocaleString('da-DK')}+`
    : String(tal.ialt);

  const kort: { etiket: string; vaerdi: string }[] = [
    { etiket: 'Sager i alt', vaerdi: ialtVaerdi },
    { etiket: 'Ledige', vaerdi: String(tal.ledige) },
    { etiket: 'Mine sager', vaerdi: String(tal.mine) },
    { etiket: 'Afventer', vaerdi: String(tal.afventer) },
  ];

  return (
    <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }}>
      {kort.map((k) => (
        <Card key={k.etiket} style={{ minWidth: '140px', padding: tokens.spacingVerticalM }}>
          <Title2>{k.vaerdi}</Title2>
          <Text size={200}>{k.etiket}</Text>
        </Card>
      ))}
    </div>
  );
};
