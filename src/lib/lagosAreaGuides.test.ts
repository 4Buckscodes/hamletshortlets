import { describe, expect, it } from 'vitest';
import { LAGOS_AREA_GUIDES, getLagosAreaGuide, stayMatchesAreaGuide } from './lagosAreaGuides';

describe('Lagos area guides', () => {
  it('has unique slugs and every nearby link points at a real guide', () => {
    const slugs = LAGOS_AREA_GUIDES.map(guide => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const guide of LAGOS_AREA_GUIDES) {
      expect(guide.summary.length).toBeGreaterThan(20);
      for (const near of guide.nearby) expect(getLagosAreaGuide(near)).toBeDefined();
      expect(guide.nearby).not.toContain(guide.slug);
    }
  });

  it('matches listings to their area, including neighbourhoods inside it', () => {
    const yaba = getLagosAreaGuide('yaba')!;
    expect(stayMatchesAreaGuide({ area: 'Akoka' }, yaba)).toBe(true);
    expect(stayMatchesAreaGuide({ area: 'Victoria Island' }, yaba)).toBe(false);
    const lekki = getLagosAreaGuide('lekki')!;
    expect(stayMatchesAreaGuide({ area: 'Oniru' }, lekki)).toBe(true);
    expect(stayMatchesAreaGuide({ area: 'Ikate' }, lekki)).toBe(true);
  });

  it('never places a listing with no location data into an area', () => {
    for (const guide of LAGOS_AREA_GUIDES) {
      expect(stayMatchesAreaGuide({ area: null, public_address: null }, guide)).toBe(false);
    }
  });
});
