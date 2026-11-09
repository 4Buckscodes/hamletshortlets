import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  renderBookingNotificationEmail,
  type BookingNotificationEventType,
  type BookingNotificationPayload,
  type BookingNotificationRecipientType,
} from '../../../../supabase/functions/booking-notifications/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OutboxRow = {
  id: string;
  event_key: string;
  actor_user_id: string | null;
  recipient_user_id: string | null;
  recipient_email: string;
  recipient_type: 'customer' | 'guest' | 'partner' | 'operations';
  event_type: string;
  subject: string;
  payload: Record<string, unknown> | null;
  attempt_count: number;
};

type RenderedEmail = { subject: string; html: string; text: string };

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
}

function resolveEmailCopy(row: OutboxRow, baseUrl: string): RenderedEmail {
  if (row.event_type.startsWith('booking_')) {
    return renderBookingNotificationEmail({
      bookingId: String(row.payload?.booking_id ?? ''),
      bookingReference: String(row.payload?.booking_reference ?? ''),
      eventType: row.event_type as BookingNotificationEventType,
      recipientType: row.recipient_type === 'operations'
        ? 'operations'
        : row.recipient_type === 'partner' ? 'partner' : 'guest',
      payload: (row.payload ?? {}) as BookingNotificationPayload,
      appBaseUrl: baseUrl,
    });
  }

  const payload = row.payload ?? {};
  const name = String(payload.name ?? payload.applicant_name ?? 'there');
  const propertyTitle = String(payload.property_title ?? 'your property listing');
  const role = String(payload.role ?? 'partner');
  const status = String(payload.status ?? '');
  const reviewNote = String(payload.review_note ?? '');
  const operations = row.recipient_type === 'operations';
  let heading = row.subject;
  let intro = 'There is an update to your HAMLET account.';
  let ctaLabel = 'Open HAMLET';
  let ctaUrl = `${baseUrl}/account`;

  switch (row.event_type) {
    case 'welcome_registration':
      heading = 'Welcome to HAMLET';
      intro = `Hello ${name}, your HAMLET account is ready. You can now explore stays, manage your account and continue your journey with us.`;
      ctaLabel = 'Explore Lagos stays';
      ctaUrl = `${baseUrl}/stays`;
      break;
    case 'operations_new_registration':
      heading = 'New account registration';
      intro = `${name} created a HAMLET account.`;
      ctaLabel = 'Open operations communications';
      ctaUrl = `${baseUrl}/admin/communications`;
      break;
    case 'partner_application_received':
      heading = 'We have received your partner application';
      intro = `Hello ${name}, thank you for applying to work with HAMLET as a ${role}. Your application is now in our review queue. We will email you when a decision or further information is required.`;
      ctaLabel = 'Open your partner workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'partner_application_approved':
      heading = 'Your partner application has been approved';
      intro = `Hello ${name}, your HAMLET partner application has been approved. Your partner access is now active.`;
      ctaLabel = 'Open your partner workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'partner_application_needs_correction':
      heading = 'Action required on your partner application';
      intro = `Hello ${name}, our team needs some additional information before we can complete your partner application.`;
      ctaLabel = 'Review your application';
      ctaUrl = `${baseUrl}/partners/apply/form`;
      break;
    case 'partner_application_rejected':
      heading = 'An update on your partner application';
      intro = `Hello ${name}, HAMLET has completed its review of your partner application. Please sign in to view the decision and any accompanying note.`;
      ctaLabel = 'View application status';
      ctaUrl = `${baseUrl}/partners/apply/form`;
      break;
    case 'partner_application_resubmitted':
      heading = 'Your updated partner application is under review';
      intro = `Hello ${name}, we have received your updated partner application and returned it to the review queue.`;
      ctaLabel = 'Open your partner workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_submitted':
      heading = 'Your property listing has been submitted';
      intro = `Hello ${name}, we have received ${propertyTitle}. Your listing is now under HAMLET review and will not appear publicly until approved.`;
      ctaLabel = 'View your property workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_resubmitted':
      heading = 'Your corrected property listing has been resubmitted';
      intro = `Hello ${name}, ${propertyTitle} has been returned to the HAMLET review queue.`;
      ctaLabel = 'View your property workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_approved':
      heading = 'Your property is approved on HAMLET';
      intro = `Hello ${name}, ${propertyTitle} has passed HAMLET's property review and is now approved for marketplace publication.`;
      ctaLabel = 'View your partner workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_needs_correction':
      heading = 'Action required on your property listing';
      intro = `Hello ${name}, HAMLET needs some changes or supporting information for ${propertyTitle} before the review can be completed.`;
      ctaLabel = 'Review your property';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_rejected':
      heading = 'An update on your property submission';
      intro = `Hello ${name}, HAMLET has completed the review of ${propertyTitle}. Sign in to view the decision and review note.`;
      ctaLabel = 'View your property workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    case 'property_suspended':
    case 'property_paused':
    case 'property_archived':
      heading = row.subject;
      intro = `Hello ${name}, the status of ${propertyTitle} has changed to ${status}.`;
      ctaLabel = 'View your property workspace';
      ctaUrl = `${baseUrl}/partners`;
      break;
    default:
      if (operations) {
        intro = `A HAMLET event was recorded: ${row.event_type}.`;
        ctaLabel = 'Open operations communications';
        ctaUrl = `${baseUrl}/admin/communications`;
      }
  }

  const details = [
    ['Event', row.event_type],
    ['Name', name],
    ['Role', role],
    ['Company', payload.company],
    ['Property', payload.property_title],
    ['Area', payload.property_area],
    ['Status', status],
    ['Review note', reviewNote],
    ['Applicant email', payload.email ?? payload.applicant_email],
  ].filter((entry): entry is [string, unknown] =>
    entry[1] !== null && entry[1] !== undefined && String(entry[1]).trim() !== '',
  );

  const detailRows = details.map(([label, value]) =>
    `<tr><th align="left" style="padding:8px;border-bottom:1px solid #ece8df;color:#64748b;">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #ece8df;color:#0f172a;">${escapeHtml(value)}</td></tr>`,
  ).join('');

  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f6f4ef;font-family:Arial,sans-serif;color:#0f172a;"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e0d5;border-radius:18px;"><tr><td style="background:#0e1f3b;padding:22px 28px;color:#fff;font-size:22px;font-weight:800;letter-spacing:2px;">HAMLET<span style="color:#c9a44a;">.</span></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 8px;color:#9a762e;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${operations ? 'Operations update' : 'Your stay, sorted.'}</p><h1 style="font-size:23px;line-height:1.3;margin:0 0 14px;">${escapeHtml(heading)}</h1><p style="font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(intro)}</p>${detailRows ? `<table width="100%" style="border-collapse:collapse;margin:18px 0;">${detailRows}</table>` : ''}<p style="margin:24px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 20px;background:#0e1f3b;border-radius:10px;color:#fff;text-decoration:none;font-weight:700;">${escapeHtml(ctaLabel)}</a></p><p style="font-size:12px;line-height:1.6;color:#64748b;">For your security, complete account, listing and booking actions only after signing in to HAMLET. We will never ask you to share your password or payment credentials by email.</p></td></tr><tr><td style="padding:18px 28px;background:#faf8f5;border-top:1px solid #eae5da;font-size:12px;color:#64748b;">HAMLET · Verified Lagos Shortlets · <a href="${baseUrl}" style="color:#0e1f3b;">hamlet.rest</a></td></tr></table></body></html>`;
  const text = [
    'HAMLET — Your stay, sorted.',
    '',
    heading,
    '',
    intro,
    '',
    ...details.map(([label, value]) => `${label}: ${String(value)}`),
    '',
    `${ctaLabel}: ${ctaUrl}`,
    '',
    'For your security, complete actions only after signing in to HAMLET.',
  ].join('\n');

  return { subject: row.subject, html, text };
}

