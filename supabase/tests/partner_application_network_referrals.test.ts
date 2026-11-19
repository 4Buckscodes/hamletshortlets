import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, createMigratedTestDb, createTestUser, resetTestData } from './helpers/testDb.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FOLLOW_UP_MIGRATION = readFileSync(
  path.resolve(
    __dirname,
    '../migrations/20261119091832_partner_application_referral_network_members.sql',
  ),
  'utf8',
);

// The 20261024100000 form of the trigger function, as still deployed on databases
// that never received 20261029100000/20261030120000: unaliased role filter.
const LEGACY_VALIDATOR_SQL = String.raw`
create or replace function public.validate_partner_application_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_code text := upper(regexp_replace(btrim(coalesce(new.referred_by_code, '')), '[^A-Za-z0-9-]', '', 'g'));
  referrer_row public.profiles%rowtype;
  referrer_email text;
  existing_ref public.partner_referrals%rowtype;
begin
  if clean_code = '' then
    new.referred_by_code := null;
    new.referred_by_partner_id := null;
    return new;
  end if;

  select * into referrer_row
    from public.profiles
    where referral_code = clean_code
      and role in ('partner', 'admin')
      and account_status = 'active';

  if not found then
    raise exception 'Referral code % is not a valid active HAMLET partner code.', clean_code;
  end if;

  if referrer_row.id = new.applicant_id then
    raise exception 'Self-referrals are not permitted.';
  end if;

  select lower(btrim(coalesce(u.email, ''))) into referrer_email
    from auth.users u
    where u.id = referrer_row.id;

  if referrer_email <> '' and referrer_email = lower(btrim(coalesce(new.email, ''))) then
    raise exception 'Self-referrals using the same email address are not permitted.';
  end if;

  if referrer_row.phone is not null
    and regexp_replace(referrer_row.phone, '\D', '', 'g') <> ''
    and regexp_replace(referrer_row.phone, '\D', '', 'g') = regexp_replace(coalesce(new.phone, ''), '\D', '', 'g') then
    raise exception 'Self-referrals using the same phone number are not permitted.';
  end if;

  select * into existing_ref
    from public.partner_referrals
    where referred_partner_id = new.applicant_id;

  if found and existing_ref.referrer_partner_id <> referrer_row.id then
    raise exception 'This account already has a recorded direct referring partner.';
  end if;

  new.referred_by_code := clean_code;
  new.referred_by_partner_id := referrer_row.id;

  insert into public.partner_referrals (
    referrer_partner_id, referred_partner_id, referral_code, status, registered_at
  )
  values (referrer_row.id, new.applicant_id, clean_code, 'registered', now())
  on conflict (referred_partner_id) do nothing;

  update public.profiles
    set referred_by_partner_id = coalesce(referred_by_partner_id, referrer_row.id),
        referred_by_code = coalesce(referred_by_code, clean_code)
    where id = new.applicant_id;

  return new;
end;
$$;
`;

