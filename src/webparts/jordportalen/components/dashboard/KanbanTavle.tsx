import * as React from 'react';
import { Avatar, Badge, Caption1, makeStyles, mergeClasses, Text, tokens } from '@fluentui/react-components';

import { IKanbanKolonne } from '../../domaene/dashboard';
import { alderTekst, dageSiden } from '../../domaene/formatering';
import { ISag, SagStatus } from '../../domaene/typer';
import { erAfsluttet } from '../../domaene/statusregler';

export interface IKanbanTavleProps {
  kolonner: IKanbanKolonne[];
  onVaelgSag: (id: number) => void;
}

// Hver kolonne faar en farvet kant, saa man kan se statussen uden at laese den.
// Samme farvefamilie som StatusMaerkat: blaa for igangvaerende, gul for
// afventer, groen og roed for de afsluttede.
const KOLONNE_FARVE: Record<SagStatus, string> = {
  'Ny': tokens.colorPaletteLightTealBorderActive,
  'Under behandling': tokens.colorPaletteBlueBorderActive,
  'Afventer': tokens.colorStatusWarningBorderActive,
  'Afgjort': tokens.colorStatusSuccessBorderActive,
  'Afvist': tokens.colorStatusDangerBorderActive,
};

/** En sag, der har ligget saa mange dage, faar sin alder fremhaevet. */
const GAMMEL_EFTER_DAGE = 30;

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

const useStyles = makeStyles({
  // Kolonnerne deler bredden, men bliver aldrig smallere end et laesbart kort.
  // Er der ikke plads (fx alle fem statusser), ruller tavlen vandret.
  tavle: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    alignItems: 'flex-start',
    overflowX: 'auto',
    paddingBottom: tokens.spacingVerticalS,
    scrollSnapType: 'x proximity',
  },
  kolonne: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: '300px',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusXLarge,
    borderTopWidth: '3px',
    borderTopStyle: 'solid',
    scrollSnapAlign: 'start',
  },
  kolonneHoved: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalXS,
    paddingRight: tokens.spacingHorizontalXS,
  },
  kolonneTitel: {
    flexGrow: 1,
    fontWeight: tokens.fontWeightSemibold,
  },
  kolonneAntal: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  tomKolonne: {
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalM}`,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  kort: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    transitionProperty: 'transform, box-shadow, border-color',
    transitionDuration: '160ms',
    transitionTimingFunction: EASE_OUT,
    // Hele kortet kan klikkes (se titelKnap). Et tryk giver en lille,
    // haandgribelig respons, saa man ved, at klikket blev hoert.
    ':active': {
      transform: 'scale(0.99)',
    },
    ':focus-within': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
    '@media (hover: hover) and (pointer: fine)': {
      ':hover': {
        boxShadow: tokens.shadow8,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
      },
    },
    '@media (prefers-reduced-motion: reduce)': {
      ':active': { transform: 'none' },
    },
  },
  top: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  nummer: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
  alder: {
    paddingTop: '1px',
    paddingBottom: '1px',
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  alderGammel: {
    backgroundColor: tokens.colorStatusWarningBackground1,
    color: tokens.colorStatusWarningForeground1,
  },
  titelBlok: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  // Titlen er kortets eneste knap. ::after daekker hele kortet, saa et klik
  // hvor som helst aabner sagen, mens skaermlaesere kun hoerer én knap.
  titelKnap: {
    appearance: 'none',
    border: 'none',
    background: 'none',
    padding: 0,
    margin: 0,
    textAlign: 'left',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    outline: 'none',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: tokens.borderRadiusLarge,
    },
  },
  ekstra: {
    color: tokens.colorNeutralForeground3,
  },
  felter: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXS,
    margin: 0,
  },
  etiket: {
    color: tokens.colorNeutralForeground3,
  },
  vaerdi: {
    margin: 0,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  bemaerkning: {
    margin: 0,
    paddingLeft: tokens.spacingHorizontalS,
    borderLeft: `2px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    whiteSpace: 'pre-line',
  },
  bund: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  ansvarlig: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  ansvarligNavn: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  antal: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
});

const dato = (iso?: string): string | undefined =>
  iso ? new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;

const flertal = (n: number, ental: string, flere: string): string => `${n} ${n === 1 ? ental : flere}`;

const Felt: React.FunctionComponent<{ etiket: string; vaerdi?: string }> = ({ etiket, vaerdi }) => {
  const styles = useStyles();
  if (!vaerdi) {
    return null;
  }
  return (
    <>
      <dt>
        <Caption1 className={styles.etiket}>{etiket}</Caption1>
      </dt>
      <dd className={styles.vaerdi} title={vaerdi}>
        <Caption1>{vaerdi}</Caption1>
      </dd>
    </>
  );
};

