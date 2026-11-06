import { describe, expect, it } from 'vitest';
import { buildPropertyPath, buildPropertySlug } from './property-slugs';

describe('SEO-friendly property URLs', () => {
  it('creates readable, stable slugs with a short unique ID suffix', () => {
    const property = {
      id: '4002928a-4c0a-4771-b901-128bdfd6c1ab',
      title: 'Adeola Executive Two-Bedroom',
      area: 'Victoria Island',
    };

    expect(buildPropertySlug(property)).toBe(
      'adeola-executive-two-bedroom-victoria-island-bdfd6c1ab',
    );
    expect(buildPropertyPath(property)).toBe(
      '/stays/adeola-executive-two-bedroom-victoria-island-bdfd6c1ab',
    );
  });

  it('normalizes punctuation and accents without producing empty path segments', () => {
    expect(
      buildPropertySlug({
        id: '12345678-1234-4234-8234-123456789abc',
        title: 'Élégant & Modern — 2 Bedroom!',
        area: 'Lekki Phase 1',
      }),
    ).toBe('elegant-and-modern-2-bedroom-lekki-phase-1-56789abc');
  });

  it('keeps otherwise identical property titles unique', () => {
    const first = buildPropertySlug({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Executive Apartment',
      area: 'Lekki',
    });
    const second = buildPropertySlug({
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Executive Apartment',
      area: 'Lekki',
    });
    expect(first).not.toBe(second);
  });
});
