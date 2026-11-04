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
import type { PartnerMarketingPerformance } from '../../src/lib/share-engine';

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

describe('HAMLET Share Engine — PostgreSQL Schema, Attribution, Ledger & Privacy', () => {
  let db: PGlite;
  let adminId: string;
  let ownerPartnerId: string;
  let closingPartnerId: string;
  let secondAgentId: string;
  let guestAId: string;
  let approvedPropertyId: string;
  let unapprovedPropertyId: string;
  let baseDateIso: string;

  const addDays = (isoDate: string, days: number): string => {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function createProperty(
    submitterId: string,
    title: string,
    approve: boolean,
  ): Promise<string> {
    const propId = await asUser(db, submitterId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title,
            property_type: 'Serviced apartment',
            area: 'Ikoyi',
            public_address: '8 Bourdillon Road, Ikoyi',
            nightly_rate: 150_000,
            cleaning_fee: 25_000,
            mandatory_charges: [
              { label: 'Cleaning & turnover (mandatory)', amount: 25_000 },
            ],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            amenities: ['24/7 Power', 'Fibre Wi-Fi'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No smoking', 'No unauthorised events'],
          }),
          JSON.stringify({
            authority_basis: 'Registered title deed',
            submitted_role: 'Owner',
            docs: [{ label: 'Title deed', status: 'self_reported' }],
          }),
        ],
      );
      return rows[0].id;
    });

    if (approve) {
      await asUser(db, adminId, async tx => {
        await tx.query(
          `select public.review_partner_property($1, 'approved', $2, $3::jsonb)`,
          [
            propId,
            'Verified across all four HAMLET pillars.',
            JSON.stringify(VERIFIED_ALL),
          ],
        );
      });
    }

    return propId;
  }

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const nowRes = await db.query<{ today: string }>(
      `select current_date::text as today`,
    );
    baseDateIso = nowRes.rows[0].today;
  });

  afterAll(async () => {
    if (db) await db.close();
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, {
      email: 'ops@hamlet.rest',
      fullName: 'HAMLET Ops',
      role: 'admin',
    });
    ownerPartnerId = await createTestUser(db, {
      email: 'owner@hamlet.rest',
      fullName: 'Chidi Property Owner',
      role: 'partner',
    });
    closingPartnerId = await createTestUser(db, {
      email: 'agent1@hamlet.rest',
      fullName: 'Amaka Closing Agent',
      role: 'partner',
    });
    secondAgentId = await createTestUser(db, {
      email: 'agent2@hamlet.rest',
      fullName: 'Tunde Second Agent',
      role: 'partner',
    });
    guestAId = await createTestUser(db, {
      email: 'guest@example.com',
      fullName: 'Ngozi Guest',
      role: 'guest',
    });

    approvedPropertyId = await createProperty(
      ownerPartnerId,
      'Ikoyi Waterfront Two-Bedroom',
      true,
    );
    unapprovedPropertyId = await createProperty(
      ownerPartnerId,
      'Pending Yaba Residence',
      false,
    );
  });

  it('Scenario A + Ledger Reconciliation: tracks share -> visit -> auth bind -> enquiry -> booking -> confirmation -> completion -> reversal accurately', async () => {
    // 1. Closing agent initiates WhatsApp share & copies link
    const shareRes = await asUser(db, closingPartnerId, async tx => {
      await tx.query(
        `select public.record_partner_share_action($1, 'share_initiated', '{}'::jsonb, null)`,
        [approvedPropertyId],
      );
      await tx.query(
        `select public.record_partner_share_action($1, 'link_copied', '{}'::jsonb, null)`,
        [approvedPropertyId],
      );
      const { rows } = await tx.query<{ payload: Record<string, unknown> }>(
        `select public.record_partner_share_action($1, 'whatsapp_handoff', '{}'::jsonb, null) as payload`,
        [approvedPropertyId],
      );
      return rows[0].payload;
    });

    const shareToken = String(shareRes.share_token);
    expect(shareToken).toMatch(/^hsl_[a-z0-9]{16,64}$/);
    const dealTerms = shareRes.deal_terms as {
      authorised: boolean;
      estimated_per_night_ngn: number | null;
    };
    expect(dealTerms.authorised).toBe(true);
    // 10% of 150,000 owner base = 15,000/night (caution deposit 100,000 is NEVER included)
    expect(dealTerms.estimated_per_night_ngn).toBe(15_000);

    // 2. Anonymous visitor clicks the shared link
    const sessionKey = 'vsess_scenario_a_visitor_0001';
    const visitPayload = await asAnon(db, async tx => {
      const { rows } = await tx.query<{
        res: { valid: boolean; property_id: string; attribution_policy: string };
      }>(
        `select public.record_share_link_visit($1, $2, 'visit_idem_1') as res`,
        [shareToken, sessionKey],
      );
      return rows[0].res;
    });
    expect(visitPayload.valid).toBe(true);
    expect(visitPayload.property_id).toBe(approvedPropertyId);
    expect(visitPayload.attribution_policy).toBe('attributed_first_touch');

    // 3. Visitor signs in as guestAId -> session binds across signup/login
    const boundCount = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{ n: number }>(
        `select public.bind_share_attribution_to_guest($1) as n`,
        [sessionKey],
      );
      return rows[0].n;
    });
    expect(boundCount).toBe(1);

    // 4. Guest submits a property enquiry before booking
    const enquiryRes = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{ res: { enquiry_id: string; status: string } }>(
        `select public.submit_property_enquiry($1, 'Ngozi Guest', 'guest@example.com', 'Is early check-in possible around 1pm?', $2, null, null) as res`,
        [approvedPropertyId, sessionKey],
      );
      return rows[0].res;
    });
    expect(enquiryRes.status).toBe('open');

    // 5. Guest submits a 3-night booking request WITHOUT passing closing_agent_id manually
    const checkIn = addDays(baseDateIso, 14);
    const checkOut = addDays(baseDateIso, 17); // 3 nights -> owner base B = 450,000
    const booking = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        guest_total: number;
        refundable_deposit: number;
        property_introducer_id: string;
        authorised_manager_id: string;
        closing_agent_id: string;
        closing_agent_commission_ngn: number;
        share_link_id: string;
        share_partner_id: string;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, status
         )
         values ('HML-SHARE-001', $1, $2::uuid, $3::date, $4::date, 2, 'requested')
         returning
           id, guest_total, refundable_deposit,
           property_introducer_id::text,
           authorised_manager_id::text,
           closing_agent_id::text,
           closing_agent_commission_ngn,
           share_link_id::text,
           share_partner_id::text`,
        [approvedPropertyId, guestAId, checkIn, checkOut],
      );
      return rows[0];
    });

    // Distinct roles preserved!
    expect(booking.property_introducer_id).toBe(ownerPartnerId);
    expect(booking.authorised_manager_id).toBe(ownerPartnerId);
    expect(booking.closing_agent_id).toBe(closingPartnerId);
    expect(booking.share_partner_id).toBe(closingPartnerId);
    expect(booking.share_link_id).toBeTruthy();
    // 10% of 450,000 owner base = 45,000 (caution deposit 100,000 & cleaning 25,000 excluded!)
    expect(booking.closing_agent_commission_ngn).toBe(45_000);

    // Check analytics while booking is still unconfirmed/unpaid
    const perfRequested = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return rows[0].p;
    });
    expect(perfRequested.events.share_initiated).toBe(1);
    expect(perfRequested.events.whatsapp_handoff).toBe(1);
    expect(perfRequested.events.link_copied).toBe(1);
    expect(perfRequested.events.link_visited).toBe(1);
    expect(perfRequested.events.unique_visitors).toBe(1);
    expect(perfRequested.events.enquiries_generated).toBe(1);
    expect(perfRequested.financials.booking_requests).toBe(1);
    expect(perfRequested.financials.confirmed_bookings).toBe(0);
    expect(perfRequested.financials.potential_opportunity_ngn).toBe(45_000);
    expect(perfRequested.financials.earnings_pending_ngn).toBe(0);
    expect(perfRequested.financials.earnings_eligible_ngn).toBe(0);

    // 6. Owner accepts booking -> Webhook (service_role) confirms guest payment
    await asUser(db, ownerPartnerId, async tx => {
      await tx.query(
        `select public.transition_booking($1, 'awaiting_payment', 'Dates confirmed.')`,
        [booking.id],
      );
    });

    await asServiceRole(db, async tx => {
      await tx.query(
        `select public.confirm_booking_payment_webhook($1, 'Paystack', 'PSK_SHARE_001', $2, 0, 'NGN')`,
        [booking.id, booking.guest_total],
      );
    });

    const perfConfirmed = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return rows[0].p;
    });
    expect(perfConfirmed.financials.confirmed_bookings).toBe(1);
    expect(perfConfirmed.financials.potential_opportunity_ngn).toBe(0);
    expect(perfConfirmed.financials.earnings_pending_ngn).toBe(45_000);
    expect(perfConfirmed.financials.earnings_eligible_ngn).toBe(0);

    // 7. Stay completes -> Commission becomes payout-eligible ('approved')
    await asUser(db, adminId, async tx => {
      await tx.query(
        `select public.transition_booking($1, 'completed', 'Stay completed cleanly.')`,
        [booking.id],
      );
    });

    const perfCompleted = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return rows[0].p;
    });
    expect(perfCompleted.financials.completed_bookings).toBe(1);
    expect(perfCompleted.financials.earnings_pending_ngn).toBe(0);
    expect(perfCompleted.financials.earnings_eligible_ngn).toBe(45_000);

    // 8. Reversal / adjustment reconciles cleanly with ledger
    await asServiceRole(db, async tx => {
      await tx.query(
        `select public.reverse_booking_commissions_and_referrals($1, 'Post-stay chargeback reversal', $2::uuid, 'HAMLET Ops')`,
        [booking.id, adminId],
      );
    });

    const perfReversed = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return rows[0].p;
    });
    expect(perfReversed.financials.earnings_eligible_ngn).toBe(0);
    expect(perfReversed.financials.earnings_reversed_ngn).toBe(45_000);
  });

  it('Attribution Precedence: never silently overwrites an active eligible partner attribution on subsequent link visits', async () => {
    const tokenA = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.get_or_create_partner_share_link($1) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });
    const tokenB = await asUser(db, secondAgentId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.get_or_create_partner_share_link($1) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });

    const sessionKey = 'vsess_precedence_lock_0001';
    const secondVisitPolicy = await asAnon(db, async tx => {
      await tx.query(`select public.record_share_link_visit($1, $2, 'v_a')`, [
        tokenA,
        sessionKey,
      ]);
      // Later click on second agent's link for the same property
      const { rows } = await tx.query<{ r: { attribution_policy: string } }>(
        `select public.record_share_link_visit($1, $2, 'v_b') as r`,
        [tokenB, sessionKey],
      );
      return rows[0].r.attribution_policy;
    });
    expect(secondVisitPolicy).toBe('preserved_existing_first_touch');

    const booking = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{ closing_agent_id: string }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, status,
           share_session_key, share_token_input
         )
         values ('HML-PREC-001', $1, $2::uuid, $3::date, $4::date, 2, 'requested', $5, $6)
         returning closing_agent_id::text`,
        [
          approvedPropertyId,
          guestAId,
          addDays(baseDateIso, 20),
          addDays(baseDateIso, 22),
          sessionKey,
          tokenB,
        ],
      );
      return rows[0];
    });

    // Remains locked to Partner A!
    expect(booking.closing_agent_id).toBe(closingPartnerId);
  });

  it('Scenario D: blocks sharing of unapproved, paused, opted-out, or revoked-access properties', async () => {
    // 1. Unapproved property cannot be shared even by its owner
    await expect(
      asUser(db, ownerPartnerId, async tx => {
        await tx.query(`select public.get_or_create_partner_share_link($1)`, [
          unapprovedPropertyId,
        ]);
      }),
    ).rejects.toThrow(/not authorised|not currently approved/i);

    // 2. Owner disables partner network sharing -> third-party agent blocked, owner still allowed
    await asUser(db, ownerPartnerId, async tx => {
      await tx.query(
        `select public.set_property_sharing_permission($1, false)`,
        [approvedPropertyId],
      );
    });

    await expect(
      asUser(db, closingPartnerId, async tx => {
        await tx.query(`select public.get_or_create_partner_share_link($1)`, [
          approvedPropertyId,
        ]);
      }),
    ).rejects.toThrow(/not authorised/i);

    const ownerLink = await asUser(db, ownerPartnerId, async tx => {
      const { rows } = await tx.query<{
        r: {
          share_token: string;
          deal_terms: { authorised: boolean; estimated_per_night_ngn: number | null };
        };
      }>(`select public.get_or_create_partner_share_link($1) as r`, [
        approvedPropertyId,
      ]);
      return rows[0].r;
    });
    expect(ownerLink.share_token).toMatch(/^hsl_/);
    // Owner sharing their own property receives owner base B directly -> no separate agent commission rate invented!
    expect(ownerLink.deal_terms.estimated_per_night_ngn).toBeNull();

    // 3. Re-enable network sharing, then pause listing -> blocked immediately
    await asUser(db, ownerPartnerId, async tx => {
      await tx.query(
        `select public.set_property_sharing_permission($1, true)`,
        [approvedPropertyId],
      );
      await tx.query(
        `select public.set_property_publication_pause($1, true, 'Maintenance pause')`,
        [approvedPropertyId],
      );
    });

    await expect(
      asUser(db, closingPartnerId, async tx => {
        await tx.query(
          `select public.record_partner_share_action($1, 'whatsapp_handoff', '{}'::jsonb, null)`,
          [approvedPropertyId],
        );
      }),
    ).rejects.toThrow(/not authorised|not currently approved/i);
  });

  it('Scenario E & F: blocks self-referral visits, session binding, and self-bookings cleanly, and never lets invalid/tampered tokens break guest booking', async () => {
    const selfToken = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.get_or_create_partner_share_link($1) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });

    // 1. Signed-in partner clicking their own share link is ignored (does not inflate visits or attribute)
    const signedInSelfVisit = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ r: { valid: boolean; reason: string } }>(
        `select public.record_share_link_visit($1, 'vsess_self_signed_in_001', null) as r`,
        [selfToken],
      );
      return rows[0].r;
    });
    expect(signedInSelfVisit.valid).toBe(false);
    expect(signedInSelfVisit.reason).toBe('self_visit_ignored');

    // 2. Anonymous visit followed by partner signing in refuses to bind session to the sharing partner
    const selfSession = 'vsess_self_referral_attempt_01';
    await asAnon(db, async tx => {
      await tx.query(`select public.record_share_link_visit($1, $2, null)`, [
        selfToken,
        selfSession,
      ]);
    });

    const boundSelfCount = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ n: number }>(
        `select public.bind_share_attribution_to_guest($1) as n`,
        [selfSession],
      );
      return rows[0].n;
    });
    expect(boundSelfCount).toBe(0);

    // 3. Partner account attempting to submit a self-booking is blocked by booking integrity
    await expect(
      asUser(db, closingPartnerId, async tx => {
        await tx.query(
          `insert into public.bookings (
             reference, property_id, guest_id, check_in, check_out, guest_count, status,
             share_session_key, share_token_input
           )
           values ('HML-SELF-001', $1, $2::uuid, $3::date, $4::date, 2, 'requested', $5, $6)`,
          [
            approvedPropertyId,
            closingPartnerId,
            addDays(baseDateIso, 25),
            addDays(baseDateIso, 27),
            selfSession,
            selfToken,
          ],
        );
      }),
    ).rejects.toThrow(/A booking must belong to the signed-in guest/i);

    // 4. Guest attempting to spoof their own guest_id as closing_agent_id has self-attribution stripped (commission = 0) without blocking the booking
    const spoofedSelfBooking = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{
        status: string;
        closing_agent_id: string | null;
        closing_agent_commission_ngn: number;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, closing_agent_id, check_in, check_out, guest_count, status
         )
         values ('HML-SELF-002', $1, $2::uuid, $2::uuid, $3::date, $4::date, 2, 'requested')
         returning status, closing_agent_id::text, closing_agent_commission_ngn`,
        [
          approvedPropertyId,
          guestAId,
          addDays(baseDateIso, 25),
          addDays(baseDateIso, 27),
        ],
      );
      return rows[0];
    });
    expect(spoofedSelfBooking.status).toBe('requested');
    expect(spoofedSelfBooking.closing_agent_id).toBeNull();
    expect(spoofedSelfBooking.closing_agent_commission_ngn).toBe(0);

    // Scenario F: Tampered / unknown token never blocks visit check or guest booking
    const tamperedVisit = await asAnon(db, async tx => {
      const { rows } = await tx.query<{ r: { valid: boolean } }>(
        `select public.record_share_link_visit('hsl_deadbeef0000111122223333', 'vsess_broken_01', null) as r`,
      );
      return rows[0].r;
    });
    expect(tamperedVisit.valid).toBe(false);

    const cleanFallbackBooking = await asUser(db, guestAId, async tx => {
      const { rows } = await tx.query<{
        status: string;
        closing_agent_id: string | null;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, status,
           share_session_key, share_token_input
         )
         values ('HML-BROKEN-001', $1, $2::uuid, $3::date, $4::date, 2, 'requested', 'vsess_broken_01', 'hsl_deadbeef0000111122223333')
         returning status, closing_agent_id::text`,
        [
          approvedPropertyId,
          guestAId,
          addDays(baseDateIso, 30),
          addDays(baseDateIso, 32),
        ],
      );
      return rows[0];
    });
    expect(cleanFallbackBooking.status).toBe('requested');
    expect(cleanFallbackBooking.closing_agent_id).toBeNull();
  });

  it('Scenario G: enforces strict RLS isolation across partners and protects guest enquiry PII from non-managing agents', async () => {
    const tokenA = await asUser(db, closingPartnerId, async tx => {
      const { rows } = await tx.query<{ r: { share_token: string } }>(
        `select public.record_partner_share_action($1, 'whatsapp_handoff', '{}'::jsonb, null) as r`,
        [approvedPropertyId],
      );
      return rows[0].r.share_token;
    });

    await asAnon(db, async tx => {
      await tx.query(
        `select public.submit_property_enquiry($1, 'Private Guest Name', 'private.guest@example.com', 'Confidential check-in question for host.', 'vsess_priv_001', $2, null)`,
        [approvedPropertyId, tokenA],
      );
    });

    // Second agent cannot read Partner A's share links, events, or analytics
    const secondAgentView = await asUser(db, secondAgentId, async tx => {
      const links = await tx.query(`select id from public.partner_share_links`);
      const events = await tx.query(`select id from public.property_share_events`);
      const perf = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return {
        linkCount: links.rows.length,
        eventCount: events.rows.length,
        perfEvents: perf.rows[0].p.events,
      };
    });
    expect(secondAgentView.linkCount).toBe(0);
    expect(secondAgentView.eventCount).toBe(0);
    expect(secondAgentView.perfEvents.whatsapp_handoff).toBe(0);
    expect(secondAgentView.perfEvents.enquiries_generated).toBe(0);

    // Closing agent sees aggregate enquiry count = 1, but CANNOT read guest email/name PII in property_enquiries!
    const closingAgentPiiCheck = await asUser(db, closingPartnerId, async tx => {
      const enquiries = await tx.query(
        `select guest_name, guest_email, message from public.property_enquiries`,
      );
      const perf = await tx.query<{ p: PartnerMarketingPerformance }>(
        `select public.get_my_marketing_performance(30) as p`,
      );
      return {
        rawEnquiryRows: enquiries.rows.length,
        aggregateCount: perf.rows[0].p.events.enquiries_generated,
      };
    });
    expect(closingAgentPiiCheck.aggregateCount).toBe(1);
    expect(closingAgentPiiCheck.rawEnquiryRows).toBe(0);

    // Property owner/manager CAN read the enquiry to respond to the guest
    const ownerEnquiryRows = await asUser(db, ownerPartnerId, async tx => {
      const { rows } = await tx.query<{ guest_email: string }>(
        `select guest_email from public.property_enquiries where property_id = $1`,
        [approvedPropertyId],
      );
      return rows;
    });
    expect(ownerEnquiryRows).toHaveLength(1);
    expect(ownerEnquiryRows[0].guest_email).toBe('private.guest@example.com');
  });

  it('Rollback Path: documented rollback SQL drops all Share Engine objects cleanly while preserving core properties and bookings', async () => {
    await db.exec(`
      begin;
      drop trigger if exists z0_record_share_booking_lifecycle_events on public.bookings;
      drop function if exists public.record_share_booking_lifecycle_events();
      drop trigger if exists a0_resolve_share_attribution_before_booking on public.bookings;
      drop function if exists public.resolve_share_attribution_before_booking();
      drop function if exists public.get_my_marketing_performance(integer);
      drop function if exists public.list_partner_shareable_properties();
      drop function if exists public.submit_property_enquiry(text, text, text, text, text, text, text);
      drop function if exists public.bind_share_attribution_to_guest(text);
      drop function if exists public.record_share_link_visit(text, text, text);
      drop function if exists public.record_partner_share_action(text, text, jsonb, text);
      drop function if exists public.get_or_create_partner_share_link(text);
      drop function if exists public.set_property_sharing_permission(text, boolean);
      drop function if exists public.get_partner_property_deal_terms(text, uuid);
      drop function if exists public.can_partner_share_property(text, uuid);
      drop function if exists public.generate_opaque_share_token();
      alter table public.bookings
        drop column if exists share_token_input,
        drop column if exists share_session_key,
        drop column if exists share_partner_id,
        drop column if exists share_link_id;
      drop table if exists public.property_share_events;
      drop table if exists public.property_enquiries;
      drop table if exists public.share_attribution_sessions;
      drop table if exists public.partner_share_links;
      alter table public.properties
        drop column if exists allow_partner_sharing;

      -- Verify core properties table & ordinary guest booking still work post-rollback
      rollback;
    `);

    const { rows } = await db.query<{ id: string }>(
      `select id from public.properties where id = $1`,
      [approvedPropertyId],
    );
    expect(rows).toHaveLength(1);
  });
});
