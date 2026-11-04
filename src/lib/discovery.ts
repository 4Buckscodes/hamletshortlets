import { hasReliableLocationData, isMainlandArea, matchesLagosAreaFilter } from './areas';
import type { PublicStayRecord } from './next-supabase';
import { guestFacingNightlyNgn, lagosIsoDateOffset } from './pricing';

export type AccommodationFilterValue = '' | 'studio' | '1_bed' | '2_bed' | '3_plus_bed' | string;

export type DiscoverySortKey = 'recommended' | 'price_asc' | 'price_desc' | 'newest';

export type CorridorSideFilter = 'all' | 'mainland' | 'island';

export interface DiscoveryNeighbourhoodItem {
  name: string;
  corridor: 'Island' | 'Mainland';
  subtitle: string;
  image: string;
  alt: string;
}

/**
 * Canonical Lagos neighbourhoods surfaced in the horizontal discovery rail,
 * covering all required Island/Lekki and Mainland corridors.
 */
export const DISCOVERY_NEIGHBOURHOODS: readonly DiscoveryNeighbourhoodItem[] = [
  {
    name: 'Lekki Phase 1',
    corridor: 'Island',
    subtitle: 'Admiralty Way · Freedom Way',
    image: '/images/prop/pool-1.jpg',
    alt: 'Contemporary serviced apartment exterior in Lekki Phase 1, Lagos',
  },
  {
    name: 'Ikate',
    corridor: 'Island',
    subtitle: 'Elegushi · Kusenla Road',
    image: '/images/prop/bed-2.jpg',
    alt: 'Furnished bedroom interior representing Ikate shortlet stays in Lagos',
  },
  {
    name: 'Victoria Island',
    corridor: 'Island',
    subtitle: 'Adeola Odeku · Ahmadu Bello',
    image: '/images/prop/living-1.jpg',
    alt: 'Bright apartment living area representing Victoria Island stays in Lagos',
  },
  {
    name: 'Ikoyi',
    corridor: 'Island',
    subtitle: 'Old Ikoyi · Bourdillon · Falomo',
    image: '/images/prop/penthouse.jpg',
    alt: 'Spacious residential suite representing Ikoyi shortlets in Lagos',
  },
  {
    name: 'Ajah',
    corridor: 'Island',
    subtitle: 'Chevron · Orchid Road · Sangotedo',
    image: '/images/prop/exterior-1.jpg',
    alt: 'Residential duplex and terrace corridor representing Ajah, Lagos',
  },
  {
    name: 'Yaba',
    corridor: 'Mainland',
    subtitle: 'Sabo · Alagomeji · Akoka',
    image: '/images/prop/studio-1.jpg',
    alt: 'Modern compact apartment representing Yaba Mainland stays in Lagos',
  },
  {
    name: 'Ikeja GRA',
    corridor: 'Mainland',
    subtitle: 'Isaac John · Airport axis',
    image: '/images/prop/duplex.jpg',
    alt: 'Executive apartment living room representing Ikeja GRA, Lagos',
  },
  {
    name: 'Surulere',
    corridor: 'Mainland',
    subtitle: 'Bode Thomas · Adeniran Ogunsanya',
    image: '/images/prop/bed-1.jpg',
    alt: 'Warm furnished bedroom representing Surulere Mainland stays in Lagos',
  },
  {
    name: 'Shomolu',
    corridor: 'Mainland',
    subtitle: 'Palmgrove · Onipanu · Gbagada',
    image: '/images/prop/kitchen-1.jpg',
    alt: 'Fitted apartment kitchen representing Shomolu and Palmgrove, Lagos',
  },
] as const;

export const ACCOMMODATION_TYPE_OPTIONS: ReadonlyArray<{
  value: '' | 'studio' | '1_bed' | '2_bed' | '3_plus_bed';
  label: string;
}> = [
  { value: '', label: 'Any type' },
  { value: 'studio', label: 'Studio' },
  { value: '1_bed', label: '1 bedroom' },
  { value: '2_bed', label: '2 bedrooms' },
  { value: '3_plus_bed', label: '3+ bedrooms' },
] as const;

export const BEDROOM_FILTER_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 0, label: 'Any' },
  { value: 1, label: '1+ bedrooms' },
  { value: 2, label: '2+ bedrooms' },
  { value: 3, label: '3+ bedrooms' },
  { value: 4, label: '4+ bedrooms' },
] as const;

