import { formatAccommodationLabel, getValidGuestNightlyNgn } from './discovery';
import { formatNaira } from './pricing';

export const HAMLET_SHARE_ORIGIN = 'https://hamlet.rest';
export const SHARE_TOKEN_REGEX = /^hsl_[a-z0-9]{16,64}$/i;
export const SHARE_VISITOR_SESSION_STORAGE_KEY = 'hamlet:share-visitor-key';
export const SHARE_PROPERTY_TOKEN_PREFIX = 'hamlet:share-prop:';

export type MarketingCardType = 'guest' | 'partner';
export type MarketingCardFormat = 'social' | 'portrait' | 'story';
export type MarketingCardTheme = 'midnight' | 'ivory' | 'lagoon';
export type PartnerIdentityDisplay = 'name' | 'company' | 'network';
export type QrVariant = 'standalone' | 'branded';

export interface MarketingFormatSpec {
  id: MarketingCardFormat;
  label: string;
  width: number;
  height: number;
  aspectClass: string;
  purpose: string;
}

export const MARKETING_CARD_FORMATS: readonly MarketingFormatSpec[] = [
  {
    id: 'social',
    label: 'Social preview',
    width: 1200,
    height: 630,
    aspectClass: 'aspect-[1200/630]',
    purpose: 'WhatsApp, Facebook & link sharing (1200 × 630)',
  },
  {
    id: 'portrait',
    label: 'Portrait post',
    width: 1080,
    height: 1350,
    aspectClass: 'aspect-[4/5]',
    purpose: 'Instagram & Facebook feed (1080 × 1350)',
  },
  {
    id: 'story',
    label: 'Story / Status',
    width: 1080,
    height: 1920,
    aspectClass: 'aspect-[9/16]',
    purpose: 'WhatsApp Status & Instagram Stories (1080 × 1920)',
  },
] as const;

export const MARKETING_CARD_THEMES: ReadonlyArray<{
  id: MarketingCardTheme;
  label: string;
  summary: string;
}> = [
  {
    id: 'midnight',
    label: 'Midnight Editorial',
    summary: 'Signature HAMLET Midnight Navy & Champagne Gold',
  },
  {
    id: 'ivory',
    label: 'Warm Ivory Gallery',
    summary: 'Light architectural frame on Warm Ivory stock',
  },
  {
    id: 'lagoon',
    label: 'Lagos Dusk',
    summary: 'Bold hospitality split with brass specification bar',
  },
] as const;

export interface PartnerDealTerms {
  authorised: boolean;
  relationship?: string;
  commission_rate?: number | null;
  estimated_per_night_ngn?: number | null;
  basis_label?: string | null;
  disclaimer?: string | null;
  reason?: string;
}

export interface ShareablePropertyRecord {
  id: string;
  title: string;
  property_type: string | null;
  area: string | null;
  public_address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  amenities: string[] | null;
  image_urls: string[] | null;
  trust_label: string | null;
  verification: Record<string, string> | null;
  allow_partner_sharing: boolean;
  guest_nightly_ngn: number | null;
  can_manage: boolean;
  is_assigned: boolean;
  share_token: string | null;
  deal_terms: PartnerDealTerms;
}

export interface MarketingPropertyBreakdownRow {
  property_id: string;
  title: string;
  area: string;
  shares: number;
  visits: number;
  unique_visitors: number;
  enquiries: number;
  booking_requests: number;
  confirmed_bookings: number;
  completed_bookings: number;
  potential_earnings_ngn: number;
  pending_earnings_ngn: number;
  eligible_earnings_ngn: number;
  paid_earnings_ngn: number;
}

export interface PartnerMarketingPerformance {
  window_days: number | null;
  events: {
    share_initiated: number;
    whatsapp_handoff: number;
    link_copied: number;
    card_generated: number;
    qr_generated: number;
    link_visited: number;
    unique_visitors: number;
    enquiries_generated: number;
  };
  financials: {
    booking_requests: number;
    open_booking_requests: number;
    confirmed_bookings: number;
    completed_bookings: number;
    potential_opportunity_ngn: number;
    earnings_pending_ngn: number;
    earnings_eligible_ngn: number;
    earnings_paid_ngn: number;
    earnings_reversed_ngn: number;
  };
  properties: MarketingPropertyBreakdownRow[];
}

export function isValidShareToken(raw?: string | null): boolean {
  if (!raw || typeof raw !== 'string') return false;
  return SHARE_TOKEN_REGEX.test(raw.trim());
}

export function normalizeShareToken(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return SHARE_TOKEN_REGEX.test(trimmed) ? trimmed : null;
}

export function extractShareTokenFromSearchParams(params: {
  get(name: string): string | null;
}): string | null {
  const refCandidate = normalizeShareToken(params.get('ref'));
  if (refCandidate) return refCandidate;
  return normalizeShareToken(params.get('s'));
}

