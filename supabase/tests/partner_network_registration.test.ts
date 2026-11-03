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

  it('registers an active guest in partner_network_memberships, backfills blank profile company/phone without elevating role, and supports idempotent updates', async () => {
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

    // Updating an existing active membership succeeds and updates partner_network_memberships
    const updated = await asUser(db, guestId, tx =>
      tx.query<{ primary_role: string; company: string }>(
        `select primary_role, company from public.join_partner_network($1, $2, $3)`,
        ['authorised_manager', 'Abundance Abodes Lagos', '+2348155377898'],
      ),
    );
    expect(updated.rows[0]).toEqual({
      primary_role: 'authorised_manager',
      company: 'Abundance Abodes Lagos',
    });
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
    await asUser(db, memberB, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3)`, [
        'closing_agent',
        'Mainland Stays Advisory',
        '+2348033334444',
      ]),
    );

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