describe('Partner applications accept referral codes owned by network members', () => {
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

  async function memberWithCode(): Promise<{ memberId: string; code: string }> {
    const memberId = await createTestUser(db, {
      email: 'network-referrer@hamlet.test',
      fullName: 'Ngozi Referrer',
      role: 'guest',
    });
    await asUser(db, memberId, tx =>
      tx.query(`select * from public.join_partner_network($1, $2, $3)`, [
        'property_owner',
        'Ngozi Homes',
        '+2348020000001',
      ]),
    );
    const { rows } = await db.query<{ referral_code: string; role: string }>(
      `select referral_code, role from public.profiles where id = $1`,
      [memberId],
    );
    expect(rows[0]?.role).toBe('guest');
    expect(rows[0]?.referral_code).toMatch(/^HML-/);
    return { memberId, code: rows[0].referral_code };
  }

  async function applyWithCode(applicantId: string, code: string, phone = '+2348030000002') {
    return asUser(db, applicantId, tx =>
      tx.query<{ referred_by_partner_id: string; referred_by_code: string }>(
        `insert into public.partner_applications (
           applicant_id, full_name, email, phone, company, role, areas, properties_count,
           motivation, referred_by_code
         )
         values (
           $1::uuid, 'Tobi Applicant', 'applicant@hamlet.test', $3, 'Tobi Stays',
           'Property Owner', array['Yaba'], 1,
           'Two serviced apartments in Yaba ready for HAMLET guests.', lower($2)
         )
         returning referred_by_partner_id::text, referred_by_code`,
        [applicantId, code, phone],
      ),
    );
  }

  async function assertMemberReferralAccepted({ referralRecordedOnInsert }: { referralRecordedOnInsert: boolean }) {
    const { memberId, code } = await memberWithCode();
    const applicantId = await createTestUser(db, {
      email: 'applicant@hamlet.test',
      fullName: 'Tobi Applicant',
      role: 'guest',
    });

    const inserted = await applyWithCode(applicantId, code);
    expect(inserted.rows[0]).toEqual({ referred_by_partner_id: memberId, referred_by_code: code });

    if (referralRecordedOnInsert) {
      // The legacy validator records the direct referral at submission time; the
      // repository version records it when the application is approved.
      const referral = await db.query<{ referrer_partner_id: string; status: string }>(
        `select referrer_partner_id::text, status from public.partner_referrals where referred_partner_id = $1`,
        [applicantId],
      );
      expect(referral.rows[0]).toEqual({ referrer_partner_id: memberId, status: 'registered' });
    }

    // Suspended members' codes are rejected again.
    const otherApplicant = await createTestUser(db, {
      email: 'second-applicant@hamlet.test',
      fullName: 'Second Applicant',
      role: 'guest',
    });
    await db.query(
      `update public.partner_network_memberships set status = 'suspended' where user_id = $1`,
      [memberId],
    );
    await expect(applyWithCode(otherApplicant, code, '+2348030000003')).rejects.toThrow(
      /not a valid active HAMLET partner code|invalid or no longer active/i,
    );
  }

  it('accepts an active member code on a repository-built database (follow-up is a no-op)', async () => {
    const before = await db.query<{ def: string }>(
      `select pg_get_functiondef('public.validate_partner_application_referral()'::regprocedure) as def`,
    );
    await db.exec(FOLLOW_UP_MIGRATION);
    const after = await db.query<{ def: string }>(
      `select pg_get_functiondef('public.validate_partner_application_referral()'::regprocedure) as def`,
    );
    expect(after.rows[0].def).toBe(before.rows[0].def);

    await assertMemberReferralAccepted({ referralRecordedOnInsert: false });
  });

  it('patches the legacy unaliased validator still deployed in production', async () => {
    await db.exec(LEGACY_VALIDATOR_SQL);

    const { memberId, code } = await memberWithCode();
    const applicantId = await createTestUser(db, {
      email: 'applicant@hamlet.test',
      fullName: 'Tobi Applicant',
      role: 'guest',
    });
    await expect(applyWithCode(applicantId, code)).rejects.toThrow(
      /not a valid active HAMLET partner code/,
    );
    await db.query(`delete from public.partner_network_memberships where user_id = $1`, [memberId]);
    await resetTestData(db);

    await db.exec(FOLLOW_UP_MIGRATION);
    // Re-running is harmless once the function is member-aware.
    await db.exec(FOLLOW_UP_MIGRATION);

    const patched = await db.query<{ def: string }>(
      `select pg_get_functiondef('public.validate_partner_application_referral()'::regprocedure) as def`,
    );
    expect(patched.rows[0].def).toContain('partner_network_memberships');
    expect(patched.rows[0].def).toContain(String.raw`regexp_replace(referrer_row.phone, '\D', '', 'g')`);

    await assertMemberReferralAccepted({ referralRecordedOnInsert: true });
  });

  it('fails loudly when the referrer filter is in an unrecognised form', async () => {
    await db.exec(
      LEGACY_VALIDATOR_SQL.replace(
        "and role in ('partner', 'admin')",
        "and role = any (array['partner', 'admin'])",
      ),
    );
    await expect(db.exec(FOLLOW_UP_MIGRATION)).rejects.toThrow(/referrer role filter not recognised/);
  });
});
