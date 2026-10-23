export interface AuthenticatedCheckoutUser {
  id: string;
  email: string;
}

export interface CheckoutBookingSnapshot {
  id: string;
  reference: string;
  guest_id: string;
  property_id: string;
  property_status: string;
  status: string;
  guest_total: number;
  payment_deadline: string | null;
  has_confirmed_conflict: boolean;
}

export interface PaystackInitializeGatewayParams {
  secretKey: string;
  email: string;
  amountKobo: number;
  bookingId: string;
  bookingReference: string;
  callbackUrl?: string;
}

export interface PaystackInitializeGatewayResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackInitializeDeps {
  paystackSecretKey: string | undefined;
  now?: () => Date;
  getAuthenticatedUser: (bearerToken: string) => Promise<AuthenticatedCheckoutUser | null>;
  loadBookingSnapshot: (bookingId: string) => Promise<{
    data: CheckoutBookingSnapshot | null;
    error: { message: string } | null;
  }>;
  initializeTransaction?: (
    params: PaystackInitializeGatewayParams,
  ) => Promise<{
    data: PaystackInitializeGatewayResult | null;
    error: { message: string } | null;
  }>;
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function sanitizeCallbackUrl(input: unknown): string | undefined {
  if (typeof input !== 'string' || !input.trim()) return undefined;
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export async function defaultInitializePaystackTransaction(
  params: PaystackInitializeGatewayParams,
): Promise<{
  data: PaystackInitializeGatewayResult | null;
  error: { message: string } | null;
}> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.secretKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency: 'NGN',
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
      metadata: {
        booking_id: params.bookingId,
        booking_reference: params.bookingReference,
      },
    }),
  });

  let payload: {
    status?: boolean;
    message?: string;
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
    };
  };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { data: null, error: { message: 'Invalid response from Paystack checkout gateway.' } };
  }

  if (
    !response.ok ||
    !payload.status ||
    !payload.data?.authorization_url ||
    !payload.data?.reference
  ) {
    return {
      data: null,
      error: { message: payload.message ?? 'Paystack could not initialize checkout.' },
    };
  }

  return {
    data: {
      authorization_url: payload.data.authorization_url,
      access_code: payload.data.access_code ?? '',
      reference: payload.data.reference,
    },
    error: null,
  };
}

export async function handlePaystackInitialize(
  req: Request,
  deps: PaystackInitializeDeps,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const secret = deps.paystackSecretKey?.trim();
  if (!secret) {
    return jsonResponse(
      {
        ok: false,
        code: 'provider_not_configured',
        error:
          'Online checkout is awaiting live Paystack merchant configuration. Do not send payment outside a verified HAMLET checkout.',
      },
      503,
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  if (!bearerToken) {
    return jsonResponse({ ok: false, error: 'Sign in as the booking guest to start checkout.' }, 401);
  }

  const user = await deps.getAuthenticatedUser(bearerToken);
  if (!user || !user.id || !user.email) {
    return jsonResponse({ ok: false, error: 'Invalid or expired guest session.' }, 401);
  }

  let body: { booking_id?: unknown; callback_url?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ ok: false, error: 'Malformed JSON request body.' }, 400);
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : '';
  if (!bookingId) {
    return jsonResponse({ ok: false, error: 'booking_id is required.' }, 400);
  }

  const { data: booking, error: loadError } = await deps.loadBookingSnapshot(bookingId);
  if (loadError) {
    return jsonResponse({ ok: false, error: loadError.message }, 500);
  }
  if (!booking || booking.guest_id !== user.id) {
    return jsonResponse({ ok: false, error: 'Booking not found for your guest account.' }, 403);
  }

  if (booking.status !== 'awaiting_payment') {
    return jsonResponse(
      { ok: false, error: `Booking ${booking.reference} is in ${booking.status} status and cannot be paid.` },
      409,
    );
  }

  const currentNow = deps.now ? deps.now() : new Date();
  if (
    booking.payment_deadline &&
    new Date(booking.payment_deadline).getTime() <= currentNow.getTime()
  ) {
    return jsonResponse(
      { ok: false, error: 'The 48-hour payment deadline has expired. Submit a fresh booking request.' },
      409,
    );
  }

  if (booking.property_status !== 'approved') {
    return jsonResponse(
      { ok: false, error: 'This listing is no longer approved for checkout.' },
      409,
    );
  }

  if (booking.has_confirmed_conflict) {
    return jsonResponse(
      { ok: false, error: 'Those dates are no longer available on this property.' },
      409,
    );
  }

  if (!Number.isInteger(booking.guest_total) || booking.guest_total <= 0) {
    return jsonResponse({ ok: false, error: 'Invalid authoritative booking total.' }, 422);
  }

  // Authoritative stay total from PostgreSQL in kobo; never accept client-sent amounts
  // and never add undecided processing fees.
  const amountKobo = booking.guest_total * 100;
  const callbackUrl = sanitizeCallbackUrl(body.callback_url);
  const initFn = deps.initializeTransaction ?? defaultInitializePaystackTransaction;

  const { data: initialized, error: gatewayError } = await initFn({
    secretKey: secret,
    email: user.email,
    amountKobo,
    bookingId: booking.id,
    bookingReference: booking.reference,
    callbackUrl,
  });

  if (gatewayError || !initialized) {
    return jsonResponse(
      { ok: false, error: gatewayError?.message ?? 'Could not initialize Paystack checkout.' },
      502,
    );
  }

  return jsonResponse(
    {
      ok: true,
      authorization_url: initialized.authorization_url,
      access_code: initialized.access_code,
      reference: initialized.reference,
      amount_naira: booking.guest_total,
    },
    200,
  );
}
