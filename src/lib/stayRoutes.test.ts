import { describe, expect, it } from 'vitest';
import { buildStayRedirectPath, isValidStayRef, stayPath } from './stayRoutes';

describe('stay routes', () => {
  it('accepts slugs and ids and rejects filter-breaking input', () => {
    expect(isValidStayRef('spacious-shortlet-apartment-akoka-yaba-4002928a')).toBe(true);
    expect(isValidStayRef('c025a253-3e3d-4ea1-80e2-dd354c545b3b')).toBe(true);
    for (const bad of ['', 'a,id.neq.b', 'a)', 'a.b', 'a b', '../x', '-leading', 'x'.repeat(121)]) {
      expect(isValidStayRef(bad)).toBe(false);
    }
  });

  it('prefers the slug and falls back to the id', () => {
    expect(stayPath({ id: 'abc-123', slug: 'lekki-flat-abc12345' })).toBe('/stays/lekki-flat-abc12345');
    expect(stayPath({ id: 'abc-123', slug: '' })).toBe('/stays/abc-123');
    expect(stayPath({ id: 'abc-123' })).toBe('/stays/abc-123');
  });

  it('keeps referral and date parameters when redirecting an id address to its slug', () => {
    expect(buildStayRedirectPath('lekki-flat-abc12345')).toBe('/stays/lekki-flat-abc12345');
    expect(
      buildStayRedirectPath('lekki-flat-abc12345', { ref: 'HML-9X', checkIn: '2026-12-10', checkOut: '2026-12-12', guests: '2' }),
    ).toBe('/stays/lekki-flat-abc12345?ref=HML-9X&checkIn=2026-12-10&checkOut=2026-12-12&guests=2');
    expect(buildStayRedirectPath('s', { tag: ['a', 'b'], skip: undefined })).toBe('/stays/s?tag=a&tag=b');
  });
});