async function sendWithResend(row: OutboxRow, rendered: RenderedEmail, apiKey: string, from: string, replyTo?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': `hamlet-communications-${row.id}`,
      },
      body: JSON.stringify({
        from,
        to: [row.recipient_email],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: 'hamlet_event', value: row.event_type.slice(0, 200).replace(/[^a-zA-Z0-9_-]/g, '_') },
          { name: 'hamlet_recipient', value: row.recipient_type },
        ],
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
    if (!response.ok || !body.id) {
      return { ok: false as const, error: body.message || body.name || `Resend HTTP ${response.status}` };
    }
    return { ok: true as const, messageId: body.id };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error && error.name === 'AbortError'
        ? 'Resend request timed out.'
        : 'Network error while contacting Resend.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handle(request: Request, systemRun: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const dispatchSecret = process.env.COMMUNICATIONS_DISPATCH_SECRET?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'HAMLET <notifications@send.hamlet.rest>';
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL?.trim() || undefined;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://hamlet.rest';

  if (!url || !publishableKey || !dispatchSecret || !resendApiKey) {
    return NextResponse.json({ ok: false, error: 'Communications dispatch is not configured.' }, { status: 503 });
  }

  let supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (!systemRun) {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return NextResponse.json({ ok: false, error: 'Session invalid or expired.' }, { status: 401 });
    // Recreate the client with the caller's JWT so the RPC can enforce recipient-level scope.
    supabase = createClient(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const { data, error } = await supabase.rpc('claim_communications_outbox', {
    p_dispatch_secret: dispatchSecret,
    p_batch_limit: systemRun ? 50 : 20,
    p_system_run: systemRun,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: 'Could not claim communications events.' }, { status: 500 });
  }

  const rows = (data ?? []) as OutboxRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const rendered = resolveEmailCopy(row, baseUrl);
    const result = await sendWithResend(row, rendered, resendApiKey, from, replyTo);
    const retryAfter = Math.min(60 * (2 ** Math.max(0, row.attempt_count - 1)), 3600);

    const { error: completeError } = await supabase.rpc('complete_communications_outbox', {
      p_dispatch_secret: dispatchSecret,
      p_notification_id: row.id,
      p_delivery_status: result.ok ? 'sent' : 'failed',
      p_provider_message_id: result.ok ? result.messageId : null,
      p_error: result.ok ? null : result.error,
      p_retry_after_seconds: retryAfter,
      p_system_run: systemRun,
    });

    if (completeError) {
      failed += 1;
      continue;
    }
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: failed === 0,
    processed: rows.length,
    sent,
    failed,
  });
}

export async function POST(request: Request) {
  return handle(request, false);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() || '';
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!cronSecret || !safeEqual(token, cronSecret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }
  return handle(request, true);
}
