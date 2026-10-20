import * as React from 'react';
import { Link, makeStyles, Text, tokens } from '@fluentui/react-components';
import { IAdresse, IBilag, IKontakt, ISag } from '../../domaene/typer';
import { sikkerUrl } from '../../domaene/sikkerhed';
import { ejendomsDetaljer } from '../../domaene/formatering';
import { Liste, ListeRaekke, MetaTekst, Panel } from '../faelles/Panel';

export interface IMetadataProps {
  sag: ISag;
  adresser: IAdresse[];
  kontakter: IKontakt[];
  bilag: IBilag[];
}

const useStyles = makeStyles({
  kolonne: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  // Etiket til venstre og vaerdi til hoejre, saa felterne kan skimmes.
  felter: {
    display: 'grid',
    gridTemplateColumns: 'minmax(96px, max-content) 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    margin: 0,
  },
  etiket: {
    color: tokens.colorNeutralForeground3,
  },
  vaerdi: {
    margin: 0,
    minWidth: 0,
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
  indhold: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
});

const Felt: React.FunctionComponent<{ etiket: string; vaerdi?: string }> = ({ etiket, vaerdi }) => {
  const styles = useStyles();
  return vaerdi ? (
    <>
      <dt>
        <Text size={200} className={styles.etiket}>
          {etiket}
        </Text>
      </dt>
      <dd className={styles.vaerdi}>
        <Text>{vaerdi}</Text>
      </dd>
    </>
  ) : null;
};

export const Metadata: React.FunctionComponent<IMetadataProps> = ({
  sag,
  adresser,
  kontakter,
  bilag,
}) => {
  const os2FormsUrl = sikkerUrl(sag.OS2FormsUrl?.Url);

  const styles = useStyles();

  return (
    <div className={styles.kolonne}>
      <Panel titel="Ansøgning">
        <dl className={styles.felter}>
          <Felt etiket="Sagsnummer" vaerdi={String(sag.SubmissionSerial)} />
          <Felt etiket="Udfyldt af" vaerdi={sag.Udfylder} />
          <Felt etiket="Indsendt af" vaerdi={sag.IndsendtAf} />
          <Felt
            etiket="Ansøgningsdato"
            vaerdi={sag.AnsogningsDato ? new Date(sag.AnsogningsDato).toLocaleDateString('da-DK') : undefined}
          />
          <Felt
            etiket="Modtaget"
            vaerdi={sag.ModtagetDato ? new Date(sag.ModtagetDato).toLocaleString('da-DK') : undefined}
          />
          <Felt etiket="Bemærkninger" vaerdi={sag.Bemaerkninger} />
        </dl>
        {sag.OS2FormsUrl?.Url && (
          os2FormsUrl ? (
            <Link href={os2FormsUrl} target="_blank">
              Se original i OS2Forms
            </Link>
          ) : (
            <Text block>Se original i OS2Forms</Text>
          )
        )}
      </Panel>

      <Panel titel="Ejendomme" antal={adresser.length}>
        <Liste tom="Ingen ejendomme.">
          {adresser.map((a) => (
            <ListeRaekke key={a.Id}>
              <div className={styles.indhold}>
                <Text block weight="semibold">
                  {a.Adresse}
                </Text>
                {ejendomsDetaljer(a.Matrikel, a.LokalitetsNummer) && (
                  <MetaTekst>{ejendomsDetaljer(a.Matrikel, a.LokalitetsNummer)}</MetaTekst>
                )}
              </div>
            </ListeRaekke>
          ))}
        </Liste>
      </Panel>

      <Panel titel="Kontakter" antal={kontakter.length}>
        {/* KontaktType er ikke unik - der kan vaere to grundejere paa samme sag. */}
        <Liste tom="Ingen kontakter.">
          {kontakter.map((k) => (
            <ListeRaekke key={k.Id}>
              <div className={styles.indhold}>
                <MetaTekst>
                  {k.KontaktType}
                  {k.ErUdfylder ? ' · udfylder' : ''}
                </MetaTekst>
                <Text block weight="semibold">{k.Navn || k.Firma}</Text>
                {k.Email && <Link href={`mailto:${k.Email}`}>{k.Email}</Link>}
                {k.Telefon && <Text size={200} block>{k.Telefon}</Text>}
              </div>
            </ListeRaekke>
          ))}
        </Liste>
      </Panel>

      <Panel titel="Bilag fra ansøger" antal={bilag.length}>
        <Liste tom="Ingen bilag.">
          {bilag.map((b) => {
            const filUrl = sikkerUrl(b.FilUrl?.Url);
            return (
              <ListeRaekke key={b.Id}>
                {filUrl ? (
                  <Link href={filUrl} target="_blank">
                    {b.Filnavn || b.FilId}
                  </Link>
                ) : (
                  <Text block>{b.Filnavn || `Fil ${b.FilId}`}</Text>
                )}
              </ListeRaekke>
            );
          })}
        </Liste>
      </Panel>
    </div>
  );
};
