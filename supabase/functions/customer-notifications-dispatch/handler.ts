export type CustomerEmailEvent =
  | 'registration_welcome'
  | 'partner_application_received'
  | 'partner_application_status_changed'
  | 'property_submitted'
  | 'property_status_changed';

export interface ClaimedCustomerEmailNotification {
  id: string;
  event_type: CustomerEmailEvent;
  recipient_user_id: string | null;
  recipient_email: string;
  idempotency_key: string;
  payload: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
}

export interface CustomerNotificationUpdate {
  id: string;
  delivery_status: 'sent' | 'failed';
  provider_message_id?: string | null;
  delivered_at?: string | null;
  last_delivery_error: string | null;
  next_attempt_at?: string;
}

export interface CustomerEmailSendParams {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  timeoutMs?: number;
}

export interface CustomerEmailSendResult {
  id?: string;
  error?: string;
  retryable?: boolean;
  statusCode?: number;
}

export interface CustomerNotificationsDeps {
  internalDispatchSecret: string | undefined;
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
  hamletAppUrl: string | undefined;
  now?: () => Date;
  claimNotifications: (batchLimit: number) => Promise<{
    data: ClaimedCustomerEmailNotification[] | null;
    error: { message: string } | null;
  }>;
  updateNotification: (input: CustomerNotificationUpdate) => Promise<{
    error: { message: string } | null;
  }>;
  sendEmail?: (params: CustomerEmailSendParams) => Promise<CustomerEmailSendResult>;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function escapeCustomerEmailHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function timingSafeSecretEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAppUrl(raw: string | undefined): string | null {
  try {
    const url = new URL(raw?.trim() || '');
    if (url.protocol === 'https:' || (
      url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    )) {
      return url.origin;
    }
  } catch {
    // Configuration is invalid; no untrusted fallback URL is used.
  }
  return null;
}

function textValue(payload: Record<string, unknown>, key: string, fallback = ''): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : fallback;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    submitted: 'submitted for review',
    draft: 'saved as a draft',
    approved: 'approved by HAMLET',
    needs_correction: 'returned for correction',
    rejected: 'not approved',
    suspended: 'suspended',
    paused: 'paused',
    archived: 'archived',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}

export interface RenderedCustomerEmail {
  subject: string;
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaPath: string;
}

