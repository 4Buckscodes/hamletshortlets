export interface ConfirmWebhookParams {
  target_booking_id: string;
  provider_name: string;
  provider_ref: string;
  paid_amount_naira: number;
  provider_fee_naira: number;
  currency_code: string;
}

export interface ConfirmWebhookResult {
  status: 'confirmed' | 'already_confirmed' | 'flagged_underpayment';
  booking_id: string;
  reference: string;
  variance: number;
}

export interface PaystackWebhookDeps {
  paystackSecretKey: string | undefined;
  confirmPaymentRpc: (params: ConfirmWebhookParams) => Promise<{
    data: ConfirmWebhookResult | null;
    error: { message: string } | null;
  }>;
}

interface PaystackWebhookPayload {
  event?: unknown;
  data?: {
    status?: unknown;
    reference?: unknown;
    amount?: unknown;
    fees?: unknown;
    currency?: unknown;
    metadata?: {
      booking_id?: unknown;
      booking_reference?: unknown;
    } | null;
  } | null;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function timingSafeHexEqual(expectedHex: string, receivedHex: string): boolean {
  const cleanReceived = receivedHex.trim().toLowerCase();
  if (expectedHex.length !== cleanReceived.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i += 1) {
    diff |= expectedHex.charCodeAt(i) ^ cleanReceived.charCodeAt(i);
  }
  return diff === 0;
}

export async function computePaystackHmacSha512(
  rawBody: string,
  secretKey: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string | null,
  secretKey: string,
): Promise<boolean> {
  if (!signatureHeader || !secretKey) return false;
  const expected = await computePaystackHmacSha512(rawBody, secretKey);
  return timingSafeHexEqual(expected, signatureHeader);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function handlePaystackWebhook(
  req: Request,
  deps: PaystackWebhookDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405);
  }

  const secret = deps.paystackSecretKey?.trim();
  if (!secret) {
    return jsonResponse(
      { ok: false, error: 'Payment webhook secret is not configured on the server.' },
      503,
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  const signatureValid = await verifyPaystackSignature(rawBody, signature, secret);
  if (!signatureValid) {
    return jsonResponse({ ok: false, error: 'Invalid Paystack webhook signature.' }, 401);
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return jsonResponse({ ok: false, error: 'Malformed JSON webhook body.' }, 400);
  }

  const eventName = typeof payload.event === 'string' ? payload.event : '';
  if (eventName !== 'charge.success') {
    return jsonResponse({ ok: true, ignored: true, event: eventName }, 200);
  }

  const data = payload.data;
  if (!data || typeof data !== 'object' || data.status !== 'success') {
    return jsonResponse({ ok: false, error: 'Charge payload is missing success status.' }, 400);
  }

  const providerRef = typeof data.reference === 'string' ? data.reference.trim() : '';
  if (!providerRef) {
    return jsonResponse({ ok: false, error: 'Provider transaction reference is missing.' }, 400);
  }

  const amountKobo = typeof data.amount === 'number' ? data.amount : Number.NaN;
  if (!Number.isFinite(amountKobo) || amountKobo < 0) {
    return jsonResponse({ ok: false, error: 'Invalid transaction amount in kobo.' }, 400);
  }

  const metadataBookingId =
    typeof data.metadata?.booking_id === 'string' && data.metadata.booking_id.trim()
      ? data.metadata.booking_id.trim()
      : typeof data.metadata?.booking_reference === 'string' && data.metadata.booking_reference.trim()
        ? data.metadata.booking_reference.trim()
        : providerRef;

  const paidAmountNaira = Math.floor(amountKobo / 100);
  const providerFeeNaira =
    typeof data.fees === 'number' && Number.isFinite(data.fees) && data.fees > 0
      ? Math.round(data.fees / 100)
      : 0;
  const currencyCode = typeof data.currency === 'string' && data.currency.trim()
    ? data.currency.trim().toUpperCase()
    : 'NGN';

  const { data: rpcResult, error } = await deps.confirmPaymentRpc({
    target_booking_id: metadataBookingId,
    provider_name: 'Paystack',
    provider_ref: providerRef,
    paid_amount_naira: paidAmountNaira,
    provider_fee_naira: providerFeeNaira,
    currency_code: currencyCode,
  });

  if (error || !rpcResult) {
    return jsonResponse(
      { ok: false, error: error?.message ?? 'Booking payment confirmation failed.' },
      422,
    );
  }

  return jsonResponse({ ok: true, result: rpcResult }, 200);
}
