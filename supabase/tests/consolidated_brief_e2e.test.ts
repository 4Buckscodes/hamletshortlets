import { createHmac } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  handlePaystackInitialize,
  type CheckoutBookingSnapshot,
  type PaystackInitializeGatewayParams,
} from '../functions/paystack-initialize/handler';
import {
  handlePaystackWebhook,
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

const WEBHOOK_SECRET = 'sk_test_consolidated_webhook_secret_2026';
const INIT_SECRET = 'sk_test_consolidated_init_secret_2026';

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function signBody(raw: string, secret = WEBHOOK_SECRET): string {
  return createHmac('sha512', secret).update(raw).digest('hex');
}

describe('HAMLET Consolidated Brief E2E (Availability, Referrals, 20% Markup, 10% FX Buffer, Caution Deposit & RLS)', () => {
  let db: PGlite;
  let todayIso: string;

  const adminId = 'aaaaaaaa-0000-4000-8000-000000000001';
  const ownerPartnerId = 'bbbbbbbb-0000-4000-8000-000000000002';
  const referrerPartnerId = 'cccccccc-0000-4000-8000-000000000003';
  const closingAgentApplicantId = 'dddddddd-0000-4000-8000-000000000004';
  const unrelatedPartnerId = 'eeeeeeee-0000-4000-8000-000000000005';
  const guestId = 'ffffffff-0000-4000-8000-000000000006';
  const guestTwoId = 'ffffffff-0000-4000-8000-000000000007';

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const { rows } = await db.query<{ today: string }>(`select current_date::text as today`);
    todayIso = rows[0].today;
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);

    await createTestUser(db, {
      id: adminId,
      email: 'ops.admin@hamlet.test',
      fullName: 'Funmi Admin',
      role: 'admin',
    });
    await createTestUser(db, {
      id: ownerPartnerId,
      email: 'owner@hamlet.test',
      fullName: 'Tunde Owner',
      role: 'partner',
    });
    await createTestUser(db, {
      id: referrerPartnerId,
      email: 'referrer@hamlet.test',
      fullName: 'Kemi Referrer',
      role: 'partner',
    });
    await createTestUser(db, {
      id: closingAgentApplicantId,
      email: 'closing.agent@hamlet.test',
      fullName: 'Seyi Closing Agent',
      role: 'guest',
    });
    await createTestUser(db, {
      id: unrelatedPartnerId,
      email: 'other.partner@hamlet.test',
      fullName: 'Bola Unrelated',
      role: 'partner',
    });
    await createTestUser(db, {
      id: guestId,
      email: 'guest.one@hamlet.test',
      fullName: 'Adaeze Guest',
      role: 'guest',
    });
    await createTestUser(db, {
      id: guestTwoId,
      email: 'guest.two@hamlet.test',
      fullName: 'Chidi Guest',
      role: 'guest',
    });
  });

  async function seedApprovedListing(input: {
    ownerUserId: string;
    nightlyRate: number;
    cleaningFee: number;
    mandatoryCharges: Array<{ label: string; amount: number }>;
    refundableDeposit: number;
    capacity: number;
    titleSuffix?: string;
  }): Promise<string> {
    const propertyId = await asUser(db, input.ownerUserId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: `Test Residence ${input.titleSuffix ?? crypto.randomUUID().slice(0, 6)}`,
            property_type: 'Apartment',
            area: 'Surulere',
            public_address: `42 Bode Thomas Street (${input.titleSuffix ?? 'A'}), Surulere, Lagos`,
            nightly_rate: input.nightlyRate,
            cleaning_fee: input.cleaningFee,
            mandatory_charges: input.mandatoryCharges,
            refundable_deposit: input.refundableDeposit,
            bedrooms: 2,
            bathrooms: 2,
            capacity: input.capacity,
            bed_setup: '2 queen beds',
            amenities: ['Wifi', '24/7 Power'],
            image_urls: ['https://images.example/test.jpg'],
            house_rules: ['No parties'],
          }),
          JSON.stringify({
            authority_basis: 'Registered owner — title deed verified',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_property($1, 'approved', 'Verified ownership, ID, authority, and inspection.', $2::jsonb)`,
        [
          propertyId,
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      ),
    );
    return propertyId;
  }

  async function sendSignedWebhook(payload: unknown): Promise<Response> {
    const rawBody = JSON.stringify(payload);
    return handlePaystackWebhook(
      new Request('https://hamlet.test/functions/v1/paystack-webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-paystack-signature': signBody(rawBody),
        },
        body: rawBody,
      }),
      {
        paystackSecretKey: WEBHOOK_SECRET,
        confirmPaymentRpc: async params =>
          asServiceRole(db, async tx => {
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
            return { data: rows[0].result, error: null };
          }),
      },
    );
  }

  it('§12.1 decouples property publication from calendar occupancy, approves occupied homes, manages blocks/pauses, and blocks overlapping dates', async () => {
    const firstAvail = addDaysIso(todayIso, 5);
    const blockStart = addDaysIso(todayIso, 12);
    const blockEnd = addDaysIso(todayIso, 16);

    // 1. Partner submits a currently occupied property with initial unavailable block & first_available_date
    const propertyId = await asUser(db, ownerPartnerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Occupied Yaba 2-Bed Loft',
            property_type: 'Apartment',
            area: 'Yaba',
            public_address: '18 Montgomery Road, Yaba, Lagos',
            nightly_rate: 100_000,
            cleaning_fee: 15_000,
            mandatory_charges: [{ label: 'Cleaning & turnover', amount: 15_000 }],
            refundable_deposit: 80_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 queen beds',
            amenities: ['Wifi', '24/7 Power', 'Security'],
            image_urls: ['https://images.example/yaba-1.jpg'],
            house_rules: ['No parties', 'Check-in from 3 PM'],
            first_available_date: firstAvail,
            availability_confirmation_status: 'confirmed',
            calendar_responsible_person: 'Tunde Owner',
            unavailable_blocks: [
              {
                start_date: blockStart,
                end_date: blockEnd,
                block_type: 'external_booking',
                note: 'Existing direct corporate tenant',
              },
            ],
          }),
          JSON.stringify({
            authority_basis: 'Registered owner — title deed verified',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });

    // 2. Admin approves the occupied property (occupancy does NOT force rejection!)
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_property($1, 'approved', 'Verified docs; approved with future availability calendar.', $2::jsonb)`,
        [
          propertyId,
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      ),
    );

    // 3. Anonymous public calendar RPC exposes the unavailable span without leaking private notes
    const publicSpans = await asAnon(db, async tx => {
      const { rows } = await tx.query<{ property_id: string; start_date: string; end_date: string; kind: string }>(
        `select property_id, start_date::text as start_date, end_date::text as end_date, kind
         from public.get_public_property_calendar(array[$1])`,
        [propertyId],
      );
      return rows;
    });
    expect(publicSpans).toEqual([
      {
        property_id: propertyId,
        start_date: blockStart,
        end_date: blockEnd,
        kind: 'unavailable_block',
      },
    ]);

    // 4. Guest booking BEFORE first_available_date or OVERLAPPING external block is rejected
    await expect(
      asUser(db, guestId, tx =>
        tx.query(
          `insert into public.bookings (
             reference, property_id, guest_id, check_in, check_out, guest_count
           ) values ('HML-EARLY-01', $1, $2::uuid, $3::date, $4::date, 2)`,
          [propertyId, guestId, addDaysIso(todayIso, 2), addDaysIso(todayIso, 4)],
        ),
      ),
    ).rejects.toThrow(/first available from/i);

    await expect(
      asUser(db, guestId, tx =>
        tx.query(
          `insert into public.bookings (
             reference, property_id, guest_id, check_in, check_out, guest_count
           ) values ('HML-BLK-01', $1, $2::uuid, $3::date, $4::date, 2)`,
          [propertyId, guestId, addDaysIso(todayIso, 13), addDaysIso(todayIso, 15)],
        ),
      ),
    ).rejects.toThrow(/marked unavailable on the property calendar/i);

    // 5. Partner can pause and resume listing without losing blocks or recreating listing
    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.set_property_publication_pause($1, true, 'Brief photography refresh')`, [propertyId]),
    );
    const pausedVis = await asAnon(db, async tx => {
      const { rows } = await tx.query(`select id from public.properties where id = $1`, [propertyId]);
      return rows;
    });
    expect(pausedVis).toHaveLength(0);

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.set_property_publication_pause($1, false, 'Back online')`, [propertyId]),
    );

    // 6. Future open window [day+6, day+9) succeeds; competing request on same dates cannot both be accepted
    const openIn = addDaysIso(todayIso, 6);
    const openOut = addDaysIso(todayIso, 9);
    const b1Id = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count
         ) values ('HML-OPEN-01', $1, $2::uuid, $3::date, $4::date, 2)
         returning id`,
        [propertyId, guestId, openIn, openOut],
      );
      return rows[0].id;
    });
    const b2Id = await asUser(db, guestTwoId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count
         ) values ('HML-OPEN-02', $1, $2::uuid, $3::date, $4::date, 2)
         returning id`,
        [propertyId, guestTwoId, openIn, openOut],
      );
      return rows[0].id;
    });

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [b1Id]),
    );
    await expect(
      asUser(db, ownerPartnerId, tx =>
        tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [b2Id]),
      ),
    ).rejects.toThrow(/overlap|conflict|already held|unavailable/i);
  });

  it('§12.2 & §12.3 enforces partner referral activation on 1st booking (₦0), 2.5% of B on 2nd+ booking (B = ₦200,000), 5 independent attributions, reversals, and dispute audit', async () => {
    const propRefId = await seedApprovedListing({
      titleSuffix: 'ref-200k',
      ownerUserId: ownerPartnerId,
      nightlyRate: 100_000, // 2 nights = B = ₦200,000!
      cleaningFee: 0,
      mandatoryCharges: [],
      refundableDeposit: 50_000,
      capacity: 4,
    });
    await db.query(
      `update public.properties
         set property_introducer_id = $1::uuid,
             authorised_manager_id = $2::uuid
       where id = $3`,
      [unrelatedPartnerId, ownerPartnerId, propRefId],
    );

    // 1. Referrer partner has auto-generated HML-... referral code & public lookup works
    const refCode = await asUser(db, referrerPartnerId, async tx => {
      const { rows } = await tx.query<{ code: string }>(`select public.ensure_my_referral_code() as code`);
      return rows[0].code;
    });
    expect(refCode).toMatch(/^HML-[A-Z0-9]+$/);

    const lookup = await asAnon(db, async tx => {
      const { rows } = await tx.query<{ res: { valid: boolean; partner_name: string } }>(
        `select public.resolve_referral_code($1) as res`,
        [refCode],
      );
      return rows[0].res;
    });
    expect(lookup.valid).toBe(true);
    expect(lookup.partner_name).toBe('Kemi Referrer');

    // 2. Self-referral is rejected when partner attempts to use their own referral code
    await expect(
      asUser(db, referrerPartnerId, tx =>
        tx.query(
          `insert into public.partner_applications (
             applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation, referred_by_code
           ) values ($1::uuid, 'Kemi Referrer', 'referrer@hamlet.test', '+2348000000001', 'Kemi Realty', 'Closing Agent', array['Surulere'], 0, 'Self test', $2)`,
          [referrerPartnerId, refCode],
        ),
      ),
    ).rejects.toThrow(/self-referral/i);

    // 3. Closing agent registers with referrer's code -> admin approves -> referral status = 'verified'
    const appId = await asUser(db, closingAgentApplicantId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation, referred_by_code
         ) values ($1::uuid, 'Seyi Closing Agent', 'closing.agent@hamlet.test', '+2348000000099', 'Seyi Desk', 'Closing Agent', array['Surulere', 'Yaba'], 0, 'Close verified stays', $2)
         returning id::text as id`,
        [closingAgentApplicantId, refCode],
      );
      return rows[0].id;
    });

    await asUser(db, adminId, tx =>
      tx.query(
        `select public.review_partner_application($1::uuid, 'approved', 'Verified closing agent credentials and ID.')`,
        [appId],
      ),
    );

    const agentCodeRes = await db.query<{ referral_code: string }>(
      `select referral_code from public.profiles where id = $1::uuid`,
      [closingAgentApplicantId],
    );
    const agentCode = agentCodeRes.rows[0].referral_code;
    expect(agentCode).toMatch(/^HML-/);

    const verifiedRef = await db.query<{ id: string; status: string }>(
      `select id::text as id, status from public.partner_referrals where referred_partner_id = $1::uuid`,
      [closingAgentApplicantId],
    );
    expect(verifiedRef.rows[0].status).toBe('verified');

    // 4. FIRST booking closed by referred agent (B = ₦200,000):
    //    Before activation -> 0% referrer reward, 10% closing agent (₦20k), 7.5% HAMLET (₦15k), 2.5% reserve (₦5k)
    const firstBooking = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        owner_listed_price_ngn: number;
        domestic_markup_ngn: number;
        domestic_guest_price_ngn: number;
        closing_agent_commission_ngn: number;
        direct_referrer_reward_ngn: number;
        hamlet_allocation_ngn: number;
        payment_reserve_ngn: number;
        property_introducer_id: string;
        authorised_manager_id: string;
        closing_agent_id: string;
        direct_referrer_id: string;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, guest_referral_source
         ) values ('HML-REF-FIRST', $1, $2::uuid, $3::date, $4::date, 2, $5)
         returning id, owner_listed_price_ngn, domestic_markup_ngn, domestic_guest_price_ngn,
                   closing_agent_commission_ngn, direct_referrer_reward_ngn, hamlet_allocation_ngn,
                   payment_reserve_ngn, property_introducer_id::text, authorised_manager_id::text,
                   closing_agent_id::text, direct_referrer_id::text`,
        [propRefId, guestId, addDaysIso(todayIso, 3), addDaysIso(todayIso, 5), agentCode],
      );
      return rows[0];
    });

    // Verify all 5 attributions remain distinct & independent!
    expect(firstBooking.property_introducer_id).toBe(unrelatedPartnerId);
    expect(firstBooking.authorised_manager_id).toBe(ownerPartnerId);
    expect(firstBooking.closing_agent_id).toBe(closingAgentApplicantId);
    expect(firstBooking.direct_referrer_id).toBe(referrerPartnerId);

    // Concrete §5.4 case without active referrer reward yet:
    expect(firstBooking.owner_listed_price_ngn).toBe(200_000);
    expect(firstBooking.domestic_markup_ngn).toBe(40_000);
    expect(firstBooking.domestic_guest_price_ngn).toBe(240_000);
    expect(firstBooking.closing_agent_commission_ngn).toBe(20_000);
    expect(firstBooking.direct_referrer_reward_ngn).toBe(0);
    expect(firstBooking.hamlet_allocation_ngn).toBe(15_000);
    expect(firstBooking.payment_reserve_ngn).toBe(5_000);

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [firstBooking.id]),
    );
    const pay1 = await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_REF_FIRST_01',
        amount: 240_000 * 100,
        fees: 3_600 * 100,
        currency: 'NGN',
        metadata: { booking_id: firstBooking.id },
      },
    });
    expect(pay1.status).toBe(200);

    // Complete 1st stay -> activates referral (₦0 payout) & opens 90-day earning window!
    await asUser(db, adminId, tx =>
      tx.query(`select public.transition_booking($1, 'completed', 'Stay 1 completed cleanly')`, [firstBooking.id]),
    );

    const activeRef = await db.query<{ status: string; activating_booking_id: string; eligibility_ends_at: string }>(
      `select status, activating_booking_id, eligibility_ends_at::text
       from public.partner_referrals where id = $1::uuid`,
      [verifiedRef.rows[0].id],
    );
    expect(activeRef.rows[0].status).toBe('active');
    expect(activeRef.rows[0].activating_booking_id).toBe(firstBooking.id);
    expect(activeRef.rows[0].eligibility_ends_at).toBeTruthy();

    const firstReward = await db.query<{ reward_rate: string; reward_amount_ngn: number; payout_status: string }>(
      `select reward_rate::text, reward_amount_ngn, payout_status
       from public.partner_referral_rewards where booking_id = $1`,
      [firstBooking.id],
    );
    expect(Number(firstReward.rows[0].reward_rate)).toBe(0);
    expect(firstReward.rows[0].reward_amount_ngn).toBe(0);
    expect(firstReward.rows[0].payout_status).toBe('activated_no_payout');

    // 5. SECOND booking closed by referred agent within 90-day window (B = ₦200,000):
    //    Exact §5.4 verification: Guest ₦240k | Closing ₦20k | Referrer ₦5k | HAMLET ₦10k | Reserve ₦5k!
    const secondBooking = await asUser(db, guestTwoId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        owner_listed_price_ngn: number;
        domestic_markup_ngn: number;
        domestic_guest_price_ngn: number;
        closing_agent_commission_ngn: number;
        direct_referrer_reward_ngn: number;
        hamlet_allocation_ngn: number;
        payment_reserve_ngn: number;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, guest_referral_source
         ) values ('HML-REF-SECOND', $1, $2::uuid, $3::date, $4::date, 2, $5)
         returning id, owner_listed_price_ngn, domestic_markup_ngn, domestic_guest_price_ngn,
                   closing_agent_commission_ngn, direct_referrer_reward_ngn, hamlet_allocation_ngn,
                   payment_reserve_ngn`,
        [propRefId, guestTwoId, addDaysIso(todayIso, 7), addDaysIso(todayIso, 9), agentCode],
      );
      return rows[0];
    });

    expect(secondBooking).toMatchObject({
      owner_listed_price_ngn: 200_000,
      domestic_markup_ngn: 40_000,
      domestic_guest_price_ngn: 240_000,
      closing_agent_commission_ngn: 20_000,
      direct_referrer_reward_ngn: 5_000,
      hamlet_allocation_ngn: 10_000,
      payment_reserve_ngn: 5_000,
    });

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [secondBooking.id]),
    );
    await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_REF_SECOND_02',
        amount: 240_000 * 100,
        fees: 6_200 * 100, // exceeds ₦5k reserve -> shortfall noted as absorbed by HAMLET allocation!
        currency: 'NGN',
        metadata: { booking_id: secondBooking.id },
      },
    });

    await asUser(db, adminId, tx =>
      tx.query(`select public.transition_booking($1, 'completed', 'Stay 2 completed within 90d window')`, [secondBooking.id]),
    );

    const secondReward = await db.query<{ reward_rate: string; reward_amount_ngn: number; payout_status: string }>(
      `select reward_rate::text, reward_amount_ngn, payout_status
       from public.partner_referral_rewards where booking_id = $1`,
      [secondBooking.id],
    );
    expect(Number(secondReward.rows[0].reward_rate)).toBe(0.025);
    expect(secondReward.rows[0].reward_amount_ngn).toBe(5_000);
    expect(secondReward.rows[0].payout_status).toBe('pending');

    // Verify provider_charge note records excess absorbed by HAMLET allocation, and referral_reward ledger exists
    const ledger2 = await db.query<{ id: string; record_type: string; amount: number; note: string | null }>(
      `select id::text as id, record_type, amount, note
       from public.booking_payment_records where booking_id = $1`,
      [secondBooking.id],
    );
    const refLedger = ledger2.rows.find(l => l.record_type === 'referral_reward');
    expect(refLedger?.amount).toBe(5_000);
    const provLedger = ledger2.rows.find(l => l.record_type === 'provider_charge');
    expect(provLedger?.amount).toBe(6_200);
    expect(provLedger?.note).toContain('1200 NGN excess absorbed by HAMLET allocation');

    // Admin updates payout status on referral_reward ledger line
    await asUser(db, adminId, tx =>
      tx.query(`select public.update_payout_status($1::uuid, 'paid', 'Settled via bank transfer')`, [refLedger!.id]),
    );

    // 6. THIRD booking cancelled/refunded -> reverses unpaid commissions & referral rewards!
    const thirdBookingId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, guest_referral_source
         ) values ('HML-REF-CANCEL', $1, $2::uuid, $3::date, $4::date, 2, $5)
         returning id`,
        [propRefId, guestId, addDaysIso(todayIso, 11), addDaysIso(todayIso, 13), agentCode],
      );
      return rows[0].id;
    });
    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [thirdBookingId]),
    );
    await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_REF_THIRD_03',
        amount: 240_000 * 100,
        fees: 2_000 * 100,
        currency: 'NGN',
        metadata: { booking_id: thirdBookingId },
      },
    });
    await asUser(db, adminId, tx =>
      tx.query(`select public.transition_booking($1, 'cancelled', 'Emergency cancellation')`, [thirdBookingId]),
    );
    await asUser(db, adminId, tx =>
      tx.query(`select public.record_booking_refund($1, 240000, 'PSK_RFD_03', 'Guest emergency cancellation — full refund')`, [thirdBookingId]),
    );

    const reversalRows = await db.query<{ record_type: string; amount: number }>(
      `select record_type, amount from public.booking_payment_records
       where booking_id = $1 and record_type in ('commission_reversal', 'refund')`,
      [thirdBookingId],
    );
    expect(reversalRows.rows.some(r => r.record_type === 'commission_reversal' && r.amount === 20_000)).toBe(true);
    expect(reversalRows.rows.some(r => r.record_type === 'refund' && r.amount === 240_000)).toBe(true);

    // 7. Admin attribution dispute resolution is audit-logged
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.admin_resolve_referral_dispute($1::uuid, 'disputed', 'Investigating duplicate partner claim across two agencies.', null)`,
        [verifiedRef.rows[0].id],
      ),
    );
    const disputeAudit = await db.query<{ action: string; detail: string }>(
      `select action, detail from public.admin_audit_log where target = $1 order by created_at desc limit 1`,
      [refCode],
    );
    expect(disputeAudit.rows[0].action).toBe('referral_disputed');
  });

  it('§12.4 enforces 10% USD/GBP international buffer ($200 -> $220), rejects expired FX quotes with 409 quote_expired, refreshes quotes, and keeps NGN commissions invariant', async () => {
    const propFxId = await seedApprovedListing({
      titleSuffix: 'fx-200k',
      ownerUserId: ownerPartnerId,
      nightlyRate: 100_000, // 2 nights -> B = ₦200,000 -> Domestic = ₦240,000
      cleaningFee: 0,
      mandatoryCharges: [],
      refundableDeposit: 120_000, // Unbuffered deposit!
      capacity: 4,
    });

    // Admin sets USD = 1,200 NGN/USD so ₦240,000 converts to exact $200.00 base -> $220.00 with 10% buffer!
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.upsert_exchange_rate_config('USD', 1200, 'cbn_verified_desk', true, null)`,
      ),
    );

    const ownerCodeRes = await db.query<{ referral_code: string }>(
      `select referral_code from public.profiles where id = $1::uuid`,
      [unrelatedPartnerId],
    );

    const usdBooking = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        reference: string;
        quote_currency: string;
        exchange_rate_ngn_per_unit: string;
        converted_base_amount: string;
        international_buffer_amount: string;
        quoted_guest_total: string;
        international_buffer_ngn_equiv: number;
        settlement_total_ngn: number;
        closing_agent_commission_ngn: number;
        refundable_deposit: number;
        quote_expires_at: string;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, quote_currency, guest_referral_source
         ) values ('HML-USD-220', $1, $2::uuid, $3::date, $4::date, 2, 'USD', $5)
         returning id, reference, quote_currency, exchange_rate_ngn_per_unit::text,
                   converted_base_amount::text, international_buffer_amount::text,
                   quoted_guest_total::text, international_buffer_ngn_equiv,
                   settlement_total_ngn, closing_agent_commission_ngn, refundable_deposit,
                   quote_expires_at::text`,
        [propFxId, guestId, addDaysIso(todayIso, 4), addDaysIso(todayIso, 6), ownerCodeRes.rows[0].referral_code],
      );
      return rows[0];
    });

    expect(usdBooking.quote_currency).toBe('USD');
    expect(Number(usdBooking.exchange_rate_ngn_per_unit)).toBe(1200);
    expect(Number(usdBooking.converted_base_amount)).toBe(200);
    expect(Number(usdBooking.international_buffer_amount)).toBe(20);
    expect(Number(usdBooking.quoted_guest_total)).toBe(220);
    expect(usdBooking.international_buffer_ngn_equiv).toBe(24_000);
    expect(usdBooking.settlement_total_ngn).toBe(264_000);
    // Closing agent commission is strictly 10% of B = ₦20,000 (NOT inflated by 10% FX buffer!)
    expect(usdBooking.closing_agent_commission_ngn).toBe(20_000);
    expect(usdBooking.refundable_deposit).toBe(120_000);

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [usdBooking.id]),
    );

    const loadCheckoutSnapshot = async (bookingId: string) => {
      const { rows } = await db.query<CheckoutBookingSnapshot>(
        `select
           b.id, b.reference, b.guest_id::text as guest_id, b.property_id,
           p.status as property_status, b.status, b.guest_total, b.settlement_total_ngn,
           b.quote_currency, b.quoted_guest_total::float8 as quoted_guest_total,
           b.exchange_rate_ngn_per_unit::float8 as exchange_rate_ngn_per_unit,
           b.quote_expires_at::text as quote_expires_at,
           b.check_in::text as check_in, b.payment_deadline::text as payment_deadline,
           false as has_confirmed_conflict
         from public.bookings b
         join public.properties p on p.id = b.property_id
         where b.id = $1`,
        [bookingId],
      );
      return { data: rows[0] ?? null, error: null };
    };

    // 1. Expired USD quote is rejected with 409 quote_expired!
    const futureTimeAfterExpiry = new Date(new Date(usdBooking.quote_expires_at).getTime() + 60_000);
    const expiredInitRes = await handlePaystackInitialize(
      new Request('https://hamlet.test/functions/v1/paystack-initialize', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt' },
        body: JSON.stringify({ booking_id: usdBooking.id }),
      }),
      {
        paystackSecretKey: INIT_SECRET,
        now: () => futureTimeAfterExpiry,
        getAuthenticatedUser: async () => ({ id: guestId, email: 'guest.one@hamlet.test' }),
        loadBookingSnapshot: loadCheckoutSnapshot,
      },
    );
    expect(expiredInitRes.status).toBe(409);
    const expiredBody = (await expiredInitRes.json()) as { code: string };
    expect(expiredBody.code).toBe('quote_expired');

    // 2. Guest refreshes quote via refresh_booking_fx_quote -> Paystack initializes at 26,400,000 kobo (₦264,000)
    await asUser(db, guestId, tx =>
      tx.query(`select public.refresh_booking_fx_quote($1, 'USD')`, [usdBooking.id]),
    );

    const capturedInits: PaystackInitializeGatewayParams[] = [];
    const validInitRes = await handlePaystackInitialize(
      new Request('https://hamlet.test/functions/v1/paystack-initialize', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-jwt' },
        body: JSON.stringify({ booking_id: usdBooking.id }),
      }),
      {
        paystackSecretKey: INIT_SECRET,
        getAuthenticatedUser: async () => ({ id: guestId, email: 'guest.one@hamlet.test' }),
        loadBookingSnapshot: loadCheckoutSnapshot,
        initializeTransaction: async params => {
          capturedInits.push(params);
          return {
            data: {
              authorization_url: 'https://checkout.paystack.com/fx_usd_220',
              access_code: 'fx_usd_220',
              reference: 'PSK_USD_220_01',
            },
            error: null,
          };
        },
      },
    );
    expect(validInitRes.status).toBe(200);
    expect(capturedInits[0]?.amountKobo).toBe(26_400_000); // ₦264,000 in kobo!

    // 3. Webhook confirms at ₦264,000 and writes separate international_buffer ledger line (₦24,000)
    const fxWebhookRes = await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_USD_220_01',
        amount: 264_000 * 100,
        fees: 3_500 * 100,
        currency: 'NGN',
        metadata: { booking_id: usdBooking.id },
      },
    });
    expect(fxWebhookRes.status).toBe(200);

    const fxLedger = await db.query<{ record_type: string; amount: number }>(
      `select record_type, amount from public.booking_payment_records where booking_id = $1`,
      [usdBooking.id],
    );
    expect(fxLedger.rows.some(r => r.record_type === 'international_buffer' && r.amount === 24_000)).toBe(true);
    expect(fxLedger.rows.some(r => r.record_type === 'closing_agent_commission' && r.amount === 20_000)).toBe(true);
  });

  it('§12.5 & §12.6 tracks full & partial caution deposit refunds with evidence and enforces strict RLS & role boundaries', async () => {
    const propCdId = await seedApprovedListing({
      titleSuffix: 'caution-test',
      ownerUserId: ownerPartnerId,
      nightlyRate: 100_000,
      cleaningFee: 10_000,
      mandatoryCharges: [{ label: 'Cleaning', amount: 10_000 }],
      refundableDeposit: 100_000,
      capacity: 4,
    });

    // Stay A: Full caution refund
    const stayAId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count
         ) values ('HML-CD-FULL', $1, $2::uuid, $3::date, $4::date, 2)
         returning id`,
        [propCdId, guestId, addDaysIso(todayIso, 2), addDaysIso(todayIso, 4)],
      );
      return rows[0].id;
    });

    const initialCd = await db.query<{ status: string; amount_ngn: number }>(
      `select status, amount_ngn from public.booking_caution_deposits where booking_id = $1`,
      [stayAId],
    );
    expect(initialCd.rows[0]).toEqual({ status: 'due', amount_ngn: 100_000 });

    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [stayAId]),
    );
    await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_CD_FULL_01',
        amount: 250_000 * 100, // 200k + 40k markup + 10k cleaning = 250k
        fees: 2_500 * 100,
        currency: 'NGN',
        metadata: { booking_id: stayAId },
      },
    });

    const receivedCd = await db.query<{ status: string }>(
      `select status from public.booking_caution_deposits where booking_id = $1`,
      [stayAId],
    );
    expect(receivedCd.rows[0].status).toBe('received');

    // Property partner can submit post-checkout inspection notes -> 'inspection_pending'
    await asUser(db, ownerPartnerId, tx =>
      tx.query(
        `select public.transition_caution_deposit($1, 'inspection_pending', 0, 0, 'Checked apartment — spotless condition.', null, null, '[]'::jsonb)`,
        [stayAId],
      ),
    );

    // Property partner CANNOT finalize refund_completed (admin-only!)
    await expect(
      asUser(db, ownerPartnerId, tx =>
        tx.query(
          `select public.transition_caution_deposit($1, 'refund_completed', 0, 100000, null, null, 'TRF_ILLEGAL', '[]'::jsonb)`,
          [stayAId],
        ),
      ),
    ).rejects.toThrow(/admin/i);

    // Admin completes full ₦100,000 caution deposit refund
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.transition_caution_deposit($1, 'refund_completed', 0, 100000, 'Verified clean checkout', null, 'TRF_CD_FULL_01', '[]'::jsonb)`,
        [stayAId],
      ),
    );

    const fullRefundLedger = await db.query<{ record_type: string; amount: number }>(
      `select record_type, amount from public.booking_payment_records
       where booking_id = $1 and record_type = 'caution_refund'`,
      [stayAId],
    );
    expect(fullRefundLedger.rows[0]?.amount).toBe(100_000);

    // Stay B: Partial refund with verified damage deduction (₦35,000 deducted, ₦65,000 refunded)
    const stayBId = await asUser(db, guestTwoId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count
         ) values ('HML-CD-PART', $1, $2::uuid, $3::date, $4::date, 2)
         returning id`,
        [propCdId, guestTwoId, addDaysIso(todayIso, 6), addDaysIso(todayIso, 8)],
      );
      return rows[0].id;
    });
    await asUser(db, ownerPartnerId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment')`, [stayBId]),
    );
    await sendSignedWebhook({
      event: 'charge.success',
      data: {
        status: 'success',
        reference: 'PSK_CD_PART_02',
        amount: 250_000 * 100,
        fees: 2_500 * 100,
        currency: 'NGN',
        metadata: { booking_id: stayBId },
      },
    });
    await asUser(db, adminId, tx =>
      tx.query(
        `select public.transition_caution_deposit($1, 'partially_refunded', 35000, 65000, 'Broken bedside lamp', 'Replacement invoice #INV-882 attached', 'TRF_CD_PART_02', $2::jsonb)`,
        [stayBId, JSON.stringify(['photo://lamp-damage.jpg', 'invoice://INV-882.pdf'])],
      ),
    );

    const partLedger = await db.query<{ record_type: string; amount: number }>(
      `select record_type, amount from public.booking_payment_records
       where booking_id = $1 and record_type in ('caution_deduction', 'caution_refund')`,
      [stayBId],
    );
    expect(partLedger.rows.some(r => r.record_type === 'caution_deduction' && r.amount === 35_000)).toBe(true);
    expect(partLedger.rows.some(r => r.record_type === 'caution_refund' && r.amount === 65_000)).toBe(true);

    // §12.6 Strict RLS & role permission boundaries:
    // - Non-admin cannot configure exchange rates
    await expect(
      asUser(db, ownerPartnerId, tx =>
        tx.query(`select public.upsert_exchange_rate_config('USD', 999, 'rogue_partner', true, null)`),
      ),
    ).rejects.toThrow(/admin/i);

    // - Unrelated partner cannot add blocks to another partner's property
    await expect(
      asUser(db, unrelatedPartnerId, tx =>
        tx.query(
          `select public.add_property_availability_block($1, $2::date, $3::date, 'owner_block', 'partner', 'Unauthorized block')`,
          [propCdId, addDaysIso(todayIso, 20), addDaysIso(todayIso, 22)],
        ),
      ),
    ).rejects.toThrow(/permission|not authori[sz]ed|access/i);

    // - Guest cannot see another guest's caution deposit record
    const crossGuestDeposits = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ booking_id: string }>(
        `select booking_id from public.booking_caution_deposits where booking_id = $1`,
        [stayBId],
      );
      return rows;
    });
    expect(crossGuestDeposits).toHaveLength(0);
  });
});