export function renderCustomerEmail(
  eventType: CustomerEmailEvent,
  payload: Record<string, unknown>,
): RenderedCustomerEmail {
  const name = textValue(payload, 'full_name', 'there');
  const company = textValue(payload, 'company', 'your business');
  const role = textValue(payload, 'role', 'partner');
  const title = textValue(payload, 'property_title', 'your property');
  const area = textValue(payload, 'area');
  const location = area ? ` in ${area}` : '';
  const reviewNote = textValue(payload, 'review_note');
  const status = textValue(payload, 'status');

  switch (eventType) {
    case 'registration_welcome':
      return {
        subject: 'Welcome to HAMLET — your stay, sorted',
        heading: `Welcome to HAMLET, ${name}`,
        paragraphs: [
          'Your email address is confirmed and your HAMLET account is ready.',
          'Explore shortlet stays, keep your booking details organised and return to your account whenever you need it.',
        ],
        ctaLabel: 'Explore HAMLET',
        ctaPath: '/',
      };
    case 'partner_application_received':
      return {
        subject: 'We received your HAMLET partner application',
        heading: `Thank you for applying, ${name}`,
        paragraphs: [
          `We have received your partner application for ${company} as a ${role}.`,
          'Our team will review the information you submitted and update you when a decision has been recorded. You can continue to access your applicant workspace while the review is pending.',
        ],
        ctaLabel: 'Open partner workspace',
        ctaPath: '/partners',
      };
    case 'partner_application_status_changed': {
      const detail = status === 'approved'
        ? 'Your application has been approved. Your approved partner workspace and partner tools are now available.'
        : status === 'needs_correction'
          ? 'Our team needs a few corrections before your application can be approved. Review the note below and update your application.'
          : status === 'rejected'
            ? 'Our team has reviewed your application and recorded a decision not to approve it.'
            : `Your application status has changed to ${statusLabel(status)}.`;
      return {
        subject: status === 'approved'
          ? 'Your HAMLET partner application is approved'
          : status === 'needs_correction'
            ? 'Action needed: update your HAMLET partner application'
            : status === 'rejected'
              ? 'Update on your HAMLET partner application'
              : 'Your HAMLET partner application has been updated',
        heading: 'An update on your partner application',
        paragraphs: [
          `Hello ${name},`,
          detail,
          ...(reviewNote ? [`HAMLET review note: ${reviewNote}`] : []),
        ],
        ctaLabel: 'Review application',
        ctaPath: '/partners',
      };
    }
    case 'property_submitted':
      return {
        subject: 'Your property has been submitted to HAMLET',
        heading: 'We have received your property listing',
        paragraphs: [
          `Hello ${name || 'there'}, we have received “${title}”${location} for review.`,
          'Your listing is not yet approved or visible as a bookable property. We will email you when its review status changes.',
        ],
        ctaLabel: 'Open property workspace',
        ctaPath: '/partners/properties',
      };
    case 'property_status_changed':
      return {
        subject: `HAMLET listing update: ${statusLabel(status)}`,
        heading: 'There is an update on your property listing',
        paragraphs: [
          `Hello ${name || 'there'}, “${title}”${location} has been ${statusLabel(status)}.`,
          status === 'approved'
            ? 'HAMLET has approved your listing. Open your partner workspace to review its current status and next steps.'
            : status === 'needs_correction'
              ? 'Please review the note below and make the requested changes in your property workspace.'
              : status === 'rejected'
                ? 'The listing was not approved. Review the note below for the reason recorded by HAMLET.'
                : status === 'suspended' || status === 'paused' || status === 'archived'
                  ? 'This status affects the listing’s availability on HAMLET. Open your property workspace for the latest details.'
                  : `The listing status is now ${statusLabel(status)}.`,
          ...(reviewNote ? [`HAMLET review note: ${reviewNote}`] : []),
        ],
        ctaLabel: 'Review property listing',
        ctaPath: '/partners/properties',
      };
  }
}

export function buildCustomerEmail(
  eventType: CustomerEmailEvent,
  payload: Record<string, unknown>,
  appUrl: string,
): { subject: string; html: string; text: string } {
  const rendered = renderCustomerEmail(eventType, payload);
  const ctaUrl = new URL(rendered.ctaPath, appUrl).toString();
  const paragraphsHtml = rendered.paragraphs
    .map(paragraph => `<p>${escapeCustomerEmailHtml(paragraph)}</p>`)
    .join('');
  return {
    subject: rendered.subject.replace(/[\r\n]+/g, ' ').trim(),
    html: [
      '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17202a;max-width:600px;margin:0 auto">',
      '<p style="font-weight:700;letter-spacing:.08em">HAMLET</p>',
      `<h2>${escapeCustomerEmailHtml(rendered.heading)}</h2>`,
      paragraphsHtml,
      `<p><a href="${escapeCustomerEmailHtml(ctaUrl)}">${escapeCustomerEmailHtml(rendered.ctaLabel)}</a></p>`,
      '<p style="color:#687078;font-size:12px">HAMLET · Your stay, sorted.</p>',
      '</div>',
    ].join(''),
    text: [
      'HAMLET',
      rendered.heading,
      ...rendered.paragraphs,
      `${rendered.ctaLabel}: ${ctaUrl}`,
      'HAMLET · Your stay, sorted.',
    ].join('\n\n'),
  };
}

