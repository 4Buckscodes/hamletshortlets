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
});
