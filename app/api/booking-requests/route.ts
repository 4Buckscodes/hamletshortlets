import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateGuestPricing, nightsBetween } from '@/lib/pricing';

export const runtime = 'nodejs';

type RequestBody = {
  propertyId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  specialRequests?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return errorResponse('Booking is not configured yet.', 503);

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return errorResponse('Sign in to send a booking request.', 401);

  let body: RequestBody;
  try { body = await request.json() as RequestBody; }
  catch { return errorResponse('The booking request was not valid JSON.'); }

  const propertyId = body.propertyId?.trim();
  const checkIn = body.checkIn;
  const checkOut = body.checkOut;
  const guests = Number(body.guests);
  const specialRequests = typeof body.specialRequests === 'string' ? body.specialRequests.trim().slice(0, 1000) : '';

  if (!propertyId || !checkIn || !checkOut || !datePattern.test(checkIn) || !datePattern.test(checkOut)) {
    return errorResponse('Choose a property, check-in date and check-out date.');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (checkIn < today || checkOut <= checkIn) return errorResponse('Choose valid future dates with check-out after check-in.');
  const nights = nightsBetween(checkIn, checkOut);
  if (!Number.isInteger(nights) || nights < 1 || nights > 60) return errorResponse('Bookings must be between 1 and 60 nights.');
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) return errorResponse('Choose between 1 and 20 guests.');

  const db = createClient(url, key, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user) return errorResponse('Your session has expired. Sign in and try again.', 401);
  const user = authData.user;

  const { data: profile, error: profileError } = await db.from('profiles').select('role,account_status').eq('id', user.id).maybeSingle();
  if (profileError || !profile) return errorResponse('We could not verify your account permissions. Complete guest account setup and try again.', 403);
  if (profile.role !== 'guest') return errorResponse('Booking requests require a guest account.', 403);
  if (profile.account_status && profile.account_status !== 'active') return errorResponse('Your account is currently suspended. Contact HAMLET support.', 403);

  const { data: property, error: propertyError } = await db
    .from('properties')
    .select('id,status,nightly_rate,cleaning_fee,refundable_deposit,capacity')
    .eq('id', propertyId)
    .eq('status', 'approved')
    .maybeSingle();
  if (propertyError || !property) return errorResponse('This stay is not currently available to request.', 404);
  const capacity = Number(property.capacity || 0);
  if (capacity > 0 && guests > capacity) return errorResponse('This stay does not accommodate that many guests.');

  const { data: unavailable, error: availabilityError } = await db.rpc('get_unavailable_property_ids', {
    requested_check_in: checkIn,
    requested_check_out: checkOut,
  });
  if (availabilityError) return errorResponse('We could not verify the property calendar. Please try again later.', 503);
  if ((unavailable as string[] | null)?.includes(propertyId)) {
    return errorResponse('These dates are blocked or already booked for this property. Please choose different dates.', 409);
  }

  const nightlyRate = Math.max(0, Math.round(Number(property.nightly_rate || 0)));
  const cleaningFee = Math.max(0, Math.round(Number(property.cleaning_fee || 0)));
  const deposit = Math.max(0, Math.round(Number(property.refundable_deposit || 0)));
  const pricing = calculateGuestPricing({
    accommodationSubtotal: nightlyRate * nights,
    mandatoryCharges: cleaningFee > 0 ? [{ label: 'Cleaning fee', amount: cleaningFee }] : [],
    refundableDeposit: deposit,
  });
  const reference = 'HML-' + crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const { data: booking, error: insertError } = await db.from('bookings').insert({
    reference,
    property_id: propertyId,
    guest_id: user.id,
    check_in: checkIn,
    check_out: checkOut,
    guest_count: guests,
    accommodation_subtotal: pricing.accommodationSubtotal,
    mandatory_charges: pricing.mandatoryCharges,
    mandatory_total: pricing.mandatoryChargesTotal,
    hamlet_guest_fee: pricing.hamletGuestServiceFee,
    guest_total: pricing.guestTotal,
    refundable_deposit: pricing.refundableDeposit,
    status: 'requested',
    special_requests: specialRequests || null,
  }).select('id,reference,status,guest_total,refundable_deposit').single();

  if (insertError || !booking) {
    const detail = insertError?.message || '';
    if (/date conflict|dates conflict|overlap|unavailable|calendar/i.test(detail)) {
      return errorResponse('Those dates are no longer available. Please choose different dates.', 409);
    }
    if (/suspend/i.test(detail)) return errorResponse('Your account is currently suspended. Contact HAMLET support.', 403);
    return errorResponse(insertError?.code === '23505' ? 'A booking with these details already exists.' : 'We could not save the booking request. Please try again.', 400);
  }
  return NextResponse.json({
    booking: {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      guestTotal: Number(booking.guest_total),
      refundableDeposit: Number(booking.refundable_deposit),
    },
    message: 'Request received. The property partner must confirm availability before payment.',
  }, { status: 201 });
}
