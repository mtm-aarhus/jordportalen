import * as React from 'react';
import {
  Button,
  Dropdown,
  Input,
  Option,
  OptionGroup,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import { ALLE_STATUS } from '../../domaene/typer';
import { erStandard, Hvem, IVisning, STANDARD_VISNING, Udvalg } from '../../domaene/dashboard';
import { useMountNode } from '../faelles/MountNode';

export interface IFiltreProps {
  visning: IVisning;
  onVisning: (visning: IVisning) => void;
}

const UDVALG_ETIKET: Record<string, string> = {
  aktive: 'Aktive sager',
  afsluttede: 'Afsluttede',
  alle: 'Alle',
};

const HVEM_ETIKET: Record<Hvem, string> = { alle: 'Alle', ledige: 'Ledige', mine: 'Mine' };
const HVEM_RAEKKEFOELGE: Hvem[] = ['alle', 'ledige', 'mine'];

const etiketFor = (u: Udvalg): string => UDVALG_ETIKET[u] ?? u;

export const Filtre: React.FunctionComponent<IFiltreProps> = ({ visning, onVisning }) => {
  // Uden mountNode mister dropdownens popup sin styling. Se MountNode.tsx.
  const mountNode = useMountNode();
  const saet = (aendring: Partial<IVisning>): void => onVisning({ ...visning, ...aendring });

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
        placeholder="Søg på sagsnummer, adresse eller grundejer"
        value={visning.soeg}
        onChange={(_, d) => saet({ soeg: d.value })}
        style={{ minWidth: '300px' }}
      />

      <Dropdown
        aria-label="Udvalg"
        value={etiketFor(visning.udvalg)}
        selectedOptions={[visning.udvalg]}
        mountNode={mountNode}
        onOptionSelect={(_, d) => {
          if (d.optionValue) {
            saet({ udvalg: d.optionValue as Udvalg });
          }
        }}
      >
        <Option value="aktive">Aktive sager</Option>
        <Option value="afsluttede">Afsluttede</Option>
        <Option value="alle">Alle</Option>
        <OptionGroup label="Status">
          {ALLE_STATUS.map((s) => (
            <Option key={s} value={s}>
              {s}
            </Option>
          ))}
        </OptionGroup>
      </Dropdown>

      <div role="group" aria-label="Hvem" style={{ display: 'flex' }}>
        {HVEM_RAEKKEFOELGE.map((h) => (
          <ToggleButton
            key={h}
            checked={visning.hvem === h}
            onClick={() => saet({ hvem: h })}
          >
            {HVEM_ETIKET[h]}
          </ToggleButton>
        ))}
      </div>

      {!erStandard(visning) && (
        <Button appearance="subtle" onClick={() => onVisning({ ...STANDARD_VISNING })}>
          Nulstil
        </Button>
      )}
    </div>
  );
};
