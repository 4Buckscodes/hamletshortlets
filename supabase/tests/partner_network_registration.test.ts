import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asAnon,
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

describe('Immediate Partner Network Registration & Admin Moderation RPCs', () => {
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

  it('provisions an active partner membership from partner signup metadata before the first dashboard request', async () => {
    const partnerId = await createTestUser(db, {
      email: 'instant-owner@hamlet.test',
      partnerSignup: {
        role: 'property_owner',
      },
    });

    const result = await db.query<{
      profile_role: string;
      membership_role: string;
      company: string;
      phone: string | null;
      status: string;
    }>(
      `select p.role as profile_role, m.primary_role as membership_role,
              m.company, m.phone, m.status
       from public.profiles p
       join public.partner_network_memberships m on m.user_id = p.id
       where p.id = $1`,
      [partnerId],
    );

    expect(result.rows[0]).toEqual({
      profile_role: 'guest',
      membership_role: 'property_owner',
      company: 'HAMLET Partner',
      phone: null,
      status: 'active',
    });

    const access = await asUser(db, partnerId, tx =>
      tx.query<{ guest_access: boolean; partner_access: boolean; can_submit: boolean }>(
        `select public.has_role('guest') as guest_access,
                public.has_role('partner') as partner_access,
                public.can_submit_partner_property() as can_submit`,
      ),
    );
    expect(access.rows[0]).toEqual({
      guest_access: true,
      partner_access: true,
      can_submit: true,
    });
  });

  it('registers an active guest without elevating the account role, supports same-role updates, and prevents self-service role escalation', async () => {
    const guestId = await createTestUser(db, {
      email: 'babsa11@yahoo.com',
      fullName: 'Adams Babatunde',
      role: 'guest',
    });

    const joined = await asUser(db, guestId, tx =>
      tx.query<{
        user_id: string;
        primary_role: string;
        company: string;
        phone: string;
        status: string;
      }>(
        `select * from public.join_partner_network($1, $2, $3)`,
        ['property_owner', 'Abundance Abodes', '+2348155377898'],
      ),
    );

    expect(joined.rows[0]).toMatchObject({
      user_id: guestId,
      primary_role: 'property_owner',
      company: 'Abundance Abodes',
      phone: '+2348155377898',
      status: 'active',
    });

    const profileRow = await db.query<{
      role: string;
      company: string | null;
      phone: string | null;
    }>(`select role, company, phone from public.profiles where id = $1`, [
      guestId,
    ]);
    expect(profileRow.rows[0]).toEqual({
      role: 'guest',
      company: 'Abundance Abodes',
      phone: '+2348155377898',
    });

    const access = await asUser(db, guestId, tx =>
      tx.query<{ guest_access: boolean; partner_access: boolean; can_submit: boolean; referral_code: string }>(
        `select
           public.has_role('guest') as guest_access,
           public.has_role('partner') as partner_access,
           public.can_submit_partner_property() as can_submit,
           (select referral_code from public.profiles where id = $1) as referral_code`,
        [guestId],
      ),
    );
    expect(access.rows[0]).toMatchObject({
      guest_access: true,
      partner_access: true,
      can_submit: true,
    });
    expect(access.rows[0]?.referral_code).toMatch(/^HML-/);

    // Updating an existing active membership with the same role is idempotent.
    const updated = await asUser(db, guestId, tx =>
      tx.query<{ primary_role: string; company: string }>(
        `select primary_role, company from public.join_partner_network($1, $2, $3)`,
        ['property_owner', 'Abundance Abodes Lagos', '+2348155377898'],
      ),
    );
    expect(updated.rows[0]).toEqual({
      primary_role: 'property_owner',
      company: 'Abundance Abodes Lagos',
    });

    let roleChangeError = '';
    try {
      await asUser(db, guestId, tx =>
        tx.query(`select * from public.join_partner_network($1, $2, $3)`, [
          'authorised_manager',
          'Abundance Abodes Lagos',
          '+2348155377898',
        ]),
      );
    } catch (error) {
      roleChangeError = String(error);
    }
    expect(roleChangeError).toContain('primary partner role is already set');
  });

  it('returns varchar(255) auth.users.email cleanly in list_partner_network_members() and enforces RLS + suspension rules', async () => {
    const memberA = await createTestUser(db, {
      email: 'owner-a@hamlet.test',
      fullName: 'Owner A',
      role: 'guest',
    });
    const memberB = await createTestUser(db, {
      email: 'owner-b@hamlet.test',
      fullName: 'Owner B',
      role: 'guest',
    });
    const adminId = await createTestUser(db, {
      email: 'admin-network@hamlet.test',
      fullName: 'HAMLET Admin',
      role: 'admin',
    });

    await asUser(db, memberA, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3)`, [
        'property_owner',
        'Lekki Suites',
        '+2348011112222',
      ]),
    );
    const memberAReferral = await db.query<{ referral_code: string }>(
      `select referral_code from public.profiles where id = $1`,
      [memberA],
    );
    const memberACode = memberAReferral.rows[0]?.referral_code;
    expect(memberACode).toMatch(/^HML-/);

    await asUser(db, memberB, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3, $4)`, [
        'closing_agent',
        'Mainland Stays Advisory',
        '+2348033334444',
        memberACode,
      ]),
    );

    const closingAgentAccess = await asUser(db, memberB, tx =>
      tx.query<{ guest_access: boolean; partner_access: boolean; can_submit: boolean }>(
        `select
           public.has_role('guest') as guest_access,
           public.has_role('partner') as partner_access,
           public.can_submit_partner_property() as can_submit`,
      ),
    );
    expect(closingAgentAccess.rows[0]).toEqual({
      guest_access: true,
      partner_access: true,
      can_submit: true,
    });

    const referralAttribution = await db.query<{ referrer_partner_id: string }>(
      `select referrer_partner_id from public.partner_referrals where referred_partner_id = $1`,
      [memberB],
    );
    expect(referralAttribution.rows[0]?.referrer_partner_id).toBe(memberA);

    const attributionSummary = await asUser(db, memberA, tx =>
      tx.query<{ summary: { referred_partners: Array<{ referred_partner_id: string; status: string }> } }>(
        `select public.get_my_partner_attribution_summary() as summary`,
      ),
    );
    expect(attributionSummary.rows[0]?.summary.referred_partners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ referred_partner_id: memberB, status: 'registered' }),
      ]),
    );

    const publicCodeLookup = await asAnon(db, tx =>
      tx.query<{ resolved: { valid: boolean; partner_id: string } }>(
        `select public.resolve_referral_code($1) as resolved`,
        [memberACode],
      ),
    );
    expect(publicCodeLookup.rows[0]?.resolved).toMatchObject({
      valid: true,
      partner_id: memberA,
    });

    // RLS: Member A sees only their own row; anon cannot query or execute RPCs
    const memberASelect = await asUser(db, memberA, tx =>
      tx.query<{ user_id: string }>(
        `select user_id from public.partner_network_memberships`,
      ),
    );
    expect(memberASelect.rows).toEqual([{ user_id: memberA }]);

    await expect(
      asAnon(db, tx =>
        tx.query(`select * from public.partner_network_memberships`),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(db, memberA, tx =>
        tx.query(`select * from public.list_partner_network_members()`),
      ),
    ).rejects.toThrow(/Only active administrators/);

    // Admin directory query works with auth.users.email varchar(255)
    const listed = await asUser(db, adminId, tx =>
      tx.query<{
        user_id: string;
        email: string;
        primary_role: string;
        company: string;
        status: string;
      }>(`select * from public.list_partner_network_members()`),
    );
    expect(listed.rows).toHaveLength(2);
    expect(listed.rows.map(r => r.email).sort()).toEqual([
      'owner-a@hamlet.test',
      'owner-b@hamlet.test',
    ]);

    // Suspend Member A and verify self-reactivation is blocked
    await asUser(db, adminId, tx =>
      tx.query(`select public.set_partner_network_status($1, $2, $3)`, [
        memberA,
        'suspended',
        'Compliance check requested before continuing.',
      ]),
    );

    await expect(
      asUser(db, memberA, tx =>
        tx.query(`select * from public.join_partner_network($1, $2, $3)`, [
          'property_owner',
          'Lekki Suites',
          '+2348011112222',
        ]),
      ),
    ).rejects.toThrow(/suspended/i);

    // Admin reactivates Member A
    await asUser(db, adminId, tx =>
      tx.query(`select public.set_partner_network_status($1, $2, $3)`, [
        memberA,
        'active',
        'Compliance documents verified by operations.',
      ]),
    );

    const reactivated = await asUser(db, memberA, tx =>
      tx.query<{ status: string }>(
        `select status from public.partner_network_memberships where user_id = $1`,
        [memberA],
      ),
    );
    expect(reactivated.rows[0]?.status).toBe('active');
  });
});
