import * as React from 'react';
import { Combobox, Option, Tag, TagGroup, tokens } from '@fluentui/react-components';
import { ProfilService } from '../../services/ProfilService';
import { IPerson } from '../../domaene/typer';
import { useMountNode } from './MountNode';

export interface IPeoplePickerProps {
  profil: ProfilService;
  valgte: IPerson[];
  onAendret: (personer: IPerson[]) => void;
}

export const PeoplePicker: React.FunctionComponent<IPeoplePickerProps> = ({
  profil,
  valgte,
  onAendret,
}) => {
  const mountNode = useMountNode();
  const [tekst, setTekst] = React.useState('');
  const [fundne, setFundne] = React.useState<IPerson[]>([]);

  // Debounce, saa hvert tastetryk ikke rammer SharePoint.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      profil.soegBrugere(tekst).then(setFundne).catch(() => setFundne([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [tekst, profil]);

  return (
    <div>
      {valgte.length > 0 && (
        <TagGroup
          onDismiss={(_, d) => onAendret(valgte.filter((p) => String(p.Id) !== d.value))}
          style={{ marginBottom: tokens.spacingVerticalXS }}
        >
          {valgte.map((p) => (
            <Tag key={p.Id} value={String(p.Id)} dismissible>
              {p.Title}
            </Tag>
          ))}
        </TagGroup>
      )}

      <Combobox
        placeholder="Tag en kollega..."
        value={tekst}
        mountNode={mountNode}
        onChange={(e) => setTekst(e.target.value)}
        onOptionSelect={(_, d) => {
          const valgt = fundne.filter((p) => String(p.Id) === d.optionValue)[0];
          if (valgt && !valgte.some((v) => v.Id === valgt.Id)) {
            onAendret([...valgte, valgt]);
          }
          setTekst('');
        }}
      >
        {fundne.map((p) => (
          <Option key={p.Id} value={String(p.Id)}>
            {p.Title}
          </Option>
        ))}
      </Combobox>
    </div>
  );
};
