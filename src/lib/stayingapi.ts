export type StayingApiPlatform = 'airbnb' | 'booking' | 'vrbo' | 'google';

export interface ExternalStay {
  id: string;
  source: 'stayingapi';
  platform: StayingApiPlatform;
  sourceUrl: string;
  title: string;
  city: string | null;
  region: string | null;
  country: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  nightlyPrice: number | null;
  currency: string | null;
  rating: number | null;
  ratingScale: number | null;
  reviewCount: number | null;
  amenities: string[];
  images: string[];
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function optionalNumber(value: unknown): number | null {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && /^https:\/\//i.test(item));
}

export function normaliseExternalStay(value: unknown): ExternalStay | null {
  const item = record(value);
  const location = record(item.location);
  const price = record(item.price);
  const platform = String(item.platform || '').toLowerCase();
  const sourceUrl = typeof item.url === 'string' ? item.url : '';

  if (
    !['airbnb', 'booking', 'vrbo', 'google'].includes(platform) ||
    !/^https:\/\//i.test(sourceUrl) ||
    !/^https:\/\//i.test(sourceUrl) ||
    typeof item.name !== 'string' ||
    !item.name.trim()
  ) {
    return null;
  }

  const images = stringList(item.images);
  if (typeof item.imageUrl === 'string' && /^https:\/\//i.test(item.imageUrl)) {
    images.unshift(item.imageUrl);
  }

  return {
    id: String(item.id || `${platform}:${item.platformListingId || sourceUrl}`),
    source: 'stayingapi',
    platform: platform as StayingApiPlatform,
    sourceUrl,
    title: item.name.trim().slice(0, 180),
    city: typeof location.city === 'string' ? location.city : null,
    region: typeof location.region === 'string' ? location.region : null,
    country: typeof location.country === 'string' ? location.country : null,
    propertyType: typeof item.propertyType === 'string' ? item.propertyType : null,
    bedrooms: optionalNumber(item.bedrooms),
    bathrooms: optionalNumber(item.bathrooms),
    capacity: optionalNumber(item.maxOccupancy),
    nightlyPrice: optionalNumber(price.nightlyPrice),
    currency: typeof price.currency === 'string' ? price.currency.toUpperCase() : null,
    rating: optionalNumber(item.guestRating),
    ratingScale: optionalNumber(item.ratingScale),
    reviewCount: optionalNumber(item.reviewCount),
    amenities: Array.isArray(item.amenities)
      ? item.amenities.filter((entry): entry is string => typeof entry === 'string').slice(0, 40)
      : [],
    images: images.slice(0, 8),
  };
}

export function normaliseExternalStays(payload: unknown): ExternalStay[] {
  const envelope = record(payload);
  const data = Array.isArray(envelope.data) ? envelope.data : [];
  const seen = new Set<string>();
  return data
    .map(normaliseExternalStay)
    .filter((stay): stay is ExternalStay => {
      if (!stay || seen.has(stay.id)) return false;
      seen.add(stay.id);
      return true;
    });
}

export function filterExternalStays(
  stays: readonly ExternalStay[],
  filters: {
    area?: string;
    bedrooms?: number;
    guests?: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    type?: string;
  },
): ExternalStay[] {
  const area = (filters.area || '').trim().toLowerCase();
  return stays.filter(stay => {
    const location = [stay.city, stay.region, stay.country].filter(Boolean).join(' ').toLowerCase();
    if (area && !location.includes(area) && !area.split(',').some(part => part.trim() && location.includes(part.trim()))) {
      // Search results are already scoped by the requested destination. Keep the provider's
      // result if it has no structured locality rather than inventing a location mismatch.
      if (stay.city || stay.region || stay.country) return false;
    }
    if (filters.bedrooms && (stay.bedrooms === null || stay.bedrooms < filters.bedrooms)) return false;
    if (filters.guests && filters.guests > 1 && (stay.capacity === null || stay.capacity < filters.guests)) return false;
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      if (stay.currency !== 'NGN' || stay.nightlyPrice === null || stay.nightlyPrice < filters.minPrice) return false;
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      if (stay.currency !== 'NGN' || stay.nightlyPrice === null || stay.nightlyPrice > filters.maxPrice) return false;
    }
    if (filters.type) {
      const type = filters.type.toLowerCase();
      const propertyType = (stay.propertyType || '').toLowerCase();
      if (type === 'studio' && !propertyType.includes('studio')) return false;
      if (type === '1_bed' && (stay.bedrooms === null || stay.bedrooms !== 1)) return false;
      if (type === '2_bed' && (stay.bedrooms === null || stay.bedrooms !== 2)) return false;
      if (type === '3_plus_bed' && (stay.bedrooms === null || stay.bedrooms < 3)) return false;
    }
    return true;
  });
}

export function buildStayingApiSearchUrl(params: {
  location: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  limit?: number;
}): string {
  const query = new URLSearchParams({
    location: params.location,
    platforms: 'airbnb,booking',
    currency: 'NGN',
    limit: String(Math.min(40, Math.max(5, params.limit ?? 30))),
    sort: 'recommended',
  });
  if (params.checkIn && params.checkOut) {
    query.set('checkIn', params.checkIn);
    query.set('checkOut', params.checkOut);
  }
  if (params.guests && params.guests > 1) query.set('adults', String(Math.min(16, params.guests)));
  return `https://api.stayingapi.com/v1/search?${query.toString()}`;
}
