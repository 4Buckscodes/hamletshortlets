import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  defaultInitializePaystackTransaction,
  handlePaystackInitialize,
  type CheckoutBookingSnapshot,
} from '../functions/paystack-initialize/handler.ts';
import {
  computePaystackHmacSha512,
  handlePaystackWebhook,
  type ConfirmWebhookResult,
} from '../functions/paystack-webhook/handler.ts';
import {
  handleBookingNotifications,
  type ClaimedBookingNotificationRow,
  type DispatchAuthorizationResult,
} from '../functions/booking-notifications/handler.ts';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';
import { seedProperties } from '../../src/lib/seed.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function futureIsoDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function seedApprovedProperty(
  db: PGlite,
  partnerId: string,
  adminId: string,
  title = 'Victoria Island Harbour Residence',
): Promise<string> {
  const propertyId = await asUser(db, partnerId, async tx => {
    const res = await tx.query<{ submit_partner_property: string }>(
      `select public.submit_partner_property($1::jsonb, $2::jsonb)`,
      [
        JSON.stringify({
          title,
          property_type: 'Apartment',
          area: 'Victoria Island',
          public_address: '14 Ahmadu Bello Way, Victoria Island, Lagos',
          nightly_rate: 150000,
          cleaning_fee: 20000,
          mandatory_charges: [{ label: 'Cleaning fee', amount: 20000 }],
          refundable_deposit: 80000,
          bedrooms: 2,
          bathrooms: 2,
          capacity: 4,
          bed_setup: '2 King beds',
          amenities: ['24/7 Power', 'Fibre Wi-Fi', '24h Security'],
          image_urls: ['/images/prop/penthouse.jpg'],
          house_rules: ['No parties or events', 'Valid ID at check-in'],
        }),
        JSON.stringify({
          authority_basis: 'Direct owner of deeded apartment',
          submitted_role: 'Property Owner',
          docs: [
            { label: 'Certificate of occupancy / title deed', status: 'self_reported' },
            { label: 'Government-issued ID of owner', status: 'self_reported' },
          ],
        }),
      ],
    );
    return res.rows[0].submit_partner_property;
  });

  await asUser(db, adminId, async tx => {
    await tx.query(
      `select public.review_partner_property($1, 'approved', 'Ownership, ID, authority, and physical inspection verified.', $2::jsonb)`,
      [
        propertyId,
        JSON.stringify({
          ownership: 'verified',
          identity: 'verified',
          authority: 'verified',
          inspection: 'verified',
        }),
      ],
    );
  });

  return propertyId;
}

