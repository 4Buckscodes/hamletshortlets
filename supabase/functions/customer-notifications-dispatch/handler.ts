export type CustomerEmailEventType =
  | 'registration_completed'
  | 'partner_application_submitted'
  | 'partner_application_status_changed'
  | 'property_submitted'
  | 'property_status_changed';

export interface CustomerEmailNotificationRow {
  id: string;
  event_type: CustomerEmailEventType;
  recipient_user_id: string | null;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  payload: Record<string, unknown>;
  delivery_status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
  attempt_count: number;
  max_attempts: number;
  idempotency_key: string;
}

export interface CustomerEmailSendParams {
  apiKey: string;
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

export interface CustomerEmailSendResult {
  id?: string;
  error?: string;
  statusCode?: number;
  retryable?: boolean;
}

export interface CustomerEmailCompletion {
  id: string;
  status: 'sent' | 'failed' | 'skipped';
  recipientEmail?: string;
  providerMessageId?: string;
  errorDetail?: string;
  backoffSeconds?: number;
}

export interface CustomerEmailDispatchDeps {
  internalDispatchSecret: string | undefined;
  verifyVaultDispatchSecret?: (candidate: string) => Promise<boolean>;
  supabaseConfigured: boolean;
  resendApiKey: string | undefined;
  resendFromEmail: string | undefined;
  resendReplyToEmail?: string | undefined;
  hamletAppUrl?: string | undefined;
  claimNotifications: (batchLimit: number) => Promise<{
    data: CustomerEmailNotificationRow[] | null;
    error: { message: string } | null;
  }>;
  completeNotification: (input: CustomerEmailCompletion) => Promise<{
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

function timingSafeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export function escapeCustomerEmailHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

export function isValidCustomerEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const candidate = value.trim();
  return candidate.length >= 5 && candidate.length <= 254 &&
    !/[\r\n<>]/.test(candidate) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate);
}

function resolveAppUrl(raw: string | undefined): string {
  try {
    const parsed = new URL(raw?.trim() || 'https://hamlet.rest');
    if (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return parsed.origin;
    }
  } catch {
    // Fall back to the canonical HAMLET domain.
  }
  return 'https://hamlet.rest';
}

function propertyStatusCopy(status: string): { heading: string; summary: string } {
  const messages: Record<string, { heading: string; summary: string }> = {
    approved: {
      heading: 'Your HAMLET property has been approved',
      summary: 'Your property has passed HAMLET review and can proceed to the next onboarding steps.',
    },
    needs_correction: {
      heading: 'A few updates are needed for your HAMLET property',
      summary: 'Our review team needs additional information or corrections before this property can be approved.',
    },
    rejected: {
      heading: 'There is an update on your HAMLET property submission',
      summary: 'Our team has reviewed this submission. Please read the review note or contact HAMLET operations for clarification.',
    },
  };
  return messages[status] ?? {
    heading: 'There is an update on your HAMLET property',
    summary: 'The review status of your property has changed.',
  };
}

export function renderCustomerEmail(
  row: CustomerEmailNotificationRow,
  appBaseUrl: string,
): { subject: string; html: string; text: string } {
  const payload = row.payload ?? {};
  const name = escapeCustomerEmailHtml(row.recipient_name || payload.full_name || 'there');
  const appUrl = resolveAppUrl(appBaseUrl);
  let heading = 'Welcome to HAMLET';
  let intro = 'Your HAMLET account is ready. Discover stays and manage your activity in one place.';
  let ctaLabel = 'Explore HAMLET';
  let ctaUrl = appUrl;
  const detailRows: Array<[string, unknown]> = [];

  switch (row.event_type) {
    case 'registration_completed':
      break;
    case 'partner_application_submitted':
      heading = 'We have received your partner application';
      intro = 'Thank you for your interest in joining the HAMLET partner network. Our operations team will review your application and contact you with an update.';
      ctaLabel = 'Open partner workspace';
      ctaUrl = appUrl + '/partners';
      detailRows.push(['Application reference', payload.application_id], ['Partner type', payload.partner_role], ['Current status', payload.status]);
      break;
    case 'partner_application_status_changed': {
      const status = String(payload.status ?? '');
      const messages: Record<string, { heading: string; intro: string }> = {
        approved: {
          heading: 'Your HAMLET partner application has been approved',
          intro: 'Congratulations. Your application has been approved. Sign in to access the partner workspace and continue onboarding.',
        },
        needs_correction: {
          heading: 'We need a little more information',
          intro: 'Our team has reviewed your application and needs a correction or additional information before it can proceed.',
        },
        rejected: {
          heading: 'There is an update on your partner application',
          intro: 'Our team has completed its review. Please read the note below or contact HAMLET operations if you need clarification.',
        },
      };
      const message = messages[status] ?? {
        heading: 'There is an update on your partner application',
        intro: 'Your application status is now ' + (status || 'updated') + '.',
      };
      heading = message.heading;
      intro = message.intro;
      ctaLabel = 'View partner workspace';
      ctaUrl = appUrl + '/partners';
      detailRows.push(['Application reference', payload.application_id], ['Partner type', payload.partner_role], ['Status', status], ['Review note', payload.review_note]);
      break;
    }
    case 'property_submitted':
      heading = 'Your property has been submitted for review';
      intro = 'We have received your property details. The listing will remain private while HAMLET operations reviews the information and supporting evidence.';
      ctaLabel = 'View submitted property';
      ctaUrl = appUrl + '/partners/properties';
      detailRows.push(['Property', payload.property_title], ['Area', payload.area], ['Status', 'Under review'], ['Reference', payload.property_id]);
      break;
    case 'property_status_changed': {
      const message = propertyStatusCopy(String(payload.status ?? ''));
      heading = message.heading;
      intro = message.summary;
      ctaLabel = 'View your properties';
      ctaUrl = appUrl + '/partners/properties';
      detailRows.push(['Property', payload.property_title], ['Area', payload.area], ['Status', String(payload.status ?? '').replaceAll('_', ' ')], ['Review note', payload.review_note], ['Reference', payload.property_id]);
      break;
    }
  }

  const visibleRows = detailRows.filter(([, value]) =>
    value !== null && value !== undefined && String(value).trim() !== ''
  );
  const htmlRows = visibleRows.map(([label, value]) =>
    '<tr><th align="left" style="padding:9px 12px;border-bottom:1px solid #e8e8e8;color:#686868;">' +
    escapeCustomerEmailHtml(label) +
    '</th><td style="padding:9px 12px;border-bottom:1px solid #e8e8e8;color:#202020;">' +
    escapeCustomerEmailHtml(value) + '</td></tr>'
  ).join('');
  const html = '<div style="margin:0;padding:32px 12px;background:#f5f5f2;font-family:Arial,Helvetica,sans-serif;color:#202020;">' +
    '<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8e8e2;border-radius:12px;overflow:hidden;">' +
    '<div style="padding:22px 28px;background:#17251f;color:#fff;font-size:20px;font-weight:700;letter-spacing:2px;">HAMLET</div>' +
    '<div style="padding:30px 28px;"><p style="margin:0 0 12px;color:#777;font-size:13px;">Your stay, sorted.</p>' +
    '<h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;">' + escapeCustomerEmailHtml(heading) + '</h1>' +
    '<p style="margin:0 0 18px;line-height:1.65;">Hello ' + name + ',</p>' +
    '<p style="margin:0 0 22px;line-height:1.65;">' + escapeCustomerEmailHtml(intro) + '</p>' +
    (htmlRows ? '<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;">' + htmlRows + '</table>' : '') +
    '<p style="margin:24px 0;"><a href="' + escapeCustomerEmailHtml(ctaUrl) + '" style="display:inline-block;padding:13px 19px;background:#17251f;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;">' +
    escapeCustomerEmailHtml(ctaLabel) + '</a></p>' +
    '<p style="margin:26px 0 0;color:#777;font-size:13px;line-height:1.6;">Questions? Reply to this email and the HAMLET team will assist you.</p></div></div>' +
    '<p style="max-width:600px;margin:16px auto;color:#888;font-size:12px;text-align:center;">HAMLET · Your stay, sorted.</p></div>';
  const text = [
    heading,
    '',
    'Hello ' + (row.recipient_name || 'there') + ',',
    intro,
    '',
    ...visibleRows.map(([label, value]) => label + ': ' + String(value)),
    '',
    ctaLabel + ': ' + ctaUrl,
    '',
    'HAMLET · Your stay, sorted.',
  ].join('\n');

  return { subject: row.subject.replace(/[\r\n]+/g, ' ').trim(), html, text };
}

export async function defaultSendCustomerEmail(
  params: CustomerEmailSendParams,
): Promise<CustomerEmailSendResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + params.apiKey,
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
      }),
    });
    let body: { id?: string; message?: string; name?: string } = {};
    try { body = await response.json() as typeof body; } catch { body = {}; }
    if (response.ok && body.id) return { id: body.id, statusCode: response.status };
    return {
      error: body.message || body.name || 'Resend API returned HTTP ' + response.status + '.',
      statusCode: response.status,
      retryable: response.status === 429 || response.status >= 500,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network failure contacting Resend.',
      retryable: true,
    };
  }
}

