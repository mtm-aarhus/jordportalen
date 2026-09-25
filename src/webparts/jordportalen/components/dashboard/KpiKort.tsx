import * as React from 'react';
import { Card, Text, Title2, tokens } from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';

export interface IKpiKortProps {
  sager: ISag[];
  brugerId: number;
}

export const KpiKort: React.FunctionComponent<IKpiKortProps> = ({ sager, brugerId }) => {
  const tal = React.useMemo(
    () => ({
      ialt: sager.length,
      ledige: sager.filter((s) => !s.AnsvarligId).length,
      mine: sager.filter((s) => s.AnsvarligId === brugerId).length,
      afventer: sager.filter((s) => s.Status === 'Afventer').length,
    }),
    [sager, brugerId]
  );

  const kort: { etiket: string; vaerdi: number }[] = [
    { etiket: 'Sager i alt', vaerdi: tal.ialt },
    { etiket: 'Ledige', vaerdi: tal.ledige },
    { etiket: 'Mine sager', vaerdi: tal.mine },
    { etiket: 'Afventer', vaerdi: tal.afventer },
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