describe('Comprehensive Endpoint Audit (PostgREST Tables, RPCs, Edge Functions & Static Routes)', () => {
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

  it('executes every loadSupabaseState table & RPC endpoint cleanly across anon, guest, partner, suspended partner, admin, and service_role', async () => {
    const guestId = await createTestUser(db, {
      email: 'guest.audit@hamlet.test',
      fullName: 'Chinedu Guest',
      role: 'guest',
    });
    const partnerId = await createTestUser(db, {
      email: 'partner.audit@hamlet.test',
      fullName: 'Funke Partner',
      role: 'partner',
    });
    const suspendedPartnerId = await createTestUser(db, {
      email: 'suspended.partner@hamlet.test',
      fullName: 'Suspended Partner',
      role: 'partner',
    });
    const adminId = await createTestUser(db, {
      email: 'admin.audit@hamlet.test',
      fullName: 'HAMLET Admin',
      role: 'admin',
    });

    const propertyId = await seedApprovedProperty(db, partnerId, adminId);

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.set_partner_account_status($1::uuid, 'suspended', 'Compliance documentation expired pending renewal.', true)`,
        [suspendedPartnerId],
      );
    });

    // 1. Anonymous marketplace endpoints
    await asAnon(db, async tx => {
      const approved = await tx.query<{ id: string }>(
        `select * from public.properties where status = 'approved' order by created_at desc`,
      );
      expect(approved.rows.map(r => r.id)).toEqual([propertyId]);

      const unavailable = await tx.query<{ get_unavailable_property_ids: string }>(
        `select * from public.get_unavailable_property_ids($1::date, $2::date)`,
        [futureIsoDate(5), futureIsoDate(8)],
      );
      expect(unavailable.rows).toHaveLength(0);
    });

    // Anonymous callers cannot invoke authenticated or service_role RPCs
    await expect(
      asAnon(db, tx => tx.query(`select public.expire_overdue_bookings()`)),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asAnon(db, tx =>
        tx.query(
          `select public.confirm_booking_payment_webhook('b-1', 'Paystack', 'ref-1', 1000, 0, 'NGN')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/i);

    // 2. Authenticated loadSupabaseState fan-out for guest, partner, suspended partner, and admin
    for (const [roleLabel, userId, isAdmin] of [
      ['guest', guestId, false],
      ['partner', partnerId, false],
      ['suspended_partner', suspendedPartnerId, false],
      ['admin', adminId, true],
    ] as const) {
      await asUser(db, userId, async tx => {
        await tx.query(`select public.expire_overdue_bookings()`);
        await tx.query(
          `select id,full_name,role,phone,company,partner_role,account_status,suspension_reason,created_at from public.profiles order by created_at desc`,
        );
        await tx.query(`select * from public.properties order by created_at desc`);
        await tx.query(
          `select property_id,user_id,access_role,scope,commission_rate,commission_note,status,granted_at,revoked_at from public.property_access`,
        );
        await tx.query(
          `select property_id,record_type,record_data from public.property_private_records where record_type = 'partner_submission'`,
        );
        await tx.query(`select * from public.bookings order by created_at desc`);
        await tx.query(`select * from public.booking_payment_records order by created_at desc`);
        await tx.query(`select * from public.partner_applications order by submitted_at desc`);
        await tx.query(`select * from public.booking_issues order by created_at desc`);
        await tx.query(`select * from public.booking_feedback order by created_at desc`);
        await tx.query(`select * from public.admin_audit_log order by created_at desc limit 100`);

        const notifRes = await tx.query(`select * from public.booking_notifications limit 250`);
        if (!isAdmin) {
          expect(notifRes.rows, `${roleLabel} must not read booking_notifications`).toHaveLength(0);
        }
      });
    }

    // 3. Server-side service_role access required by Edge Functions
    await asServiceRole(db, async tx => {
      const propRes = await tx.query<{ id: string; status: string }>(
        `select id, status from public.properties where id = $1`,
        [propertyId],
      );
      expect(propRes.rows[0]?.status).toBe('approved');

      const profileRes = await tx.query<{ account_status: string }>(
        `select account_status from public.profiles where id = $1::uuid`,
        [guestId],
      );
      expect(profileRes.rows[0]?.account_status).toBe('active');

      const sweepRes = await tx.query<{ expire_overdue_bookings: number }>(
        `select public.expire_overdue_bookings()`,
      );
      expect(sweepRes.rows[0].expire_overdue_bookings).toBe(0);
    });
  });

  it('aligns POST /rest/v1/bookings with get_unavailable_property_ids when an awaiting_payment hold has expired and blocks direct table mutation bypasses', async () => {
    const guestAId = await createTestUser(db, {
      email: 'guest.a@hamlet.test',
      fullName: 'Guest A',
      role: 'guest',
    });
    const guestBId = await createTestUser(db, {
      email: 'guest.b@hamlet.test',
      fullName: 'Guest B',
      role: 'guest',
    });
    const partnerId = await createTestUser(db, {
      email: 'partner.hold@hamlet.test',
      fullName: 'Partner Hold',
      role: 'partner',
    });
    const adminId = await createTestUser(db, {
      email: 'admin.hold@hamlet.test',
      fullName: 'Admin Hold',
      role: 'admin',
    });

    const propertyId = await seedApprovedProperty(db, partnerId, adminId);
    const checkIn = futureIsoDate(12);
    const checkOut = futureIsoDate(15);

    // Guest A requests booking and Partner confirms availability (48h hold)
    await asUser(db, guestAId, async tx => {
      await tx.query(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, hamlet_guest_fee, guest_total
         ) values (
           'bkg-hold-a', 'HML-HOLD-A', $1, $2::uuid, $3::date, $4::date, 2, 450000, 13500, 483500
         )`,
        [propertyId, guestAId, checkIn, checkOut],
      );
    });

    await asUser(db, partnerId, async tx => {
      await tx.query(
        `select public.transition_booking('bkg-hold-a', 'awaiting_payment', 'Dates verified.')`,
      );
    });

    // While payment_deadline is in the future, BOTH availability RPC and booking INSERT block Guest B
    const unavailableDuringHold = await asAnon(db, async tx => {
      const res = await tx.query<{ get_unavailable_property_ids: string }>(
        `select * from public.get_unavailable_property_ids($1::date, $2::date)`,
        [checkIn, checkOut],
      );
      return res.rows.map(r => r.get_unavailable_property_ids);
    });
    expect(unavailableDuringHold).toContain(propertyId);

    await expect(
      asUser(db, guestBId, tx =>
        tx.query(
          `insert into public.bookings (
             id, reference, property_id, guest_id, check_in, check_out, guest_count,
             accommodation_subtotal, hamlet_guest_fee, guest_total
           ) values (
             'bkg-hold-b', 'HML-HOLD-B', $1, $2::uuid, $3::date, $4::date, 2, 450000, 13500, 483500
           )`,
          [propertyId, guestBId, checkIn, checkOut],
        ),
      ),
    ).rejects.toThrow(/dates conflict with an existing booking/i);

    // Simulate the 48-hour payment deadline expiring BEFORE the periodic sweep has run
    await db.query(
      `update public.bookings set payment_deadline = now() - interval '5 minutes' where id = 'bkg-hold-a'`,
    );

    const unavailableAfterExpiry = await asAnon(db, async tx => {
      const res = await tx.query<{ get_unavailable_property_ids: string }>(
        `select * from public.get_unavailable_property_ids($1::date, $2::date)`,
        [checkIn, checkOut],
      );
      return res.rows.map(r => r.get_unavailable_property_ids);
    });
    expect(unavailableAfterExpiry).toHaveLength(0);

    // Guest B can now submit a booking request on those exact dates without conflict!
    const createdB = await asUser(db, guestBId, async tx => {
      const res = await tx.query<{ id: string; status: string }>(
        `insert into public.bookings (
           id, reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, hamlet_guest_fee, guest_total
         ) values (
           'bkg-hold-b', 'HML-HOLD-B', $1, $2::uuid, $3::date, $4::date, 2, 450000, 13500, 483500
         ) returning id, status`,
        [propertyId, guestBId, checkIn, checkOut],
      );
      return res.rows[0];
    });
    expect(createdB).toEqual({ id: 'bkg-hold-b', status: 'requested' });

    // Direct REST table bypass checks:
    // 1) Partner cannot insert directly into public.properties (bypassing Lagos & verification checks)
    await expect(
      asUser(db, partnerId, tx =>
        tx.query(
          `insert into public.properties (
             id, title, property_type, area, public_address, nightly_rate, capacity, status, trust_label
           ) values (
             'prop-bypass', 'Bypass Listing', 'Apartment', 'Abuja', '10 Maitama Close', 100000, 2, 'submitted', 'HAMLET verified'
           )`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);

    // 2) Admin cannot directly UPDATE partner_applications bypassing review_partner_application RPC
    const appId = await asUser(db, guestBId, async tx => {
      const res = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         ) values (
           $1::uuid, 'Guest B', 'guest.b@hamlet.test', '+2348000000001', 'B Homes', 'Property Owner',
           array['Ikoyi'], 2, 'Verified shortlet owner'
         ) returning id`,
        [guestBId],
      );
      return res.rows[0].id;
    });

    await expect(
      asUser(db, adminId, tx =>
        tx.query(`update public.partner_applications set status = 'approved' where id = $1::uuid`, [
          appId,
        ]),
      ),
    ).rejects.toThrow(/permission denied/i);

    // Guarded RPC review_partner_application still works cleanly and writes audit trail
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_partner_application($1::uuid, 'approved', 'Identity and portfolio verified by HAMLET ops.')`,
        [appId],
      );
    });
  });

  it('validates all 3 Edge Function HTTP endpoints across OPTIONS, GET, non-object JSON, placeholder secrets, past check-in, suspended accounts, and network errors', async () => {
    const baseSnapshot: CheckoutBookingSnapshot = {
      id: 'bkg-edge-001',
      reference: 'HML-EDGE-001',
      guest_id: 'guest-uuid-1',
      property_id: 'prop-1',
      property_status: 'approved',
      status: 'awaiting_payment',
      guest_total: 483500,
      payment_deadline: '2026-10-25T12:00:00.000Z',
      has_confirmed_conflict: false,
      check_in: '2026-10-26',
      guest_account_status: 'active',
    };

    // --- 1. paystack-initialize ---
    // OPTIONS preflight -> 204
    const initOptions = await handlePaystackInitialize(
      new Request('https://edge.test/functions/v1/paystack-initialize', { method: 'OPTIONS' }),
      {
        paystackSecretKey: undefined,
        getAuthenticatedUser: async () => null,
        loadBookingSnapshot: async () => ({ data: null, error: null }),
      },
    );
    expect(initOptions.status).toBe(204);
    expect(initOptions.headers.get('access-control-allow-origin')).toBe('*');

    // GET -> 405
    const initGet = await handlePaystackInitialize(
      new Request('https://edge.test/functions/v1/paystack-initialize', { method: 'GET' }),
      {
        paystackSecretKey: 'sk_test_live_secret_123',
        getAuthenticatedUser: async () => null,
        loadBookingSnapshot: async () => ({ data: null, error: null }),
      },
    );
    expect(initGet.status).toBe(405);

    // Placeholder secret -> 503 provider_not_configured
    const initPlaceholder = await handlePaystackInitialize(
      new Request('https://edge.test/functions/v1/paystack-initialize', {
        method: 'POST',
        body: JSON.stringify({ booking_id: 'bkg-edge-001' }),
      }),
      {
        paystackSecretKey: 'sk_test_replace_with_your_paystack_secret_key',
        getAuthenticatedUser: async () => ({ id: 'guest-uuid-1', email: 'g@test.com' }),
        loadBookingSnapshot: async () => ({ data: baseSnapshot, error: null }),
      },
    );
    expect(initPlaceholder.status).toBe(503);

    // Valid non-object JSON (`null` and `[]`) -> 400 (never TypeError 500!)
    for (const rawJson of ['null', '[]', '"str"', '42']) {
      const res = await handlePaystackInitialize(
        new Request('https://edge.test/functions/v1/paystack-initialize', {
          method: 'POST',
          headers: { authorization: 'Bearer valid-jwt', 'content-type': 'application/json' },
          body: rawJson,
        }),
        {
          paystackSecretKey: 'sk_test_valid_secret_key',
          getAuthenticatedUser: async () => ({ id: 'guest-uuid-1', email: 'g@test.com' }),
          loadBookingSnapshot: async () => ({ data: baseSnapshot, error: null }),
        },
      );
      expect(res.status).toBe(400);
    }

    // Past check_in date -> 409 (prevents charging guest when webhook would reject)
    const initPastCheckIn = await handlePaystackInitialize(
      new Request('https://edge.test/functions/v1/paystack-initialize', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: 'bkg-edge-001' }),
      }),
      {
        paystackSecretKey: 'sk_test_valid_secret_key',
        now: () => new Date('2026-10-23T12:00:00.000Z'),
        getAuthenticatedUser: async () => ({ id: 'guest-uuid-1', email: 'g@test.com' }),
        loadBookingSnapshot: async () => ({
          data: { ...baseSnapshot, check_in: '2026-10-22' },
          error: null,
        }),
      },
    );
    expect(initPastCheckIn.status).toBe(409);
    await expect(initPastCheckIn.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringMatching(/check-in date has already passed/i),
    });

    // Suspended guest account -> 403
    const initSuspended = await handlePaystackInitialize(
      new Request('https://edge.test/functions/v1/paystack-initialize', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt', 'content-type': 'application/json' },
        body: JSON.stringify({ booking_id: 'bkg-edge-001' }),
      }),
      {
        paystackSecretKey: 'sk_test_valid_secret_key',
        now: () => new Date('2026-10-23T12:00:00.000Z'),
        getAuthenticatedUser: async () => ({ id: 'guest-uuid-1', email: 'g@test.com' }),
        loadBookingSnapshot: async () => ({
          data: { ...baseSnapshot, guest_account_status: 'suspended' },
          error: null,
        }),
      },
    );
    expect(initSuspended.status).toBe(403);

    // Network error in defaultInitializePaystackTransaction -> caught cleanly instead of unhandled rejection
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => {
        throw new Error('ECONNRESET simulated gateway failure');
      }) as typeof fetch;

      const netFailure = await defaultInitializePaystackTransaction({
        secretKey: 'sk_test_valid_secret_key',
        email: 'g@test.com',
        amountKobo: 48350000,
        bookingId: 'bkg-edge-001',
        bookingReference: 'HML-EDGE-001',
      });
      expect(netFailure.data).toBeNull();
      expect(netFailure.error?.message).toMatch(/Could not reach Paystack/i);
    } finally {
      globalThis.fetch = origFetch;
    }

    // --- 2. paystack-webhook ---
    const webhookSecret = 'sk_test_webhook_hmac_secret';
    const webhookOptions = await handlePaystackWebhook(
      new Request('https://edge.test/functions/v1/paystack-webhook', { method: 'OPTIONS' }),
      {
        paystackSecretKey: webhookSecret,
        confirmPaymentRpc: async () => ({ data: null, error: null }),
      },
    );
    expect(webhookOptions.status).toBe(204);

    const webhookGet = await handlePaystackWebhook(
      new Request('https://edge.test/functions/v1/paystack-webhook', { method: 'GET' }),
      {
        paystackSecretKey: webhookSecret,
        confirmPaymentRpc: async () => ({ data: null, error: null }),
      },
    );
    expect(webhookGet.status).toBe(405);

    // Signed `null` payload -> 400 (never TypeError 500!)
    const nullSig = await computePaystackHmacSha512('null', webhookSecret);
    const webhookNull = await handlePaystackWebhook(
      new Request('https://edge.test/functions/v1/paystack-webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': nullSig },
        body: 'null',
      }),
      {
        paystackSecretKey: webhookSecret,
        confirmPaymentRpc: async () => ({ data: null, error: null }),
      },
    );
    expect(webhookNull.status).toBe(400);

    // Signed fractional kobo amount -> 400
    const badAmountBody = JSON.stringify({
      event: 'charge.success',
      data: { status: 'success', reference: 'PSK_1', amount: 100.5 },
    });
    const badAmountSig = await computePaystackHmacSha512(badAmountBody, webhookSecret);
    const webhookBadAmount = await handlePaystackWebhook(
      new Request('https://edge.test/functions/v1/paystack-webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': badAmountSig },
        body: badAmountBody,
      }),
      {
        paystackSecretKey: webhookSecret,
        confirmPaymentRpc: async (): Promise<{
          data: ConfirmWebhookResult | null;
          error: { message: string } | null;
        }> => ({ data: null, error: null }),
      },
    );
    expect(webhookBadAmount.status).toBe(400);

    // --- 3. booking-notifications ---
    const notifDeps = {
      resendApiKey: 're_live_valid_key',
      resendFromEmail: 'HAMLET Bookings <bookings@mail.hamlet.test>',
      hamletBookingsEmail: 'ops@hamlet.test',
      hamletAppUrl: 'https://hamletshortlets.vercel.app',
      internalDispatchSecret: 'internal_worker_secret_0123456789',
      getAuthenticatedUser: async () => ({ id: 'admin-1', email: 'admin@hamlet.test' }),
      authorizeDispatch: async (): Promise<{
        data: DispatchAuthorizationResult | null;
        error: { message: string } | null;
      }> => ({
        data: { authorized: true, role: 'admin', booking_id: null },
        error: null,
      }),
      claimPendingNotifications: async (): Promise<{
        data: ClaimedBookingNotificationRow[] | null;
        error: { message: string } | null;
      }> => ({ data: [], error: null }),
      completeNotification: async () => ({ error: null }),
    };

    const notifOptions = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', { method: 'OPTIONS' }),
      notifDeps,
    );
    expect(notifOptions.status).toBe(204);

    const notifGet = await handleBookingNotifications(
      new Request('https://edge.test/functions/v1/booking-notifications', { method: 'GET' }),
      notifDeps,
    );
    expect(notifGet.status).toBe(405);

    // Non-object JSON (`null`, `[]`) -> 400 (never TypeError 500!)
    for (const rawJson of ['null', '[]', '"str"']) {
      const notifBadJson = await handleBookingNotifications(
        new Request('https://edge.test/functions/v1/booking-notifications', {
          method: 'POST',
          headers: { 'x-hamlet-internal-secret': 'internal_worker_secret_0123456789' },
          body: rawJson,
        }),
        notifDeps,
      );
      expect(notifBadJson.status).toBe(400);
    }
  });

  it('verifies all static asset endpoints, SPA fallback configuration, and Deno import map exist and are valid', () => {
    // 1. Deno import map for Supabase Edge Runtime
    const denoConfig = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'supabase/functions/deno.json'), 'utf8'),
    ) as { imports?: Record<string, string> };
    expect(denoConfig.imports?.['@supabase/supabase-js']).toBe('npm:@supabase/supabase-js@2');

    // 2. Vercel SPA rewrite preserves /assets/* and /images/* while routing SPA paths to /index.html
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8'),
    ) as { rewrites?: Array<{ source: string; destination: string }> };
    expect(vercelConfig.rewrites).toHaveLength(1);
    expect(vercelConfig.rewrites?.[0]?.destination).toBe('/index.html');
    expect(vercelConfig.rewrites?.[0]?.source).toContain('assets/');
    expect(vercelConfig.rewrites?.[0]?.source).toContain('images/');

    // 3. Every /images/... and /favicon.svg reference in src/ points to a real non-empty file in public/
    const walk = (dir: string): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap(entry =>
          entry.isDirectory()
            ? walk(path.join(dir, entry.name))
            : [path.join(dir, entry.name)],
        );

    const srcFiles = walk(path.join(REPO_ROOT, 'src')).filter(f => /\.(ts|tsx|css)$/.test(f));
    const referencedAssets = new Set<string>([
      '/favicon.svg',
      ...seedProperties.flatMap(prop => prop.images),
    ]);
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const match of content.matchAll(/['"](\/(?:images|favicon)[^'"\s)]+)['"]/g)) {
        referencedAssets.add(match[1]);
      }
    }

    expect(referencedAssets.size).toBeGreaterThanOrEqual(10);
    for (const assetUrl of referencedAssets) {
      const diskPath = path.join(REPO_ROOT, 'public', assetUrl);
      expect(fs.existsSync(diskPath), `Missing static asset ${assetUrl}`).toBe(true);
      expect(fs.statSync(diskPath).size, `Empty static asset ${assetUrl}`).toBeGreaterThan(0);
    }
  });
});
