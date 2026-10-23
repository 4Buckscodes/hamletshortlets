import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import {
  handlePaystackInitialize,
  type CheckoutBookingSnapshot,
  type PaystackInitializeGatewayParams,
} from '../functions/paystack-initialize/handler';
import {
  computePaystackHmacSha512,
  handlePaystackWebhook,
  type ConfirmWebhookParams,
  type ConfirmWebhookResult,
} from '../functions/paystack-webhook/handler';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb';

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

const TEST_SECRET = 'sk_test_hamlet_checkout_2026';

describe('HAMLET Release 1 — partner suspension, property corrections, private pilot feedback, availability & checkout init', () => {
  let db: PGlite;
  let adminId: string;
  let partnerId: string;
  let secondPartnerId: string;
  let guestId: string;
  let otherGuestId: string;
  let approvedPropertyId: string;
  let baseDateIso: string;

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function submitPropertyAs(
    actorUserId: string,
    overrides: Partial<{ title: string; area: string; publicAddress: string; nightlyRate: number }> = {},
  ): Promise<string> {
    return asUser(db, actorUserId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: overrides.title ?? 'Ikoyi Waterfront 2-Bed Suite',
            property_type: 'Serviced apartment',
            area: overrides.area ?? 'Ikoyi',
            public_address: overrides.publicAddress ?? '8 Bourdillon Road, Ikoyi, Lagos',
            nightly_rate: overrides.nightlyRate ?? 150_000,
            cleaning_fee: 15_000,
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 15_000 }],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 King beds',
            amenities: ['Wifi', '24/7 Power'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No parties'],
          }),
          JSON.stringify({
            authority_basis: 'Registered title deed in partner company name',
            submitted_role: 'Property Owner',
            docs: [
              { label: 'Certificate of occupancy / title deed', status: 'self_reported' },
              { label: 'Government-issued ID of owner', status: 'self_reported' },
              { label: 'Proof of authority / management mandate', status: 'self_reported' },
              { label: 'Property inspection report', status: 'missing' },
            ],
          }),
        ],
      );
      return rows[0].id;
    });
  }

  async function createBookingRequest(
    reference: string,
    offsetStartDays = 6,
    nights = 2,
    forGuestId = guestId,
  ) {
    const checkIn = addDays(baseDateIso, offsetStartDays);
    const checkOut = addDays(baseDateIso, offsetStartDays + nights);
    return asUser(db, forGuestId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        reference: string;
        guest_total: number;
        check_in: string;
        check_out: string;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count,
           accommodation_subtotal, hamlet_guest_fee, guest_total
         ) values ($1, $2, $3::uuid, $4::date, $5::date, 2, 0, 0, 0)
         returning id, reference, guest_total, check_in::text, check_out::text`,
        [reference, approvedPropertyId, forGuestId, checkIn, checkOut],
      );
      return rows[0];
    });
  }

  async function confirmViaWebhook(bookingId: string, guestTotal: number, providerRef: string) {
    const rawBody = JSON.stringify({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: providerRef,
        amount: guestTotal * 100,
        currency: 'NGN',
        metadata: { booking_id: bookingId },
      },
    });
    const sig = await computePaystackHmacSha512(rawBody, TEST_SECRET);
    const res = await handlePaystackWebhook(
      new Request('https://hamlet.test/functions/v1/paystack-webhook', {
        method: 'POST',
        headers: { 'x-paystack-signature': sig },
        body: rawBody,
      }),
      {
        paystackSecretKey: TEST_SECRET,
        confirmPaymentRpc: async (params: ConfirmWebhookParams) => {
          const data = await asServiceRole(db, async tx => {
            const { rows } = await tx.query<{ result: ConfirmWebhookResult }>(
              `select public.confirm_booking_payment_webhook($1, $2, $3, $4, $5, $6) as result`,
              [
                params.target_booking_id,
                params.provider_name,
                params.provider_ref,
                params.paid_amount_naira,
                params.provider_fee_naira,
                params.currency_code,
              ],
            );
            return rows[0].result;
          });
          return { data, error: null };
        },
      },
    );
    expect(res.status).toBe(200);
  }

  beforeAll(async () => {
    db = await createMigratedTestDb();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    const { rows } = await db.query<{ today: string }>('select current_date::text as today');
    baseDateIso = rows[0].today;

    adminId = await createTestUser(db, {
      email: 'admin@hamlet.test',
      fullName: 'Funmi Admin',
      role: 'admin',
    });
    partnerId = await createTestUser(db, {
      email: 'partner1@hamlet.test',
      fullName: 'Tunde Partner',
      role: 'partner',
    });
    secondPartnerId = await createTestUser(db, {
      email: 'partner2@hamlet.test',
      fullName: 'Chiamaka Partner',
      role: 'partner',
    });
    guestId = await createTestUser(db, {
      email: 'guest1@hamlet.test',
      fullName: 'Adaeze Guest',
      role: 'guest',
    });
    otherGuestId = await createTestUser(db, {
      email: 'guest2@hamlet.test',
      fullName: 'Seyi Guest',
      role: 'guest',
    });

    approvedPropertyId = await submitPropertyAs(partnerId);
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', $2, $3::jsonb)`, [
        approvedPropertyId,
        'Verified ownership, identity, authority, and physical inspection.',
        JSON.stringify(VERIFIED_ALL),
      ]),
    );
  });

  describe('Partner account suspension & reinstatement', () => {
    it('suspends partner privileges and approved listings immediately, blocks mutations, and restores capabilities on reinstatement', async () => {
      const pendingBooking = await createBookingRequest('HML-SUSP-01', 10, 2);

      // Non-admin cannot suspend a partner
      await expect(
        asUser(db, secondPartnerId, tx =>
          tx.query(
            `select public.set_partner_account_status($1::uuid, 'suspended', 'Attempt unauthorized suspension', true)`,
            [partnerId],
          ),
        ),
      ).rejects.toThrow(/Only administrators can suspend or reinstate partner accounts/i);

      // Admin suspends partner -> cascades suspension onto approvedPropertyId
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.set_partner_account_status($1::uuid, 'suspended', 'Solicited off-platform transfer from guest', true)`,
          [partnerId],
        ),
      );

      // Approved listing is now suspended and hidden from anonymous public discovery
      const anonVisible = await asAnon(db, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select id from public.properties where id = $1`,
          [approvedPropertyId],
        );
        return rows;
      });
      expect(anonVisible).toHaveLength(0);

      // Suspended partner can still view their own suspended listing in read-only mode
      const partnerReadOnly = await asUser(db, partnerId, async tx => {
        const { rows } = await tx.query<{ status: string }>(
          `select status from public.properties where id = $1`,
          [approvedPropertyId],
        );
        return rows;
      });
      expect(partnerReadOnly).toEqual([{ status: 'suspended' }]);

      // Suspended partner CANNOT submit new properties or transition bookings
      await expect(
        submitPropertyAs(partnerId, {
          title: 'Ikoyi Garden Annex Studio',
          publicAddress: '19 Alexander Road, Ikoyi, Lagos',
        }),
      ).rejects.toThrow(/suspended/i);

      await expect(
        asUser(db, partnerId, tx =>
          tx.query(`select public.transition_booking($1, 'checking')`, [pendingBooking.id]),
        ),
      ).rejects.toThrow(/You are not authorised to manage this property booking/i);

      // Cannot assign an approved property to a suspended partner
      const secondApprovedId = await submitPropertyAs(secondPartnerId, {
        title: 'Lekki Phase 1 Penthouse 4A',
        area: 'Lekki Phase 1',
        publicAddress: '14 Admiralty Way, Lekki Phase 1',
      });
      await asUser(db, adminId, tx =>
        tx.query(`select public.review_partner_property($1, 'approved', $2, $3::jsonb)`, [
          secondApprovedId,
          'All four pillars verified by operations.',
          JSON.stringify(VERIFIED_ALL),
        ]),
      );

      await expect(
        asUser(db, adminId, tx =>
          tx.query(
            `select public.grant_property_assignment($1, $2::uuid, 'Co-host scope', null, '')`,
            [secondApprovedId, partnerId],
          ),
        ),
      ).rejects.toThrow(/Cannot assign properties to a suspended partner account/i);

      // Admin reinstates partner -> partner can submit new Lagos listings again
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.set_partner_account_status($1::uuid, 'active', 'Compliance retraining completed and signed off', false)`,
          [partnerId],
        ),
      );

      const newListingId = await submitPropertyAs(partnerId, {
        title: 'Ikoyi Garden Annex Studio',
        publicAddress: '19 Alexander Road, Ikoyi, Lagos',
      });
      expect(newListingId).toBeTruthy();
    });
  });

  describe('Lagos-only geography guard & structured property corrections', () => {
    it('blocks deferred non-Lagos cities while allowing Lagos streets, and supports structured correction edits without self-verifying docs', async () => {
      // Deferred cities (Abuja, Ibadan) are rejected in area
      await expect(
        submitPropertyAs(partnerId, {
          title: 'Maitama Luxury 3-Bed Duplex',
          area: 'Abuja',
          publicAddress: '5 Danube Street, Maitama',
        }),
      ).rejects.toThrow(/Launch market is Lagos, Nigeria only/i);

      await expect(
        submitPropertyAs(partnerId, {
          title: 'Bodija Heritage 2-Bed Flat',
          area: 'Ibadan',
          publicAddress: '10 Awolowo Avenue, Bodija',
        }),
      ).rejects.toThrow(/Launch market is Lagos, Nigeria only/i);

      // A genuine Lagos Mainland address on "Ibadan Street" is allowed!
      const mainlandPropId = await submitPropertyAs(partnerId, {
        title: 'Ebute Metta Modern 2-Bed Loft',
        area: 'Lagos Mainland',
        publicAddress: '12 Ibadan Street, Ebute Metta, Lagos',
        nightlyRate: 95_000,
      });

      // Admin marks needs_correction after verifying ownership & identity, flagging authority
      await asUser(db, adminId, tx =>
        tx.query(
          `select public.review_partner_property($1, 'needs_correction', $2, $3::jsonb)`,
          [
            mainlandPropId,
            'Ownership and ID verified; please attach updated management mandate and confirm nightly rate.',
            JSON.stringify({
              ownership: 'verified',
              identity: 'verified',
              authority: 'missing',
              inspection: 'missing',
            }),
          ],
        ),
      );

      // Partner cannot edit the listing into a duplicate of approvedPropertyId
      await expect(
        asUser(db, partnerId, tx =>
          tx.query(
            `select public.update_and_resubmit_partner_property($1, $2::jsonb, $3::jsonb, $4)`,
            [
              mainlandPropId,
              JSON.stringify({
                title: 'Ikoyi Waterfront 2-Bed Suite',
                property_type: 'Serviced apartment',
                area: 'Ikoyi',
                public_address: '8 Bourdillon Road, Ikoyi, Lagos',
                nightly_rate: 90_000,
                cleaning_fee: 10_000,
                mandatory_charges: [],
                refundable_deposit: 50_000,
                bedrooms: 2,
                bathrooms: 2,
                capacity: 4,
                bed_setup: '2 Queen beds',
                amenities: ['Wifi'],
                image_urls: ['/images/prop/living-1.jpg'],
                house_rules: ['No smoking'],
              }),
              JSON.stringify({
                authority_basis: 'Signed owner mandate dated 20 Oct 2026',
                submitted_role: 'Property Manager',
                docs: [{ label: 'Proof of authority / management mandate', status: 'verified' }],
              }),
              'Attempt duplicate overwrite',
            ],
          ),
        ),
      ).rejects.toThrow(/already exists in this area/i);

      // Valid correction updates rate & authority, keeps ownership/identity verified, and downgrades forged 'verified' doc input to 'self_reported'
      await asUser(db, partnerId, tx =>
        tx.query(
          `select public.update_and_resubmit_partner_property($1, $2::jsonb, $3::jsonb, $4)`,
          [
            mainlandPropId,
            JSON.stringify({
              title: 'Ebute Metta Modern 2-Bed Loft',
              property_type: 'Apartment',
              area: 'Lagos Mainland',
              public_address: '12 Ibadan Street, Ebute Metta, Lagos',
              nightly_rate: 85_000,
              cleaning_fee: 10_000,
              mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 10_000 }],
              refundable_deposit: 50_000,
              bedrooms: 2,
              bathrooms: 2,
              capacity: 4,
              bed_setup: '2 Queen beds',
              amenities: ['Wifi', '24/7 Power'],
              image_urls: ['/images/prop/living-1.jpg'],
              house_rules: ['No smoking'],
            }),
            JSON.stringify({
              authority_basis: 'Signed owner mandate #MND-2026-44 dated 20 Oct 2026',
              submitted_role: 'Property Manager',
              docs: [
                { label: 'Proof of authority / management mandate', status: 'verified' }, // forged client input!
              ],
            }),
            'Updated mandate reference and adjusted nightly rate to ₦85,000.',
          ],
        ),
      );

      const updatedProp = await db.query<{
        status: string;
        nightly_rate: number;
        verification: Record<string, string>;
      }>(
        `select status, nightly_rate, verification from public.properties where id = $1`,
        [mainlandPropId],
      );
      expect(updatedProp.rows[0].status).toBe('submitted');
      expect(updatedProp.rows[0].nightly_rate).toBe(85_000);
      expect(updatedProp.rows[0].verification).toEqual({
        ownership: 'verified',
        identity: 'verified',
        authority: 'pending_review',
        inspection: 'missing',
      });

      const submissionRec = await db.query<{
        record_data: { authority_basis: string; docs: Array<{ label: string; status: string }> };
      }>(
        `select record_data from public.property_private_records
         where property_id = $1 and record_type = 'partner_submission'`,
        [mainlandPropId],
      );
      expect(submissionRec.rows[0].record_data.authority_basis).toContain('#MND-2026-44');
      // Forged 'verified' status was sanitized to 'self_reported'!
      expect(submissionRec.rows[0].record_data.docs[0].status).toBe('self_reported');
    });
  });

  describe('Private pilot guest feedback & privacy-safe availability lookup', () => {
    it('keeps pilot feedback strictly private to the submitting guest and admins, and exposes only unavailable property IDs to search', async () => {
      const booking = await createBookingRequest('HML-FB-001', 14, 2);

      // Before acceptance, dates are NOT yet unavailable
      const beforeAccept = await asAnon(db, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select public.get_unavailable_property_ids($1::date, $2::date) as id`,
          [booking.check_in, booking.check_out],
        );
        return rows.map(r => r.id);
      });
      expect(beforeAccept).toEqual([]);

      // Partner accepts -> awaiting_payment holds dates in get_unavailable_property_ids
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
      );

      const duringHold = await asAnon(db, async tx => {
        const { rows } = await tx.query<{ id: string }>(
          `select public.get_unavailable_property_ids($1::date, $2::date) as id`,
          [booking.check_in, booking.check_out],
        );
        return rows.map(r => r.id);
      });
      expect(duringHold).toEqual([approvedPropertyId]);

      // Feedback cannot be submitted before stay is completed/disputed
      await expect(
        asUser(db, guestId, tx =>
          tx.query(
            `select public.submit_booking_feedback($1, 5, 'Stay experience', 'Trying to review too early')`,
            [booking.id],
          ),
        ),
      ).rejects.toThrow(/completed or disputed stays/i);

      // Confirm via webhook and mark completed
      await confirmViaWebhook(booking.id, booking.guest_total, 'PSK_FB_001');
      await asUser(db, adminId, tx =>
        tx.query(`select public.transition_booking($1, 'completed')`, [booking.id]),
      );

      // Other guest cannot submit feedback for someone else's booking
      await expect(
        asUser(db, otherGuestId, tx =>
          tx.query(
            `select public.submit_booking_feedback($1, 4, 'Stay experience', 'Impersonation attempt')`,
            [booking.id],
          ),
        ),
      ).rejects.toThrow(/Booking not found for your account/i);

      // Booking guest submits private pilot feedback
      await asUser(db, guestId, tx =>
        tx.query(
          `select public.submit_booking_feedback($1, 5, 'Stay experience', 'Spotless apartment, 24/7 power worked seamlessly.')`,
          [booking.id],
        ),
      );

      // Duplicate feedback on same booking is rejected
      await expect(
        asUser(db, guestId, tx =>
          tx.query(
            `select public.submit_booking_feedback($1, 3, 'Stay experience', 'Second submission')`,
            [booking.id],
          ),
        ),
      ).rejects.toThrow(/already been submitted/i);

      // Submitting guest and admin can read it; anon, other guests, and property partner see 0 rows!
      const guestVisible = await asUser(db, guestId, async tx => {
        const { rows } = await tx.query(`select id from public.booking_feedback`);
        return rows;
      });
      const adminVisible = await asUser(db, adminId, async tx => {
        const { rows } = await tx.query(`select id from public.booking_feedback`);
        return rows;
      });
      const partnerVisible = await asUser(db, partnerId, async tx => {
        const { rows } = await tx.query(`select id from public.booking_feedback`);
        return rows;
      });
      const otherGuestVisible = await asUser(db, otherGuestId, async tx => {
        const { rows } = await tx.query(`select id from public.booking_feedback`);
        return rows;
      });

      expect(guestVisible).toHaveLength(1);
      expect(adminVisible).toHaveLength(1);
      expect(partnerVisible).toHaveLength(0);
      expect(otherGuestVisible).toHaveLength(0);

      await expect(
        asAnon(db, tx => tx.query(`select id from public.booking_feedback`)),
      ).rejects.toThrow(/permission denied for table booking_feedback/i);
    });
  });

  describe('Server-side Paystack checkout initialization handler', () => {
    it('enforces honest 503 when unconfigured, validates guest ownership & deadline, and initializes Paystack with authoritative DB guest_total in kobo', async () => {
      const booking = await createBookingRequest('HML-INIT-01', 20, 2);
      await asUser(db, partnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [booking.id]),
      );

      const loadSnapshot = async (bookingId: string) => {
        const { rows } = await db.query<CheckoutBookingSnapshot>(
          `select
             b.id,
             b.reference,
             b.guest_id::text as guest_id,
             b.property_id,
             p.status as property_status,
             b.status,
             b.guest_total,
             b.payment_deadline::text as payment_deadline,
             exists (
               select 1 from public.bookings c
               where c.property_id = b.property_id
                 and c.id <> b.id
                 and c.status = 'confirmed'
                 and c.check_in < b.check_out
                 and c.check_out > b.check_in
             ) as has_confirmed_conflict
           from public.bookings b
           join public.properties p on p.id = b.property_id
           where b.id = $1`,
          [bookingId],
        );
        return { data: rows[0] ?? null, error: null };
      };

      // 1. Missing PAYSTACK_SECRET_KEY returns 503 provider_not_configured
      const unconfiguredRes = await handlePaystackInitialize(
        new Request('https://hamlet.test/functions/v1/paystack-initialize', {
          method: 'POST',
          headers: { authorization: 'Bearer valid-guest-jwt' },
          body: JSON.stringify({ booking_id: booking.id }),
        }),
        {
          paystackSecretKey: undefined,
          getAuthenticatedUser: async () => ({ id: guestId, email: 'guest1@hamlet.test' }),
          loadBookingSnapshot: loadSnapshot,
        },
      );
      expect(unconfiguredRes.status).toBe(503);

      // 2. Different guest attempting to pay someone else's booking gets 403
      const wrongGuestRes = await handlePaystackInitialize(
        new Request('https://hamlet.test/functions/v1/paystack-initialize', {
          method: 'POST',
          headers: { authorization: 'Bearer other-guest-jwt' },
          body: JSON.stringify({ booking_id: booking.id }),
        }),
        {
          paystackSecretKey: TEST_SECRET,
          getAuthenticatedUser: async () => ({ id: otherGuestId, email: 'guest2@hamlet.test' }),
          loadBookingSnapshot: loadSnapshot,
        },
      );
      expect(wrongGuestRes.status).toBe(403);

      // 3. Valid guest initializes Paystack with authoritative guest_total * 100 kobo (ignoring any client-supplied amount)
      let capturedGatewayCall: PaystackInitializeGatewayParams | null = null;
      const validInitRes = await handlePaystackInitialize(
        new Request('https://hamlet.test/functions/v1/paystack-initialize', {
          method: 'POST',
          headers: { authorization: 'Bearer valid-guest-jwt' },
          body: JSON.stringify({
            booking_id: booking.id,
            amount: 100, // tampered client field — must be ignored!
            callback_url: 'https://hamlet.ng/#/account?payment=returned',
          }),
        }),
        {
          paystackSecretKey: TEST_SECRET,
          getAuthenticatedUser: async () => ({ id: guestId, email: 'guest1@hamlet.test' }),
          loadBookingSnapshot: loadSnapshot,
          initializeTransaction: async params => {
            capturedGatewayCall = params;
            return {
              data: {
                authorization_url: 'https://checkout.paystack.com/test_auth_code',
                access_code: 'test_auth_code',
                reference: 'PSK_INIT_REF_001',
              },
              error: null,
            };
          },
        },
      );

      expect(validInitRes.status).toBe(200);
      // 2 nights × 150,000 = 300,000 + 15,000 mandatory + 9,000 (3% fee) = 324,000 NGN -> 32,400,000 kobo
      expect(booking.guest_total).toBe(324_000);
      expect(capturedGatewayCall).toEqual({
        secretKey: TEST_SECRET,
        email: 'guest1@hamlet.test',
        amountKobo: 32_400_000,
        bookingId: booking.id,
        bookingReference: booking.reference,
        callbackUrl: 'https://hamlet.ng/#/account?payment=returned',
      });
    });

    it('provisions a guest profile with full_name, optional phone, role=guest, and account_status=active on signup', async () => {
      const signupUserId = '99999999-9999-4999-8999-999999999999';
      await db.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1::uuid, 'newguest@hamlet.test', $2::jsonb)`,
        [signupUserId, JSON.stringify({ full_name: '  Adaeze Okafor  ', phone: '  +234 803 123 4567  ' })],
      );

      const profileRes = await db.query<{
        full_name: string;
        phone: string | null;
        role: string;
        account_status: string;
      }>(
        `select full_name, phone, role, account_status from public.profiles where id = $1::uuid`,
        [signupUserId],
      );

      expect(profileRes.rows[0]).toEqual({
        full_name: 'Adaeze Okafor',
        phone: '+234 803 123 4567',
        role: 'guest',
        account_status: 'active',
      });
    });
  });
});
