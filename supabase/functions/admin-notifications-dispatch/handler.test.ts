import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultSendAdminAlertEmail,
  handleAdminNotificationsDispatch,
  type AdminNotificationsDispatchDeps,
  type AdminNotificationUpdateInput,
  type ClaimedAdminNotificationRow,
} from './handler';
import './index';

const VALID_SECRET = 'hamlet_internal_dispatch_secret_32chars_ok!';

function makeDeps(
  overrides: Partial<AdminNotificationsDispatchDeps> = {},
): {
  deps: AdminNotificationsDispatchDeps;
  claimMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  updates: AdminNotificationUpdateInput[];
} {
  const updates: AdminNotificationUpdateInput[] = [];
  const claimMock = vi.fn(async () => ({
    data: [] as ClaimedAdminNotificationRow[],
    error: null,
  }));
  const updateMock = vi.fn(async (input: AdminNotificationUpdateInput) => {
    updates.push(input);
    return { error: null };
  });

  const deps: AdminNotificationsDispatchDeps = {
    internalDispatchSecret: VALID_SECRET,
    supabaseConfigured: true,
    resendApiKey: 're_live_secret_token_do_not_expose_12345',
    resendFromEmail: 'HAMLET <notifications@send.hamlet.rest>',
    resendReplyToEmail: 'ops-reply@hamlet.rest',
    operationsEmail: 'ops@hamlet.rest',
    hamletAppUrl: 'https://hamlet.rest',
    now: () => new Date('2026-11-07T12:00:00.000Z'),
    claimAdminNotifications: claimMock,
    updateAdminNotification: updateMock,
    ...overrides,
  };

  return { deps, claimMock, updateMock, updates };
}

