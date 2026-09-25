import { sikkerUrl } from '../src/webparts/jordportalen/domaene/sikkerhed';

describe('sikkerUrl', () => {
  it('accepterer https://', () => {
    expect(sikkerUrl('https://example.com')).toBe('https://example.com');
  });

  it('accepterer http://', () => {
    expect(sikkerUrl('http://example.com')).toBe('http://example.com');
  });

  it('afviser javascript:', () => {
    expect(sikkerUrl('javascript:alert(1)')).toBeUndefined();
  });

  it('afviser JavaScript: uanset store/smaa bogstaver', () => {
    expect(sikkerUrl('JavaScript:alert(1)')).toBeUndefined();
  });

  it('afviser data:', () => {
    expect(sikkerUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('afviser en relativ sti', () => {
    expect(sikkerUrl('/nogen/sti')).toBeUndefined();
  });

  it('afviser en tom streng', () => {
    expect(sikkerUrl('')).toBeUndefined();
  });

  it('afviser undefined', () => {
    expect(sikkerUrl(undefined)).toBeUndefined();
  });

  it('afviser javascript: med indledende whitespace', () => {
    // Browsere trimmer whitespace foer navigation, saa et naivt
    // startsWith('http')-tjek ville lukke denne igennem.
    expect(sikkerUrl('  javascript:alert(1)')).toBeUndefined();
  });
});