const SagsKort: React.FunctionComponent<{ sag: ISag; onVaelg: () => void }> = ({ sag, onVaelg }) => {
  const styles = useStyles();
  // En afsluttet sag venter ikke paa noget, saa dens alder siger intet.
  const dage = sag.ModtagetDato && !erAfsluttet(sag.Status) ? dageSiden(sag.ModtagetDato) : undefined;
  const gammel = dage !== undefined && dage >= GAMMEL_EFTER_DAGE;
  const flereAdresser = (sag.AntalAdresser ?? 0) - 1;
  const indsendtAf = [sag.Udfylder, sag.IndsendtAf && `(${sag.IndsendtAf.toLowerCase()})`]
    .filter(Boolean)
    .join(' ');
  const tal = [
    sag.AntalKontakter ? flertal(sag.AntalKontakter, 'kontakt', 'kontakter') : undefined,
    sag.AntalVedhaeftninger ? flertal(sag.AntalVedhaeftninger, 'bilag', 'bilag') : undefined,
  ].filter(Boolean);

  return (
    <article className={styles.kort}>
      <div className={styles.top}>
        <Caption1 className={styles.nummer}>Sag {sag.SubmissionSerial}</Caption1>
        {dage !== undefined && (
          <Caption1
            className={mergeClasses(styles.alder, gammel && styles.alderGammel)}
            title={`Modtaget ${dato(sag.ModtagetDato)}`}
          >
            {alderTekst(dage)}
          </Caption1>
        )}
      </div>

      <div className={styles.titelBlok}>
        <button type="button" className={styles.titelKnap} onClick={onVaelg}>
          {sag.Title}
        </button>
        {flereAdresser > 0 && (
          <Caption1 className={styles.ekstra}>
            + {flertal(flereAdresser, 'adresse', 'adresser')} mere
          </Caption1>
        )}
      </div>

      {sag.Status === 'Afventer' && sag.AfventerAarsag && (
        <Badge appearance="tint" color="warning" style={{ alignSelf: 'flex-start' }}>
          Afventer {sag.AfventerAarsag.toLowerCase()}
        </Badge>
      )}

      <dl className={styles.felter}>
        <Felt etiket={sag.FlereGrundejere ? 'Grundejere' : 'Grundejer'} vaerdi={sag.Grundejere} />
        <Felt etiket="Indsendt af" vaerdi={indsendtAf || undefined} />
        <Felt etiket="Ansøgt" vaerdi={dato(sag.AnsogningsDato)} />
        <Felt etiket="Modtaget" vaerdi={dato(sag.ModtagetDato)} />
      </dl>

      {sag.Bemaerkninger && <p className={styles.bemaerkning}>{sag.Bemaerkninger}</p>}

      <div className={styles.bund}>
        {sag.Ansvarlig ? (
          <div className={styles.ansvarlig}>
            <Avatar name={sag.Ansvarlig.Title} size={24} />
            <Caption1 className={styles.ansvarligNavn}>{sag.Ansvarlig.Title}</Caption1>
          </div>
        ) : (
          <Badge appearance="outline" color="subtle">
            Ledig
          </Badge>
        )}
        {tal.length > 0 && <Caption1 className={styles.antal}>{tal.join(' · ')}</Caption1>}
      </div>
    </article>
  );
};

export const KanbanTavle: React.FunctionComponent<IKanbanTavleProps> = ({ kolonner, onVaelgSag }) => {
  const styles = useStyles();
  return (
    <div className={styles.tavle}>
      {kolonner.map((k) => (
        <section
          key={k.status}
          className={styles.kolonne}
          style={{ borderTopColor: KOLONNE_FARVE[k.status] ?? tokens.colorNeutralStroke1 }}
          aria-label={`${k.status}, ${k.sager.length} sager`}
        >
          <div className={styles.kolonneHoved}>
            <Text className={styles.kolonneTitel}>{k.status}</Text>
            <Caption1 className={styles.kolonneAntal}>{k.sager.length}</Caption1>
          </div>
          {k.sager.length === 0 ? (
            <Caption1 className={styles.tomKolonne}>Ingen sager</Caption1>
          ) : (
            k.sager.map((s) => <SagsKort key={s.Id} sag={s} onVaelg={() => onVaelgSag(s.Id)} />)
          )}
        </section>
      ))}
    </div>
  );
};
