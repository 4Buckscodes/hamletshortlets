import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asUser,
  createMigratedTestDb,
  createTestUser,
  resetTestData,
} from './helpers/testDb.ts';

describe('Google / OIDC OAuth Sign-Up Profile Metadata & Referral Claiming', () => {
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

  it('populates profiles.full_name from Google OIDC `name` or `given_name` + `family_name` claims and respects admin_bootstrap_emails', async () => {
    const insertedName = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data)
       values ($1, $2::jsonb)
       returning id`,
      [
        'google-name-claim@hamlet.test',
        JSON.stringify({
          iss: 'https://accounts.google.com',
          name: 'Adaeze Okafor',
          email_verified: true,
        }),
      ],
    );
    const profileFromName = await db.query<{ full_name: string; role: string }>(
      `select full_name, role from public.profiles where id = $1`,
      [insertedName.rows[0]!.id],
    );
    expect(profileFromName.rows[0]!.full_name).toBe('Adaeze Okafor');
    expect(profileFromName.rows[0]!.role).toBe('guest');

    const insertedSplit = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data)
       values ($1, $2::jsonb)
       returning id`,
      [
        'google-split-claims@hamlet.test',
        JSON.stringify({
          iss: 'https://accounts.google.com',
          given_name: 'Tunde',
          family_name: 'Bakare',
        }),
      ],
    );
    const profileFromSplit = await db.query<{ full_name: string; role: string }>(
      `select full_name, role from public.profiles where id = $1`,
      [insertedSplit.rows[0]!.id],
    );
    expect(profileFromSplit.rows[0]!.full_name).toBe('Tunde Bakare');
    expect(profileFromSplit.rows[0]!.role).toBe('guest');

    // Pre-authorized bootstrap admin signing in via Google OAuth
    await db.query(
      `insert into public.admin_bootstrap_emails (email) values ('ops-google@hamlet.test')`,
    );
    const insertedAdmin = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data)
       values ($1, $2::jsonb)
       returning id`,
      ['ops-google@hamlet.test', JSON.stringify({ name: 'Jonn Ops' })],
    );
    const adminProfile = await db.query<{ full_name: string; role: string }>(
      `select full_name, role from public.profiles where id = $1`,
      [insertedAdmin.rows[0]!.id],
    );
    expect(adminProfile.rows[0]!.full_name).toBe('Jonn Ops');
    expect(adminProfile.rows[0]!.role).toBe('admin');
  });

  it('allows a newly created Google OAuth guest to claim an active partner referral code once while enforcing self-referral and age guards', async () => {
    const referrerPartnerId = await createTestUser(db, {
      email: 'partner-referrer-oauth@hamlet.test',
      fullName: 'Referrer Partner',
      role: 'partner',
    });

    const partnerCode = await asUser(db, referrerPartnerId, async tx => {
      const res = await tx.query<{ code: string }>(
        `select public.ensure_my_referral_code() as code`,
      );
      return res.rows[0]!.code;
    });
    expect(partnerCode).toMatch(/^HML-/);

    // Newly created Google OAuth guest (no referred_by_code in initial OIDC claims)
    const insertedOAuthGuest = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data)
       values ($1, $2::jsonb)
       returning id`,
      ['new-google-guest@hamlet.test', JSON.stringify({ name: 'New Google Guest' })],
    );
    const oauthGuestId = insertedOAuthGuest.rows[0]!.id;

    // Invalid code raises a clear error
    await expect(
      asUser(db, oauthGuestId, tx =>
        tx.query(`select public.claim_oauth_signup_referral('HML-DOESNOTEXIST')`),
      ),
    ).rejects.toThrow(/invalid or no longer active/i);

    // First valid claim succeeds
    const claimed = await asUser(db, oauthGuestId, async tx => {
      const res = await tx.query<{ claimed: boolean }>(
        `select public.claim_oauth_signup_referral($1) as claimed`,
        [partnerCode],
      );
      return res.rows[0]!.claimed;
    });
    expect(claimed).toBe(true);

    // Second claim attempt cannot overwrite the already-recorded referral
    const secondPartnerId = await createTestUser(db, {
      email: 'second-partner-oauth@hamlet.test',
      fullName: 'Second Partner',
      role: 'partner',
    });
    const secondCode = await asUser(db, secondPartnerId, async tx => {
      const res = await tx.query<{ code: string }>(
        `select public.ensure_my_referral_code() as code`,
      );
      return res.rows[0]!.code;
    });

    const secondAttempt = await asUser(db, oauthGuestId, async tx => {
      const res = await tx.query<{ claimed: boolean }>(
        `select public.claim_oauth_signup_referral($1) as claimed`,
        [secondCode],
      );
      return res.rows[0]!.claimed;
    });
    expect(secondAttempt).toBe(false);

    const recorded = await db.query<{
      referred_by_code: string | null;
      referred_by_partner_id: string | null;
    }>(
      `select referred_by_code, referred_by_partner_id from public.profiles where id = $1`,
      [oauthGuestId],
    );
    expect(recorded.rows[0]!.referred_by_code).toBe(partnerCode);
    expect(recorded.rows[0]!.referred_by_partner_id).toBe(referrerPartnerId);

    // Accounts older than 15 minutes cannot attach a sign-up referral retroactively
    const insertedOlderGuest = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data, created_at)
       values ($1, $2::jsonb, now() - interval '20 minutes')
       returning id`,
      ['older-google-guest@hamlet.test', JSON.stringify({ name: 'Older Guest' })],
    );
    const olderClaim = await asUser(db, insertedOlderGuest.rows[0]!.id, async tx => {
      const res = await tx.query<{ claimed: boolean }>(
        `select public.claim_oauth_signup_referral($1) as claimed`,
        [partnerCode],
      );
      return res.rows[0]!.claimed;
    });
    expect(olderClaim).toBe(false);
  });
  it('allows a guest-profile active network member to refer a new Google OAuth signup', async () => {
    const referrerMemberId = await createTestUser(db, {
      email: 'network-member-referrer@hamlet.test',
      fullName: 'Network Member Referrer',
      role: 'guest',
    });

    await asUser(db, referrerMemberId, async tx => {
      await tx.query(
        `select public.join_partner_network($1, $2, $3, $4)`,
        ['closing_agent', 'Network Member Co', '+2348012345680', ''],
      );
    });

    const memberCode = await asUser(db, referrerMemberId, async tx => {
      const res = await tx.query<{ code: string }>(
        `select public.ensure_my_referral_code() as code`,
      );
      return res.rows[0]!.code;
    });

    const insertedOAuthGuest = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data)
       values ($1, $2::jsonb)
       returning id`,
      ['network-member-referred@hamlet.test', JSON.stringify({ name: 'Network Referred Guest' })],
    );
    const oauthGuestId = insertedOAuthGuest.rows[0]!.id;

    const claimed = await asUser(db, oauthGuestId, async tx => {
      const res = await tx.query<{ claimed: boolean }>(
        `select public.claim_oauth_signup_referral($1) as claimed`,
        [memberCode],
      );
      return res.rows[0]!.claimed;
    });

    expect(claimed).toBe(true);
    const recorded = await db.query<{ referred_by_partner_id: string | null }>(
      `select referred_by_partner_id from public.profiles where id = $1`,
      [oauthGuestId],
    );
    expect(recorded.rows[0]!.referred_by_partner_id).toBe(referrerMemberId);
  });

  it('creates immediate partner membership and queues the partner welcome email on confirmed signup', async () => {
    await db.exec(`alter table auth.users add column if not exists email_confirmed_at timestamptz`);

    const inserted = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data, email_confirmed_at)
       values ($1, $2::jsonb, now())
       returning id`,
      [
        'instant-partner-welcome@hamlet.test',
        JSON.stringify({
          full_name: 'Instant Partner Welcome',
          phone: '+2348012345681',
          hamlet_partner_signup: true,
          hamlet_partner_role: 'property_owner',
          hamlet_partner_company: 'Instant Partner Homes',
        }),
      ],
    );
    const userId = inserted.rows[0]!.id;

    const profile = await db.query<{ role: string }>(
      `select role from public.profiles where id = $1::uuid`,
      [userId],
    );
    const membership = await db.query<{ status: string; primary_role: string }>(
      `select status, primary_role from public.partner_network_memberships where user_id = $1::uuid`,
      [userId],
    );
    const welcome = await db.query<{
      event_type: string;
      subject: string;
      payload: { partner_signup: boolean };
    }>(
      `select event_type, subject, payload
       from public.customer_email_notifications
       where recipient_user_id = $1::uuid
         and event_type = 'registration_completed'`,
      [userId],
    );

    expect(profile.rows[0]!.role).toBe('guest');
    expect(membership.rows[0]!.status).toBe('active');
    expect(membership.rows[0]!.primary_role).toBe('property_owner');
    expect(welcome.rows[0]!.subject).toBe('Welcome to HAMLET — List, Share and Earn!');
    expect(welcome.rows[0]!.payload.partner_signup).toBe(true);
  });

});
