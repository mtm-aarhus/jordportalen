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
} from '@fluentui/react-components';
import { ISag, SagStatus } from '../../domaene/typer';

const STATUS_FARVE: Record<SagStatus, 'informative' | 'warning' | 'success' | 'danger'> = {
  'Ny': 'informative',
  'Under behandling': 'informative',
  'Afventer': 'warning',
  'Afgjort': 'success',
  'Afvist': 'danger',
};

export interface ISagsTabelProps {
  sager: ISag[];
  onVaelgSag: (id: number) => void;
}

export const SagsTabel: React.FunctionComponent<ISagsTabelProps> = ({ sager, onVaelgSag }) => (
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
            <Badge appearance="filled" color={STATUS_FARVE[s.Status]}>
              {s.Status}
              {s.Status === 'Afventer' && s.AfventerAarsag ? `: ${s.AfventerAarsag}` : ''}
            </Badge>
          </TableCell>
          <TableCell>
            {s.Ansvarlig ? (
              <Text>{s.Ansvarlig.Title}</Text>
            ) : (
              <Button size="small" appearance="subtle" onClick={() => onVaelgSag(s.Id)}>
                Ledig
              </Button>
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