export async function handleCustomerEmailDispatch(
  req: Request,
  deps: CustomerEmailDispatchDeps,
): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'POST required.' }, 405);

  const expected = deps.internalDispatchSecret?.trim() ?? '';
  const supplied = req.headers.get('x-hamlet-internal-secret')?.trim() ?? '';
  const authorizedByEnvironment = expected.length >= 32 && timingSafeEqual(supplied, expected);
  let authorizedByVault = false;
  if (!authorizedByEnvironment && supplied.length >= 32 && deps.verifyVaultDispatchSecret) {
    try {
      authorizedByVault = await deps.verifyVaultDispatchSecret(supplied);
    } catch {
      authorizedByVault = false;
    }
  }
  if (!authorizedByEnvironment && !authorizedByVault) {
    return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401);
  }

  const apiKey = deps.resendApiKey?.trim() ?? '';
  const from = deps.resendFromEmail?.trim() ?? '';
  if (!deps.supabaseConfigured || !apiKey || !from || /[\r\n]/.test(from)) {
    return jsonResponse({ ok: false, error: 'Customer email dispatch configuration is incomplete.' }, 503);
  }

  let requestBody: { batchLimit?: unknown } = {};
  try {
    const raw = await req.text();
    if (raw.trim()) {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return jsonResponse({ ok: false, error: 'JSON request body must be an object.' }, 400);
      }
      requestBody = parsed as typeof requestBody;
    }
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON request body.' }, 400);
  }

  const batchLimit = typeof requestBody.batchLimit === 'number' && Number.isFinite(requestBody.batchLimit)
    ? Math.max(1, Math.min(50, Math.trunc(requestBody.batchLimit)))
    : 20;
  const { data: rows, error: claimError } = await deps.claimNotifications(batchLimit);
  if (claimError) return jsonResponse({ ok: false, error: 'Could not claim customer emails.' }, 500);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const sendEmail = deps.sendEmail ?? defaultSendCustomerEmail;
  const baseUrl = resolveAppUrl(deps.hamletAppUrl);

  for (const row of rows ?? []) {
    if (!isValidCustomerEmail(row.recipient_email)) {
      skipped += 1;
      await deps.completeNotification({ id: row.id, status: 'skipped', errorDetail: 'Recipient email address is invalid.' });
      continue;
    }

    const rendered = renderCustomerEmail(row, baseUrl);
    let result: CustomerEmailSendResult;
    try {
      result = await sendEmail({
        apiKey,
        from,
        replyTo: deps.resendReplyToEmail?.trim() || undefined,
        to: row.recipient_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: row.idempotency_key,
      });
    } catch (error) {
      result = {
        error: error instanceof Error ? error.message : 'Email provider request failed.',
        retryable: true,
      };
    }

    if (result.id) {
      sent += 1;
      await deps.completeNotification({
        id: row.id,
        status: 'sent',
        recipientEmail: row.recipient_email,
        providerMessageId: result.id,
      });
    } else {
      failed += 1;
      const canRetry = result.retryable === true && row.attempt_count < row.max_attempts;
      const safeError = String(result.error || 'Email provider rejected the message.')
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .replace(/\bre_[A-Za-z0-9_]+/g, '[REDACTED_RESEND_KEY]')
        .replace(/[\r\n\t]+/g, ' ')
        .slice(0, 480);
      await deps.completeNotification({
        id: row.id,
        status: 'failed',
        errorDetail: safeError,
        backoffSeconds: canRetry ? Math.min(60 * (2 ** Math.max(0, row.attempt_count - 1)), 3600) : 3600,
      });
    }
  }

  return jsonResponse({ ok: failed === 0, processed: (rows ?? []).length, sent, failed, skipped });
}
