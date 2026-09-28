import * as React from 'react';
import {
  Badge,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from '@fluentui/react-components';
import { ISag } from '../../domaene/typer';
import { StatusMaerkat } from '../faelles/StatusMaerkat';

export interface ISagsTabelProps {
  sager: ISag[];
  onVaelgSag: (id: number) => void;
  /** Teksten naar der ingen raekker er. */
  tomBesked: string;
  /** Vises som "Nulstil filtre" ved tom tabel. Udelades naar visningen er standard. */
  onNulstil?: () => void;
}

export const SagsTabel: React.FunctionComponent<ISagsTabelProps> = ({
  sager,
  onVaelgSag,
  tomBesked,
  onNulstil,
}) => {
  if (sager.length === 0) {
    return (
      <div style={{ padding: `${tokens.spacingVerticalXXL} 0`, textAlign: 'center' }}>
        <Text block>{tomBesked}</Text>
        {onNulstil && (
          <Button appearance="secondary" onClick={onNulstil} style={{ marginTop: tokens.spacingVerticalM }}>
            Nulstil filtre
          </Button>
        )}
      </div>
    );
  }

  return (
    <Table aria-label="Sager">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Nr.</TableHeaderCell>
          <TableHeaderCell>Adresse</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Ansvarlig</TableHeaderCell>
          <TableHeaderCell>Modtaget</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sager.map((s) => (
          <TableRow key={s.Id}>
            <TableCell>{s.SubmissionSerial}</TableCell>
            <TableCell>
              <Link onClick={() => onVaelgSag(s.Id)}>{s.Title}</Link>
            </TableCell>
            <TableCell>
              <StatusMaerkat status={s.Status} aarsag={s.AfventerAarsag} />
            </TableCell>
            <TableCell>
              {s.Ansvarlig ? (
                <Text>{s.Ansvarlig.Title}</Text>
              ) : (
                // En maerkat, ikke en knap: den tager ikke sagen.
                <Badge appearance="outline" color="subtle">
                  Ledig
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {s.ModtagetDato ? new Date(s.ModtagetDato).toLocaleDateString('da-DK') : ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
