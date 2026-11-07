import { createClient } from '@supabase/supabase-js';

interface Runtime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}
const runtime = (globalThis as unknown as { Deno?: Runtime }).Deno;

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

if (runtime) {
  runtime.serve(async req => {
    if (req.method !== 'POST') return response({ ok: false, error: 'POST required.' }, 405);
    const expected = runtime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET') ?? '';
    const supplied = req.headers.get('x-hamlet-internal-secret') ?? '';
    if (expected.length < 32 || !constantTimeEqual(supplied, expected)) {
      return response({ ok: false, error: 'Unauthorized.' }, 401);
    }
    const url = runtime.env.get('SUPABASE_URL');
    const serviceKey = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = runtime.env.get('RESEND_API_KEY');
    const from = runtime.env.get('RESEND_FROM_EMAIL');
    const operationsEmail = runtime.env.get('HAMLET_BOOKINGS_EMAIL');
    if (!url || !serviceKey || !resendKey || !from || !operationsEmail) {
      return response({ ok: false, error: 'Dispatch configuration is incomplete.' }, 503);
    }

    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: rows, error: claimError } = await db.rpc('claim_admin_notifications', { batch_limit: 20 });
    if (claimError) return response({ ok: false, error: 'Could not claim communications events.' }, 500);

    let sent = 0;
    let failed = 0;
    for (const row of rows ?? []) {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {};
      const details = [
        ['Event', row.event_type],
        ['Applicant', payload.applicant_name],
        ['Email', payload.applicant_email],
        ['Company', payload.company],
        ['Role', payload.role],
        ['Status', payload.status],
      ].filter(([, value]) => value !== null && value !== undefined && value !== '');
      const html = `<h2>${escapeHtml(row.title)}</h2><p>${escapeHtml(row.message)}</p><table>${details.map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table><p>Open the HAMLET admin communications centre to review this event.</p>`;
      let providerError: string | null = null;
      try {
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${resendKey}`,
            'content-type': 'application/json',
            'idempotency-key': `hamlet-admin-notification-${row.id}`,
          },
          body: JSON.stringify({
            from,
            to: [operationsEmail],
            subject: `[HAMLET Operations] ${row.title}`,
            html,
            text: [row.title, row.message, ...details.map(([label, value]) => `${label}: ${value}`)].join('\\n'),
          }),
        });
        if (!result.ok) providerError = `Resend HTTP ${result.status}`;
      } catch {
        providerError = 'Network error while contacting email provider.';
      }

      if (providerError) {
        failed += 1;
        const backoff = Math.min(60 * (2 ** Math.max(0, Number(row.delivery_attempts) - 1)), 3600);
        await db.from('admin_notifications').update({
          delivery_status: Number(row.delivery_attempts) >= 5 ? 'failed' : 'failed',
          last_delivery_error: providerError,
          next_attempt_at: new Date(Date.now() + backoff * 1000).toISOString(),
        }).eq('id', row.id);
      } else {
        sent += 1;
        await db.from('admin_notifications').update({
          delivery_status: 'sent',
          delivered_at: new Date().toISOString(),
          last_delivery_error: null,
        }).eq('id', row.id);
      }
    }
    return response({ ok: true, processed: (rows ?? []).length, sent, failed });
  });
}
