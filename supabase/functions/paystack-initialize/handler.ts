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
  settlement_total_ngn?: number;
  quote_currency?: string;
  quoted_guest_total?: number;
  exchange_rate_ngn_per_unit?: number;
  international_buffer_amount?: number;
  quote_expires_at?: string | null;
  payment_deadline: string | null;
  has_confirmed_conflict: boolean;
  check_in?: string;
  guest_account_status?: string;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  let response: Response;
  try {
    response = await fetch('https://api.paystack.co/transaction/initialize', {
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
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      data: null,
      error: {
        message: isAbort
          ? 'Paystack checkout gateway timed out. Please try again shortly.'
          : 'Could not reach Paystack checkout gateway. Please check your connection and retry.',
      },
    };
  } finally {
    clearTimeout(timer);
  }

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

function formatLagosIsoDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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
  if (!secret || secret.toLowerCase().includes('replace_with_')) {
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

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Malformed JSON request body.' }, 400);
  }

  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return jsonResponse({ ok: false, error: 'JSON request body must be an object.' }, 400);
  }

  const body = parsedBody as { booking_id?: unknown; callback_url?: unknown };
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

  if (booking.guest_account_status && booking.guest_account_status !== 'active') {
    return jsonResponse(
      { ok: false, error: 'Your account is currently suspended. Contact HAMLET operations.' },
      403,
    );
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

  if (booking.check_in && /^\d{4}-\d{2}-\d{2}$/.test(booking.check_in)) {
    const todayLagos = formatLagosIsoDate(currentNow);
    if (booking.check_in < todayLagos) {
      return jsonResponse(
        { ok: false, error: 'This booking check-in date has already passed. Submit a fresh booking request.' },
        409,
      );
    }
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

  const quoteCurrency = (booking.quote_currency ?? 'NGN').toUpperCase();
  if (
    (quoteCurrency === 'USD' || quoteCurrency === 'GBP') &&
    booking.quote_expires_at &&
    new Date(booking.quote_expires_at).getTime() <= currentNow.getTime()
  ) {
    return jsonResponse(
      {
        ok: false,
        code: 'quote_expired',
        error: `Your ${quoteCurrency} exchange-rate quote has expired. Refresh the quote or switch to NGN before checkout.`,
      },
      409,
    );
  }

  const authoritativeNgnAmount =
    typeof booking.settlement_total_ngn === 'number' &&
    Number.isInteger(booking.settlement_total_ngn) &&
    booking.settlement_total_ngn > 0
      ? booking.settlement_total_ngn
      : booking.guest_total;

  // Authoritative stay settlement total from PostgreSQL in kobo; never accept client-sent amounts.
  const amountKobo = authoritativeNgnAmount * 100;
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
      amount_naira: authoritativeNgnAmount,
      settlement_currency: 'NGN',
      quote_currency: quoteCurrency,
      quoted_guest_total: booking.quoted_guest_total ?? authoritativeNgnAmount,
      exchange_rate_ngn_per_unit: booking.exchange_rate_ngn_per_unit ?? 1,
      international_buffer_amount: booking.international_buffer_amount ?? 0,
    },
    200,
  );
}
