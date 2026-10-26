import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readRequestedRedirectFromSearch,
  resolveNextAppPostSignInRedirect,
  resolvePostSignUpRedirect,
  sanitizeInternalRedirect,
} from './authRedirect';
import {
  isMissingSchemaObjectError,
  PARTNER_PROPERTY_SELECT,
  PUBLIC_PROPERTY_SELECT,
} from './next-supabase';

const ROOT = process.cwd();
const readRepoFile = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('Next.js App Router MVP — Redirect Safety, Live Schema Safety & Progressive Form Parity', () => {
  it('resolves role-aware Next.js redirects without sending signed-in users to /legacy', () => {
    expect(resolveNextAppPostSignInRedirect('admin', null)).toBe('/admin');
    expect(resolveNextAppPostSignInRedirect('partner', null)).toBe('/partners');
    expect(resolveNextAppPostSignInRedirect('guest', null)).toBe('/account');

    // Preserves booking intent across /signin?next=...
    const bookingIntent =
      '/stays/prop-vi-101?checkIn=2026-11-10&checkOut=2026-11-14&guests=2&step=2';
    expect(resolveNextAppPostSignInRedirect('guest', bookingIntent)).toBe(
      bookingIntent,
    );
    expect(resolvePostSignUpRedirect(bookingIntent)).toBe(bookingIntent);
    expect(resolvePostSignUpRedirect('/partners/apply')).toBe('/partners/apply');

    // Prevents non-admins from landing on /admin and non-partners from landing on /partners workspace
    expect(resolveNextAppPostSignInRedirect('guest', '/admin/properties')).toBe(
      '/account',
    );
    expect(resolveNextAppPostSignInRedirect('guest', '/partners')).toBe('/account');
    expect(resolveNextAppPostSignInRedirect('guest', '/partners/apply')).toBe(
      '/partners/apply',
    );
  });

  it('rejects external, protocol-relative, javascript and /signin loop redirects', () => {
    expect(sanitizeInternalRedirect('https://evil.example/steal')).toBeNull();
    expect(sanitizeInternalRedirect('//evil.example/steal')).toBeNull();
    expect(sanitizeInternalRedirect('javascript:alert(1)')).toBeNull();
    expect(sanitizeInternalRedirect('/\\evil.example')).toBeNull();
    expect(sanitizeInternalRedirect('/signin?next=/stays')).toBeNull();
    expect(
      readRequestedRedirectFromSearch('?next=https%3A%2F%2Fevil.example'),
    ).toBeNull();
    expect(
      readRequestedRedirectFromSearch('?next=%2Fstays%2Fabc%3Fstep%3D2'),
    ).toBe('/stays/abc?step=2');
  });

  it('keeps PUBLIC_PROPERTY_SELECT and PARTNER_PROPERTY_SELECT safe against unapplied Wayfinder columns', () => {
    for (const unappliedColumn of [
      'city',
      'public_location_summary',
      'public_landmarks',
      'location_accuracy',
      'wayfinder_status',
    ]) {
      expect(PUBLIC_PROPERTY_SELECT.split(',')).not.toContain(unappliedColumn);
      expect(PARTNER_PROPERTY_SELECT.split(',')).not.toContain(unappliedColumn);
    }

    expect(
      isMissingSchemaObjectError({
        code: '42703',
        message: 'column properties.city does not exist',
      }),
    ).toBe(true);
    expect(
      isMissingSchemaObjectError({
        code: 'PGRST202',
        message: 'Could not find the function public.get_guest_booking_wayfinder',
      }),
    ).toBe(true);
    expect(
      isMissingSchemaObjectError({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      }),
    ).toBe(false);
  });

  it('provides all required Next.js App Router public, guest, partner, admin and API routes', () => {
    const requiredFiles = [
      'app/page.tsx',
      'app/stays/page.tsx',
      'app/stays/[id]/page.tsx',
      'app/lagos/page.tsx',
      'app/about/page.tsx',
      'app/how-it-works/page.tsx',
      'app/safety/page.tsx',
      'app/faqs/page.tsx',
      'app/legal/page.tsx',
      'app/signin/page.tsx',
      'app/not-found.tsx',
      'app/error.tsx',
      'app/robots.ts',
      'app/sitemap.ts',
      'app/account/page.tsx',
      'app/account/bookings/page.tsx',
      'app/account/issues/page.tsx',
      'app/partners/page.tsx',
      'app/partners/apply/page.tsx',
      'app/partners/properties/new/page.tsx',
      'app/partners/properties/[id]/edit/page.tsx',
      'app/partners/bookings/page.tsx',
      'app/partners/availability/page.tsx',
      'app/partners/earnings/page.tsx',
      'app/partners/profile/page.tsx',
      'app/admin/page.tsx',
      'app/admin/properties/page.tsx',
      'app/admin/partners/page.tsx',
      'app/admin/bookings/page.tsx',
      'app/admin/issues/page.tsx',
      'app/admin/settlements/page.tsx',
      'app/admin/accounts/page.tsx',
      'app/admin/audit/page.tsx',
      'app/api/booking-requests/route.ts',
      'app/api/partner/properties/route.ts',
      'app/api/admin/properties/review/route.ts',
    ];

    for (const relPath of requiredFiles) {
      expect(existsSync(join(ROOT, relPath)), `Missing route file ${relPath}`).toBe(
        true,
      );
    }
  });

  it('enforces progressive step forms, focused drawers, brand rules, and zero /legacy sign-in trap', () => {
    const signInForm = readRepoFile('app/signin/signin-form.tsx');
    expect(signInForm).not.toContain("window.location.assign('/legacy')");
    expect(signInForm).toContain('resolveNextAppPostSignInRedirect');
    expect(signInForm).toContain('StepProgressHeader');

    const homePage = readRepoFile('app/page.tsx');
    const aboutPage = readRepoFile('app/about/page.tsx');
    const lagosPage = readRepoFile('app/lagos/page.tsx');
    expect(homePage.toLowerCase()).not.toContain('four pillars of a better stay');
    expect(aboutPage.toLowerCase()).toContain('four pillars of a better stay');
    expect(homePage).toContain('Yaba');
    expect(homePage).toContain('Shomolu');
    expect(homePage).toContain('Surulere');
    expect(lagosPage).toContain('Yaba');
    expect(lagosPage).toContain('Shomolu');
    expect(lagosPage).toContain('Surulere');

    // Progressive step headers across multi-step user & partner forms
    for (const progressiveFile of [
      'app/stays/[id]/booking-request-form.tsx',
      'app/account/issues/page.tsx',
      'app/partners/apply/partner-application-form.tsx',
      'src/components/forms/PropertyListingWizard.tsx',
    ]) {
      expect(readRepoFile(progressiveFile)).toContain('StepProgressHeader');
    }

    // Focused drawers across stays filter sheet and admin review queues
    for (const drawerFile of [
      'app/stays/stays-explorer.tsx',
      'app/admin/properties/page.tsx',
      'app/admin/partners/page.tsx',
      'app/admin/bookings/page.tsx',
      'app/admin/issues/page.tsx',
      'app/admin/settlements/page.tsx',
      'app/admin/accounts/page.tsx',
    ]) {
      expect(readRepoFile(drawerFile)).toContain('FocusedDrawer');
    }

    // Audited RPC usage across admin pages (exact live SQL function names)
    const adminIssues = readRepoFile('app/admin/issues/page.tsx');
    expect(adminIssues).toContain("rpc('transition_booking_issue'");
    expect(adminIssues).not.toContain(".from('booking_issues').update(");

    const adminProperties = readRepoFile('app/admin/properties/page.tsx');
    expect(adminProperties).toContain("rpc('review_partner_property'");
    expect(adminProperties).toContain("rpc('grant_property_assignment'");
    expect(adminProperties).toContain("rpc('revoke_property_assignment'");

    const adminPartners = readRepoFile('app/admin/partners/page.tsx');
    expect(adminPartners).toContain("rpc('review_partner_application'");
    expect(adminPartners).toContain('target_application_id');

    const adminAccounts = readRepoFile('app/admin/accounts/page.tsx');
    expect(adminAccounts).toContain("rpc('set_partner_account_status'");
    expect(adminAccounts).toContain("rpc('set_guest_account_status'");

    expect(signInForm).toContain('resetPasswordForEmail');
  });
});
