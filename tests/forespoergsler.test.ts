import {
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
