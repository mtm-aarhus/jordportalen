import * as React from 'react';
import {
  Button,
  Dropdown,
  Input,
  makeStyles,
  Option,
  OptionGroup,
  ToggleButton,
  tokens,
} from '@fluentui/react-components';
import { ALLE_STATUS } from '../../domaene/typer';
import { erStandard, Hvem, IVisning, nulstilFiltre, Udvalg } from '../../domaene/dashboard';
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

const useStyles = makeStyles({
  raekke: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalM,
  },
  // Soegefeltet tager den ledige plads, saa raekken fylder hele bredden.
  soeg: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '320px',
    minWidth: '240px',
  },
  udvalg: {
    minWidth: '200px',
  },
  // Tre knapper der haenger sammen som en kontrol, saa de laeses som et valg.
  segment: {
    display: 'flex',
    '& > button': {
      minWidth: '72px',
    },
    '& > button:not(:first-child)': {
      marginLeft: '-1px',
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
    },
    '& > button:not(:last-child)': {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },
  },
});

export const Filtre: React.FunctionComponent<IFiltreProps> = ({ visning, onVisning }) => {
  // Uden mountNode mister dropdownens popup sin styling. Se MountNode.tsx.
  const mountNode = useMountNode();
  const styles = useStyles();
  const saet = (aendring: Partial<IVisning>): void => onVisning({ ...visning, ...aendring });

  return (
    <div className={styles.raekke}>
      <Input
        placeholder="Søg på sagsnummer, adresse eller grundejer"
        value={visning.soeg}
        onChange={(_, d) => saet({ soeg: d.value })}
        className={styles.soeg}
      />

      <Dropdown
        aria-label="Udvalg"
        className={styles.udvalg}
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

      <div role="group" aria-label="Hvem" className={styles.segment}>
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
        <Button appearance="subtle" onClick={() => onVisning(nulstilFiltre(visning))}>
          Nulstil
        </Button>
      )}
    </div>
  );
};
