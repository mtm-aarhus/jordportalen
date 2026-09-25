import * as React from 'react';
import { Card, Link, Text, Title3, tokens } from '@fluentui/react-components';
import { IAdresse, IBilag, IKontakt, ISag } from '../../domaene/typer';

export interface IMetadataProps {
  sag: ISag;
  adresser: IAdresse[];
  kontakter: IKontakt[];
  bilag: IBilag[];
}

const Felt: React.FunctionComponent<{ etiket: string; vaerdi?: string }> = ({ etiket, vaerdi }) =>
  vaerdi ? (
    <div style={{ marginBottom: tokens.spacingVerticalS }}>
      <Text size={200} block>
        {etiket}
      </Text>
      <Text block>{vaerdi}</Text>
    </div>
  ) : null;

export const Metadata: React.FunctionComponent<IMetadataProps> = ({
  sag,
  adresser,
  kontakter,
  bilag,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ansøgning</Title3>
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
      {sag.OS2FormsUrl?.Url && (
        <Link href={sag.OS2FormsUrl.Url} target="_blank">
          Se original i OS2Forms
        </Link>
      )}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Ejendomme ({adresser.length})</Title3>
      {adresser.map((a) => (
        <div key={a.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text block weight="semibold">
            {a.Adresse}
          </Text>
          <Text size={200} block>
            Matrikel {a.Matrikel} · Lokalitet {a.LokalitetsNummer}
          </Text>
        </div>
      ))}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Kontakter ({kontakter.length})</Title3>
      {/* KontaktType er ikke unik - der kan vaere to grundejere paa samme sag. */}
      {kontakter.map((k) => (
        <div key={k.Id} style={{ marginBottom: tokens.spacingVerticalS }}>
          <Text block weight="semibold">
            {k.KontaktType}
            {k.ErUdfylder ? ' (udfylder)' : ''}
          </Text>
          <Text block>{k.Navn || k.Firma}</Text>
          {k.Email && <Link href={`mailto:${k.Email}`}>{k.Email}</Link>}
          {k.Telefon && <Text size={200} block>{k.Telefon}</Text>}
        </div>
      ))}
    </Card>

    <Card style={{ padding: tokens.spacingVerticalM }}>
      <Title3>Bilag fra ansøger ({bilag.length})</Title3>
      {bilag.map((b) => (
        <div key={b.Id}>
          {b.FilUrl?.Url ? (
            <Link href={b.FilUrl.Url} target="_blank">
              {b.Filnavn || b.FilId}
            </Link>
          ) : (
            <Text block>{b.Filnavn || `Fil ${b.FilId}`}</Text>
          )}
        </div>
      ))}
    </Card>
  </div>
);
