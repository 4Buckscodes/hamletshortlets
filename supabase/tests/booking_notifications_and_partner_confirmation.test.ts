import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';
import {
  handleBookingNotifications,
  defaultSendResendEmail,
  type BookingNotificationsDeps,
  type ClaimedBookingNotificationRow,
  type DispatchAuthorizationResult,
  type ResendSendParams,
  type ResendSendResult,
} from '../functions/booking-notifications/handler';
import {
  escapeHtml,
  renderBookingNotificationEmail,
  resolveSafeAssetUrl,
} from '../functions/booking-notifications/templates';

function futureIsoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

interface SeededScenario {
  adminId: string;
  ownerPartnerId: string;
  otherPartnerId: string;
  guestId: string;
  otherGuestId: string;
  propertyId: string;
}

async function seedBookingScenario(db: PGlite): Promise<SeededScenario> {
  const adminId = await createTestUser(db, {
    email: 'ops-lead@hamlet.test',
    fullName: 'Adaeze Operations',
    role: 'admin',
  });
  const ownerPartnerId = await createTestUser(db, {
    email: 'owner.ikoyi@partner.test',
    fullName: 'Tunde Adeyemi',
    role: 'partner',
  });
  const otherPartnerId = await createTestUser(db, {
    email: 'other.lekki@partner.test',
    fullName: 'Kemi Balogun',
    role: 'partner',
  });
  const guestId = await createTestUser(db, {
    email: 'amina.guest@guest.test',
    fullName: 'Amina Bello',
    role: 'guest',
  });
  const otherGuestId = await createTestUser(db, {
    email: 'chidi.guest@guest.test',
    fullName: 'Chidi Okafor',
    role: 'guest',
  });

  const propertyId = await asUser(db, ownerPartnerId, async tx => {
    const { rows } = await tx.query<{ id: string }>(
      `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
      [
        JSON.stringify({
          title: 'Bourdillon Terrace Residence',
          property_type: 'Penthouse',
          area: 'Ikoyi',
          public_address: '14 Bourdillon Road, Ikoyi, Lagos',
          nightly_rate: 180_000,
          cleaning_fee: 25_000,
          mandatory_charges: [{ label: 'Cleaning fee', amount: 25_000 }],
          refundable_deposit: 100_000,
          bedrooms: 3,
          bathrooms: 3,
          capacity: 6,
          bed_setup: '2 King, 1 Queen',
          amenities: ['24/7 inverter & solar', 'Fibre Wi-Fi', 'Gated security'],
          image_urls: ['/images/ikoyi-penthouse.jpg'],
          house_rules: ['No parties or events', 'Valid ID at check-in'],
        }),
        JSON.stringify({
          authority_basis: 'Registered title deed and owner listing mandate',
          submitted_role: 'Property Owner',
          docs: [{ label: 'Title deed', status: 'self_reported' }],
        }),
      ],
    );
    return rows[0].id;
  });

  await asUser(db, adminId, async tx => {
    await tx.query(
      `select public.review_partner_property($1, 'approved', $2, $3::jsonb)`,
      [
        propertyId,
        'Ownership, identity, authority, and physical inspection verified.',
        JSON.stringify({
          ownership: 'verified',
          identity: 'verified',
          authority: 'verified',
          inspection: 'verified',
        }),
      ],
    );
  });

  return {
    adminId,
    ownerPartnerId,
    otherPartnerId,
    guestId,
    otherGuestId,
    propertyId,
  };
}

function buildPgliteNotificationDeps(
  db: PGlite,
  tokenMap: Record<string, { id: string; email: string }>,
  overrides: Partial<BookingNotificationsDeps> = {},
): BookingNotificationsDeps {
  return {
    resendApiKey: 're_test_secret_key_99887766',
    resendFromEmail: 'HAMLET Bookings <bookings@verified-domain.test>',
    resendReplyToEmail: 'support@verified-domain.test',
    hamletBookingsEmail: 'bookings-ops@hamlet-internal.test',
    hamletAppUrl: 'https://hamletshortlets.vercel.app',
    internalDispatchSecret: 'internal_cron_dispatch_secret_2026',
    transientRetryDelayMs: 0,
    getAuthenticatedUser: async (bearerToken: string) => tokenMap[bearerToken] ?? null,
    authorizeDispatch: async (bookingId: string | null, callerUserId: string) => {
      try {
        const data = await asServiceRole(db, async tx => {
          const res = await tx.query<{ result: DispatchAuthorizationResult }>(
            `select public.authorize_booking_notification_dispatch($1, $2::uuid) as result`,
            [bookingId, callerUserId],
          );
          return res.rows[0]?.result ?? null;
        });
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'authz failed' },
        };
      }
    },
    claimPendingNotifications: async ({ bookingId, batchLimit, ignoreBackoff }) => {
      try {
        const rows = await asServiceRole(db, async tx => {
          const res = await tx.query<ClaimedBookingNotificationRow>(
            `select * from public.claim_pending_booking_notifications($1, $2, $3)`,
            [bookingId, batchLimit, ignoreBackoff],
          );
          return res.rows;
        });
        return { data: rows, error: null };
      } catch (err) {
        return {
          data: null,
          error: { message: err instanceof Error ? err.message : 'claim failed' },
        };
      }
    },
    completeNotification: async (input) => {
      try {
        await asServiceRole(db, async tx => {
          await tx.query(
            `select public.complete_booking_notification($1::uuid, $2, $3, $4, $5, $6, $7)`,
            [
              input.id,
              input.status,
              input.recipientEmail ?? null,
              input.subject ?? null,
              input.providerMessageId ?? null,
              input.errorDetail ?? null,
              input.backoffSeconds ?? 60,
            ],
          );
        });
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : 'complete failed' } };
      }
    },
    ...overrides,
  };
}

describe('Booking Notifications, Partner Dashboard Confirmation & Resend Integration', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  beforeEach(async () => {
    await resetTestData(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('creates booking request + enqueues and sends Guest, Partner, and HAMLET Operations emails with required copy and links', async () => {
    const ctx = await seedBookingScenario(db);
    const checkIn = futureIsoDate(10);
    const checkOut = futureIsoDate(13); // 3 nights: 540,000 + 25,000 + 108,000 (20% markup) = 673,000

    const createdBooking = await asUser(db, ctx.guestId, async tx => {
      const res = await tx.query<{ id: string; reference: string; status: string }>(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit, special_requests
         )
         values (
           'bkg-notify-001', 'HML-2026-9001', $1, $2::uuid, $3::date, $4::date, 4,
           540000, '[{"label":"Cleaning fee","amount":25000}]'::jsonb, 25000,
           16200, 581200, 100000, 'Arriving on evening flight around 7 PM'
         )
         returning id, reference, status`,
        [ctx.propertyId, ctx.guestId, checkIn, checkOut],
      );
      return res.rows[0];
    });

    expect(createdBooking.status).toBe('requested');

    // Outbox has 3 pending records: guest, partner, operations
    const queued = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query<{
        recipient_type: string;
        recipient_email: string | null;
        delivery_status: string;
        event_type: string;
        idempotency_key: string;
      }>(
        `select recipient_type, recipient_email, delivery_status, event_type, idempotency_key
         from public.booking_notifications
         where booking_id = $1
         order by recipient_type asc`,
        [createdBooking.id],
      );
      return res.rows;
    });

    expect(queued).toHaveLength(3);
    expect(queued.map(r => r.recipient_type)).toEqual(['guest', 'operations', 'partner']);
    expect(queued.every(r => r.event_type === 'booking_request_created')).toBe(true);
    expect(queued.every(r => r.delivery_status === 'pending')).toBe(true);

    // Dispatch via Edge Function handler with captured Resend calls
    const sentEmails: ResendSendParams[] = [];
    const deps = buildPgliteNotificationDeps(
      db,
      { 'guest-jwt': { id: ctx.guestId, email: 'amina.guest@guest.test' } },
      {
        sendEmail: async (params): Promise<ResendSendResult> => {
          sentEmails.push(params);
          return { id: `re_msg_${sentEmails.length}`, statusCode: 200 };
        },
      },
    );

    const response = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer guest-jwt',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ bookingId: createdBooking.id }),
      }),
      deps,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      processed: number;
      sent: number;
      failed: number;
    };
    expect(body).toMatchObject({ ok: true, processed: 3, sent: 3, failed: 0 });
    expect(sentEmails).toHaveLength(3);

    // 1) Guest email verification
    const guestEmail = sentEmails.find(e => e.to === 'amina.guest@guest.test')!;
    expect(guestEmail).toBeDefined();
    expect(guestEmail.subject).toBe("We've received your HAMLET booking request");
    expect(guestEmail.html).toContain('HML-2026-9001');
    expect(guestEmail.html).toContain('Bourdillon Terrace Residence');
    expect(guestEmail.html).toContain('4 guests');
    expect(guestEmail.html).toContain('not confirmed yet');
    expect(guestEmail.html).toContain('https://hamletshortlets.vercel.app/#/account?booking=bkg-notify-001');
    expect(guestEmail.text).toContain('NOT yet confirmed');

    // 2) Partner email verification (property details + resolved thumbnail + exact review link)
    const partnerEmail = sentEmails.find(e => e.to === 'owner.ikoyi@partner.test')!;
    expect(partnerEmail).toBeDefined();
    expect(partnerEmail.subject).toBe('Availability review required — HAMLET booking request');
    expect(partnerEmail.html).toContain('Bourdillon Terrace Residence');
    expect(partnerEmail.html).toContain('https://hamletshortlets.vercel.app/images/ikoyi-penthouse.jpg');
    expect(partnerEmail.html).toContain('Review booking request');
    expect(partnerEmail.html).toContain('https://hamletshortlets.vercel.app/#/partner/bookings/bkg-notify-001');
    expect(partnerEmail.html).toContain('Arriving on evening flight around 7 PM');
    expect(partnerEmail.text).toContain('https://hamletshortlets.vercel.app/#/partner/bookings/bkg-notify-001');

    // 3) HAMLET operations email verification (uses HAMLET_BOOKINGS_EMAIL secret)
    const opsEmail = sentEmails.find(e => e.to === 'bookings-ops@hamlet-internal.test')!;
    expect(opsEmail).toBeDefined();
    expect(opsEmail.subject).toBe('New HAMLET booking request — HML-2026-9001');
    expect(opsEmail.html).toContain('https://hamletshortlets.vercel.app/#/admin/bookings?booking=bkg-notify-001');
    expect(opsEmail.text).toContain('HML-2026-9001');

    // Verify provider_message_id and sent_at persisted in booking_notifications
    const persisted = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query<{
        recipient_type: string;
        recipient_email: string;
        delivery_status: string;
        provider_message_id: string | null;
        sent_at: string | null;
      }>(
        `select recipient_type, recipient_email, delivery_status, provider_message_id, sent_at
         from public.booking_notifications
         where booking_id = $1`,
        [createdBooking.id],
      );
      return res.rows;
    });

    expect(persisted.every(r => r.delivery_status === 'sent')).toBe(true);
    expect(persisted.every(r => r.provider_message_id?.startsWith('re_msg_'))).toBe(true);
    expect(persisted.every(r => r.sent_at !== null)).toBe(true);
    expect(persisted.find(r => r.recipient_type === 'operations')?.recipient_email).toBe(
      'bookings-ops@hamlet-internal.test',
    );
  });

  it('keeps booking saved when Resend fails, records sanitized error details, and respects idempotency + bounded retries', async () => {
    const ctx = await seedBookingScenario(db);
    const checkIn = futureIsoDate(15);
    const checkOut = futureIsoDate(17);

    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-fail-001', 'HML-2026-9002', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[{"label":"Cleaning fee","amount":25000}]'::jsonb, 25000,
           10800, 395800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, checkIn, checkOut],
      );
    });

    // Simulate Resend failing for Partner email with an error containing the secret key (must be redacted!)
    // while succeeding for Guest and Operations
    let callCount = 0;
    const failingDeps = buildPgliteNotificationDeps(
      db,
      {
        'guest-jwt': { id: ctx.guestId, email: 'amina.guest@guest.test' },
        'admin-jwt': { id: ctx.adminId, email: 'ops-lead@hamlet.test' },
      },
      {
        maxTransientRetries: 0,
        sendEmail: async (params): Promise<ResendSendResult> => {
          callCount += 1;
          if (params.to === 'owner.ikoyi@partner.test') {
            return {
              error: 'Upstream gateway rejected key re_test_secret_key_99887766 with HTTP 502',
              statusCode: 502,
              retryable: true,
            };
          }
          return { id: `re_ok_${callCount}`, statusCode: 200 };
        },
      },
    );

    const firstRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer guest-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-fail-001' }),
      }),
      failingDeps,
    );
    const firstBody = (await firstRes.json()) as {
      ok: boolean;
      sent: number;
      failed: number;
    };
    expect(firstBody).toMatchObject({ ok: false, sent: 2, failed: 1 });

    // Booking itself remains intact and saved in 'requested' status
    const savedBooking = await asUser(db, ctx.guestId, async tx => {
      const res = await tx.query<{ id: string; status: string }>(
        `select id, status from public.bookings where id = 'bkg-fail-001'`,
      );
      return res.rows[0];
    });
    expect(savedBooking).toEqual({ id: 'bkg-fail-001', status: 'requested' });

    // Failed partner row has sanitized error (raw Resend key redacted) and attempt_count = 1
    const afterFirst = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query<{
        recipient_type: string;
        delivery_status: string;
        attempt_count: number;
        last_error: string | null;
      }>(
        `select recipient_type, delivery_status, attempt_count, last_error
         from public.booking_notifications
         where booking_id = 'bkg-fail-001'`,
      );
      return res.rows;
    });
    const partnerLog = afterFirst.find(r => r.recipient_type === 'partner')!;
    expect(partnerLog.delivery_status).toBe('failed');
    expect(partnerLog.attempt_count).toBe(1);
    expect(partnerLog.last_error).toContain('HTTP 502');
    expect(partnerLog.last_error).not.toContain('re_test_secret_key_99887766');

    // Retry when Resend recovers: ONLY the 1 failed partner notification is retried —
    // already-sent guest & operations emails are NOT resent!
    const retryRecipients: string[] = [];
    const recoveredDeps = buildPgliteNotificationDeps(
      db,
      { 'admin-jwt': { id: ctx.adminId, email: 'ops-lead@hamlet.test' } },
      {
        sendEmail: async (params): Promise<ResendSendResult> => {
          retryRecipients.push(params.to);
          return { id: 're_recovered_partner', statusCode: 200 };
        },
      },
    );

    const retryRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-fail-001', forceRetry: true }),
      }),
      recoveredDeps,
    );
    const retryBody = (await retryRes.json()) as {
      ok: boolean;
      processed: number;
      sent: number;
      failed: number;
    };
    expect(retryBody).toMatchObject({ ok: true, processed: 1, sent: 1, failed: 0 });
    expect(retryRecipients).toEqual(['owner.ikoyi@partner.test']);

    // Calling again after all 3 are 'sent' processes 0 notifications (strict idempotency)
    const duplicateRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-fail-001', forceRetry: true }),
      }),
      recoveredDeps,
    );
    const duplicateBody = (await duplicateRes.json()) as { processed: number; sent: number };
    expect(duplicateBody).toMatchObject({ processed: 0, sent: 0 });
  });

  it('caps automatic retries at max_attempts (3) so persistent provider failures cannot loop infinitely', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-cap-001', 'HML-2026-9003', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[]'::jsonb, 0, 10800, 370800, 50000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(20), futureIsoDate(22)],
      );
    });

    let totalProviderCalls = 0;
    const alwaysFailDeps = buildPgliteNotificationDeps(
      db,
      { 'admin-jwt': { id: ctx.adminId, email: 'ops-lead@hamlet.test' } },
      {
        maxTransientRetries: 0,
        sendEmail: async (): Promise<ResendSendResult> => {
          totalProviderCalls += 1;
          return { error: 'Domain verification pending in Resend', statusCode: 403, retryable: false };
        },
      },
    );

    // Run 4 dispatch attempts with forceRetry; attempts 1..3 run (3 recipients * 3 = 9 calls), attempt 4 claims 0 rows!
    for (let i = 0; i < 4; i += 1) {
      await handleBookingNotifications(
        new Request('https://edge.test/functions/v1/booking-notifications', {
          method: 'POST',
          headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
          body: JSON.stringify({ bookingId: 'bkg-cap-001', forceRetry: true }),
        }),
        alwaysFailDeps,
      );
    }

    expect(totalProviderCalls).toBe(9);
    const rows = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query<{ attempt_count: number; max_attempts: number }>(
        `select attempt_count, max_attempts from public.booking_notifications where booking_id = 'bkg-cap-001'`,
      );
      return res.rows;
    });
    expect(rows.every(r => r.attempt_count === 3 && r.max_attempts === 3)).toBe(true);
  });

  it('enforces partner authorization, transitions confirmed availability to awaiting_payment (not confirmed), and triggers Event B Guest + Operations emails', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-accept-001', 'HML-2026-9004', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[{"label":"Cleaning fee","amount":25000}]'::jsonb, 25000,
           10800, 395800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(12), futureIsoDate(14)],
      );
    });

    // Wrong partner cannot read or confirm this booking
    const wrongPartnerView = await asUser(db, ctx.otherPartnerId, async tx => {
      const res = await tx.query(`select id from public.bookings where id = 'bkg-accept-001'`);
      return res.rows;
    });
    expect(wrongPartnerView).toHaveLength(0);

    await expect(
      asUser(db, ctx.otherPartnerId, async tx => {
        await tx.query(
          `select public.transition_booking('bkg-accept-001', 'awaiting_payment', 'Trying to hijack booking')`,
        );
      }),
    ).rejects.toThrow(/not authorised to manage this property booking/i);

    // Authorized partner cannot skip payment and mark 'confirmed' directly
    await expect(
      asUser(db, ctx.ownerPartnerId, async tx => {
        await tx.query(
          `select public.transition_booking('bkg-accept-001', 'confirmed', 'Trying to skip Paystack')`,
        );
      }),
    ).rejects.toThrow(/Invalid booking transition/i);

    // Authorized partner confirms availability -> status becomes 'awaiting_payment' with 48h deadline
    await asUser(db, ctx.ownerPartnerId, async tx => {
      await tx.query(
        `select public.transition_booking('bkg-accept-001', 'awaiting_payment', 'Estate gate pass ready once payment clears')`,
      );
    });

    const updatedBooking = await asUser(db, ctx.ownerPartnerId, async tx => {
      const res = await tx.query<{ status: string; payment_deadline: string | null }>(
        `select status, payment_deadline from public.bookings where id = 'bkg-accept-001'`,
      );
      return res.rows[0];
    });
    expect(updatedBooking.status).toBe('awaiting_payment');
    expect(updatedBooking.status).not.toBe('confirmed');
    expect(updatedBooking.payment_deadline).not.toBeNull();

    // Prevent conflicting re-decision once already awaiting_payment
    await expect(
      asUser(db, ctx.ownerPartnerId, async tx => {
        await tx.query(
          `select public.transition_booking('bkg-accept-001', 'declined', 'Changed mind after accepting')`,
        );
      }),
    ).rejects.toThrow(/Invalid booking transition/i);

    // Dispatch notifications as authorized partner and verify Event B (availability confirmed) emails
    const sentEmails: ResendSendParams[] = [];
    const deps = buildPgliteNotificationDeps(
      db,
      { 'partner-jwt': { id: ctx.ownerPartnerId, email: 'owner.ikoyi@partner.test' } },
      {
        sendEmail: async (params): Promise<ResendSendResult> => {
          sentEmails.push(params);
          return { id: `re_accept_${sentEmails.length}`, statusCode: 200 };
        },
      },
    );

    const res = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer partner-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-accept-001' }),
      }),
      deps,
    );
    expect(res.status).toBe(200);

    const eventBEmails = sentEmails.filter(e =>
      e.tags?.some(t => t.name === 'event_type' && t.value === 'booking_availability_confirmed'),
    );
    expect(eventBEmails).toHaveLength(2);

    const guestFollowUp = eventBEmails.find(e => e.to === 'amina.guest@guest.test')!;
    expect(guestFollowUp.subject).toContain('Availability confirmed');
    expect(guestFollowUp.html).toContain('not confirmed yet');
    expect(guestFollowUp.html).toContain('Estate gate pass ready once payment clears');
    expect(guestFollowUp.html).toContain('Complete payment on HAMLET');

    const opsFollowUp = eventBEmails.find(e => e.to === 'bookings-ops@hamlet-internal.test')!;
    expect(opsFollowUp.subject).toContain('awaiting payment');
  });

  it('handles partner unavailable (declined) decision cleanly with Event C Guest + Operations emails and zero payment side effects', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-decline-001', 'HML-2026-9005', $1, $2::uuid, $3::date, $4::date, 3,
           360000, '[]'::jsonb, 0, 10800, 370800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(18), futureIsoDate(20)],
      );
    });

    await asUser(db, ctx.ownerPartnerId, async tx => {
      await tx.query(
        `select public.transition_booking('bkg-decline-001', 'declined', 'Scheduled inverter maintenance during requested dates')`,
      );
    });

    // Cannot subsequently confirm availability after declining
    await expect(
      asUser(db, ctx.ownerPartnerId, async tx => {
        await tx.query(
          `select public.transition_booking('bkg-decline-001', 'awaiting_payment', 'Trying to flip declined booking')`,
        );
      }),
    ).rejects.toThrow(/Invalid booking transition/i);

    // Zero speculative ledger/payment records created
    const ledgerRows = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query(
        `select id from public.booking_payment_records where booking_id = 'bkg-decline-001'`,
      );
      return res.rows;
    });
    expect(ledgerRows).toHaveLength(0);

    const sentEmails: ResendSendParams[] = [];
    const deps = buildPgliteNotificationDeps(
      db,
      { 'partner-jwt': { id: ctx.ownerPartnerId, email: 'owner.ikoyi@partner.test' } },
      {
        sendEmail: async (params): Promise<ResendSendResult> => {
          sentEmails.push(params);
          return { id: `re_decline_${sentEmails.length}`, statusCode: 200 };
        },
      },
    );

    await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer partner-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-decline-001' }),
      }),
      deps,
    );

    const eventCEmails = sentEmails.filter(e =>
      e.tags?.some(t => t.name === 'event_type' && t.value === 'booking_availability_declined'),
    );
    expect(eventCEmails).toHaveLength(2);

    const guestDeclineEmail = eventCEmails.find(e => e.to === 'amina.guest@guest.test')!;
    expect(guestDeclineEmail.subject).toBe('Update on your HAMLET booking request (HML-2026-9005)');
    expect(guestDeclineEmail.html).toContain('Scheduled inverter maintenance during requested dates');
    expect(guestDeclineEmail.html).toContain('No payment was charged');

    const opsDeclineEmail = eventCEmails.find(e => e.to === 'bookings-ops@hamlet-internal.test')!;
    expect(opsDeclineEmail.subject).toBe('Booking request declined — HAMLET HML-2026-9005');
  });

  it('enforces strict RLS on booking_notifications and rejects unauthorized Edge Function dispatch callers', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-rls-001', 'HML-2026-9006', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[]'::jsonb, 0, 10800, 370800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(25), futureIsoDate(27)],
      );
    });

    // Guests, partners, and anonymous users cannot read booking_notifications
    await expect(
      asAnon(db, async tx => tx.query(`select * from public.booking_notifications`)),
    ).rejects.toThrow(/permission denied/i);

    const guestNotifRows = await asUser(db, ctx.guestId, async tx => {
      const res = await tx.query(`select * from public.booking_notifications`);
      return res.rows;
    });
    expect(guestNotifRows).toHaveLength(0);

    const partnerNotifRows = await asUser(db, ctx.ownerPartnerId, async tx => {
      const res = await tx.query(`select * from public.booking_notifications`);
      return res.rows;
    });
    expect(partnerNotifRows).toHaveLength(0);

    // Even authenticated users cannot call service_role worker RPCs directly
    await expect(
      asUser(db, ctx.adminId, async tx =>
        tx.query(`select * from public.claim_pending_booking_notifications('bkg-rls-001', 10, false)`),
      ),
    ).rejects.toThrow(/permission denied/i);

    // Admins CAN read booking_notifications for operational troubleshooting
    const adminNotifRows = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query(
        `select id from public.booking_notifications where booking_id = 'bkg-rls-001'`,
      );
      return res.rows;
    });
    expect(adminNotifRows).toHaveLength(3);

    // Unauthenticated or unrelated users receive 401 / 403 from the Edge Function handler
    const deps = buildPgliteNotificationDeps(db, {
      'other-guest-jwt': { id: ctx.otherGuestId, email: 'chidi.guest@guest.test' },
      'other-partner-jwt': { id: ctx.otherPartnerId, email: 'other.lekki@partner.test' },
    });

    const unauthRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-rls-001' }),
      }),
      deps,
    );
    expect(unauthRes.status).toBe(401);

    const wrongGuestRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer other-guest-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-rls-001' }),
      }),
      deps,
    );
    expect(wrongGuestRes.status).toBe(403);

    const wrongPartnerRes = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer other-partner-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-rls-001' }),
      }),
      deps,
    );
    expect(wrongPartnerRes.status).toBe(403);
  });

  it('escapes HTML in user-supplied names, notes, and property fields and blocks unsafe image URLs', () => {
    expect(escapeHtml(`<script>alert("xss")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
    expect(resolveSafeAssetUrl('javascript:alert(1)', 'https://hamletshortlets.vercel.app')).toBeNull();
    expect(resolveSafeAssetUrl('data:text/html,<script>', 'https://hamletshortlets.vercel.app')).toBeNull();
    expect(
      resolveSafeAssetUrl('/images/ikoyi.jpg', 'https://hamletshortlets.vercel.app'),
    ).toBe('https://hamletshortlets.vercel.app/images/ikoyi.jpg');

    const rendered = renderBookingNotificationEmail({
      bookingId: 'bkg-xss-001',
      bookingReference: 'HML-2026-XSS',
      eventType: 'booking_request_created',
      recipientType: 'partner',
      appBaseUrl: 'https://hamletshortlets.vercel.app',
      payload: {
        property_title: 'Villa <img src=x onerror=alert(1)>',
        property_area: 'Ikoyi',
        property_image_url: 'javascript:alert(document.cookie)',
        guest_name: '<script>steal()</script>',
        partner_name: 'Host <b>Injected</b>',
        check_in: '2026-11-10',
        check_out: '2026-11-12',
        nights: 2,
        guest_count: 2,
        accommodation_subtotal: 300000,
        mandatory_total: 20000,
        guest_total: 329000,
        special_requests: '"><svg onload=alert(1)>',
      },
    });

    expect(rendered.html).not.toContain('<script>steal()</script>');
    expect(rendered.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(rendered.html).not.toContain('<svg onload=alert(1)>');
    expect(rendered.html).not.toContain('javascript:alert');
    expect(rendered.html).toContain('&lt;script&gt;steal()&lt;/script&gt;');
    expect(rendered.html).toContain('&lt;svg onload=alert(1)&gt;');
  });

  it('supports extensible lifecycle events (payment confirmed, cancelled, refunded) via the same outbox architecture', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-ext-001', 'HML-2026-9007', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[]'::jsonb, 0, 10800, 370800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(14), futureIsoDate(16)],
      );
    });

    const enqueued = await asServiceRole(db, async tx => {
      const res = await tx.query<{ count: number }>(
        `select public.enqueue_booking_event_notifications('bkg-ext-001', 'booking_payment_confirmed', null) as count`,
      );
      return res.rows[0].count;
    });
    expect(enqueued).toBe(3); // guest, partner, operations

    // Calling enqueue again with the same event is idempotent (0 duplicates)
    const duplicateEnqueue = await asServiceRole(db, async tx => {
      const res = await tx.query<{ count: number }>(
        `select public.enqueue_booking_event_notifications('bkg-ext-001', 'booking_payment_confirmed', null) as count`,
      );
      return res.rows[0].count;
    });
    expect(duplicateEnqueue).toBe(0);
  });

  it('notifies all active authorized partners (e.g. owner + assigned manager) while excluding revoked or suspended partners', async () => {
    const ctx = await seedBookingScenario(db);
    const activeManagerId = await createTestUser(db, {
      email: 'manager.ikoyi@partner.test',
      fullName: 'Ngozi Manager',
      role: 'partner',
    });
    const suspendedAgentId = await createTestUser(db, {
      email: 'suspended.agent@partner.test',
      fullName: 'Suspended Agent',
      role: 'partner',
    });

    await asUser(db, ctx.adminId, async tx => {
      await tx.query(
        `select public.grant_property_assignment($1, $2::uuid, 'Day-to-day guest booking management', 0.10, 'Signed management SLA 2026-10')`,
        [ctx.propertyId, activeManagerId],
      );
      await tx.query(
        `select public.grant_property_assignment($1, $2::uuid, 'Secondary leasing support', null, '')`,
        [ctx.propertyId, suspendedAgentId],
      );
      await tx.query(
        `select public.set_partner_account_status($1::uuid, 'suspended', 'Compliance verification expired — suspended', false)`,
        [suspendedAgentId],
      );
    });

    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-multipartner-001', 'HML-2026-9008', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[]'::jsonb, 0, 10800, 370800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(28), futureIsoDate(30)],
      );
    });

    const partnerRecipients = await asUser(db, ctx.adminId, async tx => {
      const res = await tx.query<{ recipient_email: string }>(
        `select recipient_email
         from public.booking_notifications
         where booking_id = 'bkg-multipartner-001'
           and recipient_type = 'partner'
         order by recipient_email asc`,
      );
      return res.rows.map(r => r.recipient_email);
    });

    expect(partnerRecipients).toEqual([
      'manager.ikoyi@partner.test',
      'owner.ikoyi@partner.test',
    ]);
  });

  it('logs clear config failures when placeholder secrets are supplied and verifies Resend HTTP transport headers', async () => {
    const ctx = await seedBookingScenario(db);
    await asUser(db, ctx.guestId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, mandatory_charges, mandatory_total,
           hamlet_guest_fee, guest_total, refundable_deposit
         )
         values (
           'bkg-cfg-001', 'HML-2026-9009', $1, $2::uuid, $3::date, $4::date, 2,
           360000, '[]'::jsonb, 0, 10800, 370800, 100000
         )`,
        [ctx.propertyId, ctx.guestId, futureIsoDate(31), futureIsoDate(33)],
      );
    });

    // Placeholder HAMLET_BOOKINGS_EMAIL fails ONLY the operations row while Guest and Partner still send!
    const sentTo: string[] = [];
    const partialCfgDeps = buildPgliteNotificationDeps(
      db,
      { 'guest-jwt': { id: ctx.guestId, email: 'amina.guest@guest.test' } },
      {
        hamletBookingsEmail: 'bookings@your-domain.example',
        sendEmail: async (params): Promise<ResendSendResult> => {
          sentTo.push(params.to);
          return { id: `re_partial_${sentTo.length}`, statusCode: 200 };
        },
      },
    );

    const res = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', {
        method: 'POST',
        headers: { authorization: 'Bearer guest-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: 'bkg-cfg-001' }),
      }),
      partialCfgDeps,
    );
    const summary = (await res.json()) as { ok: boolean; sent: number; failed: number };
    expect(summary).toMatchObject({ ok: false, sent: 2, failed: 1 });
    expect(sentTo.sort()).toEqual(['amina.guest@guest.test', 'owner.ikoyi@partner.test']);

    const opsRow = await asUser(db, ctx.adminId, async tx => {
      const q = await tx.query<{ delivery_status: string; last_error: string }>(
        `select delivery_status, last_error
         from public.booking_notifications
         where booking_id = 'bkg-cfg-001' and recipient_type = 'operations'`,
      );
      return q.rows[0];
    });
    expect(opsRow.delivery_status).toBe('failed');
    expect(opsRow.last_error).toContain('HAMLET_BOOKINGS_EMAIL');

    // Verify defaultSendResendEmail sends Idempotency-Key + Bearer header and parses Resend JSON response
    const originalFetch = globalThis.fetch;
    let capturedUrl = '';
    const capturedHeaders: Record<string, string> = {};
    try {
      globalThis.fetch = (async (
        input: Parameters<typeof fetch>[0],
        init?: Parameters<typeof fetch>[1],
      ) => {
        capturedUrl = String(input);
        const h = new Headers(init?.headers);
        h.forEach((value, key) => {
          capturedHeaders[key.toLowerCase()] = value;
        });
        return new Response(JSON.stringify({ id: 're_live_mock_123' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const transportResult = await defaultSendResendEmail({
        apiKey: 're_unit_key_abc',
        from: 'HAMLET <bookings@verified.test>',
        to: 'amina.guest@guest.test',
        subject: 'Subject line',
        html: '<p>Hello</p>',
        text: 'Hello',
        idempotencyKey: 'bkg-1:booking_request_created:guest',
      });

      expect(capturedUrl).toBe('https://api.resend.com/emails');
      expect(capturedHeaders['authorization']).toBe('Bearer re_unit_key_abc');
      expect(capturedHeaders['idempotency-key']).toBe('bkg-1:booking_request_created:guest');
      expect(transportResult).toEqual({ id: 're_live_mock_123', statusCode: 200 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
