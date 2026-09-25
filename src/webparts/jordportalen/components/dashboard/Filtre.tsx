import * as React from 'react';
import { Dropdown, Option, Switch, Input, tokens } from '@fluentui/react-components';
import { ALLE_STATUS, SagStatus } from '../../domaene/typer';
import { useMountNode } from '../faelles/MountNode';

export interface IFiltreProps {
  status?: SagStatus;
  kunLedige: boolean;
  kunMine: boolean;
  soegning: string;
  onAendret: (aendring: {
    status?: SagStatus;
    kunLedige?: boolean;
    kunMine?: boolean;
    soegning?: string;
  }) => void;
}

export const Filtre: React.FunctionComponent<IFiltreProps> = (p) => {
  // Uden mountNode mister dropdownens popup sin styling. Se MountNode.tsx.
  const mountNode = useMountNode();

  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacingHorizontalM,
        alignItems: 'center',
        flexWrap: 'wrap',
        margin: `${tokens.spacingVerticalM} 0`,
      }}
    >
      <Input
        placeholder="Søg i adresse eller titel"
        value={p.soegning}
        onChange={(_, d) => p.onAendret({ soegning: d.value })}
        style={{ minWidth: '260px' }}
      />

      <Dropdown
        placeholder="Alle statusser"
        value={p.status ?? ''}
        selectedOptions={p.status ? [p.status] : []}
        mountNode={mountNode}
        onOptionSelect={(_, d) =>
          p.onAendret({ status: (d.optionValue as SagStatus) || undefined })
        }
      >
        <Option value="">Alle statusser</Option>
        {ALLE_STATUS.map((s) => (
          <Option key={s} value={s}>
            {s}
          </Option>
        ))}
      </Dropdown>

      <Switch
        label="Kun ledige"
        checked={p.kunLedige}
        onChange={(_, d) => p.onAendret({ kunLedige: d.checked, kunMine: false })}
      />
      <Switch
        label="Mine sager"
        checked={p.kunMine}
        onChange={(_, d) => p.onAendret({ kunMine: d.checked, kunLedige: false })}
      />
    </div>
  );
};