export const DISCOVERY_SORT_OPTIONS: ReadonlyArray<{
  value: DiscoverySortKey;
  label: string;
}> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: lowest first' },
  { value: 'price_desc', label: 'Price: highest first' },
  { value: 'newest', label: 'Recently added' },
] as const;

const VERIFICATION_PILLARS = ['ownership', 'identity', 'authority', 'inspection'] as const;

/**
 * Strict marketplace publication guard:
 * Only real properties whose `status` is `'approved'` and that are NOT preview-only
 * may appear as bookable marketplace listings.
 */
export function isApprovedBookableStay(
  stay: Partial<PublicStayRecord> & { preview_only?: boolean } | null | undefined,
): stay is PublicStayRecord {
  if (!stay || !stay.id || !stay.title) return false;
  if (stay.preview_only === true) return false;
  return stay.status === 'approved';
}

export function getStayTrustStatus(stay: Pick<PublicStayRecord, 'status' | 'verification'>): {
  verified: boolean;
  badge: 'Verified by HAMLET' | 'Approved listing';
  verifiedPillarsCount: number;
} {
  const verification = stay.verification ?? {};
  const verifiedPillarsCount = VERIFICATION_PILLARS.filter(
    pillar => verification[pillar] === 'verified',
  ).length;
  const verified =
    stay.status === 'approved' && verifiedPillarsCount === VERIFICATION_PILLARS.length;

  return {
    verified,
    badge: verified ? 'Verified by HAMLET' : 'Approved listing',
    verifiedPillarsCount,
  };
}

/**
 * Computes the guest-facing domestic NGN nightly price from the owner's listed rate `B`,
 * returning `null` if the underlying listing has no valid positive nightly rate.
 * Never invents or defaults to ₦0.
 */
export function getValidGuestNightlyNgn(ownerNightlyRate: unknown): number | null {
  const num = Number(ownerNightlyRate);
  if (!Number.isFinite(num) || num <= 0) return null;
  const computed = guestFacingNightlyNgn(num);
  return Number.isFinite(computed) && computed > 0 ? computed : null;
}

export function isStudioProperty(propertyType: string | null | undefined, bedrooms: number | null | undefined): boolean {
  const cleanType = (propertyType || '').trim().toLowerCase();
  const bedCount = bedrooms === null || bedrooms === undefined ? null : Number(bedrooms);
  if (bedCount === 0) return true;
  if (/\bstudio\b/.test(cleanType) && (bedCount === null || bedCount <= 1)) return true;
  return false;
}

export function formatAccommodationLabel(
  propertyType: string | null | undefined,
  bedrooms: number | null | undefined,
): string {
  const cleanType = (propertyType || '').trim();
  if (isStudioProperty(cleanType, bedrooms)) {
    return cleanType && /\bstudio\b/i.test(cleanType) ? cleanType : 'Studio';
  }
  return cleanType || 'Shortlet';
}

export function formatBedroomCountLabel(
  bedrooms: number | null | undefined,
  propertyType?: string | null,
): string {
  if (isStudioProperty(propertyType, bedrooms) && (bedrooms === 0 || bedrooms === null || bedrooms === undefined)) {
    return 'Studio';
  }
  const count = Math.max(0, Math.trunc(Number(bedrooms ?? 0)));
  if (count === 0) return 'Studio';
  return count === 1 ? '1 bedroom' : `${count} bedrooms`;
}

export function normalizeAccommodationFilterValue(raw: string | undefined | null): AccommodationFilterValue {
  const clean = (raw || '').trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (lower === 'any' || lower === 'any type' || lower === 'all') return '';
  if (lower === 'studio' || lower === 'studio apartment') return 'studio';
  if (lower === '1_bed' || lower === '1 bedroom' || lower === '1 bed') return '1_bed';
  if (lower === '2_bed' || lower === '2 bedrooms' || lower === '2 beds') return '2_bed';
  if (lower === '3_plus_bed' || lower === '3+ bedrooms' || lower === '3+ beds') return '3_plus_bed';
  return clean;
}

