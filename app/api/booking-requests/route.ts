import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nightsBetween } from '@/lib/pricing';
import { isMissingSchemaObjectError } from '@/lib/next-supabase';
import { normalizeShareToken } from '@/lib/share-engine';
import type { SupportedCurrency } from '@/lib/types';

export const runtime = 'nodejs';

type RequestBody = {
  propertyId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  specialRequests?: string;
  quoteCurrency?: string;
  visitorSessionKey?: string | null;
  shareToken?: string | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function lagosToday() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return errorResponse('Booking is not configured yet.', 503);

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return errorResponse('Sign in to send a booking request.', 401);

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse('The booking request was not valid JSON.');
  }

  const propertyId = body.propertyId?.trim();
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;
  const guests = Number(body.guests);
  const specialRequests =
    typeof body.specialRequests === 'string' ? body.specialRequests.trim().slice(0, 1000) : '';
  const requestedCurrency: SupportedCurrency =
    body.quoteCurrency === 'USD' || body.quoteCurrency === 'GBP' || body.quoteCurrency === 'EUR'
      ? body.quoteCurrency
      : 'NGN';
  const visitorSessionKey =
    typeof body.visitorSessionKey === 'string' &&
    body.visitorSessionKey.trim().length >= 12 &&
    body.visitorSessionKey.trim().length <= 128
      ? body.visitorSessionKey.trim()
      : null;
  const shareTokenInput = normalizeShareToken(body.shareToken);

  if (!propertyId || !checkIn || !checkOut || !isValidDate(checkIn) || !isValidDate(checkOut)) {
    return errorResponse('Choose a property, check-in date and check-out date.');
  }
  const today = lagosToday();
  if (checkIn < today || checkOut <= checkIn) {
    return errorResponse('Choose valid future dates with check-out after check-in.');
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (!Number.isInteger(nights) || nights < 1 || nights > 60) {
    return errorResponse('Bookings must be between 1 and 60 nights.');
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
    return errorResponse('Choose between 1 and 20 guests.');
  }

  const db = createClient(url, key, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) {
    return errorResponse('Your session has expired. Sign in and try again.', 401);
  }
  const user = authData.user;

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role,account_status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return errorResponse(
      'We could not verify your account permissions. Complete guest account setup and try again.',
      403,
    );
  }
  if (profile.role !== 'guest') {
    return errorResponse('Booking requests require a guest account.', 403);
  }
  if (profile.account_status && profile.account_status !== 'active') {
    return errorResponse(
      'Your account is currently suspended. Contact HAMLET support.',
      403,
    );
  }

  const { data: property, error: propertyError } = await db
    .from('public_properties')
    .select('id,status,guest_nightly_ngn,capacity,first_available_date')
    .eq('id', propertyId)
    .eq('status', 'approved')
    .maybeSingle();
  if (propertyError || !property) {
    return errorResponse('This stay is not currently available to request.', 404);
  }
  const capacity = Number(property.capacity || 0);
  if (capacity > 0 && guests > capacity) {
    return errorResponse('This stay does not accommodate that many guests.');
  }
  if (property.first_available_date && checkIn < String(property.first_available_date)) {
    return errorResponse(
      `This stay is available from ${String(property.first_available_date)} onwards.`,
      409,
    );
  }
  const guestNightlyRate = Number(property.guest_nightly_ngn);
  if (!Number.isFinite(guestNightlyRate) || guestNightlyRate <= 0) {
    return errorResponse('The price for this stay is currently unavailable. Please contact HAMLET.', 409);
  }

  const { data: unavailable, error: availabilityError } = await db.rpc(
    'get_unavailable_property_ids',
    {
      requested_check_in: checkIn,
      requested_check_out: checkOut,
    },
  );
  if (availabilityError) {
    return errorResponse(
      'We could not verify the property calendar. Please try again later.',
      503,
    );
  }
  if ((unavailable as string[] | null)?.includes(propertyId)) {
    return errorResponse(
      'These dates are blocked or already booked for this property. Please choose different dates.',
      409,
    );
  }

  const reference =
    'HML-' + crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();

  // Submit intent only. The BEFORE INSERT database trigger re-reads the approved
  // property, checks availability and calculates the authoritative NGN/FX quote.
  // No owner rate or private property column is read or sent by this API route.
  const bookingIntentPayload = {
    reference,
    property_id: propertyId,
    guest_id: user.id,
    check_in: checkIn,
    check_out: checkOut,
    guest_count: guests,
    special_requests: specialRequests || null,
    quote_currency: requestedCurrency,
  };

  const payloadWithShare =
    visitorSessionKey || shareTokenInput
      ? {
          ...bookingIntentPayload,
          ...(visitorSessionKey ? { share_session_key: visitorSessionKey } : {}),
          ...(shareTokenInput ? { share_token_input: shareTokenInput } : {}),
        }
      : bookingIntentPayload;

  let { data: booking, error: insertError } = await db
    .from('bookings')
    .insert(payloadWithShare)
    .select('id,reference,status,guest_total,refundable_deposit,quote_currency,quoted_guest_total')
    .single();

  if (insertError && isMissingSchemaObjectError(insertError) && payloadWithShare !== bookingIntentPayload) {
    const retryRes = await db
      .from('bookings')
      .insert(bookingIntentPayload)
      .select('id,reference,status,guest_total,refundable_deposit,quote_currency,quoted_guest_total')
      .single();
    booking = retryRes.data;
    insertError = retryRes.error;
  }

  if (insertError || !booking) {
    const detail = insertError?.message || '';
    if (/date conflict|dates conflict|overlap|unavailable|calendar/i.test(detail)) {
      return errorResponse(
        'Those dates are no longer available. Please choose different dates.',
        409,
      );
    }
    if (/suspend/i.test(detail)) {
      return errorResponse(
        'Your account is currently suspended. Contact HAMLET support.',
        403,
      );
    }
    return errorResponse(
      insertError?.code === '23505'
        ? 'A booking with these details already exists.'
        : 'We could not save the booking request. Please try again.',
      400,
    );
  }

  // Best-effort trigger of notification outbox (never blocks request creation)
  try {
    await db.functions.invoke('booking-notifications', {
      body: { booking_id: booking.id },
    });
  } catch {
    // Outbox entries remain durable in booking_notifications if provider is unconfigured.
  }

  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        guestTotal: Number(booking.guest_total),
        refundableDeposit: Number(booking.refundable_deposit),
        quoteCurrency: booking.quote_currency,
        quotedGuestTotal: Number(booking.quoted_guest_total),
      },
      message:
        'Request received. The property partner will review your dates and confirm availability before payment opens.',
    },
    { status: 201 },
  );
}
