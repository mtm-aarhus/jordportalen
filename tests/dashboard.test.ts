import {
  ALLE_KORT,
  erKortValgt,
  erStandard,
  filtrerSager,
  IVisning,
  kortGenvej,
  STANDARD_VISNING,
  taelNoegletal,
} from '../src/webparts/jordportalen/domaene/dashboard';
import { ISag, SagStatus } from '../src/webparts/jordportalen/domaene/typer';

const MIG = 7;
const KOLLEGA = 9;

function sag(felter: Partial<ISag>): ISag {
  return {
    Id: 1,
    Title: 'Ringvej 12, 8000 Aarhus C',
    SubmissionUUID: 'uuid',
    SubmissionSerial: 1,
    SubmissionSid: 1,
    FlereGrundejere: false,
    BygherreSammeSomGrundejer: false,
    Status: 'Ny',
    AntalAdresser: 1,
    AntalKontakter: 1,
    AntalVedhaeftninger: 0,
    ...felter,
  };
}

function visning(felter: Partial<IVisning>): IVisning {
  return { ...STANDARD_VISNING, ...felter };
}

const ids = (sager: ISag[]): number[] => sager.map((s) => s.Id);

const SAGER: ISag[] = [
  sag({ Id: 1, Status: 'Ny' }),
  sag({ Id: 2, Status: 'Under behandling', AnsvarligId: MIG }),
  sag({ Id: 3, Status: 'Afventer', AnsvarligId: KOLLEGA }),
  sag({ Id: 4, Status: 'Afgjort', AnsvarligId: MIG }),
  sag({ Id: 5, Status: 'Afvist' }),
];

describe('filtrerSager - udvalg', () => {
  it('viser aktive sager som standard', () => {
    expect(ids(filtrerSager(SAGER, STANDARD_VISNING, MIG))).toEqual([1, 2, 3]);
  });

  it('viser kun afsluttede', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'afsluttede' }), MIG))).toEqual([4, 5]);
  });

  it('viser alle', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'alle' }), MIG))).toEqual([1, 2, 3, 4, 5]);
  });

  it('viser en bestemt status', () => {
    expect(ids(filtrerSager(SAGER, visning({ udvalg: 'Afventer' }), MIG))).toEqual([3]);
  });

  it('viser en ukendt status fra SharePoint blandt de aktive', () => {
    const med = [...SAGER, sag({ Id: 6, Status: 'Genoptaget' as SagStatus })];
    expect(ids(filtrerSager(med, STANDARD_VISNING, MIG))).toEqual([1, 2, 3, 6]);
  });
});

describe('filtrerSager - hvem', () => {
  it('ledige er sager uden ansvarlig', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'ledige', udvalg: 'alle' }), MIG))).toEqual([1, 5]);
  });

  it('mine er sager med mig som ansvarlig', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'mine', udvalg: 'alle' }), MIG))).toEqual([2, 4]);
  });

  it('regner et tomt personfelt fra SharePoint (null) som ledigt', () => {
    // SharePoint returnerer null, ikke undefined, for et tomt personfelt.
    const nul = sag({ Id: 8, AnsvarligId: null as unknown as undefined });
    expect(ids(filtrerSager([nul], visning({ hvem: 'ledige' }), MIG))).toEqual([8]);
    expect(ids(filtrerSager([nul], visning({ hvem: 'mine' }), MIG))).toEqual([]);
  });

  it('kombinerer udvalg og hvem', () => {
    expect(ids(filtrerSager(SAGER, visning({ hvem: 'mine' }), MIG))).toEqual([2]);
  });
});

