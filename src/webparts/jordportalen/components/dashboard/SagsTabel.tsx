import * as React from 'react';
import {
  Badge,
  Button,
  Link,
  makeStyles,
  mergeClasses,
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

const useStyles = makeStyles({
  // Tabellen og den tomme tilstand ligger paa samme flade, saa siden ikke
  // skifter udseende, naar et filter giver nul raekker.
  flade: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    overflowX: 'auto',
  },
  hoved: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  hovedCelle: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  nr: {
    width: '96px',
  },
  dato: {
    width: '120px',
  },
  tal: {
    fontVariantNumeric: 'tabular-nums',
  },
  raekke: {
    cursor: 'pointer',
  },
  tom: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
    padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalL}`,
    textAlign: 'center',
  },
  tomUndertekst: {
    color: tokens.colorNeutralForeground3,
  },
});

export const SagsTabel: React.FunctionComponent<ISagsTabelProps> = ({
  sager,
  onVaelgSag,
  tomBesked,
  onNulstil,
}) => {
  const styles = useStyles();

  if (sager.length === 0) {
    return (
      <div className={styles.flade}>
        <div className={styles.tom}>
          <Text size={400} weight="semibold">{tomBesked}</Text>
          {onNulstil && (
            <>
              <Text className={styles.tomUndertekst}>Prøv at ændre søgningen eller filtrene.</Text>
              <Button appearance="secondary" onClick={onNulstil}>
                Nulstil filtre
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.flade}>
      <Table aria-label="Sager">
        <TableHeader className={styles.hoved}>
          <TableRow>
            <TableHeaderCell className={mergeClasses(styles.hovedCelle, styles.nr)}>Nr.</TableHeaderCell>
            <TableHeaderCell className={styles.hovedCelle}>Adresse</TableHeaderCell>
            <TableHeaderCell className={styles.hovedCelle}>Status</TableHeaderCell>
            <TableHeaderCell className={styles.hovedCelle}>Ansvarlig</TableHeaderCell>
            <TableHeaderCell className={mergeClasses(styles.hovedCelle, styles.dato)}>Modtaget</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sager.map((s) => (
            // Hele raekken kan klikkes med musen. Linket i adressen er stadig
            // den tilgaengelige vej med tastaturet.
            <TableRow key={s.Id} className={styles.raekke} onClick={() => onVaelgSag(s.Id)}>
              <TableCell className={styles.tal}>{s.SubmissionSerial}</TableCell>
              <TableCell>
                <Link
                  onClick={(e) => {
                    // Raekken aabner ogsaa sagen; uden dette aabnes den to gange.
                    e.stopPropagation();
                    onVaelgSag(s.Id);
                  }}
                >
                  {s.Title}
                </Link>
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
              <TableCell className={styles.tal}>
                {s.ModtagetDato ? new Date(s.ModtagetDato).toLocaleDateString('da-DK') : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
