import {
  dashboardFilter,
  noteFilter,
  sagIdFilter,
  uuidFilter,
} from '../src/webparts/jordportalen/domaene/forespoergsler';

describe('noteFilter', () => {
  it('filtrerer paa baade sag og forfatter', () => {
    // Forfatterfiltret ligger i selve forespoergslen, ikke kun i UI'et.
    // Uden det ville en ny ansvarlig se den forriges private noter.
    expect(noteFilter(42, 7)).toBe('SagId eq 42 and Author/Id eq 7');
  });
});

describe('sagIdFilter', () => {
  it('bruger tal uden anfoerselstegn', () => {
    expect(sagIdFilter(42)).toBe('SagId eq 42');
  });
});

describe('uuidFilter', () => {
  it('saetter anfoerselstegn om tekstvaerdien', () => {
    expect(uuidFilter('abc-123')).toBe("SubmissionUUID eq 'abc-123'");
  });

  it('undgaar at et apostrof braekker forespoergslen', () => {
    expect(uuidFilter("a'b")).toBe("SubmissionUUID eq 'a''b'");
  });
});

describe('dashboardFilter', () => {
  it('giver en tom streng naar intet er valgt', () => {
    expect(dashboardFilter({})).toBe('');
  });

  it('filtrerer paa status', () => {
    expect(dashboardFilter({ status: 'Afventer' })).toBe("Status eq 'Afventer'");
  });

  it('filtrerer paa mine sager', () => {
    expect(dashboardFilter({ ansvarligId: 7 })).toBe('AnsvarligId eq 7');
  });

  it('filtrerer paa ledige sager', () => {
    expect(dashboardFilter({ kunLedige: true })).toBe('AnsvarligId eq null');
  });

  it('kombinerer flere kriterier med and', () => {
    expect(dashboardFilter({ status: 'Ny', kunLedige: true })).toBe(
      "Status eq 'Ny' and AnsvarligId eq null"
    );
  });

  it('ignorerer ansvarligId naar kunLedige er sat, da de udelukker hinanden', () => {
    expect(dashboardFilter({ ansvarligId: 7, kunLedige: true })).toBe('AnsvarligId eq null');
  });
});