export function formatAccommodationFilterLabel(value: AccommodationFilterValue): string {
  const normalized = normalizeAccommodationFilterValue(value);
  const found = ACCOMMODATION_TYPE_OPTIONS.find(opt => opt.value === normalized);
  return found ? found.label : normalized;
}

export function matchesAccommodationFilter(
  item: { property_type?: string | null; bedrooms?: number | null },
  rawFilter: AccommodationFilterValue,
): boolean {
  const filter = normalizeAccommodationFilterValue(rawFilter);
  if (!filter) return true;

  const beds = Math.max(0, Math.trunc(Number(item.bedrooms ?? 0)));
  const studio = isStudioProperty(item.property_type, beds);

  if (filter === 'studio') return studio;
  if (filter === '1_bed') return !studio && beds === 1;
  if (filter === '2_bed') return beds === 2;
  if (filter === '3_plus_bed') return beds >= 3;

  // Support architectural property_type deep links (e.g. "Duplex", "Penthouse", "Serviced apartment")
  return (item.property_type || '').toLowerCase().includes(filter.toLowerCase());
}

export interface PriceRangeValidation {
  minPrice: number | null;
  maxPrice: number | null;
  valid: boolean;
  error: string | null;
}

function parseSinglePriceInput(raw: string | number | null | undefined): {
  value: number | null;
  invalid: boolean;
} {
  if (raw === null || raw === undefined) return { value: null, invalid: false };
  const clean = String(raw).replace(/[\s,₦]/g, '').trim();
  if (!clean) return { value: null, invalid: false };
  if (!/^\d+(\.\d+)?$/.test(clean)) return { value: null, invalid: true };
  const parsed = Number(clean);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    return { value: null, invalid: true };
  }
  return { value: Math.round(parsed), invalid: false };
}

export function validatePriceRange(
  minInput: string | number | null | undefined,
  maxInput: string | number | null | undefined,
): PriceRangeValidation {
  const minParsed = parseSinglePriceInput(minInput);
  const maxParsed = parseSinglePriceInput(maxInput);

  if (minParsed.invalid || maxParsed.invalid) {
    return {
      minPrice: minParsed.value,
      maxPrice: maxParsed.value,
      valid: false,
      error: 'Enter valid non-negative Naira amounts for minimum and maximum price.',
    };
  }

  if (
    minParsed.value !== null &&
    maxParsed.value !== null &&
    minParsed.value > maxParsed.value
  ) {
    return {
      minPrice: minParsed.value,
      maxPrice: maxParsed.value,
      valid: false,
      error: 'Minimum price cannot be higher than maximum price.',
    };
  }

  return {
    minPrice: minParsed.value,
    maxPrice: maxParsed.value,
    valid: true,
    error: null,
  };
}

