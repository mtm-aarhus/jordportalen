import * as React from 'react';
import { Badge } from '@fluentui/react-components';
import { AfventerAarsag, SagStatus } from '../../domaene/typer';

// Én kilde til statusfarver, saa tabellen og sagens overskrift ikke kan vise
// samme status forskelligt.
const STATUS_FARVE: Record<SagStatus, 'informative' | 'warning' | 'success' | 'danger'> = {
  'Ny': 'informative',
  'Under behandling': 'informative',
  'Afventer': 'warning',
  'Afgjort': 'success',
  'Afvist': 'danger',
};

export interface IStatusMaerkatProps {
  status: SagStatus;
  aarsag?: AfventerAarsag;
}

export const StatusMaerkat: React.FunctionComponent<IStatusMaerkatProps> = ({ status, aarsag }) => (
  // En ukendt status fra SharePoint faar en neutral farve i stedet for undefined.
  <Badge appearance="filled" color={STATUS_FARVE[status] ?? 'informative'}>
    {status}
    {status === 'Afventer' && aarsag ? `: ${aarsag}` : ''}
  </Badge>
);
