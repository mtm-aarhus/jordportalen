/**
 * Datatyper og listenavne for Jordportalen.
 *
 * Listenavne og feltnavne svarer til scripts/Opret-SharePointLister.ps1. De er rene ASCII,
 * fordi SharePoint koder specialtegn om i det interne kolonnenavn og afkorter
 * ved 32 tegn - og det interne navn er laast fra oprettelsen.
 *
 * Valgmuligheder indeholder derimod danske tegn og skal matche byte for byte,
 * da vaerdierne kommer fra OS2Forms-blanketten.
 */

export const LIST_NAMES = {
  SAGER: 'P8Ansogninger',
  ADRESSER: 'P8Adresser',
  KONTAKTER: 'P8Kontakter',
  BILAG: 'P8Vedhaeftninger',
  LOG: 'P8Log',
  NOTER: 'P8Noter',
  OPGAVER: 'P8Opgaver',
  LINKS: 'P8Links',
  DOKUMENTER: 'P8Dokumenter',
} as const;

export const ALLE_STATUS = ['Ny', 'Under behandling', 'Afventer', 'Afgjort', 'Afvist'] as const;
export type SagStatus = (typeof ALLE_STATUS)[number];

export const ALLE_AARSAGER = ['Materiale', 'Høring', 'Vurderingssvar'] as const;
export type AfventerAarsag = (typeof ALLE_AARSAGER)[number];

export const ALLE_KONTAKTTYPER = ['Grundejer', 'Bygherre', 'Rådgiver'] as const;
export type KontaktType = (typeof ALLE_KONTAKTTYPER)[number];

export type Handling =
  | 'Statusskift'
  | 'Kommentar'
  | 'Sag taget'
  | 'Sag frigivet'
  | 'Opgave oprettet'
  | 'Opgave udført'
  | 'Dokument uploadet'
  | 'Link tilføjet';

export interface IPerson {
  Id: number;
  Title: string;
  EMail?: string;
}

export interface IUrlFelt {
  Url: string;
  Description?: string;
}

/** Én raekke i P8Ansogninger. */
export interface ISag {
  Id: number;
  Title: string;
  SubmissionUUID: string;
  SubmissionSerial: number;
  SubmissionSid: number;
  OS2FormsUrl?: IUrlFelt;
  Udfylder?: string;
  IndsendtAf?: KontaktType;
  AnsogningsDato?: string;
  Bemaerkninger?: string;
  ModtagetDato?: string;
  AfsluttetDato?: string;
  FlereGrundejere: boolean;
  BygherreSammeSomGrundejer: boolean;
  Status: SagStatus;
  AfventerAarsag?: AfventerAarsag;
  Ansvarlig?: IPerson;
  AnsvarligId?: number;
  AntalAdresser: number;
  AntalKontakter: number;
  AntalVedhaeftninger: number;
  AdresserTekst?: string;
  Grundejere?: string;
  /** SharePoints ETag. Bruges til at opdage samtidige aendringer. */
  etag?: string;
}

export interface IAdresse {
  Id: number;
  Title: string;
  Adresse?: string;
  Matrikel?: string;
  LokalitetsNummer?: string;
}

export interface IKontakt {
  Id: number;
  Title: string;
  KontaktType: KontaktType;
  ErUdfylder: boolean;
  Navn?: string;
  Firma?: string;
  CVR?: string;
  Email?: string;
  Telefon?: string;
  Adresse?: string;
}

export interface IBilag {
  Id: number;
  Title: string;
  FilId?: string;
  Filnavn?: string;
  FilUrl?: IUrlFelt;
}

export interface ILogPost {
  Id: number;
  Title: string;
  SagId: number;
  Handling: Handling;
  FraStatus?: string;
  TilStatus?: string;
  Kommentar?: string;
  TaggedeBrugere?: IPerson[];
  Created: string;
  Author: IPerson;
}

export interface INote {
  Id: number;
  SagId: number;
  Tekst: string;
  Created: string;
  Modified: string;
}

export interface IOpgave {
  Id: number;
  Title: string;
  SagId: number;
  Udfoert: boolean;
  Created: string;
}

export interface ILink {
  Id: number;
  Title: string;
  SagId: number;
  Url: IUrlFelt;
}

export interface IDokument {
  Id: number;
  Filnavn: string;
  ServerRelativeUrl: string;
  SagId: number;
  Modified: string;
}

/** Profildata til AnsvarligKort. Hentes uden Microsoft Graph. */
export interface IProfil {
  Id: number;
  Navn: string;
  Mail?: string;
  JobTitel?: string;
  Afdeling?: string;
  BilledeUrl: string;
}
