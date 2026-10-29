import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const signInForm = readFileSync(resolve(process.cwd(), 'app/signin/signin-form.tsx'), 'utf8');
const partnerForm = readFileSync(resolve(process.cwd(), 'app/partners/apply/partner-application-form.tsx'), 'utf8');
const hero = readFileSync(resolve(process.cwd(), 'app/home-slideshow.tsx'), 'utf8');
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261029100000_lock_signup_referral_attribution.sql'),
  'utf8',
);

describe('locked referral capture and static hero', () => {
  it('passes the captured guest referral code into auth metadata and renders it read-only', () => {
    expect(signInForm).toMatch(/referred_by_code:\s*lockedReferralCode\s*\|\|\s*null/);
    expect(signInForm).toMatch(/value=\{lockedReferralCode\}[\s\S]{0,100}readOnly/);
  });

  it('locks the partner referral code when it came from the referral URL', () => {
    expect(partnerForm).toMatch(/value=\{lockedReferralCode\s*\|\|\s*values\.referralCode\}/);
    expect(partnerForm).toMatch(/readOnly=\{Boolean\(lockedReferralCode\)\}/);
  });

  it('validates the referral code against an active partner in the database profile trigger', () => {
    expect(migration).toMatch(/p\.referral_code = raw_referral_code/i);
    expect(migration).toMatch(/p\.role in \('partner', 'admin'\)/i);
    expect(migration).toMatch(/p\.account_status = 'active'/i);
    expect(migration).toMatch(/referred_by_code, referred_by_partner_id/i);
    expect(migration).toMatch(/raise exception 'This referral code is invalid or no longer active\.'/i);
  });

  it('removes the hero image scale/reveal entrance effect', () => {
    expect(hero).not.toMatch(/scale-105/);
    expect(hero).not.toMatch(/transition-all duration-1000 ease-out/);
  });
});
