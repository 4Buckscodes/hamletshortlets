import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildDefaultExchangeRates } from './pricing';
import type { ExchangeRateConfig, MandatoryCharge } from './types';

let browserClient: SupabaseClient | null | undefined;

export function getPublicSupabaseEnv(): { url: string; publishableKey: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    '';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    '';
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    const env = getPublicSupabaseEnv();
    return env
      ? createClient(env.url, env.publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  }
  const winWithOverride = window as Window & {
    __HAMLET_TEST_SUPABASE__?: SupabaseClient | null;
  };
  if (winWithOverride.__HAMLET_TEST_SUPABASE__ !== undefined) {
    return winWithOverride.__HAMLET_TEST_SUPABASE__;
  }
  if (browserClient !== undefined) return browserClient;
  const env = getPublicSupabaseEnv();
  browserClient = env ? createClient(env.url, env.publishableKey) : null;
  return browserClient;
}

export function createServerUserSupabase(accessToken: string): SupabaseClient | null {
  const env = getPublicSupabaseEnv();
  if (!env || !accessToken) return null;
  return createClient(env.url, env.publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Select list for the security-barrier `public.public_properties` guest-facing view.
 * It contains no private owner rate, operational contact, partner, or review-note fields.
 */
export const PUBLIC_PROPERTY_SELECT =
  'id,title,property_type,area,public_address,guest_nightly_ngn,cleaning_fee,mandatory_charges,refundable_deposit,bedrooms,bathrooms,capacity,bed_setup,amenities,image_urls,house_rules,status,verification,trust_label,first_available_date,availability_confirmation_status,created_at,updated_at';

/** Private property columns for authenticated partner/admin workspace queries only. */
export const PARTNER_PROPERTY_SELECT =
  'id,title,property_type,area,public_address,nightly_rate,cleaning_fee,mandatory_charges,refundable_deposit,bedrooms,bathrooms,capacity,bed_setup,amenities,image_urls,house_rules,status,verification,trust_label,first_available_date,availability_confirmation_status,calendar_responsible_person,created_at,updated_at,review_note';

export interface PublicStayRecord {
  id: string;
  title: string;
  property_type: string | null;
  area: string | null;
  public_address: string | null;
  /** Private raw owner rate — only present on authenticated server/partner records. */
  nightly_rate?: number | string | null;
  /** Precomputed guest-facing price returned by the public_properties view. */
  guest_nightly_ngn?: number | string | null;
  cleaning_fee: number | string | null;
  mandatory_charges: MandatoryCharge[] | null;
  refundable_deposit: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  bed_setup: string | null;
  amenities: string[] | null;
  image_urls: string[] | null;
  house_rules: string[] | null;
  status: string;
  verification: Record<string, string> | null;
  trust_label: string | null;
  first_available_date: string | null;
  availability_confirmation_status: string | null;
  calendar_responsible_person?: string | null;
  city?: string | null;
  public_location_summary?: string | null;
  public_landmarks?: string[] | null;
  location_accuracy?: string | null;
  wayfinder_status?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Commercial-redacted public stay view model safe to serialize across React Server Component
 * boundaries, HTML, JSON-LD, sitemaps, and public discovery feeds.
 *
 * Strictly omits private owner base rate (`nightly_rate` / `B`), internal agent margins,
 * operational contact fields (`calendar_responsible_person`), and admin `review_note`.
 */
export interface PublicStayView {
  id: string;
  title: string;
  property_type: string | null;
  area: string | null;
  public_address: string | null;
  /** Guest-facing domestic NGN nightly stay price computed via HAMLET central pricing logic. */
  guest_nightly_ngn: number | null;
  /** Disclosed mandatory cleaning/turnover charge in NGN. */
  cleaning_fee: number;
  /** Disclosed mandatory non-accommodation charges (sanitized to label + non-negative integer NGN). */
  mandatory_charges: MandatoryCharge[];
  /** Separate refundable caution deposit in NGN (never marked up or buffered). */
  refundable_deposit: number;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  bed_setup: string | null;
  amenities: string[] | null;
  image_urls: string[] | null;
  house_rules: string[] | null;
  status: string;
  verification: Record<string, string> | null;
  trust_label: string | null;
  first_available_date: string | null;
  availability_confirmation_status: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type AnyPublicStay = PublicStayView | PublicStayRecord;

export interface OptionalWayfinderLocationMeta {
  deployed: boolean;
  city?: string | null;
  public_location_summary?: string | null;
  public_landmarks?: string[] | null;
  location_accuracy?: string | null;
  wayfinder_status?: string | null;
}

export function isMissingSchemaObjectError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === '42P01' ||
    code === '42883' ||
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the function') ||
    message.includes('could not find the table')
  );
}

/**
 * Probes optional Wayfinder public location columns on a property without breaking
 * core property detail rendering when Wayfinder migrations are not yet deployed.
 */
export async function probePropertyWayfinderMeta(
  db: SupabaseClient | null,
  propertyId: string,
): Promise<OptionalWayfinderLocationMeta> {
  if (!db) return { deployed: false };
  const { data, error } = await db
    .from('public_properties')
    .select('city,public_location_summary,public_landmarks,location_accuracy,wayfinder_status')
    .eq('id', propertyId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      return { deployed: false };
    }
    return { deployed: false };
  }
  if (!data) return { deployed: true };
  return {
    deployed: true,
    city: (data as Record<string, unknown>).city as string | null,
    public_location_summary: (data as Record<string, unknown>).public_location_summary as string | null,
    public_landmarks: (data as Record<string, unknown>).public_landmarks as string[] | null,
    location_accuracy: (data as Record<string, unknown>).location_accuracy as string | null,
    wayfinder_status: (data as Record<string, unknown>).wayfinder_status as string | null,
  };
}

/**
 * Loads configured exchange rates from `currency_exchange_rates`, falling back cleanly
 * to `buildDefaultExchangeRates()` if Supabase is unconfigured or unreachable.
 */
export async function loadActiveExchangeRates(
  db: SupabaseClient | null,
): Promise<ExchangeRateConfig[]> {
  if (!db) return buildDefaultExchangeRates();
  try {
    const { data, error } = await db
      .from('currency_exchange_rates')
      .select('currency,ngn_per_unit,buffer_rate,source,effective_at,expires_at,is_active')
      .eq('is_active', true);
    if (error || !data || data.length === 0) {
      return buildDefaultExchangeRates();
    }
    return data
      .filter(row => row.currency === 'USD' || row.currency === 'GBP')
      .map(row => ({
        currency: row.currency as 'USD' | 'GBP',
        currencyPair: `NGN/${row.currency}`,
        ngnPerUnit: Number(row.ngn_per_unit),
        bufferRate: Number(row.buffer_rate ?? 0.1),
        source: String(row.source || 'supabase_currency_exchange_rates'),
        quoteTtlMinutes: 30,
        effectiveAt: String(row.effective_at || new Date().toISOString()),
        quotedAt: String(row.effective_at || new Date().toISOString()),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        isActive: Boolean(row.is_active),
      }));
  } catch {
    return buildDefaultExchangeRates();
  }
}

/**
 * Best-effort, non-blocking notification outbox dispatch trigger.
 * Never throws or blocks user booking transitions if Resend is not yet configured.
 */
export async function triggerBookingNotificationDispatchBestEffort(
  db: SupabaseClient | null,
  bookingId: string,
): Promise<{ dispatched: boolean; detail?: string }> {
  if (!db || !bookingId) return { dispatched: false };
  try {
    const { data, error } = await db.functions.invoke('booking-notifications', {
      body: { booking_id: bookingId },
    });
    if (error) {
      return { dispatched: false, detail: error.message };
    }
    const payload = data as { ok?: boolean; sent?: number; skipped?: number } | null;
    return {
      dispatched: Boolean(payload?.ok),
      detail: payload?.ok ? 'Outbox processed' : undefined,
    };
  } catch {
    return { dispatched: false };
  }
}
