import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asAnon,
  asServiceRole,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATCH_UP_MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    '../migrations/20261119100000_network_partner_referral_and_attribution_catch_up.sql',
  ),
  'utf8',
);

const VERIFIED_ALL = {
  ownership: 'verified',
  identity: 'verified',
  authority: 'verified',
  inspection: 'verified',
};

/**
 * Network partners keep profiles.role = 'guest'; an active
 * partner_network_memberships row is their entitlement. Joining the network is
 * enough for referrals to earn.
 */
describe('Network partner referrals and closing-agent attribution (catch-up)', () => {
  let db: PGlite;
  let adminId: string;
  let guestId: string;
  let today: string;

  const addDays = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  beforeAll(async () => {
    db = await createMigratedTestDb();
    const { rows } = await db.query<{ today: string }>(`select current_date::text as today`);
    today = rows[0].today;
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'ops@hamlet.test', fullName: 'HAMLET Ops', role: 'admin' });
    guestId = await createTestUser(db, { email: 'guest@hamlet.test', fullName: 'Ngozi Guest', role: 'guest' });
  });

  afterAll(async () => {
    await db.close();
  });

  /** A guest account that joins the network (optionally with a referral code). */
  async function networkMember(
    email: string,
    fullName: string,
    phone: string,
    referralCode: string | null = null,
    role = 'property_owner',
  ): Promise<{ id: string; code: string }> {
    const id = await createTestUser(db, { email, fullName, role: 'guest' });
    await asUser(db, id, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3, $4)`, [
        role,
        `${fullName} Homes`,
        phone,
        referralCode,
      ]),
    );
    const { rows } = await db.query<{ role: string; referral_code: string }>(
      `select role, referral_code from public.profiles where id = $1`,
      [id],
    );
    expect(rows[0].role).toBe('guest');
    return { id, code: rows[0].referral_code };
  }

  async function approvedProperty(ownerId: string, title: string): Promise<string> {
    const id = await asUser(db, ownerId, async tx => {
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
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 25_000 }],
            refundable_deposit: 100_000,
            bedrooms: 2,
            bathrooms: 2,
            capacity: 4,
            bed_setup: '2 Queen beds',
            amenities: ['24/7 Power'],
            image_urls: ['/images/prop/living-1.jpg'],
            house_rules: ['No smoking'],
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
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', $2, $3::jsonb)`, [
        id,
        'Verified across all four HAMLET pillars.',
        JSON.stringify(VERIFIED_ALL),
      ]),
    );
    return id;
  }

  async function requestBooking(
    propertyId: string,
    reference: string,
    startOffset: number,
    extra: { closingAgentId?: string; referralSource?: string; shareSessionKey?: string } = {},
  ) {
    return asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{
        id: string;
        guest_total: number;
        closing_agent_id: string | null;
        closing_agent_commission_ngn: number;
        direct_referrer_id: string | null;
        share_partner_id: string | null;
      }>(
        `insert into public.bookings (
           reference, property_id, guest_id, check_in, check_out, guest_count, status,
           closing_agent_id, guest_referral_source, share_session_key
         )
         values ($1, $2, $3::uuid, $4::date, $5::date, 2, 'requested', $6::uuid, $7, $8)
         returning id, guest_total, closing_agent_id::text, closing_agent_commission_ngn,
                   direct_referrer_id::text, share_partner_id::text`,
        [
          reference,
          propertyId,
          guestId,
          addDays(today, startOffset),
          addDays(today, startOffset + 3),
          extra.closingAgentId ?? null,
          extra.referralSource ?? null,
          extra.shareSessionKey ?? null,
        ],
      );
      return rows[0];
    });
  }

  async function completeBooking(bookingId: string, guestTotal: number, providerRef: string) {
    await asUser(db, adminId, tx =>
      tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Dates confirmed.')`, [bookingId]),
    );
    await asServiceRole(db, tx =>
      tx.query(
        `select public.confirm_booking_payment_webhook($1, 'Paystack', $2, $3, 0, 'NGN')`,
        [bookingId, providerRef, guestTotal],
      ),
    );
    await asUser(db, adminId, tx =>
      tx.query(`select public.transition_booking($1, 'completed', 'Stay completed cleanly.')`, [bookingId]),
    );
  }

  async function referralState(referredId: string) {
    const { rows } = await db.query<{ status: string; activated: boolean }>(
      `select status, activated_at is not null as activated from public.partner_referrals where referred_partner_id = $1`,
      [referredId],
    );
    return rows[0];
  }

  async function rewardFor(bookingId: string) {
    const { rows } = await db.query<{ reward_amount_ngn: number; payout_status: string; referrer_partner_id: string }>(
      `select reward_amount_ngn, payout_status, referrer_partner_id::text
         from public.partner_referral_rewards where booking_id = $1`,
      [bookingId],
    );
    return rows[0];
  }

  it('keeps a network member as closing agent from a share link or HML- referral code', async () => {
    const owner = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348011110001');
    const agent = await networkMember('agent@hamlet.test', 'Amaka Agent', '+2348011110002', null, 'closing_agent');
    const propertyId = await approvedProperty(owner.id, 'Ikoyi Waterfront Two-Bedroom');

    // Share link -> visit -> booking.
    const share = await asUser(db, agent.id, async tx => {
      const { rows } = await tx.query<{ payload: { share_token: string } }>(
        `select public.record_partner_share_action($1, 'link_copied', '{}'::jsonb, null) as payload`,
        [propertyId],
      );
      return rows[0].payload;
    });
    const sessionKey = 'vsess_network_member_0001';
    await asAnon(db, tx =>
      tx.query(`select public.record_share_link_visit($1, $2, 'visit_idem_net_1')`, [share.share_token, sessionKey]),
    );
    const viaShare = await requestBooking(propertyId, 'HML-NET-SHARE', 14, { shareSessionKey: sessionKey });
    expect(viaShare.share_partner_id).toBe(agent.id);
    expect(viaShare.closing_agent_id).toBe(agent.id);
    // 10% of the 450,000 owner base for 3 nights.
    expect(viaShare.closing_agent_commission_ngn).toBe(45_000);

    // HML- referral code on the booking request.
    const viaCode = await requestBooking(propertyId, 'HML-NET-CODE', 30, { referralSource: agent.code });
    expect(viaCode.closing_agent_id).toBe(agent.id);
    expect(viaCode.closing_agent_commission_ngn).toBe(45_000);

    // A suspended membership no longer qualifies.
    await db.query(`update public.partner_network_memberships set status = 'suspended' where user_id = $1`, [agent.id]);
    const afterSuspension = await requestBooking(propertyId, 'HML-NET-SUSP', 50, { referralSource: agent.code });
    expect(afterSuspension.closing_agent_id).toBeNull();
    expect(afterSuspension.closing_agent_commission_ngn).toBe(0);
  });

  it('pays the referrer of a network-member property partner on completed stays (registered referral activates)', async () => {
    const referrer = await networkMember('referrer@hamlet.test', 'Bisi Referrer', '+2348022220001');
    const owner = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348022220002', referrer.code);
    expect(await referralState(owner.id)).toEqual({ status: 'registered', activated: false });

    const propertyId = await approvedProperty(owner.id, 'Lekki Garden Loft');

    const first = await requestBooking(propertyId, 'HML-NET-REF-1', 14);
    await completeBooking(first.id, first.guest_total, 'PSK_NET_REF_1');
    expect(await referralState(owner.id)).toEqual({ status: 'active', activated: true });
    expect(await rewardFor(first.id)).toEqual({
      reward_amount_ngn: 0,
      payout_status: 'activated_no_payout',
      referrer_partner_id: referrer.id,
    });

    const second = await requestBooking(propertyId, 'HML-NET-REF-2', 20);
    await completeBooking(second.id, second.guest_total, 'PSK_NET_REF_2');
    // 2.5% of the 450,000 owner base.
    expect(await rewardFor(second.id)).toEqual({
      reward_amount_ngn: 11_250,
      payout_status: 'pending',
      referrer_partner_id: referrer.id,
    });
    const ledger = await db.query<{ amount: number; beneficiary_user_id: string }>(
      `select amount, beneficiary_user_id::text from public.booking_payment_records
        where booking_id = $1 and record_type = 'referral_reward'`,
      [second.id],
    );
    expect(ledger.rows).toEqual([{ amount: 11_250, beneficiary_user_id: referrer.id }]);
  });

  it('activates and pays registered closing-agent referrals in transition_booking', async () => {
    const owner = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348033330001');
    const referrer = await networkMember('referrer@hamlet.test', 'Bisi Referrer', '+2348033330002');
    const agent = await networkMember('agent@hamlet.test', 'Amaka Agent', '+2348033330003', referrer.code, 'closing_agent');
    const propertyId = await approvedProperty(owner.id, 'Victoria Island Studio');
    expect(await referralState(agent.id)).toEqual({ status: 'registered', activated: false });

    const first = await requestBooking(propertyId, 'HML-NET-CA-1', 14, { referralSource: agent.code });
    expect(first.closing_agent_id).toBe(agent.id);
    expect(first.direct_referrer_id).toBe(referrer.id);
    await completeBooking(first.id, first.guest_total, 'PSK_NET_CA_1');
    expect(await referralState(agent.id)).toEqual({ status: 'active', activated: true });
    expect((await rewardFor(first.id)).payout_status).toBe('activated_no_payout');

    const second = await requestBooking(propertyId, 'HML-NET-CA-2', 20, { referralSource: agent.code });
    await completeBooking(second.id, second.guest_total, 'PSK_NET_CA_2');
    expect(await rewardFor(second.id)).toEqual({
      reward_amount_ngn: 11_250,
      payout_status: 'pending',
      referrer_partner_id: referrer.id,
    });
  });

  it('records, preserves and verifies partner-application referrals from network members', async () => {
    const referrer = await networkMember('referrer@hamlet.test', 'Bisi Referrer', '+2348044440001');
    const applicantId = await createTestUser(db, { email: 'applicant@hamlet.test', fullName: 'Tobi Applicant', role: 'guest' });

    const appId = await asUser(db, applicantId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count,
           motivation, referred_by_code
         ) values ($1::uuid, 'Tobi Applicant', 'applicant@hamlet.test', '+2348044440002', 'Tobi Stays',
                   'Property Owner', array['Yaba'], 1,
                   'Two serviced apartments in Yaba ready for HAMLET guests.', $2)
         returning id`,
        [applicantId, referrer.code],
      );
      return rows[0].id;
    });
    // Joining is enough: the referral is recorded at submission.
    expect(await referralState(applicantId)).toEqual({ status: 'registered', activated: false });

    // Changing to another partner's code is blocked by the update-time validator.
    const other = await networkMember('other@hamlet.test', 'Other Partner', '+2348044440003');
    await expect(
      asServiceRole(db, tx =>
        tx.query(`update public.partner_applications set referred_by_code = $2 where id = $1`, [appId, other.code]),
      ),
    ).rejects.toThrow(/already has a recorded direct referring partner/);

    // Resubmission keeps the attribution even after the referrer is suspended.
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_application($1, 'needs_correction', 'Add your Yaba addresses.')`, [appId]),
    );
    await db.query(`update public.partner_network_memberships set status = 'suspended' where user_id = $1`, [referrer.id]);
    await asUser(db, applicantId, tx =>
      tx.query(`select public.resubmit_partner_application($1, $2::jsonb)`, [
        appId,
        JSON.stringify({
          full_name: 'Tobi Applicant',
          phone: '+2348044440002',
          company: 'Tobi Stays',
          role: 'Property Owner',
          areas: ['Yaba'],
          properties_count: 2,
          motivation: 'Two serviced apartments in Yaba with verified addresses.',
          referred_by_code: other.code,
        }),
      ]),
    );
    const resubmitted = await db.query<{ referred_by_partner_id: string; status: string }>(
      `select referred_by_partner_id::text, status from public.partner_applications where id = $1`,
      [appId],
    );
    expect(resubmitted.rows[0]).toEqual({ referred_by_partner_id: referrer.id, status: 'pending' });

    // Approval marks a registered referral verified, but never downgrades an active one.
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_application($1, 'approved', 'Documents verified.')`, [appId]),
    );
    expect((await referralState(applicantId)).status).toBe('verified');
  });

  it('lets network members list and share approved properties', async () => {
    const owner = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348055550001');
    const agent = await networkMember('agent@hamlet.test', 'Amaka Agent', '+2348055550002', null, 'closing_agent');
    const propertyId = await approvedProperty(owner.id, 'Ikeja GRA Duplex');

    const listed = await asUser(db, agent.id, async tx => {
      const { rows } = await tx.query<{ items: Array<{ id: string }> }>(
        `select public.list_partner_shareable_properties() as items`,
      );
      return rows[0].items;
    });
    expect(listed.map(p => p.id)).toContain(propertyId);

    const canShare = await db.query<{ ok: boolean }>(
      `select public.can_partner_share_property($1, $2::uuid) as ok`,
      [propertyId, agent.id],
    );
    expect(canShare.rows[0].ok).toBe(true);

    // A plain guest without a membership still cannot.
    const plain = await db.query<{ ok: boolean }>(
      `select public.can_partner_share_property($1, $2::uuid) as ok`,
      [propertyId, guestId],
    );
    expect(plain.rows[0].ok).toBe(false);
  });

  it('patches production-shaped booking functions, is idempotent, and fails loudly on unknown shapes', async () => {
    const defs = async () => {
      const { rows } = await db.query<{ tb: string; eb: string }>(
        `select pg_get_functiondef('public.transition_booking(text,text,text)'::regprocedure) as tb,
                pg_get_functiondef('public.enforce_booking_request_integrity()'::regprocedure) as eb`,
      );
      return rows[0];
    };
    const patched = await defs();
    const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, '');

    // Rebuild the pre-catch-up production shape: original checks, comments stripped.
    const memberClause = /and \(\s*p\.role in \('partner', 'admin'\)\s*or exists \(\s*select 1 from public\.partner_network_memberships m\s*where m\.user_id = p\.id and m\.status = 'active'\s*\)\s*\)/g;
    await db.exec(
      stripComments(
        patched.tb.replace(
          "ref_row.status in ('registered', 'verified') and ref_row.activated_at is null",
          "ref_row.status = 'verified' and ref_row.activated_at is null",
        ),
      ),
    );
    await db.exec(
      stripComments(
        patched.eb
          .replace(memberClause, "and p.role in ('partner', 'admin')")
          .replace("pr.status in ('registered', 'verified', 'active')", "pr.status in ('verified', 'active')"),
      ),
    );
    const legacy = await defs();
    expect(legacy.tb).not.toContain("'registered', 'verified'");
    expect(legacy.eb).not.toContain('partner_network_memberships');

    await db.exec(CATCH_UP_MIGRATION);
    const repatched = await defs();
    expect(repatched.tb).toContain("ref_row.status in ('registered', 'verified') and ref_row.activated_at is null");
    expect(repatched.eb).toContain('partner_network_memberships');
    expect(repatched.eb).toContain("pr.status in ('registered', 'verified', 'active')");

    // Re-running changes nothing.
    await db.exec(CATCH_UP_MIGRATION);
    expect(await defs()).toEqual(repatched);

    // An unrecognised shape stops the migration instead of skipping silently.
    await db.exec(
      repatched.tb.replace(
        "ref_row.status in ('registered', 'verified') and ref_row.activated_at is null",
        "ref_row.status = any (array['verified']) and ref_row.activated_at is null",
      ),
    );
    await expect(db.exec(CATCH_UP_MIGRATION)).rejects.toThrow(/closing-agent referral activation check not recognised/);
  });
});
