import { describe, expect, it, vi } from 'vitest';
import {
  buildCustomerEmail,
  handleCustomerNotificationsDispatch,
  type ClaimedCustomerEmailNotification,
  type CustomerNotificationsDeps,
} from './handler';

const INTERNAL_SECRET = 'hamlet-test-secret-that-is-at-least-thirty-two-characters';

function makeRow(
  overrides: Partial<ClaimedCustomerEmailNotification> = {},
): ClaimedCustomerEmailNotification {
  return {
    id: 'notification-1',
    event_type: 'property_submitted',
    recipient_user_id: 'user-1',
    recipient_email: 'owner@example.com',
    idempotency_key: 'property-submitted:property-1:user-1',
    payload: { full_name: 'Amina', property_title: 'Lekki apartment', area: 'Lekki' },
    attempt_count: 1,
    max_attempts: 5,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<CustomerNotificationsDeps> = {}) {
  const updateNotification = vi.fn(async () => ({ error: null }));
  const sendEmail = vi.fn(async () => ({ id: 'resend-message-1' }));
  const claimNotifications = vi.fn(async () => ({ data: [makeRow()], error: null }));
  const deps: CustomerNotificationsDeps = {
    internalDispatchSecret: INTERNAL_SECRET,
    resendApiKey: 're_test_key',
    resendFromEmail: 'HAMLET <notifications@send.hamlet.rest>',
    hamletAppUrl: 'https://hamlet.rest',
    claimNotifications,
    updateNotification,
    sendEmail,
    ...overrides,
  };
  return { deps, updateNotification, sendEmail, claimNotifications };
}

async function dispatch(deps: CustomerNotificationsDeps, secret = INTERNAL_SECRET) {
  return handleCustomerNotificationsDispatch(
    new Request('https://hamlet.test/functions/v1/customer-notifications-dispatch', {
      method: 'POST',
      headers: { 'x-hamlet-internal-secret': secret },
    }),
    deps,
  );
}

describe('customer notification email rendering', () => {
  it('renders property submission as received but not yet approved or bookable', () => {
    const email = buildCustomerEmail(
      'property_submitted',
      { property_title: 'Lekki apartment', area: 'Lekki' },
      'https://hamlet.rest',
    );
    expect(email.subject).toContain('submitted');
    expect(email.text).toContain('not yet approved or visible as a bookable property');
    expect(email.text).toContain('https://hamlet.rest/partners/properties');
  });

  it('escapes untrusted reviewer notes in HTML', () => {
    const email = buildCustomerEmail(
      'property_status_changed',
      {
        property_title: 'Test home',
        status: 'needs_correction',
        review_note: '<script>alert(1)</script>',
      },
      'https://hamlet.rest',
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('uses a useful correction message for partner application decisions', () => {
    const email = buildCustomerEmail(
      'partner_application_status_changed',
      { status: 'needs_correction', review_note: 'Please clarify your authority.' },
      'https://hamlet.rest',
    );
    expect(email.subject).toContain('Action needed');
    expect(email.text).toContain('Please clarify your authority.');
  });
});

describe('customer notification dispatch', () => {
  it('rejects a missing or incorrect internal secret without claiming rows', async () => {
    const { deps, claimNotifications } = makeDeps();
    const response = await dispatch(deps, 'wrong-secret');

    expect(response.status).toBe(401);
    expect(claimNotifications).not.toHaveBeenCalled();
  });

  it('rejects incomplete provider configuration without claiming rows', async () => {
    const { deps, claimNotifications } = makeDeps({ resendApiKey: undefined });
    const response = await dispatch(deps);

    expect(response.status).toBe(503);
    expect(claimNotifications).not.toHaveBeenCalled();
  });

  it('sends claimed customer email and records provider delivery details', async () => {
    const { deps, updateNotification, sendEmail } = makeDeps();
    const response = await dispatch(deps);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, processed: 1, sent: 1, failed: 0 });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      idempotencyKey: 'property-submitted:property-1:user-1',
    }));
    expect(updateNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      delivery_status: 'sent',
      provider_message_id: 'resend-message-1',
    }));
  });

  it('marks failed delivery for retry and redacts the provider key from errors', async () => {
    const { deps, updateNotification } = makeDeps({
      sendEmail: vi.fn(async () => ({ error: 'Invalid key re_test_key', retryable: true })),
      now: () => new Date('2026-11-09T10:00:00.000Z'),
    });
    const response = await dispatch(deps);
    const body = await response.json();

    expect(body).toMatchObject({ ok: false, processed: 1, sent: 0, failed: 1 });
    expect(updateNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: 'notification-1',
      delivery_status: 'failed',
      last_delivery_error: expect.not.stringContaining('re_test_key'),
      next_attempt_at: expect.any(String),
    }));
  });
});
