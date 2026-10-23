import {
  normalizeAppBaseUrl,
  renderBookingNotificationEmail,
  type BookingNotificationEventType,
  type BookingNotificationPayload,
  type BookingNotificationRecipientType,
} from './templates.ts';

export interface AuthenticatedNotificationCaller {
  id: string;
  email?: string;
}

export interface DispatchAuthorizationResult {
  authorized: boolean;
  role?: 'guest' | 'partner' | 'admin';
  booking_id?: string | null;
  reason?: string;
}

export interface ClaimedBookingNotificationRow {
  id: string;
  booking_id: string;
  booking_reference: string;
  property_id: string;
  event_type: BookingNotificationEventType;
  recipient_type: BookingNotificationRecipientType;
  recipient_user_id: string | null;
  recipient_email: string | null;
  subject: string | null;
  delivery_status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
  provider: string;
  provider_message_id: string | null;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  idempotency_key: string;
  payload: BookingNotificationPayload;
}

export interface CompleteNotificationInput {
  id: string;
  status: 'sent' | 'failed' | 'skipped';
  recipientEmail?: string | null;
  subject?: string | null;
  providerMessageId?: string | null;
  errorDetail?: string | null;
  backoffSeconds?: number;
}

export interface ResendSendParams {
  apiKey: string;
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: Array<{ name: string; value: string }>;
  timeoutMs?: number;
}

export interface ResendSendResult {
  id?: string;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
}

export interface BookingNotificationsDeps {
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
  resendReplyToEmail?: string | undefined;
  hamletBookingsEmail: string | undefined;
  hamletAppUrl: string | undefined;
  internalDispatchSecret?: string | undefined;
  requestTimeoutMs?: number;
  maxTransientRetries?: number;
  transientRetryDelayMs?: number;
  getAuthenticatedUser: (bearerToken: string) => Promise<AuthenticatedNotificationCaller | null>;
  authorizeDispatch: (
    bookingId: string | null,
    callerUserId: string,
  ) => Promise<{ data: DispatchAuthorizationResult | null; error: { message: string } | null }>;
  claimPendingNotifications: (params: {
    bookingId: string | null;
    batchLimit: number;
    ignoreBackoff: boolean;
  }) => Promise<{ data: ClaimedBookingNotificationRow[] | null; error: { message: string } | null }>;
  completeNotification: (
    input: CompleteNotificationInput,
  ) => Promise<{ error: { message: string } | null }>;
  sendEmail?: (params: ResendSendParams) => Promise<ResendSendResult>;
}

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers':
    'authorization, x-client-info, apikey, content-type, x-hamlet-internal-secret',
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

function timingSafeEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function isValidEmailAddress(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  if (/[\r\n<>]/.test(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function isValidFromAddress(value: string | undefined): { valid: boolean; reason?: string } {
  if (!value || !value.trim()) {
    return { valid: false, reason: 'RESEND_FROM_EMAIL secret is not configured.' };
  }
  const trimmed = value.trim();
  if (/[\r\n]/.test(trimmed)) {
    return { valid: false, reason: 'RESEND_FROM_EMAIL contains invalid header characters.' };
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('your-verified-domain') || lower.includes('replace_with_')) {
    return {
      valid: false,
      reason: 'RESEND_FROM_EMAIL still uses a placeholder domain; configure a verified Resend sender.',
    };
  }

  const angleMatch = /^([^<>]+)<([^<>]+)>$/.exec(trimmed);
  const emailPart = angleMatch ? angleMatch[2].trim() : trimmed;
  if (!isValidEmailAddress(emailPart)) {
    return { valid: false, reason: 'RESEND_FROM_EMAIL is not a valid sender address.' };
  }
  return { valid: true };
}

export function sanitizeNotificationError(
  rawMessage: unknown,
  secretsToRedact: Array<string | undefined>,
): string {
  let text =
    typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage instanceof Error
        ? rawMessage.message
        : 'Notification delivery failed.';

  for (const secret of secretsToRedact) {
    if (secret && secret.trim().length >= 6) {
      text = text.split(secret.trim()).join('[REDACTED]');
    }
  }

  text = text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/\bre_[A-Za-z0-9_]+/g, '[REDACTED_RESEND_KEY]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();

  return text.slice(0, 480) || 'Notification delivery failed.';
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function defaultSendResendEmail(params: ResendSendParams): Promise<ResendSendResult> {
  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? 10_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${params.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': params.idempotencyKey,
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        subject: params.subject,
        html: params.html,
        text: params.text,
        ...(params.tags && params.tags.length > 0 ? { tags: params.tags } : {}),
      }),
      signal: controller.signal,
    });

    let body: { id?: string; message?: string; name?: string } = {};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      body = {};
    }

    if (response.ok && body.id) {
      return { id: body.id, statusCode: response.status };
    }

    const retryable = response.status === 429 || response.status >= 500;
    const providerError =
      body.message ||
      body.name ||
      `Resend API returned HTTP ${response.status}.`;
    return {
      error: providerError,
      statusCode: response.status,
      retryable,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      error: isAbort
        ? `Resend API request timed out after ${timeoutMs}ms.`
        : err instanceof Error
          ? err.message
          : 'Network failure while contacting Resend API.',
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function handleBookingNotifications(
  req: Request,
  deps: BookingNotificationsDeps,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed. Use POST.' }, 405);
  }

  let body: { bookingId?: unknown; batchLimit?: unknown; forceRetry?: unknown } = {};
  try {
    const rawText = await req.text();
    if (rawText.trim()) {
      body = JSON.parse(rawText) as typeof body;
    }
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
  }

  const requestedBookingId =
    typeof body.bookingId === 'string' && body.bookingId.trim() ? body.bookingId.trim() : null;
  const requestedBatchLimit =
    typeof body.batchLimit === 'number' && Number.isFinite(body.batchLimit)
      ? Math.max(1, Math.min(Math.trunc(body.batchLimit), 50))
      : 20;
  const requestedForceRetry = body.forceRetry === true;

  // Authenticate caller: internal secret header OR authenticated Supabase JWT
  const configuredInternalSecret = deps.internalDispatchSecret?.trim() || '';
  const providedInternalSecret = req.headers.get('x-hamlet-internal-secret')?.trim() || '';
  let callerRole: 'guest' | 'partner' | 'admin' | 'internal' | null = null;
  let scopedBookingId: string | null = requestedBookingId;

  if (
    configuredInternalSecret.length >= 16 &&
    providedInternalSecret.length > 0 &&
    timingSafeEquals(providedInternalSecret, configuredInternalSecret)
  ) {
    callerRole = 'internal';
  } else {
    const authHeader = req.headers.get('authorization') ?? '';
    const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (!bearerMatch || !bearerMatch[1].trim()) {
      return jsonResponse({ ok: false, error: 'Authentication is required.' }, 401);
    }

    const user = await deps.getAuthenticatedUser(bearerMatch[1].trim());
    if (!user) {
      return jsonResponse({ ok: false, error: 'Invalid or expired session token.' }, 401);
    }

    const { data: authz, error: authzError } = await deps.authorizeDispatch(
      requestedBookingId,
      user.id,
    );
    if (authzError) {
      return jsonResponse(
        { ok: false, error: 'Could not verify booking notification permissions.' },
        500,
      );
    }
    if (!authz?.authorized) {
      return jsonResponse(
        { ok: false, error: 'You are not authorised to dispatch notifications for this booking.' },
        403,
      );
    }

    callerRole = authz.role ?? 'guest';
    scopedBookingId = authz.booking_id ?? requestedBookingId;
  }

  const ignoreBackoff =
    requestedForceRetry && (callerRole === 'admin' || callerRole === 'internal');

  const { data: claimedRows, error: claimError } = await deps.claimPendingNotifications({
    bookingId: scopedBookingId,
    batchLimit: requestedBatchLimit,
    ignoreBackoff,
  });

  if (claimError) {
    return jsonResponse(
      { ok: false, error: 'Could not claim pending booking notifications.' },
      500,
    );
  }

  const notifications = claimedRows ?? [];
  if (notifications.length === 0) {
    return jsonResponse({
      ok: true,
      processed: 0,
      sent: 0,
      failed: 0,
      notifications: [],
    });
  }

  const sendEmail = deps.sendEmail ?? defaultSendResendEmail;
  const resendApiKey = deps.resendApiKey?.trim() || '';
  const fromValidation = isValidFromAddress(deps.resendFromEmail);
  const resendFromEmail = deps.resendFromEmail?.trim() || '';
  const resendReplyTo =
    deps.resendReplyToEmail && isValidEmailAddress(deps.resendReplyToEmail)
      ? deps.resendReplyToEmail.trim()
      : undefined;
  const appBaseUrl = normalizeAppBaseUrl(deps.hamletAppUrl);
  const operationsEmail = deps.hamletBookingsEmail?.trim() || '';
  const maxTransientRetries = Math.max(0, Math.min(deps.maxTransientRetries ?? 1, 2));
  const transientRetryDelayMs = Math.max(0, deps.transientRetryDelayMs ?? 250);
  const requestTimeoutMs = Math.max(1_000, deps.requestTimeoutMs ?? 10_000);
  const redactList = [deps.resendApiKey, deps.internalDispatchSecret];

  let sentCount = 0;
  let failedCount = 0;
  const outcomes: Array<{
    id: string;
    bookingReference: string;
    eventType: string;
    recipientType: string;
    status: 'sent' | 'failed';
    providerMessageId?: string;
    error?: string;
  }> = [];

  for (const item of notifications) {
    const backoffSeconds = 60 * Math.pow(2, Math.max(0, item.attempt_count - 1));

    // Resolve recipient address (operations uses server-configured HAMLET_BOOKINGS_EMAIL)
    const resolvedRecipient =
      item.recipient_type === 'operations'
        ? operationsEmail
        : item.recipient_email?.trim() || '';

    // Validate required runtime configuration per notification so failures are logged durably
    let configError: string | null = null;
    if (!appBaseUrl) {
      configError = 'HAMLET_APP_URL secret is not configured with a valid HTTPS (or localhost) base URL.';
    } else if (!resendApiKey || resendApiKey.toLowerCase().includes('replace_with_')) {
      configError = 'RESEND_API_KEY secret is not configured.';
    } else if (!fromValidation.valid) {
      configError = fromValidation.reason ?? 'RESEND_FROM_EMAIL secret is invalid.';
    } else if (item.recipient_type === 'operations') {
      if (
        !isValidEmailAddress(resolvedRecipient) ||
        resolvedRecipient.toLowerCase().includes('your-domain') ||
        resolvedRecipient.toLowerCase().includes('replace_with_')
      ) {
        configError = 'HAMLET_BOOKINGS_EMAIL secret is not configured with a valid operations inbox.';
      }
    } else if (!isValidEmailAddress(resolvedRecipient)) {
      configError = `Recipient email for ${item.recipient_type} is missing or invalid.`;
    }

    if (configError || !appBaseUrl) {
      const safeErr = sanitizeNotificationError(configError ?? 'Invalid notification configuration.', redactList);
      await deps.completeNotification({
        id: item.id,
        status: 'failed',
        recipientEmail: isValidEmailAddress(resolvedRecipient) ? resolvedRecipient : null,
        errorDetail: safeErr,
        backoffSeconds,
      });
      failedCount += 1;
      outcomes.push({
        id: item.id,
        bookingReference: item.booking_reference,
        eventType: item.event_type,
        recipientType: item.recipient_type,
        status: 'failed',
        error: safeErr,
      });
      continue;
    }

    const rendered = renderBookingNotificationEmail({
      bookingId: item.booking_id,
      bookingReference: item.booking_reference,
      eventType: item.event_type,
      recipientType: item.recipient_type,
      payload: item.payload ?? {},
      appBaseUrl,
    });

    let sendResult: ResendSendResult = { error: 'Delivery was not attempted.', retryable: false };
    for (let attempt = 0; attempt <= maxTransientRetries; attempt += 1) {
      if (attempt > 0) {
        await delay(transientRetryDelayMs * attempt);
      }
      sendResult = await sendEmail({
        apiKey: resendApiKey,
        from: resendFromEmail,
        replyTo: resendReplyTo,
        to: resolvedRecipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: item.idempotency_key,
        tags: [
          { name: 'event_type', value: item.event_type },
          { name: 'recipient_type', value: item.recipient_type },
        ],
        timeoutMs: requestTimeoutMs,
      });

      if (sendResult.id && !sendResult.error) {
        break;
      }
      if (!sendResult.retryable) {
        break;
      }
    }

    if (sendResult.id && !sendResult.error) {
      await deps.completeNotification({
        id: item.id,
        status: 'sent',
        recipientEmail: resolvedRecipient,
        subject: rendered.subject,
        providerMessageId: sendResult.id,
      });
      sentCount += 1;
      outcomes.push({
        id: item.id,
        bookingReference: item.booking_reference,
        eventType: item.event_type,
        recipientType: item.recipient_type,
        status: 'sent',
        providerMessageId: sendResult.id,
      });
    } else {
      const safeErr = sanitizeNotificationError(
        sendResult.error ?? 'Resend rejected the email request.',
        redactList,
      );
      await deps.completeNotification({
        id: item.id,
        status: 'failed',
        recipientEmail: resolvedRecipient,
        subject: rendered.subject,
        errorDetail: safeErr,
        backoffSeconds,
      });
      failedCount += 1;
      outcomes.push({
        id: item.id,
        bookingReference: item.booking_reference,
        eventType: item.event_type,
        recipientType: item.recipient_type,
        status: 'failed',
        error: safeErr,
      });
    }
  }

  return jsonResponse({
    ok: failedCount === 0,
    processed: notifications.length,
    sent: sentCount,
    failed: failedCount,
    notifications: outcomes,
  });
}
