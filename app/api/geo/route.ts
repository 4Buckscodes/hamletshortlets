import { NextRequest, NextResponse } from 'next/server';
import { detectUserCurrency } from '@/lib/currency-detect';

/**
 * Lightweight automatic currency detection endpoint using platform edge geo headers
 * (`x-vercel-ip-country` on Vercel, `cf-ipcountry` behind Cloudflare) with safe
 * fallback to `Accept-Language`. Keeps static pages cacheable while giving
 * international and Lagos visitors accurate automatic currency display.
 */
export async function GET(request: NextRequest) {
  const rawCountry =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    null;

  const country = rawCountry ? rawCountry.trim().toUpperCase().slice(0, 2) : null;
  const acceptLanguage = request.headers.get('accept-language') || '';
  const locales = acceptLanguage
    .split(',')
    .map(part => part.split(';')[0]?.trim())
    .filter((item): item is string => Boolean(item));

  const currency = detectUserCurrency({
    countryCode: country,
    locales,
  });

  return NextResponse.json(
    {
      country,
      currency,
    },
    {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        Vary: 'x-vercel-ip-country, cf-ipcountry, accept-language',
      },
    },
  );
}