describe('filtrerSager - soegning', () => {
  const sager = [
    sag({ Id: 1, SubmissionSerial: 75, Title: 'Nørre Allé 3', AdresserTekst: 'Nørre Allé 3\nVestergade 1' }),
    sag({ Id: 2, SubmissionSerial: 12, Title: 'Ringvej 12', Grundejere: 'Mette Hansen\nJens Jensen' }),
    sag({ Id: 3, SubmissionSerial: 13, Title: 'Havnegade 1', AdresserTekst: undefined, Grundejere: undefined }),
  ];

  it('rammer sagsnummeret', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '75' }), MIG))).toEqual([1]);
  });

  it('rammer titlen', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'havnegade' }), MIG))).toEqual([3]);
  });

  it('rammer en adresse ud over den foerste', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'Vestergade' }), MIG))).toEqual([1]);
  });

  it('rammer en grundejer', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: 'jens jensen' }), MIG))).toEqual([2]);
  });

  it('er ligeglad med store og smaa bogstaver og mellemrum omkring', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '  NØRRE ALLÉ  ' }), MIG))).toEqual([1]);
  });

  it('tom soegning filtrerer intet', () => {
    expect(ids(filtrerSager(sager, visning({ soeg: '   ' }), MIG))).toEqual([1, 2, 3]);
  });

  it('bevarer raekkefoelgen fra serveren', () => {
    const omvendt = [...sager].reverse();
    expect(ids(filtrerSager(omvendt, STANDARD_VISNING, MIG))).toEqual([3, 2, 1]);
  });
});

describe('taelNoegletal', () => {
  it('taeller kun aktive sager', () => {
    expect(taelNoegletal(SAGER, MIG)).toEqual({ aktive: 3, ledige: 1, mine: 1, afventer: 1 });
  });

  it('taeller null som ledig', () => {
    const nul = sag({ Id: 8, AnsvarligId: null as unknown as undefined });
    expect(taelNoegletal([nul], MIG).ledige).toBe(1);
  });

  it('giver nul overalt for en tom liste', () => {
    expect(taelNoegletal([], MIG)).toEqual({ aktive: 0, ledige: 0, mine: 0, afventer: 0 });
  });
});

describe('kortGenvej og erKortValgt', () => {
  it('saetter udvalg og hvem og bevarer soegningen', () => {
    const fra = visning({ udvalg: 'afsluttede', hvem: 'mine', soeg: 'Ringvej' });
    expect(kortGenvej('aktive', fra)).toEqual({ udvalg: 'aktive', hvem: 'alle', soeg: 'Ringvej' });
    expect(kortGenvej('ledige', fra)).toEqual({ udvalg: 'aktive', hvem: 'ledige', soeg: 'Ringvej' });
    expect(kortGenvej('mine', fra)).toEqual({ udvalg: 'aktive', hvem: 'mine', soeg: 'Ringvej' });
    expect(kortGenvej('afventer', fra)).toEqual({ udvalg: 'Afventer', hvem: 'alle', soeg: 'Ringvej' });
  });

  it('fjerner en aaben sag fra visningen', () => {
    expect(kortGenvej('aktive', visning({ sag: 42 })).sag).toBeUndefined();
  });

  it('markerer netop det kort der svarer til visningen', () => {
    const valgte = (v: IVisning): string[] => ALLE_KORT.filter((k) => erKortValgt(k, v));
    expect(valgte(STANDARD_VISNING)).toEqual(['aktive']);
    expect(valgte(visning({ hvem: 'ledige' }))).toEqual(['ledige']);
    expect(valgte(visning({ udvalg: 'Afventer' }))).toEqual(['afventer']);
    expect(valgte(visning({ udvalg: 'afsluttede' }))).toEqual([]);
    expect(valgte(visning({ udvalg: 'Afventer', hvem: 'mine' }))).toEqual([]);
  });

  it('markerer uanset soegning', () => {
    expect(erKortValgt('aktive', visning({ soeg: 'x' }))).toBe(true);
  });
});

describe('erStandard', () => {
  it('er sand for standardvisningen, ogsaa med en aaben sag eller blank soegning', () => {
    expect(erStandard(STANDARD_VISNING)).toBe(true);
    expect(erStandard(visning({ sag: 3, soeg: '  ' }))).toBe(true);
  });

  it('er falsk naar udvalg, hvem eller soegning afviger', () => {
    expect(erStandard(visning({ udvalg: 'alle' }))).toBe(false);
    expect(erStandard(visning({ hvem: 'mine' }))).toBe(false);
    expect(erStandard(visning({ soeg: 'x' }))).toBe(false);
  });
});