export interface DiscoveryFilterState {
  area: string;
  side: CorridorSideFilter;
  type: AccommodationFilterValue;
  minBedrooms: number;
  minPriceInput: string;
  maxPriceInput: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  sort: DiscoverySortKey;
}

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilterState = {
  area: '',
  side: 'all',
  type: '',
  minBedrooms: 0,
  minPriceInput: '',
  maxPriceInput: '',
  guests: 1,
  checkIn: '',
  checkOut: '',
  sort: 'recommended',
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDateString(value: string | undefined | null): value is string {
  if (!value || !ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateStayDates(
  checkIn: string,
  checkOut: string,
  todayIso: string = lagosIsoDateOffset(0),
): { valid: boolean; hasAnyDate: boolean; error: string | null } {
  const cleanIn = checkIn.trim();
  const cleanOut = checkOut.trim();
  if (!cleanIn && !cleanOut) {
    return { valid: false, hasAnyDate: false, error: null };
  }
  if (!cleanIn || !cleanOut) {
    return {
      valid: false,
      hasAnyDate: true,
      error: 'Select both check-in and check-out dates to check calendar availability.',
    };
  }
  if (!isValidIsoDateString(cleanIn) || !isValidIsoDateString(cleanOut)) {
    return {
      valid: false,
      hasAnyDate: true,
      error: 'Enter valid calendar dates.',
    };
  }
  if (cleanIn < todayIso) {
    return {
      valid: false,
      hasAnyDate: true,
      error: `Check-in date must be on or after ${todayIso}.`,
    };
  }
  if (cleanOut <= cleanIn) {
    return {
      valid: false,
      hasAnyDate: true,
      error: 'Check-out date must be after check-in date.',
    };
  }
  return { valid: true, hasAnyDate: true, error: null };
}

export function filterAndSortApprovedStays(
  stays: ReadonlyArray<PublicStayRecord>,
  filters: DiscoveryFilterState,
  options?: {
    unavailableIds?: ReadonlySet<string> | null;
    todayIso?: string;
  },
): PublicStayRecord[] {
  const priceCheck = validatePriceRange(filters.minPriceInput, filters.maxPriceInput);
  if (!priceCheck.valid) return [];

  const dateCheck = validateStayDates(
    filters.checkIn,
    filters.checkOut,
    options?.todayIso,
  );

  const filtered = stays.filter(stay => {
    if (!isApprovedBookableStay(stay)) return false;

    const areaVal = (stay.area || '').trim();
    const addrVal = (stay.public_address || '').trim();

    if (filters.side === 'mainland' && !isMainlandArea(areaVal || addrVal)) return false;
    if (filters.side === 'island') {
      if (!areaVal && !addrVal) return false;
      if (isMainlandArea(areaVal || addrVal)) return false;
    }

    if (
      filters.area.trim() &&
      !matchesLagosAreaFilter(
        { area: areaVal, address: addrVal, title: stay.title },
        filters.area,
      )
    ) {
      return false;
    }

    if (!matchesAccommodationFilter(stay, filters.type)) {
      return false;
    }

    if (filters.minBedrooms > 0) {
      const beds = Math.max(0, Math.trunc(Number(stay.bedrooms ?? 0)));
      if (beds < filters.minBedrooms) return false;
    }

    if (filters.guests > 1) {
      const cap = Math.max(0, Math.trunc(Number(stay.capacity ?? 0)));
      if (cap < filters.guests) return false;
    }

    const nightlyNgn = getValidGuestNightlyNgn(stay.nightly_rate);
    if (priceCheck.minPrice !== null) {
      if (nightlyNgn === null || nightlyNgn < priceCheck.minPrice) return false;
    }
    if (priceCheck.maxPrice !== null) {
      if (nightlyNgn === null || nightlyNgn > priceCheck.maxPrice) return false;
    }

    if (dateCheck.valid) {
      if (stay.first_available_date && filters.checkIn < stay.first_available_date) {
        return false;
      }
      if (options?.unavailableIds?.has(stay.id)) {
        return false;
      }
    }

    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    const priceA = getValidGuestNightlyNgn(a.nightly_rate);
    const priceB = getValidGuestNightlyNgn(b.nightly_rate);

    if (filters.sort === 'price_asc') {
      if (priceA === null && priceB === null) return 0;
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return priceA - priceB;
    }

    if (filters.sort === 'price_desc') {
      if (priceA === null && priceB === null) return 0;
      if (priceA === null) return 1;
      if (priceB === null) return -1;
      return priceB - priceA;
    }

    if (filters.sort === 'newest') {
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    }

    // 'recommended': deterministic, non-fabricated ranking using real listing completeness & verification:
    // 1. All-4-pillars verified status, 2. Real property photography, 3. Confirmed location data,
    // 4. Valid positive nightly rate, 5. Verified pillar count, 6. Newest created_at
    const trustA = getStayTrustStatus(a);
    const trustB = getStayTrustStatus(b);
    if (trustA.verified !== trustB.verified) return trustA.verified ? -1 : 1;

    const hasPhotosA = Array.isArray(a.image_urls) && a.image_urls.some(Boolean);
    const hasPhotosB = Array.isArray(b.image_urls) && b.image_urls.some(Boolean);
    if (hasPhotosA !== hasPhotosB) return hasPhotosA ? -1 : 1;

    const hasLocA = hasReliableLocationData({ area: a.area, address: a.public_address });
    const hasLocB = hasReliableLocationData({ area: b.area, address: b.public_address });
    if (hasLocA !== hasLocB) return hasLocA ? -1 : 1;

    const hasPriceA = priceA !== null;
    const hasPriceB = priceB !== null;
    if (hasPriceA !== hasPriceB) return hasPriceA ? -1 : 1;

    if (trustA.verifiedPillarsCount !== trustB.verifiedPillarsCount) {
      return trustB.verifiedPillarsCount - trustA.verifiedPillarsCount;
    }

    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  return sorted;
}

export interface ActiveFilterBadge {
  key:
    | 'area'
    | 'side'
    | 'type'
    | 'minBedrooms'
    | 'minPrice'
    | 'maxPrice'
    | 'guests'
    | 'dates';
  label: string;
}

export function getActiveFilterBadges(filters: DiscoveryFilterState): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];
  if (filters.area.trim()) {
    badges.push({ key: 'area', label: filters.area.trim() });
  } else if (filters.side !== 'all') {
    badges.push({
      key: 'side',
      label: filters.side === 'mainland' ? 'Lagos Mainland' : 'Lagos Island',
    });
  }

  if (filters.type) {
    badges.push({
      key: 'type',
      label: formatAccommodationFilterLabel(filters.type),
    });
  }

  if (filters.minBedrooms > 0) {
    badges.push({
      key: 'minBedrooms',
      label: `${filters.minBedrooms}+ bedrooms`,
    });
  }

  const priceCheck = validatePriceRange(filters.minPriceInput, filters.maxPriceInput);
  if (priceCheck.minPrice !== null) {
    badges.push({
      key: 'minPrice',
      label: `Min ₦${priceCheck.minPrice.toLocaleString('en-NG')}`,
    });
  }
  if (priceCheck.maxPrice !== null) {
    badges.push({
      key: 'maxPrice',
      label: `Max ₦${priceCheck.maxPrice.toLocaleString('en-NG')}`,
    });
  }

  if (filters.guests > 1) {
    badges.push({
      key: 'guests',
      label: `${filters.guests}+ guests`,
    });
  }

  if (filters.checkIn && filters.checkOut) {
    badges.push({
      key: 'dates',
      label: `${filters.checkIn} → ${filters.checkOut}`,
    });
  }

  return badges;
}

export function parseDiscoverySearchParams(
  params: Record<string, string | undefined>,
): DiscoveryFilterState {
  const area = (params.area || '').trim().slice(0, 80);
  const rawSide = (params.side || '').trim().toLowerCase();
  const side: CorridorSideFilter =
    rawSide === 'mainland' || rawSide === 'island' ? rawSide : 'all';
  const type = normalizeAccommodationFilterValue((params.type || '').slice(0, 60));

  const rawBeds = Number(params.bedrooms);
  const minBedrooms =
    Number.isInteger(rawBeds) && rawBeds >= 1 && rawBeds <= 10 ? rawBeds : 0;

  const rawGuests = Number(params.guests);
  const guests =
    Number.isInteger(rawGuests) && rawGuests >= 1 && rawGuests <= 50 ? rawGuests : 1;

  const minPriceInput = (params.minPrice || '').replace(/[^\d]/g, '').slice(0, 10);
  const maxPriceInput = (params.maxPrice || '').replace(/[^\d]/g, '').slice(0, 10);

  const checkIn = isValidIsoDateString(params.checkIn) ? params.checkIn : '';
  const checkOut = isValidIsoDateString(params.checkOut) ? params.checkOut : '';

  const rawSort = (params.sort || '').trim() as DiscoverySortKey;
  const sort: DiscoverySortKey = DISCOVERY_SORT_OPTIONS.some(opt => opt.value === rawSort)
    ? rawSort
    : 'recommended';

  return {
    area,
    side,
    type,
    minBedrooms,
    minPriceInput,
    maxPriceInput,
    guests,
    checkIn,
    checkOut,
    sort,
  };
}

export function buildDiscoverySearchParams(filters: DiscoveryFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.area.trim()) {
    params.set('area', filters.area.trim());
  } else if (filters.side !== 'all') {
    params.set('side', filters.side);
  }
  if (filters.type) params.set('type', filters.type);
  if (filters.minBedrooms > 0) params.set('bedrooms', String(filters.minBedrooms));
  if (filters.minPriceInput.trim()) params.set('minPrice', filters.minPriceInput.trim());
  if (filters.maxPriceInput.trim()) params.set('maxPrice', filters.maxPriceInput.trim());
  if (filters.guests > 1) params.set('guests', String(filters.guests));
  if (filters.checkIn) params.set('checkIn', filters.checkIn);
  if (filters.checkOut) params.set('checkOut', filters.checkOut);
  if (filters.sort !== 'recommended') params.set('sort', filters.sort);
  return params;
}
