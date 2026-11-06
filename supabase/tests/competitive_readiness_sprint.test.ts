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

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

describe('HAMLET Competitive Readiness Sprint — Journeys A–G, Financial Snapshots & RLS Privacy', () => {
  let db: PGlite;
  let adminId: string;
  let ownerId: string;
  let agentAId: string;
  let agentBId: string;
  let guestId: string;
  let approvedPropertyId: string;

  beforeAll(async () => {
    db = await createMigratedTestDb();
  }, 60_000);

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);

    adminId = await createTestUser(db, {
      email: 'admin@hamlet.rest',
      fullName: 'HAMLET Admin',
      role: 'admin',
    });
    ownerId = await createTestUser(db, {
      email: 'owner@hamlet.rest',
      fullName: 'Chidi Property Owner',
      role: 'partner',
    });
    agentAId = await createTestUser(db, {
      email: 'agent.a@hamlet.rest',
      fullName: 'Tunde Closing Agent A',
      role: 'partner',
    });
    agentBId = await createTestUser(db, {
      email: 'agent.b@hamlet.rest',
      fullName: 'Bisi Competing Agent B',
      role: 'partner',
    });
    guestId = await createTestUser(db, {
      email: 'guest@hamlet.rest',
      fullName: 'Adaeze Guest',
      role: 'guest',
    });

    // Owner submits and Admin approves canonical Victoria Island property
    approvedPropertyId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Canonical Lagoon 2BR Residence',
            property_type: 'Serviced apartment',
            area: 'Victoria Island',
            public_address: '22 Ahmadu Bello Way, Victoria Island',
            nightly_rate: 100_000,
            cleaning_fee: 15_000,
            mandatory_charges: [{ label: 'Cleaning fee', amount: 15_000 }],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            image_urls: [
              'https://images.hamlet.rest/vi-lagoon/cover.webp',
              'https://images.hamlet.rest/vi-lagoon/living.webp',
              'https://images.hamlet.rest/vi-lagoon/bedroom.webp',
            ],
            amenities: ['24/7 Estate Power', 'Fibre Wi-Fi', 'Gated Security'],
            house_rules: ['No smoking indoors', 'No parties'],
          }),
          JSON.stringify({
            authority_basis: 'Registered title deed',
            submitted_role: 'Property owner',
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
          approvedPropertyId,
          'Approved canonical VI listing',
          JSON.stringify({
            ownership: 'verified',
            identity: 'verified',
            authority: 'verified',
            inspection: 'verified',
          }),
        ],
      );
    });
  });

  it('Journey A & F: Owner publishes Fixed Payout & Net Rate deals -> Agent A accepts -> frozen snapshot survives owner edit -> attributed booking avoids double-pay -> Agent B blocked by RLS', async () => {
    // 1. Owner creates a Fixed Agent Payout deal (₦200,000/week selling, ₦60,000 agent payout -> ₦140,000 owner)
    const fixedDealId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.upsert_owner_agent_deal($1::jsonb) as id`,
        [
          JSON.stringify({
            property_id: approvedPropertyId,
            title: 'Corporate Weekly Fixed Payout Deal',
            deal_structure: 'fixed_agent_payout',
            billing_unit: 'per_week',
            authorised_selling_price_ngn: 200_000,
            agent_payout_ngn: 60_000,
            min_stay_nights: 2,
            exclusivity: 'open_network',
            status: 'published',
          }),
        ],
      );
      return rows[0].id;
    });

    // Also verify Owner Net Rate deal creation (₦140,000 net, ₦200,000 selling -> ₦60,000 agent margin)
    const netDealId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.upsert_owner_agent_deal($1::jsonb) as id`,
        [
          JSON.stringify({
            property_id: approvedPropertyId,
            title: 'Owner Net Rate Per-Night Deal',
            deal_structure: 'owner_net_rate',
            billing_unit: 'per_night',
            authorised_selling_price_ngn: 90_000,
            owner_allocation_ngn: 70_000,
            min_stay_nights: 1,
            status: 'paused',
          }),
        ],
      );
      return rows[0].id;
    });
    expect(netDealId).toBeTruthy();

    // Verify kobo columns generated accurately on `agent_deals`
    const { rows: dealKoboRows } = await db.query<{
      owner_allocation_ngn: number;
      owner_allocation_kobo: string;
      agent_payout_kobo: string;
      authorised_selling_price_kobo: string;
    }>(
      `select owner_allocation_ngn, owner_allocation_kobo::text, agent_payout_kobo::text, authorised_selling_price_kobo::text
       from public.agent_deals where id = $1`,
      [fixedDealId],
    );
    expect(dealKoboRows[0].owner_allocation_ngn).toBe(140_000);
    expect(dealKoboRows[0].owner_allocation_kobo).toBe('14000000');
    expect(dealKoboRows[0].agent_payout_kobo).toBe('6000000');
    expect(dealKoboRows[0].authorised_selling_price_kobo).toBe('20000000');

    // Anon is denied table privileges outright, and Guests see 0 rows via RLS
    await expect(
      asAnon(db, async tx => {
        await tx.query(`select id from public.agent_deals`);
      }),
    ).rejects.toThrow(/permission denied/i);

    const guestDeals = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query(`select id from public.agent_deals`);
      return rows;
    });
    expect(guestDeals).toHaveLength(0);

    // 2. Agent A accepts the Fixed Agent Payout deal -> unlocks share_token & freezes snapshot
    const acceptance = await asUser(db, agentAId, async tx => {
      const { rows } = await tx.query<{
        r: {
          acceptance_id: string;
          deal_code: string;
          share_token: string;
          accepted_terms_snapshot: {
            authorised_selling_price_ngn: number;
            owner_allocation_ngn: number;
            agent_payout_ngn: number;
          };
        };
      }>(`select public.respond_to_agent_deal($1, 'accepted') as r`, [fixedDealId]);
      return rows[0].r;
    });
    expect(acceptance.share_token).toMatch(/^hsl_/);
    expect(acceptance.accepted_terms_snapshot.owner_allocation_ngn).toBe(140_000);
    expect(acceptance.accepted_terms_snapshot.agent_payout_ngn).toBe(60_000);

    // 3. Owner edits the live deal afterwards (reduces agent payout to ₦30,000) — Agent A's frozen snapshot MUST NOT change!
    await asUser(db, ownerId, async tx => {
      await tx.query(`select public.upsert_owner_agent_deal($1::jsonb)`, [
        JSON.stringify({
          id: fixedDealId,
          property_id: approvedPropertyId,
          title: 'Corporate Weekly Fixed Payout Deal',
          deal_structure: 'fixed_agent_payout',
          billing_unit: 'per_week',
          authorised_selling_price_ngn: 200_000,
          agent_payout_ngn: 30_000,
          min_stay_nights: 2,
          status: 'published',
        }),
      ]);
    });

    // 4. Guest visits via Agent A's WhatsApp share link -> clicks Agent B's link afterwards -> Agent A attribution stays locked!
    const agentBShareToken = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.get_or_create_partner_share_link($1) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });

    const sessionKey = 'hsv_competitive_sprint_guest_session_01';
    await asAnon(db, async tx => {
      await tx.query(`select public.record_share_link_visit($1, $2, 'whatsapp')`, [
        acceptance.share_token,
        sessionKey,
      ]);
      // Subsequent click on Agent B's link does NOT overwrite Agent A's active attribution
      await tx.query(`select public.record_share_link_visit($1, $2, 'whatsapp')`, [
        agentBShareToken,
        sessionKey,
      ]);
    });

    // 5. Guest books a 7-night stay using the deal link -> verify frozen deal & financial breakdown + anti-double-payment
    const checkIn = futureDate(10);
    const checkOut = futureDate(17); // 7 nights = 1 week
    const booking = await asUser(db, guestId, async tx => {
      await tx.query(`select public.bind_share_attribution_to_guest($1)`, [sessionKey]);
      const { rows } = await tx.query<{
        id: string;
        reference: string;
        closing_agent_id: string;
        accommodation_subtotal: number;
        hamlet_guest_fee: number;
        guest_total: number;
        refundable_deposit: number;
        closing_agent_commission_ngn: number;
        agreed_owner_allocation_ngn: number;
        agreed_agent_deal_payout_ngn: number;
        price_breakdown_snapshot: Record<string, unknown>;
      }>(
        `insert into public.bookings (
          reference, property_id, guest_id, check_in, check_out, guest_count,
          accommodation_subtotal, mandatory_charges, mandatory_total,
          hamlet_guest_fee, guest_total, refundable_deposit, status,
          share_session_key, share_token_input, deal_code_input
        ) values (
          'HML-DEAL7N01', $1, $2, $3, $4, 2,
          700000, '[{"label":"Cleaning fee","amount":15000}]'::jsonb, 15000,
          140000, 855000, 100000, 'requested',
          $5, $6, $7
        )
        returning id, reference, closing_agent_id, accommodation_subtotal, hamlet_guest_fee,
                  guest_total, refundable_deposit, closing_agent_commission_ngn,
                  agreed_owner_allocation_ngn, agreed_agent_deal_payout_ngn, price_breakdown_snapshot`,
        [
          approvedPropertyId,
          guestId,
          checkIn,
          checkOut,
          sessionKey,
          acceptance.share_token,
          acceptance.deal_code,
        ],
      );
      return rows[0];
    });

    // Attribution stayed locked to Agent A (not overwritten by Agent B)
    expect(booking.closing_agent_id).toBe(agentAId);
    // Frozen deal snapshot used ₦140,000 owner / ₦60,000 agent (NOT the later ₦30,000 edit!)
    expect(booking.agreed_owner_allocation_ngn).toBe(140_000);
    expect(booking.agreed_agent_deal_payout_ngn).toBe(60_000);
    expect(booking.accommodation_subtotal).toBe(140_000);
    expect(booking.closing_agent_commission_ngn).toBe(60_000);
    // 20% HAMLET service pool on ₦200,000 authorised selling = ₦40,000; + ₦15,000 cleaning = ₦255,000 stay total
    expect(booking.hamlet_guest_fee).toBe(40_000);
    expect(booking.guest_total).toBe(255_000);
    // Refundable deposit (₦100,000) is strictly separate from stay total
    expect(booking.refundable_deposit).toBe(100_000);
    expect(booking.price_breakdown_snapshot.agent_compensation_source).toBe(
      'accepted_owner_deal',
    );
    expect(booking.price_breakdown_snapshot.caution_deposit_kobo).toBe(10_000_000);

    // Owner accepts -> webhook confirms payment -> verify single agent commission record (no double-payment!)
    await asUser(db, ownerId, async tx => {
      await tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Confirmed')`, [
        booking.id,
      ]);
    });

    await asServiceRole(db, async tx => {
      await tx.query(
        `select public.confirm_booking_payment_webhook($1, 'PSK-DEAL-001', 'paystack', $2, 2000, 'NGN')`,
        [booking.id, 255_000 + 100_000],
      );
    });

    const { rows: agentLedgerRows } = await db.query<{ amount: number; record_type: string }>(
      `select amount, record_type from public.booking_payment_records
       where booking_id = $1 and beneficiary_user_id = $2`,
      [booking.id, agentAId],
    );
    // Paid ONCE (₦60,000), never double-paid!
    expect(agentLedgerRows).toHaveLength(1);
    expect(agentLedgerRows[0].amount).toBe(60_000);

    // 6. Strict RLS isolation: Agent B CANNOT see Agent A's deal acceptances or earnings!
    const agentBSeesAcceptances = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query(
        `select id from public.agent_deal_acceptances where agent_id = $1`,
        [agentAId],
      );
      return rows;
    });
    expect(agentBSeesAcceptances).toHaveLength(0);

    const agentBEarnings = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query<{
        r: { deals: unknown[]; attributed_bookings: unknown[] };
      }>(`select public.get_my_agent_deal_earnings() as r`);
      return rows[0].r;
    });
    expect(agentBEarnings.deals).toHaveLength(0);
    expect(agentBEarnings.attributed_bookings).toHaveLength(0);
  });

  it('Journey B: Submitter role separation prevents sourcing agents from becoming owners, and near-duplicate submissions enter Admin review queue without auto-deletion', async () => {
    // Agent B submits a near-duplicate listing at the SAME public address & shared photo, declaring an agent role
    const nearDupPropertyId = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Executive Lagoon Two Bedroom Suite',
            property_type: 'Serviced apartment',
            area: 'Victoria Island',
            public_address: '22 Ahmadu Bello Way, Victoria Island',
            nightly_rate: 115_000,
            cleaning_fee: 15_000,
            mandatory_charges: [{ label: 'Cleaning fee', amount: 15_000 }],
            refundable_deposit: 80_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            image_urls: [
              'https://images.hamlet.rest/vi-lagoon/cover.webp',
              'https://images.hamlet.rest/vi-lagoon/alt1.webp',
              'https://images.hamlet.rest/vi-lagoon/alt2.webp',
            ],
            amenities: ['24/7 Estate Power', 'Fibre Wi-Fi'],
            house_rules: ['No smoking'],
          }),
          JSON.stringify({
            authority_basis: 'Verbal introducer lead',
            submitted_role: 'Property introducer / agent',
            docs: [],
          }),
        ],
      );
      return rows[0].id;
    });

    // 1. Agent B did NOT become owner — `submitter_relationship` is `sourcing_agent` and `can_manage_property` is false!
    const { rows: propRoleRows } = await db.query<{
      submitter_relationship: string;
      hamlet_property_code: string;
    }>(
      `select submitter_relationship, hamlet_property_code from public.properties where id = $1`,
      [nearDupPropertyId],
    );
    expect(propRoleRows[0].submitter_relationship).toBe('sourcing_agent');
    expect(propRoleRows[0].hamlet_property_code).toMatch(/^HMP-LAG-/);

    const agentBCanManageAsOwner = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query<{ ok: boolean }>(
        `select public.can_manage_property($1) as ok`,
        [nearDupPropertyId],
      );
      return rows[0].ok;
    });
    expect(agentBCanManageAsOwner).toBe(false);

    // 2. Duplicate detector flagged `nearDupPropertyId` vs `approvedPropertyId` non-destructively
    const partnerCannotReadFlags = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query(`select id from public.property_duplicate_flags`);
      return rows;
    });
    expect(partnerCannotReadFlags).toHaveLength(0);

    const adminFlags = await asUser(db, adminId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        property_id: string;
        matched_property_id: string;
        confidence_score: number;
        status: string;
      }>(`select id, property_id, matched_property_id, confidence_score, status from public.property_duplicate_flags`);
      return rows;
    });
    expect(adminFlags.length).toBeGreaterThanOrEqual(1);
    const flag = adminFlags.find(f => f.property_id === nearDupPropertyId)!;
    expect(flag.matched_property_id).toBe(approvedPropertyId);
    expect(flag.confidence_score).toBeGreaterThanOrEqual(80);

    // 3. Admin marks as confirmed duplicate & suspends/rejects without deleting either record
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.review_property_duplicate_flag($1, 'confirmed_duplicate', 'Same apartment submitted by unauthorised sourcing agent', true)`,
        [flag.id],
      );
    });

    const { rows: afterReview } = await db.query<{ status: string }>(
      `select status from public.properties where id = $1`,
      [nearDupPropertyId],
    );
    expect(afterReview[0].status).toBe('rejected');
  });

  it('Journey C: Owner authorises multiple agents on one property and revokes an agent without losing historical booking attribution', async () => {
    // Turn off open network sharing so ONLY explicitly authorised agents can share
    await asUser(db, ownerId, async tx => {
      await tx.query(`select public.set_property_sharing_permission($1, false)`, [
        approvedPropertyId,
      ]);
      await tx.query(
        `select public.grant_owner_agent_authorisation($1, $2, array['market_and_share']::text[], null, 'VIP Island mandate')`,
        [approvedPropertyId, agentAId],
      );
      await tx.query(
        `select public.grant_owner_agent_authorisation($1, $2, array['market_and_share']::text[], null, 'Corporate relocation mandate')`,
        [approvedPropertyId, agentBId],
      );
    });

    // Agent A creates share link & attributes a guest booking
    const linkA = await asUser(db, agentAId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.get_or_create_partner_share_link($1) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });

    const sess = 'hsv_revoke_attribution_test_01';
    await asAnon(db, async tx => {
      await tx.query(`select public.record_share_link_visit($1, $2, 'whatsapp')`, [
        linkA,
        sess,
      ]);
    });

    const histBookingId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
          reference, property_id, guest_id, check_in, check_out, guest_count,
          accommodation_subtotal, mandatory_charges, mandatory_total,
          hamlet_guest_fee, guest_total, refundable_deposit, status,
          share_session_key, share_token_input
        ) values (
          'HML-REVOKE01', $1, $2, $3, $4, 2,
          200000, '[]'::jsonb, 0, 40000, 240000, 100000, 'requested', $5, $6
        ) returning id`,
        [approvedPropertyId, guestId, futureDate(20), futureDate(22), sess, linkA],
      );
      return rows[0].id;
    });

    // Owner revokes Agent A
    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.revoke_owner_agent_authorisation($1, $2, 'Mandate ended')`,
        [approvedPropertyId, agentAId],
      );
    });

    // Agent A is blocked from future sharing, while Agent B remains authorised
    const canShareA = await asUser(db, agentAId, async tx => {
      const { rows } = await tx.query<{ ok: boolean }>(
        `select public.can_partner_share_property($1, $2) as ok`,
        [approvedPropertyId, agentAId],
      );
      return rows[0].ok;
    });
    const canShareB = await asUser(db, agentBId, async tx => {
      const { rows } = await tx.query<{ ok: boolean }>(
        `select public.can_partner_share_property($1, $2) as ok`,
        [approvedPropertyId, agentBId],
      );
      return rows[0].ok;
    });
    expect(canShareA).toBe(false);
    expect(canShareB).toBe(true);

    // Historical booking attribution to Agent A remains 100% preserved!
    const { rows: preservedRows } = await db.query<{
      closing_agent_id: string;
      share_partner_id: string;
    }>(
      `select closing_agent_id, share_partner_id from public.bookings where id = $1`,
      [histBookingId],
    );
    expect(preservedRows[0].closing_agent_id).toBe(agentAId);
    expect(preservedRows[0].share_partner_id).toBe(agentAId);
  });

  it('Journey D & E: Caution policy, check-in/check-out inspections, guest acknowledgement, wear-and-tear guard, claim resolution & enquiry reply', async () => {
    // Owner sets caution policy & confirms availability
    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.update_property_caution_policy($1, 100000, 'Refunded within 48h post-inspection', 'Joint photo checklist at check-in and check-out')`,
        [approvedPropertyId],
      );
      await tx.query(
        `select public.confirm_property_availability_now($1, 'request_to_book')`,
        [approvedPropertyId],
      );
    });

    // Guest submits enquiry -> Owner responds cleanly
    const enquiryId = await asAnon(db, async tx => {
      const { rows } = await tx.query<{ r: { enquiry_id: string } }>(
        `select public.submit_property_enquiry($1, 'Adaeze Guest', 'adaeze@example.com', '+2348012345678', 'Is inverter 24/7?', null, null) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.enquiry_id;
    });

    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.respond_to_property_enquiry($1, 'Yes, dual hybrid inverter + estate generator.', 'answered')`,
        [enquiryId],
      );
    });

    // Guest books -> Owner accepts -> Webhook confirms payment -> Caution deposit = `received`
    const bookingId = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.bookings (
          reference, property_id, guest_id, check_in, check_out, guest_count,
          accommodation_subtotal, mandatory_charges, mandatory_total,
          hamlet_guest_fee, guest_total, refundable_deposit, status
        ) values (
          'HML-CAUT01', $1, $2, $3, $4, 2,
          200000, '[]'::jsonb, 0, 40000, 240000, 100000, 'requested'
        ) returning id`,
        [approvedPropertyId, guestId, futureDate(30), futureDate(32)],
      );
      return rows[0].id;
    });

    // Changing property caution deposit AFTER booking creation does NOT alter historical booking
    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.update_property_caution_policy($1, 150000, null, null)`,
        [approvedPropertyId],
      );
      await tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Confirmed')`, [
        bookingId,
      ]);
    });

    await asServiceRole(db, async tx => {
      await tx.query(
        `select public.confirm_booking_payment_webhook($1, 'PSK-CAUT-01', 'paystack', 340000, 2000, 'NGN')`,
        [bookingId],
      );
    });

    // Owner records Check-In inspection -> Guest acknowledges
    const checkInInspId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_property_inspection($1, 'check_in', 'excellent', 'All furniture intact', '', '', 'Inverter 100%', '[{"url":"https://img.hamlet.rest/checkin.jpg","media_type":"photo","caption":"Check-in living room","captured_at":"2026-11-06T14:00:00Z"}]'::jsonb) as id`,
        [bookingId],
      );
      return rows[0].id;
    });

    await asUser(db, guestId, async tx => {
      await tx.query(
        `select public.respond_to_property_inspection($1, 'acknowledged', 'Confirmed accurate at check-in')`,
        [checkInInspId],
      );
    });

    // Owner records Check-Out inspection -> moves caution deposit to `inspection_pending`
    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.submit_property_inspection($1, 'check_out', 'issues_noted', 'Broken bedside lamp shade', 'Cracked ceramic lamp', '', 'All utilities operational', '[{"url":"https://img.hamlet.rest/checkout-lamp.jpg","media_type":"photo","caption":"Broken lamp","captured_at":"2026-11-08T11:00:00Z"}]'::jsonb)`,
        [bookingId],
      );
    });

    // Claim that fails to exclude normal wear and tear is rejected
    await expect(
      asUser(db, ownerId, async tx => {
        await tx.query(
          `select public.submit_caution_damage_claim($1, 'Normal paint scuff from luggage', 15000, '[{"url":"https://img.hamlet.rest/scuff.jpg"}]'::jsonb, false)`,
          [bookingId],
        );
      }),
    ).rejects.toThrow(/Normal wear and tear/i);

    // Valid documented damage claim succeeds -> Guest responds -> Admin resolves partial refund
    await asUser(db, ownerId, async tx => {
      await tx.query(
        `select public.submit_caution_damage_claim($1, 'Cracked ceramic bedside lamp documented at checkout', 25000, '[{"url":"https://img.hamlet.rest/checkout-lamp.jpg","caption":"Lamp damage"}]'::jsonb, true)`,
        [bookingId],
      );
    });

    await asUser(db, guestId, async tx => {
      await tx.query(
        `select public.respond_to_caution_damage_claim($1, 'Lamp was accidentally knocked over; ₦25,000 replacement agreed.')`,
        [bookingId],
      );
    });

    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.admin_resolve_caution_deposit_status($1, 'partially_refunded', 25000, 75000, 'Evidence & guest agreement verified')`,
        [bookingId],
      );
    });

    const { rows: finalDep } = await db.query<{
      amount_ngn: number;
      status: string;
      deducted_amount_ngn: number;
      refunded_amount_ngn: number;
    }>(
      `select amount_ngn, status, deducted_amount_ngn, refunded_amount_ngn from public.booking_caution_deposits where booking_id = $1`,
      [bookingId],
    );
    expect(finalDep[0].amount_ngn).toBe(100_000); // Preserved despite later ₦150k property edit!
    expect(finalDep[0].status).toBe('partially_refunded');
    expect(finalDep[0].deducted_amount_ngn).toBe(25_000);
    expect(finalDep[0].refunded_amount_ngn).toBe(75_000);
  });

  it('Journey G & Rollback: 7-check Trust Profile hides confidential notes from public/guests and never claims full verification until all 7 checks pass', async () => {
    // Admin updates physical inspection with private internal note
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.admin_review_property_trust_check($1, 'physical_inspection_completed', 'additional_docs_requested', 'Awaiting updated inverter test video', 'PRIVATE NOTE: Owner C-of-O ref #LAG-998821 checked; waiting on generator video', 'Pending video follow-up')`,
        [approvedPropertyId],
      );
    });

    // Anon & unrelated Guest CANNOT read raw `property_trust_checks` (protects `internal_review_note`!)
    const guestRawChecks = await asUser(db, guestId, async tx => {
      const { rows } = await tx.query(
        `select internal_review_note from public.property_trust_checks where property_id = $1`,
        [approvedPropertyId],
      );
      return rows;
    });
    expect(guestRawChecks).toHaveLength(0);

    // Safe public RPC returns public status WITHOUT `internal_review_note`
    const publicProfile = await asAnon(db, async tx => {
      const { rows } = await tx.query<{
        r: { found: boolean; checks: Array<Record<string, unknown>> };
      }>(`select public.get_public_property_trust_profile($1) as r`, [
        approvedPropertyId,
      ]);
      return rows[0].r;
    });
    expect(publicProfile.found).toBe(true);
    expect(JSON.stringify(publicProfile)).not.toContain('LAG-998821');

    // Property `trust_label` does NOT claim blanket `Verified by HAMLET` while partial!
    const { rows: partialLabel } = await db.query<{ trust_label: string }>(
      `select trust_label from public.properties where id = $1`,
      [approvedPropertyId],
    );
    expect(partialLabel[0].trust_label).toContain('of 7 trust checks completed');

    // Complete remaining check -> `trust_label` upgrades back to `Verified by HAMLET`
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.admin_review_property_trust_check($1, 'physical_inspection_completed', 'verified', 'On-site inspection completed', 'Passed physical inspection', 'Passed')`,
        [approvedPropertyId],
      );
    });

    const { rows: fullLabel } = await db.query<{ trust_label: string }>(
      `select trust_label from public.properties where id = $1`,
      [approvedPropertyId],
    );
    expect(fullLabel[0].trust_label).toBe('Verified by HAMLET');

    // Verify Sprint Rollback SQL executes cleanly in a savepoint/transaction while preserving core data
    await db.exec(`
      begin;
      drop trigger if exists z2_sync_property_trust_checks on public.properties;
      drop function if exists public.sync_property_trust_checks_from_property();
      drop function if exists public.admin_review_property_trust_check(text, text, text, text, text, text);
      drop function if exists public.get_public_property_trust_profile(text);
      drop table if exists public.property_trust_checks;

      drop function if exists public.respond_to_property_enquiry(uuid, text, text);
      drop function if exists public.confirm_property_availability_now(text, text);
      alter table public.property_enquiries
        drop column if exists partner_response,
        drop column if exists responded_by,
        drop column if exists responded_at;

      drop function if exists public.admin_resolve_caution_deposit_status(text, text, integer, integer, text);
      drop function if exists public.respond_to_caution_damage_claim(text, text);
      drop function if exists public.submit_caution_damage_claim(text, text, integer, jsonb, boolean);
      drop function if exists public.respond_to_property_inspection(uuid, text, text);
      drop function if exists public.submit_property_inspection(text, text, text, text, text, text, text, jsonb);
      drop function if exists public.update_property_caution_policy(text, integer, text, text);
      drop table if exists public.property_inspections;

      drop trigger if exists z1_snapshot_booking_financial_and_deal_terms on public.bookings;
      drop function if exists public.snapshot_booking_financial_and_deal_terms();
      drop function if exists public.get_my_agent_deal_earnings();
      alter table public.bookings
        drop column if exists deal_code_input,
        drop column if exists price_breakdown_snapshot,
        drop column if exists deal_terms_snapshot,
        drop column if exists agreed_agent_deal_payout_ngn,
        drop column if exists agreed_owner_allocation_ngn,
        drop column if exists agent_deal_acceptance_id,
        drop column if exists agent_deal_id;

      drop function if exists public.respond_to_agent_deal(uuid, text);
      drop function if exists public.set_owner_agent_deal_status(uuid, text);
      drop function if exists public.upsert_owner_agent_deal(jsonb);
      alter table public.partner_share_links drop column if exists accepted_deal_id;
      drop policy if exists "Authorised partners and managers read eligible agent deals" on public.agent_deals;
      drop table if exists public.agent_deal_acceptances;
      drop table if exists public.agent_deals;

      drop function if exists public.lookup_partner_by_referral_code(text);
      drop function if exists public.revoke_owner_agent_authorisation(text, uuid, text);
      drop function if exists public.grant_owner_agent_authorisation(text, uuid, text[], timestamptz, text);
      drop table if exists public.property_agent_authorisations;
      drop trigger if exists z1_detect_property_duplicates on public.properties;
      drop function if exists public.detect_property_duplicates_on_write();
      drop function if exists public.review_property_duplicate_flag(uuid, text, text, boolean);
      drop table if exists public.property_duplicate_flags;
      drop trigger if exists z0_enforce_submitter_role_separation on public.property_private_records;
      drop function if exists public.enforce_submitter_role_separation();
      drop trigger if exists a0_assign_hamlet_property_defaults on public.properties;
      drop function if exists public.assign_hamlet_property_defaults();
      rollback;
    `);
  });
});
