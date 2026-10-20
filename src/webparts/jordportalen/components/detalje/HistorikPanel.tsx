import * as React from 'react';
import { makeStyles, Text } from '@fluentui/react-components';
import { ILogPost } from '../../domaene/typer';
import { Liste, ListeRaekke, MetaTekst, Panel } from '../faelles/Panel';

export interface IHistorikPanelProps {
  logposter: ILogPost[];
}

const useStyles = makeStyles({
  rul: {
    maxHeight: '420px',
    overflowY: 'auto',
  },
  indhold: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
});

export const HistorikPanel: React.FunctionComponent<IHistorikPanelProps> = ({ logposter }) => {
  const styles = useStyles();
  return (
    <Panel titel="Historik" antal={logposter.length}>
      <div className={styles.rul}>
        <Liste tom="Ingen hændelser endnu.">
          {logposter.map((l) => (
            <ListeRaekke key={l.Id}>
              <div className={styles.indhold}>
                <MetaTekst>
                  {new Date(l.Created).toLocaleString('da-DK')} · {l.Author?.Title}
                </MetaTekst>
                <Text block weight="semibold">
                  {l.Handling}
                </Text>
                <Text block>{l.Title}</Text>
              </div>
            </ListeRaekke>
          ))}
        </Liste>
      </div>
    </Panel>
  );
};
