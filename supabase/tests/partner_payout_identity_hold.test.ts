import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asServiceRole, asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

const VERIFIED_ALL = { ownership: 'verified', identity: 'verified', authority: 'verified', inspection: 'verified' };

/**
 * Joining the partner network is enough to earn, but a partner payout line may
 * only become 'approved' or 'paid' once the beneficiary is identity-verified
 * (an approved partner application). Until then earnings stay 'pending'.
 */
describe('Partner payouts are held until identity verification', () => {
  let db: PGlite;
  let adminId: string;
  let ownerId: string;
  let agentId: string;
  let agentCode: string;
  let guestId: string;
  let propertyId: string;
  let today: string;

  const addDays = (iso: string, days: number) => {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };

  async function networkMember(email: string, fullName: string, phone: string, role = 'property_owner') {
    const id = await createTestUser(db, { email, fullName, role: 'guest' });
    await asUser(db, id, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3)`, [role, `${fullName} Homes`, phone]),
    );
    const { rows } = await db.query<{ referral_code: string }>(`select referral_code from public.profiles where id = $1`, [id]);
    return { id, code: rows[0].referral_code };
  }

  async function approveApplication(userId: string, fullName: string, email: string) {
    const appId = await asServiceRole(db, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count, motivation
         ) values ($1::uuid, $2, $3, '+2348099990000', 'Verified Stays', 'Closing Agent', array['Ikoyi'], 0,
                   'Closing agent for Ikoyi and Victoria Island stays.')
         returning id`,
        [userId, fullName, email],
      );
      return rows[0].id;
    });
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_application($1::uuid, 'approved', 'Identity verified.')`, [appId]),
    );
  }

  async function booking(reference: string, startOffset: number) {
    return asUser(db, guestId, async tx => {
      const { rows } = await tx.query<{ id: string; guest_total: number; closing_agent_id: string }>(
        `insert into public.bookings (reference, property_id, guest_id, check_in, check_out, guest_count, status, guest_referral_source)
         values ($1, $2, $3::uuid, $4::date, $5::date, 2, 'requested', $6)
         returning id, guest_total, closing_agent_id::text`,
        [reference, propertyId, guestId, addDays(today, startOffset), addDays(today, startOffset + 3), agentCode],
      );
      return rows[0];
    });
  }

  async function confirm(b: { id: string; guest_total: number }, ref: string) {
    await asUser(db, adminId, tx => tx.query(`select public.transition_booking($1, 'awaiting_payment', 'Dates confirmed.')`, [b.id]));
    await asServiceRole(db, tx =>
      tx.query(`select public.confirm_booking_payment_webhook($1, 'Paystack', $2, $3, 0, 'NGN')`, [b.id, ref, b.guest_total]),
    );
  }

  const complete = (bookingId: string) =>
    asUser(db, adminId, tx => tx.query(`select public.transition_booking($1, 'completed', 'Stay completed.')`, [bookingId]));

  const line = async (bookingId: string, recordType: string) =>
    (
      await db.query<{ id: string; payout_status: string; beneficiary_user_id: string | null }>(
        `select id, payout_status, beneficiary_user_id::text from public.booking_payment_records
          where booking_id = $1 and record_type = $2`,
        [bookingId, recordType],
      )
    ).rows[0];

  const setPayout = (entryId: string, next: string) =>
    asUser(db, adminId, tx => tx.query(`select public.update_payout_status($1::uuid, $2, 'Ops payout run')`, [entryId, next]));

  beforeAll(async () => {
    db = await createMigratedTestDb();
    today = (await db.query<{ t: string }>(`select current_date::text as t`)).rows[0].t;
  });

  beforeEach(async () => {
    await resetTestData(db);
    adminId = await createTestUser(db, { email: 'ops@hamlet.test', fullName: 'HAMLET Ops', role: 'admin' });
    guestId = await createTestUser(db, { email: 'guest@hamlet.test', fullName: 'Ngozi Guest', role: 'guest' });
    ({ id: ownerId } = await networkMember('owner@hamlet.test', 'Chidi Owner', '+2348071110001'));
    ({ id: agentId, code: agentCode } = await networkMember('agent@hamlet.test', 'Amaka Agent', '+2348071110002', 'closing_agent'));
    propertyId = await asUser(db, ownerId, async tx => {
      const { rows } = await tx.query<{ id: string }>(
        `select public.submit_partner_property($1::jsonb, $2::jsonb) as id`,
        [
          JSON.stringify({
            title: 'Ikoyi Waterfront Two-Bedroom', property_type: 'Serviced apartment', area: 'Ikoyi',
            public_address: '8 Bourdillon Road, Ikoyi', nightly_rate: 150_000, cleaning_fee: 25_000,
            mandatory_charges: [{ label: 'Cleaning & turnover (mandatory)', amount: 25_000 }],
            refundable_deposit: 100_000, bedrooms: 2, bathrooms: 2, capacity: 4, bed_setup: '2 Queen beds',
            amenities: ['24/7 Power'], image_urls: ['/images/prop/living-1.jpg'], house_rules: ['No smoking'],
          }),
          JSON.stringify({ authority_basis: 'Registered title deed', submitted_role: 'Owner', docs: [] }),
        ],
      );
      return rows[0].id;
    });
    await asUser(db, adminId, tx =>
      tx.query(`select public.review_partner_property($1, 'approved', 'Verified across all four HAMLET pillars.', $2::jsonb)`, [propertyId, JSON.stringify(VERIFIED_ALL)]),
    );
  });

  afterAll(async () => {
    await db.close();
  });

  it('holds an unverified partner commission at completion and refuses admin approval or payment', async () => {
    const b = await booking('HML-HOLD-1', 14);
    expect(b.closing_agent_id).toBe(agentId);
    await confirm(b, 'PSK_HOLD_1');
    await complete(b.id);

    const commission = await line(b.id, 'closing_agent_commission');
    expect(commission).toMatchObject({ payout_status: 'pending', beneficiary_user_id: agentId });
    // HAMLET's own lines (no partner beneficiary) are released as before.
    expect((await line(b.id, 'accommodation_revenue')).payout_status).toBe('approved');

    await expect(setPayout(commission.id, 'approved')).rejects.toThrow(/Complete HAMLET identity verification/);
    await expect(setPayout(commission.id, 'paid')).rejects.toThrow(/Complete HAMLET identity verification/);
    // Withholding or reversing is still possible.
    await setPayout(commission.id, 'withheld');
    expect((await line(b.id, 'closing_agent_commission')).payout_status).toBe('withheld');

    // Direct writes cannot bypass the hold either.
    await asServiceRole(db, tx =>
      tx.query(`update public.booking_payment_records set payout_status = 'paid' where id = $1`, [commission.id]),
    );
    expect((await line(b.id, 'closing_agent_commission')).payout_status).toBe('withheld');
  });

  it('releases held commissions on completed stays when the partner is verified, and only those', async () => {
    const completed = await booking('HML-HOLD-2', 14);
    await confirm(completed, 'PSK_HOLD_2');
    await complete(completed.id);
    const confirmedOnly = await booking('HML-HOLD-3', 30);
    await confirm(confirmedOnly, 'PSK_HOLD_3');

    expect((await line(completed.id, 'closing_agent_commission')).payout_status).toBe('pending');
    expect((await line(confirmedOnly.id, 'closing_agent_commission')).payout_status).toBe('pending');

    await approveApplication(agentId, 'Amaka Agent', 'agent@hamlet.test');

    expect((await line(completed.id, 'closing_agent_commission')).payout_status).toBe('approved');
    // The stay has not happened yet, so its commission stays pending until completion.
    expect((await line(confirmedOnly.id, 'closing_agent_commission')).payout_status).toBe('pending');

    // Once verified, completion approves directly and admins can pay.
    await complete(confirmedOnly.id);
    const later = await line(confirmedOnly.id, 'closing_agent_commission');
    expect(later.payout_status).toBe('approved');
    await setPayout(later.id, 'paid');
    expect((await line(confirmedOnly.id, 'closing_agent_commission')).payout_status).toBe('paid');
  });

  it('holds payouts again for a suspended account', async () => {
    await approveApplication(agentId, 'Amaka Agent', 'agent@hamlet.test');
    const b = await booking('HML-HOLD-4', 14);
    await confirm(b, 'PSK_HOLD_4');
    await db.query(`update public.profiles set account_status = 'suspended' where id = $1`, [agentId]);
    await complete(b.id);
    const commission = await line(b.id, 'closing_agent_commission');
    expect(commission.payout_status).toBe('pending');
    await expect(setPayout(commission.id, 'approved')).rejects.toThrow(/Complete HAMLET identity verification/);
  });

  it('exposes the verification check for the partner workspace', async () => {
    const before = await asUser(db, agentId, tx =>
      tx.query<{ ok: boolean }>(`select public.is_partner_payout_verified($1::uuid) as ok`, [agentId]),
    );
    expect(before.rows[0].ok).toBe(false);
    await approveApplication(agentId, 'Amaka Agent', 'agent@hamlet.test');
    const after = await asUser(db, agentId, tx =>
      tx.query<{ ok: boolean }>(`select public.is_partner_payout_verified($1::uuid) as ok`, [agentId]),
    );
    expect(after.rows[0].ok).toBe(true);
  });
});
