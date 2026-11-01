export type DisplayCurrency = 'NGN' | 'USD' | 'GBP';

export const CURRENCY_ORDER: readonly DisplayCurrency[] = ['NGN', 'USD', 'GBP'];

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
};

const NGN_COUNTRY_CODES = new Set(['NG']);
const GBP_COUNTRY_CODES = new Set(['GB', 'UK', 'IM', 'JE', 'GG']);
const USD_COUNTRY_CODES = new Set([
  'US',
  'CA',
  'UM',
  'PR',
  'VI',
  'GU',
  'AS',
  'MP',
  'AE',
  'AU',
  'NZ',
  'SG',
]);

function mapCountryToCurrency(rawCountry: string | null | undefined): DisplayCurrency | null {
  const code = (rawCountry || '').trim().toUpperCase();
  if (!code) return null;
  if (NGN_COUNTRY_CODES.has(code)) return 'NGN';
  if (GBP_COUNTRY_CODES.has(code)) return 'GBP';
  if (USD_COUNTRY_CODES.has(code)) return 'USD';
  return null;
}

function extractRegionFromLocale(locale: string): string | null {
  const clean = locale.trim();
  if (!clean) return null;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Locale === 'function') {
      const parsed = new Intl.Locale(clean);
      if (parsed.region) return parsed.region.toUpperCase();
    }
  } catch {
    // Fall back to subtag parsing below.
  }
  const match = clean.match(/[-_]([A-Za-z]{2})\b/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Pure, deterministic user currency detector (safe in both server routes and client components).
 * Priority:
 * 1. Explicit geo country code (`NG` -> NGN, `GB` -> GBP, `US`/`CA`/... -> USD)
 * 2. IANA timezone (`Africa/Lagos` -> NGN, `Europe/London` -> GBP, `America/*` -> USD)
 * 3. Browser/OS locale region subtags (`en-NG`, `en-GB`, `en-US`, etc.)
 * 4. Safe HAMLET Lagos default (`NGN`)
 */
export function detectUserCurrency(signals: {
  countryCode?: string | null;
  timeZone?: string | null;
  locales?: readonly string[] | null;
}): DisplayCurrency {
  const fromCountry = mapCountryToCurrency(signals.countryCode);
  if (fromCountry) return fromCountry;

  const tz = (signals.timeZone || '').trim();
  if (tz) {
    if (tz === 'Africa/Lagos') return 'NGN';
    if (
      tz === 'Europe/London' ||
      tz === 'Europe/Belfast' ||
      tz === 'Europe/Isle_of_Man' ||
      tz === 'Europe/Jersey' ||
      tz === 'Europe/Guernsey'
    ) {
      return 'GBP';
    }
    if (tz.startsWith('America/')) {
      return 'USD';
    }
  }

  for (const locale of signals.locales ?? []) {
    const region = extractRegionFromLocale(locale);
    const mapped = mapCountryToCurrency(region);
    if (mapped) return mapped;
  }

  return 'NGN';
}
