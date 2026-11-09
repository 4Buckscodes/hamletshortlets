import { describe, expect, it, vi } from 'vitest';
import {
  escapeCustomerEmailHtml,
  handleCustomerEmailDispatch,
  renderCustomerEmail,
  type CustomerEmailNotificationRow,
} from './handler';

const INTERNAL_SECRET = 'hamlet-test-internal-secret-32-characters-minimum';

function makeRow(overrides: Partial<CustomerEmailNotificationRow> = {}): CustomerEmailNotificationRow {
  return {
    id: 'notification-1',
    event_type: 'property_status_changed',
    recipient_user_id: 'user-1',
    recipient_email: 'owner@example.com',
    recipient_name: 'Property Owner',
    subject: 'There is an update on your HAMLET property',
    payload: {
      property_id: 'property-1',
      property_title: 'Luxury Apartment',
      area: 'Lekki',
      status: 'needs_correction',
      review_note: 'Please update the ownership document.',
    },
    delivery_status: 'processing',
    attempt_count: 1,
    max_attempts: 5,
    idempotency_key: 'property-lifecycle:property-1:needs_correction:timestamp',
    ...overrides,
  };
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const claimNotifications = vi.fn(async () => ({ data: [makeRow()], error: null }));
  const completeNotification = vi.fn(async () => ({ error: null }));
  const sendEmail = vi.fn(async () => ({ id: 'resend-message-1', statusCode: 200 }));
  return {
    deps: {
      internalDispatchSecret: INTERNAL_SECRET,
      supabaseConfigured: true,
      resendApiKey: 'resend-test-key',
      resendFromEmail: 'HAMLET <notifications@send.hamlet.rest>',
      hamletAppUrl: 'https://hamlet.rest',
      claimNotifications,
      completeNotification,
      sendEmail,
      ...overrides,
    },
    claimNotifications,
    completeNotification,
    sendEmail,
  };
}

async function dispatch(deps: ReturnType<typeof makeDeps>['deps'], body: unknown = {}) {
  return handleCustomerEmailDispatch(
    new Request('https://hamlet.test/functions/v1/customer-notifications-dispatch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hamlet-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    }),
    deps,
  );
}

describe('customer email lifecycle dispatcher', () => {
  it('rejects calls without the configured internal secret', async () => {
    const { deps, claimNotifications } = makeDeps({ internalDispatchSecret: 'incorrect-secret-value-over-32-chars' });
    const response = await dispatch(deps);
    expect(response.status).toBe(401);
    expect(claimNotifications).not.toHaveBeenCalled();
  });

  it('accepts a valid Vault-backed scheduler secret when no Edge Function secret is set', async () => {
    const verifyVaultDispatchSecret = vi.fn(async (candidate: string) => candidate === INTERNAL_SECRET);
    const { deps, claimNotifications } = makeDeps({
      internalDispatchSecret: undefined,
      verifyVaultDispatchSecret,
    });
    const response = await dispatch(deps);

    expect(response.status).toBe(200);
    expect(verifyVaultDispatchSecret).toHaveBeenCalledWith(INTERNAL_SECRET);
    expect(claimNotifications).toHaveBeenCalledOnce();
  });

  it('does not claim queue rows when Resend configuration is missing', async () => {
    const { deps, claimNotifications } = makeDeps({ resendApiKey: undefined });
    const response = await dispatch(deps);
    expect(response.status).toBe(503);
    expect(claimNotifications).not.toHaveBeenCalled();
  });

  it('sends the rendered message and records the provider message id', async () => {
    const { deps, claimNotifications, completeNotification, sendEmail } = makeDeps();
    const response = await dispatch(deps, { batchLimit: 8 });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, processed: 1, sent: 1, failed: 0 });
    expect(claimNotifications).toHaveBeenCalledWith(8);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      idempotencyKey: 'property-lifecycle:property-1:needs_correction:timestamp',
    }));
    expect(completeNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      status: 'sent',
      providerMessageId: 'resend-message-1',
    }));
  });

  it('records transient provider failures for retry with backoff', async () => {
    const { deps, completeNotification } = makeDeps({
      sendEmail: vi.fn(async () => ({ error: 'Rate limited', statusCode: 429, retryable: true })),
    });
    const response = await dispatch(deps);
    const body = await response.json();

    expect(body).toMatchObject({ ok: false, failed: 1 });
    expect(completeNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      status: 'failed',
      errorDetail: 'Rate limited',
      backoffSeconds: 60,
    }));
  });

  it('escapes untrusted user content in HTML email templates', () => {
    const html = renderCustomerEmail(makeRow({
      recipient_name: '<img src=x onerror=alert(1)>',
      payload: { property_title: '<script>alert(1)</script>', status: 'needs_correction' },
    }), 'https://hamlet.rest').html;

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes all five HTML-sensitive characters', () => {
    expect(escapeCustomerEmailHtml("<>&\"'")).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('does not send an invalid recipient address', async () => {
    const { deps, sendEmail, completeNotification } = makeDeps({
      claimNotifications: vi.fn(async () => ({
        data: [makeRow({ recipient_email: 'not-an-email' })],
        error: null,
      })),
    });
    const response = await dispatch(deps);
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, skipped: 1, sent: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(completeNotification).toHaveBeenCalledWith(expect.objectContaining({
      status: 'skipped',
    }));
  });
});