describe('admin-notifications-dispatch Edge Function handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-POST HTTP methods with 405 before claiming notifications', async () => {
    const { deps, claimMock } = makeDeps();

    for (const method of ['GET', 'OPTIONS', 'PUT', 'DELETE']) {
      const res = await handleAdminNotificationsDispatch(
        new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
          method,
          headers: { 'x-hamlet-internal-secret': VALID_SECRET },
        }),
        deps,
      );
      expect(res.status).toBe(405);
    }

    expect(claimMock).not.toHaveBeenCalled();
  });

  it('rejects missing, short, incorrect, and user-JWT-only requests with 401', async () => {
    const { deps, claimMock } = makeDeps();

    // 1. Missing internal secret header
    const missingRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
      }),
      deps,
    );
    expect(missingRes.status).toBe(401);

    // 2. Incorrect internal secret (same length & different length)
    const sameLengthWrong = 'x'.repeat(VALID_SECRET.length);
    const wrongSameLenRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': sameLengthWrong },
      }),
      deps,
    );
    expect(wrongSameLenRes.status).toBe(401);

    const wrongShortRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': 'wrong-secret' },
      }),
      deps,
    );
    expect(wrongShortRes.status).toBe(401);

    // 3. Unauthorised caller passing Bearer JWT + apikey without internal secret
    const bearerOnlyRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.sig',
          apikey: 'sb_publishable_public_key',
        },
      }),
      deps,
    );
    expect(bearerOnlyRes.status).toBe(401);

    // 4. Configured secret shorter than 32 characters is rejected even if matched
    const { deps: weakSecretDeps } = makeDeps({
      internalDispatchSecret: 'too-short-secret-under-32',
    });
    const weakRes = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': 'too-short-secret-under-32' },
      }),
      weakSecretDeps,
    );
    expect(weakRes.status).toBe(401);

    expect(claimMock).not.toHaveBeenCalled();
  });

  it('accepts a valid Vault-backed scheduler secret while preserving environment-secret auth', async () => {
    const verifyVaultDispatchSecret = vi.fn(async (candidate: string) => candidate === VALID_SECRET);
    const { deps, claimMock } = makeDeps({
      internalDispatchSecret: undefined,
      verifyVaultDispatchSecret,
    });
    const res = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': VALID_SECRET },
      }),
      deps,
    );

    expect(res.status).toBe(200);
    expect(verifyVaultDispatchSecret).toHaveBeenCalledWith(VALID_SECRET);
    expect(claimMock).toHaveBeenCalledOnce();
  });

  it('returns 503 when required Supabase or Resend configuration is incomplete', async () => {
    const { deps } = makeDeps({ resendApiKey: '' });
    const res = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': VALID_SECRET },
      }),
      deps,
    );
    expect(res.status).toBe(503);
  });

  it('delivers claimed notifications via Resend with idempotency key, escaped HTML, and clean plain-text newlines', async () => {
    const claimedRow: ClaimedAdminNotificationRow = {
      id: 'notif-uuid-001',
      event_type: 'partner_application_submitted',
      title: 'New partner application\r\nInjected-Header: nope',
      message: 'Tunde <script>alert(1)</script> submitted an application.',
      delivery_status: 'processing',
      delivery_attempts: 1,
      payload: {
        applicant_name: 'Tunde <img src=x onerror=alert(1)>',
        applicant_email: 'tunde@ikoyihomes.ng',
        company: 'Ikoyi Homes & Co',
        role: 'Property Owner',
        status: 'pending',
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 're_email_001' }), { status: 200 }),
    );

    const { deps, updates } = makeDeps({
      claimAdminNotifications: vi.fn(async () => ({
        data: [claimedRow],
        error: null,
      })),
      sendEmail: defaultSendAdminAlertEmail,
    });

    const res = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': VALID_SECRET },
      }),
      deps,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      processed: 1,
      sent: 1,
      failed: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [fetchUrl, fetchInit] = fetchSpy.mock.calls[0];
    expect(fetchUrl).toBe('https://api.resend.com/emails');
    const sentHeaders = fetchInit?.headers as Record<string, string>;
    expect(sentHeaders['idempotency-key']).toBe('hamlet-admin-notification-notif-uuid-001');

    const sentPayload = JSON.parse(String(fetchInit?.body)) as {
      from: string;
      reply_to?: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
    };
    expect(sentPayload.to).toEqual(['ops@hamlet.rest']);
    expect(sentPayload.reply_to).toBe('ops-reply@hamlet.rest');
    expect(sentPayload.subject).not.toMatch(/[\r\n]/);
    expect(sentPayload.html).not.toContain('<script>');
    expect(sentPayload.html).not.toContain('<img src=x');
    expect(sentPayload.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(sentPayload.html).toContain('https://hamlet.rest/admin/communications');
    expect(sentPayload.text).toContain('\nCompany: Ikoyi Homes & Co\n');
    expect(sentPayload.text).not.toContain('\\n');

    expect(updates).toEqual([
      {
        id: 'notif-uuid-001',
        delivery_status: 'sent',
        delivered_at: '2026-11-07T12:00:00.000Z',
        last_delivery_error: null,
      },
    ]);
  });

  it('records sanitized failure details and exponential backoff on Resend HTTP and network errors', async () => {
    const rows: ClaimedAdminNotificationRow[] = [
      {
        id: 'notif-fail-http',
        event_type: 'partner_application_submitted',
        title: 'New partner application',
        message: 'HTTP failure case',
        delivery_status: 'processing',
        delivery_attempts: 1,
        payload: {},
      },
      {
        id: 'notif-fail-net',
        event_type: 'partner_application_status_changed',
        title: 'Partner application decision recorded',
        message: 'Network failure case',
        delivery_status: 'processing',
        delivery_attempts: 3,
        payload: {},
      },
    ];

    const { deps, updates } = makeDeps({
      claimAdminNotifications: vi.fn(async () => ({ data: rows, error: null })),
      sendEmail: vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          error: 'Resend HTTP 502 with token re_live_secret_token_do_not_expose_12345',
        })
        .mockRejectedValueOnce(new Error(`Socket hangup (${VALID_SECRET})`)),
    });

    const res = await handleAdminNotificationsDispatch(
      new Request('https://edge.hamlet.test/functions/v1/admin-notifications-dispatch', {
        method: 'POST',
        headers: { 'x-hamlet-internal-secret': VALID_SECRET },
      }),
      deps,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: false,
      processed: 2,
      sent: 0,
      failed: 2,
    });

    expect(updates).toHaveLength(2);
    // Attempt 1 -> 60s backoff
    expect(updates[0]).toEqual({
      id: 'notif-fail-http',
      delivery_status: 'failed',
      last_delivery_error: 'Resend HTTP 502 with token [REDACTED]',
      next_attempt_at: '2026-11-07T12:01:00.000Z',
    });
    // Attempt 3 -> 240s (4m) backoff
    expect(updates[1]).toEqual({
      id: 'notif-fail-net',
      delivery_status: 'failed',
      last_delivery_error: 'Socket hangup ([REDACTED])',
      next_attempt_at: '2026-11-07T12:04:00.000Z',
    });
  });
});
