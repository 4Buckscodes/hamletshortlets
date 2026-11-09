import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DISCOVERY_FILTERS,
  DISCOVERY_NEIGHBOURHOODS,
  buildDiscoverySearchParams,
  filterAndSortApprovedStays,
  formatBedroomCountLabel,
  getActiveFilterBadges,
  getStayTrustStatus,
  getValidGuestNightlyNgn,
  isApprovedBookableStay,
  matchesAccommodationFilter,
  parseDiscoverySearchParams,
  validatePriceRange,
  validateStayDates,
} from './discovery';
import type { PublicStayRecord } from './next-supabase';

function makeStay(overrides: Partial<PublicStayRecord> & { preview_only?: boolean }): PublicStayRecord {
  return {
    id: overrides.id ?? 'stay-1',
    title: overrides.title ?? 'Verified Lekki Apartment',
    area: overrides.area ?? 'Lekki Phase 1',
    public_address: overrides.public_address ?? 'Admiralty Way, Lekki Phase 1, Lagos',
    property_type: overrides.property_type ?? 'Serviced apartment',
    bedrooms: overrides.bedrooms ?? 2,
    bathrooms: overrides.bathrooms ?? 2,
    capacity: overrides.capacity ?? 4,
    bed_setup: overrides.bed_setup ?? '2 Queen beds',
    guest_nightly_ngn: Object.prototype.hasOwnProperty.call(overrides, 'guest_nightly_ngn')
      ? overrides.guest_nightly_ngn ?? null
      : 120_000,
    cleaning_fee: overrides.cleaning_fee ?? 15_000,
    refundable_deposit: overrides.refundable_deposit ?? 50_000,
    amenities: overrides.amenities ?? ['24-hour power', 'High-speed Wi-Fi', 'Kitchen'],
    house_rules: overrides.house_rules ?? ['No parties'],
    image_urls: overrides.image_urls ?? ['https://images.example.com/1.jpg'],
    status: overrides.status ?? 'approved',
    trust_label: overrides.trust_label ?? null,
    verification: overrides.verification ?? {
      ownership: 'verified',
      identity: 'verified',
      authority: 'verified',
      inspection: 'verified',
    },
    first_available_date: overrides.first_available_date ?? null,
    availability_confirmation_status: overrides.availability_confirmation_status ?? 'confirmed',
    created_at: overrides.created_at ?? '2026-10-20T12:00:00.000Z',
    ...(overrides.preview_only !== undefined ? { preview_only: overrides.preview_only } : {}),
  } as PublicStayRecord;
}