export function buildPropertyCanonicalShareUrl(
  propertyId: string,
  origin: string = HAMLET_SHARE_ORIGIN,
): string {
  const cleanOrigin = (origin || HAMLET_SHARE_ORIGIN).replace(/\/+$/, '');
  return `${cleanOrigin}/stays/${encodeURIComponent(propertyId.trim())}`;
}

export function buildPartnerPropertyTrackingUrl(
  propertyId: string,
  shareToken: string,
  origin: string = HAMLET_SHARE_ORIGIN,
): string {
  const canonical = buildPropertyCanonicalShareUrl(propertyId, origin);
  const validToken = normalizeShareToken(shareToken);
  if (!validToken) return canonical;
  return `${canonical}?ref=${encodeURIComponent(validToken)}`;
}

export function getMarketingFormatSpec(format?: string | null): MarketingFormatSpec {
  const found = MARKETING_CARD_FORMATS.find(item => item.id === format);
  return found ?? MARKETING_CARD_FORMATS[0];
}

export function buildPropertyPreviewVersion(stay: {
  image_urls?: readonly string[] | null;
  nightly_rate?: number | string | null;
  updated_at?: string | null;
  title?: string | null;
}): string {
  const primaryImage = stay.image_urls?.[0] || 'fallback';
  const raw = `${stay.title || ''}|${primaryImage}|${stay.nightly_rate ?? ''}|${stay.updated_at || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(36)}`;
}

export interface WhatsAppPropertyShareInput {
  title: string;
  area?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  capacity?: number | null;
  /** Either pre-computed domestic guest nightly NGN (`B * 1.20`) or raw owner `nightlyRate` via `ownerNightlyRateNgn`. */
  guestNightlyNgn?: number | null;
  ownerNightlyRateNgn?: number | null;
  trackingUrl: string;
}

/**
 * Constructs a dynamic, pre-populated WhatsApp share message from approved property data.
 * Never invents missing fields.
 */
export function buildWhatsAppPropertyShareMessage(input: WhatsAppPropertyShareInput): string {
  const cleanTitle = input.title.trim();
  const cleanArea = input.area?.trim() ? `${input.area.trim()}, Lagos` : 'Lagos';

  const accommodationParts: string[] = [];
  if (input.propertyType?.trim() || (typeof input.bedrooms === 'number' && input.bedrooms >= 0)) {
    const label = formatAccommodationLabel(input.propertyType ?? null, input.bedrooms ?? null);
    if (label) accommodationParts.push(label);
  }
  if (typeof input.capacity === 'number' && input.capacity > 0) {
    accommodationParts.push(`Up to ${input.capacity} ${input.capacity === 1 ? 'guest' : 'guests'}`);
  }

  const resolvedGuestNightly =
    typeof input.guestNightlyNgn === 'number' && input.guestNightlyNgn > 0
      ? Math.round(input.guestNightlyNgn)
      : getValidGuestNightlyNgn(input.ownerNightlyRateNgn);

  const lines: string[] = [
    'Hello!',
    '',
    'I thought you might like this verified shortlet stay on HAMLET:',
    '',
    `🏡 ${cleanTitle}`,
  ];

  if (accommodationParts.length > 0) {
    lines.push(`🛏️ ${accommodationParts.join(' · ')}`);
  }

  lines.push(`📍 ${cleanArea}`);

  if (resolvedGuestNightly !== null && resolvedGuestNightly > 0) {
    lines.push(`💰 ${formatNaira(resolvedGuestNightly)} per night`);
  }

  lines.push(
    '',
    'View photos, amenities, verification details and request dates here:',
    input.trackingUrl.trim(),
    '',
    'Find your next stay with HAMLET.',
    'Your stay, sorted.',
  );

  return lines.join('\n');
}

export function buildWhatsAppClickToChatUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function getOrCreateVisitorSessionKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(SHARE_VISITOR_SESSION_STORAGE_KEY)?.trim();
    if (existing && existing.length >= 16 && existing.length <= 128) {
      return existing;
    }
    const randomPart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replaceAll('-', '')
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    const generated = `hsv_${randomPart}`;
    window.localStorage.setItem(SHARE_VISITOR_SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

export function readVisitorSessionKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = window.localStorage.getItem(SHARE_VISITOR_SESSION_STORAGE_KEY)?.trim() || '';
    return val.length >= 12 && val.length <= 128 ? val : null;
  } catch {
    return null;
  }
}

export function storePropertyShareTokenHint(propertyId: string, shareToken: string): void {
  if (typeof window === 'undefined') return;
  const cleanToken = normalizeShareToken(shareToken);
  if (!propertyId.trim() || !cleanToken) return;
  try {
    window.localStorage.setItem(
      `${SHARE_PROPERTY_TOKEN_PREFIX}${propertyId.trim()}`,
      cleanToken,
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function readPropertyShareTokenHint(propertyId: string): string | null {
  if (typeof window === 'undefined' || !propertyId.trim()) return null;
  try {
    const raw = window.localStorage.getItem(`${SHARE_PROPERTY_TOKEN_PREFIX}${propertyId.trim()}`);
    return normalizeShareToken(raw);
  } catch {
    return null;
  }
}
