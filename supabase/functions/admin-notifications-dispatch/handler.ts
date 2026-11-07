export interface ClaimedAdminNotificationRow {
  id: string;
  event_type: string;
  title: string;
  message: string;
  target_type?: string | null;
  target_id?: string | null;
  recipient_email?: string | null;
  payload?: Record<string, unknown> | null;
  delivery_status: 'pending' | 'processing' | 'sent' | 'failed';
  delivery_attempts: number;
  delivered_at?: string | null;
  next_attempt_at?: string;
  last_delivery_error?: string | null;
  created_at?: string;
}

export interface AdminEmailSendParams {
  apiKey: string;
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export interface AdminEmailSendResult {
  ok: boolean;
  error?: string;
}

export interface AdminNotificationUpdateInput {
  id: string;
  delivery_status: 'sent' | 'failed';
  delivered_at?: string | null;
  last_delivery_error: string | null;
  next_attempt_at?: string;
}

export interface AdminNotificationsDispatchDeps {
  internalDispatchSecret: string | undefined;
  supabaseConfigured: boolean;
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
  resendReplyToEmail?: string | undefined;
  operationsEmail: string | undefined;
  hamletAppUrl?: string | undefined;
  now?: () => Date;
  claimAdminNotifications: (batchLimit: number) => Promise<{
    data: ClaimedAdminNotificationRow[] | null;
    error: { message: string } | null;
  }>;
  updateAdminNotification: (input: AdminNotificationUpdateInput) => Promise<{
    error: { message: string } | null;
  }>;
  sendEmail?: (params: AdminEmailSendParams) => Promise<AdminEmailSendResult>;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function escapeAdminHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] ?? char);
}

function sanitizeHeaderSubject(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

export function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function sanitizeErrorDetail(raw: string, secrets: Array<string | undefined>): string {
  let cleaned = raw;
  for (const secret of secrets) {
    if (secret && secret.trim().length >= 6) {
      cleaned = cleaned.split(secret.trim()).join('[REDACTED]');
    }
  }
  return cleaned.slice(0, 500);
}

function resolveTrustedAdminCommunicationsUrl(rawBaseUrl: string | undefined): string {
  const candidate = rawBaseUrl?.trim() || 'https://hamlet.rest';
  try {
    const parsed = new URL(candidate);
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhost)) {
      return `${parsed.origin}/admin/communications`;
    }
  } catch {
    // Fall back to canonical HAMLET domain below
  }
  return 'https://hamlet.rest/admin/communications';
}

export async function defaultSendAdminAlertEmail(
  params: AdminEmailSendParams,
): Promise<AdminEmailSendResult> {
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${params.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': params.idempotencyKey,
      },
      body: JSON.stringify({
        from: params.from,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!result.ok) {
      return { ok: false, error: `Resend HTTP ${result.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error while contacting email provider.' };
  }
}

export async function handleAdminNotificationsDispatch(
  req: Request,
  deps: AdminNotificationsDispatchDeps,
): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'POST required.' }, 405);
  }

  const expected = deps.internalDispatchSecret ?? '';
  const supplied = req.headers.get('x-hamlet-internal-secret') ?? '';
  if (expected.length < 32 || !constantTimeEqual(supplied, expected)) {
    return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const resendKey = deps.resendApiKey?.trim();
  const from = deps.resendFromEmail?.trim();
  const replyTo = deps.resendReplyToEmail?.trim() || undefined;
  const operationsEmail = deps.operationsEmail?.trim();

  if (!deps.supabaseConfigured || !resendKey || !from || !operationsEmail) {
    return jsonResponse({ ok: false, error: 'Dispatch configuration is incomplete.' }, 503);
  }

  const { data: rows, error: claimError } = await deps.claimAdminNotifications(20);
  if (claimError) {
    return jsonResponse({ ok: false, error: 'Could not claim communications events.' }, 500);
  }

  const sendFn = deps.sendEmail ?? defaultSendAdminAlertEmail;
  const currentNow = deps.now ?? (() => new Date());
  const communicationsUrl = resolveTrustedAdminCommunicationsUrl(deps.hamletAppUrl);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const payload =
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    const details = [
      ['Event', row.event_type],
      ['Applicant', payload.applicant_name],
      ['Email', payload.applicant_email],
      ['Company', payload.company],
      ['Role', payload.role],
      ['Status', payload.status],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');

    const subject = sanitizeHeaderSubject(`[HAMLET Operations] ${row.title}`);
    const html = [
      `<h2>${escapeAdminHtml(row.title)}</h2>`,
      `<p>${escapeAdminHtml(row.message)}</p>`,
      `<table>${details
        .map(
          ([label, value]) =>
            `<tr><th align="left">${escapeAdminHtml(label)}</th><td>${escapeAdminHtml(value)}</td></tr>`,
        )
        .join('')}</table>`,
      `<p><a href="${escapeAdminHtml(communicationsUrl)}">Open the HAMLET admin communications centre</a> to review this event.</p>`,
    ].join('');

    const text = [
      row.title,
      row.message,
      ...details.map(([label, value]) => `${label}: ${value}`),
      `Admin communications centre: ${communicationsUrl}`,
    ].join('\n');

    let sendResult: AdminEmailSendResult;
    try {
      sendResult = await sendFn({
        apiKey: resendKey,
        from,
        replyTo,
        to: operationsEmail,
        subject,
        html,
        text,
        idempotencyKey: `hamlet-admin-notification-${row.id}`,
      });
    } catch (err) {
      sendResult = {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Network error while contacting email provider.',
      };
    }

    const nowDate = currentNow();
    if (!sendResult.ok) {
      failed += 1;
      const attempts = Math.max(1, Number(row.delivery_attempts) || 1);
      const backoffSeconds = Math.min(60 * (2 ** (attempts - 1)), 3600);
      const sanitizedError = sanitizeErrorDetail(
        sendResult.error || 'Email delivery failed.',
        [resendKey, expected],
      );
      await deps.updateAdminNotification({
        id: row.id,
        delivery_status: 'failed',
        last_delivery_error: sanitizedError,
        next_attempt_at: new Date(nowDate.getTime() + backoffSeconds * 1000).toISOString(),
      });
    } else {
      sent += 1;
      await deps.updateAdminNotification({
        id: row.id,
        delivery_status: 'sent',
        delivered_at: nowDate.toISOString(),
        last_delivery_error: null,
      });
    }
  }

  return jsonResponse({
    ok: failed === 0,
    processed: (rows ?? []).length,
    sent,
    failed,
  });
}
