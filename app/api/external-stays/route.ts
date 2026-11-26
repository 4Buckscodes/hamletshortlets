import { NextResponse } from 'next/server';
import {
  buildStayingApiSearchUrl,
  normaliseExternalStays,
} from '@/lib/stayingapi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_LOCATIONS = new Set([
  'Lagos, Nigeria',
  'Lekki Phase 1, Lagos, Nigeria',
  'Ikate, Lagos, Nigeria',
  'Victoria Island, Lagos, Nigeria',
  'Ikoyi, Lagos, Nigeria',
  'Ajah, Lagos, Nigeria',
  'Yaba, Lagos, Nigeria',
  'Ikeja GRA, Lagos, Nigeria',
  'Surulere, Lagos, Nigeria',
  'Abuja, Nigeria',
  'Ibadan, Nigeria',
]);

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message, stays: [] }, { status });
}

export async function GET(request: Request) {
  if (process.env.STAYINGAPI_ENABLED !== 'true') {
    return jsonError(503, 'External inventory is disabled.');
  }

  const key = process.env.STAYINGAPI_KEY?.trim() || '';
  if (!key.startsWith('stay_test_')) {
    return jsonError(503, 'The pilot currently accepts a StayingAPI sandbox key only.');
  }

  if (
    process.env.VERCEL_ENV === 'production' &&
    process.env.STAYINGAPI_PRODUCTION_DISPLAY_APPROVED !== 'true'
  ) {
    return jsonError(403, 'External inventory is restricted to the preview pilot.');
  }

  const incoming = new URL(request.url);
  const requestedLocation = (incoming.searchParams.get('location') || 'Lagos, Nigeria').trim();
  if (!ALLOWED_LOCATIONS.has(requestedLocation)) {
    return jsonError(400, 'Choose a supported HAMLET pilot location.');
  }

  const checkIn = incoming.searchParams.get('checkIn') || undefined;
  const checkOut = incoming.searchParams.get('checkOut') || undefined;
  const guests = Number(incoming.searchParams.get('guests') || 1);
  if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
    return jsonError(400, 'Both check-in and check-out dates are required.');
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 16) {
    return jsonError(400, 'Guest count must be between 1 and 16.');
  }

  const url = buildStayingApiSearchUrl({
    location: requestedLocation,
    checkIn,
    checkOut,
    guests,
    limit: 30,
  });

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      return jsonError(response.status === 429 ? 429 : 502, 'The external accommodation search is temporarily unavailable.');
    }

    const payload: unknown = await response.json();
    const stays = normaliseExternalStays(payload);
    const meta = payload && typeof payload === 'object' && 'meta' in payload
      ? (payload as { meta?: { creditsCharged?: number; cached?: boolean; pagination?: unknown } }).meta
      : undefined;

    return NextResponse.json(
      {
        ok: true,
        source: 'StayingAPI',
        stays,
        meta: {
          creditsCharged: Number(meta?.creditsCharged || 0),
          cached: Boolean(meta?.cached),
          pagination: meta?.pagination ?? null,
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } },
    );
  } catch {
    return jsonError(502, 'Could not reach the external accommodation service.');
  }
}