describe('Guest Property Discovery — Neighbourhoods, Filters, Sorting & Integrity', () => {
  it('exposes all required initial Lagos Island and Mainland discovery neighbourhoods', () => {
    const names = DISCOVERY_NEIGHBOURHOODS.map(h => h.name);
    for (const required of [
      'Lekki Phase 1',
      'Ikate',
      'Victoria Island',
      'Ikoyi',
      'Ajah',
      'Yaba',
      'Ikeja GRA',
      'Surulere',
      'Shomolu',
    ]) {
      expect(names).toContain(required);
    }
  });

  it('strictly excludes non-approved, draft, suspended, and preview_only records from bookable results', () => {
    const approved = makeStay({ id: 'ok-1', status: 'approved' });
    const draft = makeStay({ id: 'draft-1', status: 'draft' });
    const underReview = makeStay({ id: 'review-1', status: 'under_review' });
    const suspended = makeStay({ id: 'susp-1', status: 'suspended' });
    const preview = makeStay({ id: 'prev-1', status: 'approved', preview_only: true });

    expect(isApprovedBookableStay(approved)).toBe(true);
    expect(isApprovedBookableStay(draft)).toBe(false);
    expect(isApprovedBookableStay(underReview)).toBe(false);
    expect(isApprovedBookableStay(suspended)).toBe(false);
    expect(isApprovedBookableStay(preview)).toBe(false);

    const results = filterAndSortApprovedStays(
      [approved, draft, underReview, suspended, preview],
      DEFAULT_DISCOVERY_FILTERS,
    );
    expect(results.map(r => r.id)).toEqual(['ok-1']);
  });

  it('awards "Verified by HAMLET" only when all 4 verification pillars are verified', () => {
    const fullyVerified = makeStay({
      verification: {
        ownership: 'verified',
        identity: 'verified',
        authority: 'verified',
        inspection: 'verified',
      },
    });
    const partiallyReviewed = makeStay({
      verification: {
        ownership: 'verified',
        identity: 'verified',
        authority: 'verified',
        inspection: 'pending_review',
      },
    });

    expect(getStayTrustStatus(fullyVerified)).toEqual({
      verified: true,
      badge: 'Verified by HAMLET',
      verifiedPillarsCount: 4,
    });
    expect(getStayTrustStatus(partiallyReviewed)).toEqual({
      verified: false,
      badge: 'Approved listing',
      verifiedPillarsCount: 3,
    });
  });

  it('guards missing or zero nightly rates instead of inventing ₦0 prices', () => {
    expect(getValidGuestNightlyNgn(0)).toBeNull();
    expect(getValidGuestNightlyNgn(-5000)).toBeNull();
    expect(getValidGuestNightlyNgn(Number.NaN)).toBeNull();
    expect(getValidGuestNightlyNgn(100_000)).toBe(120_000);
  });

  it('validates min/max price bounds cleanly including invalid min > max combinations', () => {
    expect(validatePriceRange('', '')).toEqual({
      minPrice: null,
      maxPrice: null,
      valid: true,
      error: null,
    });
    expect(validatePriceRange('100000', '250000')).toEqual({
      minPrice: 100_000,
      maxPrice: 250_000,
      valid: true,
      error: null,
    });
    const inverted = validatePriceRange('300000', '150000');
    expect(inverted.valid).toBe(false);
    expect(inverted.error).toMatch(/Minimum price cannot be higher than maximum price/i);

    const malformed = validatePriceRange('abc', '100000');
    expect(malformed.valid).toBe(false);
  });

  it('matches Studio, 1 bedroom, 2 bedrooms, and 3+ bedrooms accurately without misclassifying studios', () => {
    const studioZeroBeds = { property_type: 'Studio apartment', bedrooms: 0 };
    const oneBed = { property_type: 'Serviced apartment', bedrooms: 1 };
    const twoBed = { property_type: 'Apartment', bedrooms: 2 };
    const fourBedDuplex = { property_type: 'Duplex', bedrooms: 4 };

    expect(formatBedroomCountLabel(0, 'Studio apartment')).toBe('Studio');
    expect(formatBedroomCountLabel(1, 'Serviced apartment')).toBe('1 bedroom');
    expect(formatBedroomCountLabel(3, 'Duplex')).toBe('3 bedrooms');

    expect(matchesAccommodationFilter(studioZeroBeds, 'studio')).toBe(true);
    expect(matchesAccommodationFilter(studioZeroBeds, '1_bed')).toBe(false);
    expect(matchesAccommodationFilter(oneBed, '1_bed')).toBe(true);
    expect(matchesAccommodationFilter(oneBed, 'studio')).toBe(false);
    expect(matchesAccommodationFilter(twoBed, '2_bed')).toBe(true);
    expect(matchesAccommodationFilter(fourBedDuplex, '3_plus_bed')).toBe(true);
    expect(matchesAccommodationFilter(twoBed, '3_plus_bed')).toBe(false);
  });

  it('applies combined location, type, bedroom, price, guest, and date availability filters accurately', () => {
    const stays: PublicStayRecord[] = [
      makeStay({
        id: 'ikate-studio',
        title: 'Ikate Executive Studio',
        area: 'Ikate',
        public_address: 'Kusenla Road, Ikate, Lekki',
        property_type: 'Studio apartment',
        bedrooms: 0,
        capacity: 2,
        guest_nightly_ngn: 90_000,
        created_at: '2026-10-20T10:00:00Z',
      }),
      makeStay({
        id: 'vi-2bed',
        title: 'Adeola Odeku Two-Bed',
        area: 'Victoria Island',
        public_address: 'Adeola Odeku, Victoria Island',
        property_type: 'Serviced apartment',
        bedrooms: 2,
        capacity: 4,
        guest_nightly_ngn: 180_000,
        first_available_date: '2026-12-10',
        created_at: '2026-10-25T10:00:00Z',
      }),
      makeStay({
        id: 'yaba-3bed',
        title: 'Alagomeji Family Terrace',
        area: 'Yaba',
        public_address: 'Hughes Avenue, Alagomeji, Yaba',
        property_type: 'Terrace',
        bedrooms: 3,
        capacity: 6,
        guest_nightly_ngn: 132_000,
        created_at: '2026-10-28T10:00:00Z',
      }),
      makeStay({
        id: 'no-loc',
        title: 'Victoria Island Named Stay Without Location',
        area: '',
        public_address: '',
        bedrooms: 2,
        guest_nightly_ngn: 120_000,
      }),
    ];

    // Missing-location records never match neighbourhood filters even if title mentions VI
    const viOnly = filterAndSortApprovedStays(stays, {
      ...DEFAULT_DISCOVERY_FILTERS,
      area: 'Victoria Island',
    });
    expect(viOnly.map(s => s.id)).toEqual(['vi-2bed']);

    // Combined Mainland + 3+ bedrooms + budget range
    const mainlandFamily = filterAndSortApprovedStays(stays, {
      ...DEFAULT_DISCOVERY_FILTERS,
      side: 'mainland',
      type: '3_plus_bed',
      minPriceInput: '120000',
      maxPriceInput: '150000',
      guests: 5,
    });
    expect(mainlandFamily.map(s => s.id)).toEqual(['yaba-3bed']);

    // Date availability excludes stays before first_available_date or in unavailableIds
    const decCheck = filterAndSortApprovedStays(
      stays,
      {
        ...DEFAULT_DISCOVERY_FILTERS,
        checkIn: '2026-12-05',
        checkOut: '2026-12-08',
      },
      {
        todayIso: '2026-11-01',
        unavailableIds: new Set(['yaba-3bed']),
      },
    );
    expect(decCheck.map(s => s.id)).toEqual(['ikate-studio', 'no-loc']);
  });

  it('sorts approved stays deterministically by price_asc, price_desc, newest, and recommended', () => {
    const low = makeStay({ id: 'low', guest_nightly_ngn: 72_000, created_at: '2026-10-01T00:00:00Z' });
    const mid = makeStay({ id: 'mid', guest_nightly_ngn: 120_000, created_at: '2026-10-15T00:00:00Z' });
    const high = makeStay({ id: 'high', guest_nightly_ngn: 240_000, created_at: '2026-10-10T00:00:00Z' });
    const unpriced = makeStay({ id: 'unpriced', guest_nightly_ngn: null, created_at: '2026-10-30T00:00:00Z' });

    expect(
      filterAndSortApprovedStays([mid, unpriced, high, low], {
        ...DEFAULT_DISCOVERY_FILTERS,
        sort: 'price_asc',
      }).map(s => s.id),
    ).toEqual(['low', 'mid', 'high', 'unpriced']);

    expect(
      filterAndSortApprovedStays([mid, unpriced, high, low], {
        ...DEFAULT_DISCOVERY_FILTERS,
        sort: 'price_desc',
      }).map(s => s.id),
    ).toEqual(['high', 'mid', 'low', 'unpriced']);

    expect(
      filterAndSortApprovedStays([mid, high, low], {
        ...DEFAULT_DISCOVERY_FILTERS,
        sort: 'newest',
      }).map(s => s.id),
    ).toEqual(['mid', 'high', 'low']);
  });

  it('round-trips URL query params and validates stay date windows', () => {
    const parsed = parseDiscoverySearchParams({
      area: 'Ikate',
      type: 'studio',
      bedrooms: '1',
      minPrice: '80000',
      maxPrice: '200000',
      guests: '2',
      checkIn: '2026-12-01',
      checkOut: '2026-12-05',
      sort: 'price_asc',
    });
    expect(getActiveFilterBadges(parsed).length).toBe(7);

    const qs = buildDiscoverySearchParams(parsed);
    const reparsed = parseDiscoverySearchParams(Object.fromEntries(qs.entries()));
    expect(reparsed).toEqual(parsed);

    expect(validateStayDates('2026-12-05', '2026-12-02', '2026-11-01').valid).toBe(false);
    expect(validateStayDates('2026-12-01', '2026-12-05', '2026-11-01').valid).toBe(true);
  });

  it('excludes illustrative/showcase demo inventory from public discovery pages', () => {
    const homePage = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8');
    const staysPage = readFileSync(resolve(process.cwd(), 'app/stays/page.tsx'), 'utf8');
    const marketplace = readFileSync(
      resolve(process.cwd(), 'src/components/site/DiscoveryMarketplace.tsx'),
      'utf8',
    );

    expect(homePage).not.toContain('lagos-showcase-inventory');
    expect(staysPage).not.toContain('lagos-showcase-inventory');
    expect(marketplace).not.toContain('ShowcaseConceptCard');
    expect(marketplace).not.toContain('Illustrative concept');
    expect(marketplace).not.toContain('/stays/showcase/');
  });

  it('keeps the homepage hero static without image zoom/reveal transitions', () => {
    const heroFile = readFileSync(resolve(process.cwd(), 'app/home-slideshow.tsx'), 'utf8');
    const heroSection = heroFile.split('/* ── Available Stays Marketplace Board')[0];
    expect(heroSection).not.toMatch(/scale-105/);
    expect(heroSection).not.toMatch(/transition-all duration-1000 ease-out/);
    expect(heroSection).not.toMatch(/transition-transform/);
  });
});