export async function defaultSendCustomerEmail(
  params: CustomerEmailSendParams,
): Promise<CustomerEmailSendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 10_000);
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
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      signal: controller.signal,
    });

    let body: { id?: string; message?: string; name?: string } = {};
    try {
      body = await response.json() as typeof body;
    } catch {
      body = {};
    }
    if (response.ok && body.id) return { id: body.id, statusCode: response.status };
    return {
      error: body.message || body.name || `Resend returned HTTP ${response.status}.`,
      retryable: response.status === 429 || response.status >= 500,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error && error.name === 'AbortError'
        ? 'Resend request timed out.'
        : 'Network error while contacting Resend.',
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeProviderError(error: string, apiKey: string): string {
  return error
    .split(apiKey).join('[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\bre_[A-Za-z0-9_]+/g, '[REDACTED_RESEND_KEY]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 480);
}

export async function handleCustomerNotificationsDispatch(
  req: Request,
  deps: CustomerNotificationsDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'POST required.' }, 405);
  }

  const expectedSecret = deps.internalDispatchSecret?.trim() || '';
  const suppliedSecret = req.headers.get('x-hamlet-internal-secret')?.trim() || '';
  if (
    expectedSecret.length < 32 ||
    !suppliedSecret ||
    !timingSafeSecretEqual(suppliedSecret, expectedSecret)
  ) {
    return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const apiKey = deps.resendApiKey?.trim() || '';
  const from = deps.resendFromEmail?.trim() || '';
  const appUrl = normalizeAppUrl(deps.hamletAppUrl);
  const fromAddress = /<([^<>]+)>/.exec(from)?.[1]?.trim() || from;
  if (!apiKey || !from || !validEmail(fromAddress) || !appUrl) {
    return jsonResponse({ ok: false, error: 'Customer email dispatch configuration is incomplete.' }, 503);
  }

  const { data: rows, error: claimError } = await deps.claimNotifications(20);
  if (claimError) {
    return jsonResponse({ ok: false, error: 'Could not claim customer email notifications.' }, 500);
  }

  const now = deps.now ?? (() => new Date());
  const sendEmail = deps.sendEmail ?? defaultSendCustomerEmail;
  let sent = 0;
  let failed = 0;
  const outcomes: Array<{ id: string; eventType: string; status: 'sent' | 'failed' }> = [];

  for (const row of rows ?? []) {
    const recipient = row.recipient_email?.trim() || '';
    if (!validEmail(recipient)) {
      const error = 'Recipient email is missing or invalid.';
      await deps.updateNotification({
        id: row.id,
        delivery_status: 'failed',
        last_delivery_error: error,
        next_attempt_at: new Date(now().getTime() + 3600_000).toISOString(),
      });
      failed += 1;
      outcomes.push({ id: row.id, eventType: row.event_type, status: 'failed' });
      continue;
    }

    const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? row.payload
      : {};
    const rendered = buildCustomerEmail(row.event_type, payload, appUrl);
    let result = await sendEmail({
      apiKey,
      from,
      to: recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: row.idempotency_key,
      timeoutMs: 10_000,
    });

    if (!result.id && result.retryable) {
      result = await sendEmail({
        apiKey,
        from,
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: row.idempotency_key,
        timeoutMs: 10_000,
      });
    }

    const completedAt = now();
    if (result.id && !result.error) {
      await deps.updateNotification({
        id: row.id,
        delivery_status: 'sent',
        provider_message_id: result.id,
        delivered_at: completedAt.toISOString(),
        last_delivery_error: null,
      });
      sent += 1;
      outcomes.push({ id: row.id, eventType: row.event_type, status: 'sent' });
    } else {
      const safeError = sanitizeProviderError(result.error || 'Resend did not accept the email.', apiKey);
      const attempts = Math.max(1, row.attempt_count || 1);
      const backoffSeconds = Math.min(60 * (2 ** Math.max(0, attempts - 1)), 3600);
      await deps.updateNotification({
        id: row.id,
        delivery_status: 'failed',
        last_delivery_error: safeError,
        next_attempt_at: new Date(completedAt.getTime() + backoffSeconds * 1000).toISOString(),
      });
      failed += 1;
      outcomes.push({ id: row.id, eventType: row.event_type, status: 'failed' });
    }
  }

  return jsonResponse({
    ok: failed === 0,
    processed: (rows ?? []).length,
    sent,
    failed,
    notifications: outcomes,
  });
}
