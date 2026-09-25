import * as React from 'react';
import { Card, Text, Title3, tokens } from '@fluentui/react-components';
import { ILogPost } from '../../domaene/typer';

export interface IHistorikPanelProps {
  logposter: ILogPost[];
}

export const HistorikPanel: React.FunctionComponent<IHistorikPanelProps> = ({ logposter }) => (
  <Card style={{ padding: tokens.spacingVerticalM }}>
    <Title3>Historik</Title3>
    <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
      {logposter.map((l) => (
        <div key={l.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text size={200} block>
            {new Date(l.Created).toLocaleString('da-DK')} · {l.Author?.Title}
          </Text>
          <Text block weight="semibold">
            {l.Handling}
          </Text>
          <Text block>{l.Title}</Text>
        </div>
      ))}
    </div>
  </Card>
);
