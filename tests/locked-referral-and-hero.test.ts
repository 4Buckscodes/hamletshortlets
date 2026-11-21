import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const signInForm = readFileSync(resolve(process.cwd(), 'app/signin/signin-form.tsx'), 'utf8');
const partnerForm = readFileSync(resolve(process.cwd(), 'app/partners/apply/partner-application-form.tsx'), 'utf8');
const referralCapture = readFileSync(resolve(process.cwd(), 'src/components/site/ReferralAttributionCapture.tsx'), 'utf8');
const resubmissionMigration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261030100000_preserve_partner_referral_on_resubmission.sql'), 'utf8');
const hero = readFileSync(resolve(process.cwd(), 'app/v0-home-experience.tsx'), 'utf8');
const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261029100000_lock_signup_referral_attribution.sql'),
  'utf8',
);

describe('locked referral capture and static hero', () => {
  it('captures referral parameters after client-side route or query changes', () => {
    expect(referralCapture).toContain('usePathname');
    expect(referralCapture).toContain('useSearchParams');
    expect(referralCapture).toContain('[pathname, searchParams]');
  });

  it('preserves referral attribution during partner application resubmission', () => {
    expect(resubmissionMigration).toContain("application_data ->> 'referred_by_code'");
    expect(resubmissionMigration).toContain("referred_by_code = nullif(clean_referral_code, '')");
    // The resubmission RPC relies on the BEFORE UPDATE validation trigger defined
    // in 20261029100000_lock_signup_referral_attribution.sql (not redefined here).
    expect(resubmissionMigration).toMatch(/BEFORE UPDATE trigger from the prior migration/);
    expect(migration).toContain('update of referred_by_code, applicant_id on public.partner_applications');
  });

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
    expect(migration).toMatch(/Self-referrals are not permitted/i);
    expect(migration).toMatch(/same phone number are not permitted/i);
    expect(migration).toMatch(/regexp_replace\(coalesce\(new\.raw_user_meta_data ->> 'phone', ''\), '\[\^0-9\]', '', 'g'\)/i);
    expect(migration).toMatch(/raise exception 'This referral code is invalid or no longer active\.'/i);
  });

  it('validates partner recruitment referrals at the database boundary, not only in the form', () => {
    expect(migration).toMatch(/create or replace function public\.validate_partner_application_referral\(\)/i);
    expect(migration).toMatch(/before insert on public\.partner_applications/i);
    expect(migration).toMatch(/before update of referred_by_code, applicant_id on public\.partner_applications/i);
    expect(migration).toMatch(/new\.applicant_id = referrer_id/i);
    expect(migration).toMatch(/This partner referral code is invalid or no longer active/i);
  });

  it('plays the hero entrance in CSS, off the loading path, and only when motion is allowed', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/ui/home.css'), 'utf8');
    const motion = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'));
    // No script is needed for the entrance, and the hero photo is never hidden from the browser.
    expect(hero).not.toContain("from 'gsap'");
    expect(motion).toContain('.hp-word-in { animation: hp-rise');
    expect(motion).toContain('.hp-hero-art::after');
    expect(motion).toContain('hp-curtain');
    expect(css).not.toMatch(/clip-path:\s*inset\(100%/);
    expect(css).not.toContain('hp-live');
    // Hover-only depth effect starts when idle, is throttled, and is removed on unmount.
    expect(hero).toContain('requestIdleCallback');
    expect(hero).toContain('requestAnimationFrame');
    expect(hero).toContain("removeEventListener('pointermove'");
    expect(hero).toContain('fetchPriority="high"');
    expect(hero).not.toMatch(/scale-105/);
    expect(hero).not.toMatch(/transition-all duration-1000 ease-out/);
    expect(hero).not.toMatch(/transition-transform/);
  });

  it('keeps all hero animation inside the no-preference media query', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/components/ui/home.css'), 'utf8');
    const start = css.indexOf('/* Hero motion');
    const mediaAt = css.indexOf('@media (prefers-reduced-motion: no-preference)', start);
    const before = css.slice(start, mediaAt);
    expect(before).not.toMatch(/animation\s*:/);
    expect(css).toContain('hp-breathe');
  });
});
