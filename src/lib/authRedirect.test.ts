import { describe, expect, it } from 'vitest';
import {
  buildAuthPath,
  buildOAuthCallbackUrl,
  buildWorkspaceSignInPath,
  extractOAuthDisplayName,
  formatOAuthErrorMessage,
  normalizeDirectPathnameToHash,
  resolveLegacyHashRoute,
  resolveNextAppPostSignInRedirect,
  resolveOAuthPostAuthRedirect,
  resolvePostSignInRedirect,
  resolvePostSignUpRedirect,
  sanitizeGuestRedirect,
  sanitizeInternalRedirect,
} from './authRedirect';
import { extractEdgeFunctionError } from './supabase';

describe('authRedirect helpers', () => {
  it('redirects newly registered guests to /stays (Explore stays) by default', () => {
    expect(resolvePostSignUpRedirect(null)).toBe('/stays');
    expect(resolvePostSignUpRedirect('')).toBe('/stays');
    expect(resolvePostSignUpRedirect(undefined)).toBe('/stays');
  });

  it('redirects newly registered guests back to the exact property they were trying to book', () => {
    const propertyTarget = '/stays/prop-ikoyi-penthouse?checkIn=2026-11-13&checkOut=2026-11-16&guests=2&book=1';
    expect(resolvePostSignUpRedirect(propertyTarget)).toBe(propertyTarget);
    expect(resolvePostSignInRedirect('guest', propertyTarget)).toBe(propertyTarget);
  });

  it('keeps role-based destinations for admin and partner sign-in when given a guest redirect, and defaults guest sign-in to /account', () => {
    const propertyTarget = '/stays/prop-1?book=1';
    expect(resolvePostSignInRedirect('admin', propertyTarget)).toBe('/admin');
    expect(resolvePostSignInRedirect('partner', propertyTarget)).toBe('/partner');
    expect(resolvePostSignInRedirect('guest', null)).toBe('/account');
  });

  it('preserves partner booking review deep links through sign-in and returns partners to the intended booking', () => {
    const partnerReviewPath = '/partner/bookings/bkg-ikoyi-001';
    const signInUrl = buildWorkspaceSignInPath(partnerReviewPath);
    expect(signInUrl).toBe('/signin?redirect=%2Fpartner%2Fbookings%2Fbkg-ikoyi-001');

    const params = new URLSearchParams(signInUrl.split('?')[1]);
    const redirectParam = params.get('redirect');

    // Authorized partner returns directly to the exact booking review page
    expect(resolvePostSignInRedirect('partner', redirectParam)).toBe(partnerReviewPath);
    // Guests and admins never follow a /partner/* redirect
    expect(resolvePostSignInRedirect('guest', redirectParam)).toBe('/account');
    expect(resolvePostSignInRedirect('admin', redirectParam)).toBe('/admin');
  });

  it('preserves admin and guest booking deep links for matching roles only', () => {
    const adminBookingPath = '/admin/bookings?booking=bkg-ikoyi-001';
    expect(resolvePostSignInRedirect('admin', adminBookingPath)).toBe(adminBookingPath);
    expect(resolvePostSignInRedirect('partner', adminBookingPath)).toBe('/partner');
    expect(resolvePostSignInRedirect('guest', adminBookingPath)).toBe('/account');

    const guestBookingPath = '/account?booking=bkg-ikoyi-001';
    expect(resolvePostSignInRedirect('guest', guestBookingPath)).toBe(guestBookingPath);
  });

  it('rejects external URLs, protocol-relative URLs, auth loops, and privileged console paths', () => {
    expect(sanitizeGuestRedirect('https://evil.example/phish')).toBeNull();
    expect(sanitizeGuestRedirect('//evil.example/phish')).toBeNull();
    expect(sanitizeGuestRedirect('/\\evil.example')).toBeNull();
    expect(sanitizeGuestRedirect('/signin?mode=signup')).toBeNull();
    expect(sanitizeGuestRedirect('/signup')).toBeNull();
    expect(sanitizeGuestRedirect('/admin/ledger')).toBeNull();
    expect(sanitizeGuestRedirect('/partner/earnings')).toBeNull();
    expect(sanitizeGuestRedirect('/partner/register')).toBe('/partner/register');
    expect(sanitizeInternalRedirect('https://evil.example/partner/bookings/1')).toBeNull();
    expect(sanitizeInternalRedirect('//evil.example/partner/bookings/1')).toBeNull();
    expect(sanitizeInternalRedirect('/signin?redirect=/partner')).toBeNull();
    expect(buildWorkspaceSignInPath('https://evil.example')).toBe('/signin');
    expect(resolvePostSignUpRedirect('https://evil.example')).toBe('/stays');
  });

  it('builds auth URLs preserving signup mode and safe redirect targets', () => {
    expect(buildAuthPath({ signup: true })).toBe('/signin?mode=signup');
    expect(buildAuthPath({ signup: true, redirect: '/stays/prop-1?book=1' })).toBe(
      '/signin?mode=signup&redirect=%2Fstays%2Fprop-1%3Fbook%3D1',
    );
    expect(buildAuthPath({ signup: false, redirect: '/stays/prop-1' })).toBe(
      '/signin?redirect=%2Fstays%2Fprop-1',
    );
    expect(buildAuthPath({ signup: true, redirect: 'https://evil.example' })).toBe('/signin?mode=signup');
  });

  it('normalizes direct non-hash SPA route URLs into HashRouter URLs while preserving static assets and existing hashes', () => {
    expect(normalizeDirectPathnameToHash('/', '', '')).toBeNull();
    expect(normalizeDirectPathnameToHash('/index.html', '', '')).toBeNull();
    expect(normalizeDirectPathnameToHash('/', '', '#/stays')).toBeNull();
    expect(normalizeDirectPathnameToHash('/images/lagos-hero.jpg', '', '')).toBeNull();
    expect(normalizeDirectPathnameToHash('/stays', '', '')).toBe('/#/stays');
    expect(normalizeDirectPathnameToHash('/partner/bookings/bkg-001', '', '')).toBe(
      '/#/partner/bookings/bkg-001',
    );
    expect(normalizeDirectPathnameToHash('/signin', '?mode=signup', '')).toBe(
      '/#/signin?mode=signup',
    );
  });

  it('maps legacy HashRouter deep links and email URLs cleanly to Next.js App Router paths while ignoring OAuth/anchor hashes', () => {
    expect(resolveLegacyHashRoute('#/stays?area=Yaba')).toBe('/stays?area=Yaba');
    expect(resolveLegacyHashRoute('#/stays/prop-ikoyi-1')).toBe('/stays/prop-ikoyi-1');
    expect(resolveLegacyHashRoute('#/partner/register?ref=HML-AB12')).toBe(
      '/partners/apply?ref=HML-AB12',
    );
    expect(resolveLegacyHashRoute('#/partner/bookings/bkg-notify-001')).toBe(
      '/partners/bookings?booking=bkg-notify-001',
    );
    expect(resolveLegacyHashRoute('#/account?booking=bkg-notify-001')).toBe(
      '/account/bookings?booking=bkg-notify-001',
    );
    expect(resolveLegacyHashRoute('#/admin/bookings?booking=bkg-notify-001')).toBe(
      '/admin/bookings?booking=bkg-notify-001',
    );
    expect(resolveLegacyHashRoute('#/admin/ledger')).toBe('/admin/settlements');
    expect(resolveLegacyHashRoute('#/legal/pricing')).toBe('/legal');

    // Never touch Supabase OAuth/recovery fragments, section anchors, external hashes, or /legacy
    expect(resolveLegacyHashRoute('#access_token=eyJ&type=recovery')).toBeNull();
    expect(resolveLegacyHashRoute('#faq-pricing')).toBeNull();
    expect(resolveLegacyHashRoute('#//evil.example/phish')).toBeNull();
    expect(resolveLegacyHashRoute('#/stays', '/legacy')).toBeNull();

    // Next.js sign-in redirect also normalizes legacy partner/guest email redirect params
    expect(
      resolveNextAppPostSignInRedirect('partner', '/partner/bookings/bkg-notify-001'),
    ).toBe('/partners/bookings?booking=bkg-notify-001');
    expect(resolveNextAppPostSignInRedirect('guest', '/account?booking=bkg-notify-001')).toBe(
      '/account/bookings?booking=bkg-notify-001',
    );
  });

  it('extracts structured JSON error messages from Edge Function non-2xx HTTP responses', async () => {
    const httpError = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response(
        JSON.stringify({
          ok: false,
          error: 'The 48-hour payment deadline has expired. Submit a fresh booking request.',
        }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      ),
    });

    await expect(
      extractEdgeFunctionError(httpError, 'Fallback checkout error'),
    ).resolves.toBe('The 48-hour payment deadline has expired. Submit a fresh booking request.');

    const genericHttpError = Object.assign(
      new Error('Edge Function returned a non-2xx status code'),
      {
        context: new Response('Bad gateway upstream', {
          status: 502,
          headers: { 'content-type': 'text/plain' },
        }),
      },
    );

    await expect(
      extractEdgeFunctionError(genericHttpError, 'Fallback checkout error'),
    ).resolves.toBe('Fallback checkout error');
  });

  it('builds safe Google OAuth callback URLs and blocks /auth/callback redirect loops', () => {
    expect(sanitizeInternalRedirect('/auth/callback')).toBeNull();
    expect(sanitizeInternalRedirect('/auth/callback?next=/stays')).toBeNull();

    expect(buildOAuthCallbackUrl('https://hamlet.rest/')).toBe(
      'https://hamlet.rest/auth/callback',
    );
    expect(
      buildOAuthCallbackUrl('https://hamlet.rest', {
        intent: 'signup',
        next: '/stays/prop-ikoyi-1?checkIn=2026-11-10',
      }),
    ).toBe(
      'https://hamlet.rest/auth/callback?intent=signup&next=%2Fstays%2Fprop-ikoyi-1%3FcheckIn%3D2026-11-10',
    );
    expect(
      buildOAuthCallbackUrl('https://hamlet.rest', {
        intent: 'signup',
        next: 'https://evil.example/phish',
      }),
    ).toBe('https://hamlet.rest/auth/callback?intent=signup');
    expect(
      buildOAuthCallbackUrl('https://hamlet.rest', {
        intent: 'signin',
        next: '/auth/callback',
      }),
    ).toBe('https://hamlet.rest/auth/callback');
  });

  it('resolves post-OAuth destinations across new sign-ups, returning guests, partners, and admins', () => {
    // New Google sign-up defaults to /stays, or returns to requested stay / partner application
    expect(resolveOAuthPostAuthRedirect({ role: 'guest', intent: 'signup' })).toBe('/stays');
    expect(
      resolveOAuthPostAuthRedirect({
        role: 'guest',
        intent: 'signup',
        next: '/partners/apply',
      }),
    ).toBe('/partners/apply');
    expect(
      resolveOAuthPostAuthRedirect({
        role: 'guest',
        intent: 'signin',
        isNewlyCreatedAccount: true,
      }),
    ).toBe('/stays');

    // Returning guest defaults to /account or requested guest deep link
    expect(resolveOAuthPostAuthRedirect({ role: 'guest', intent: 'signin' })).toBe('/account');
    expect(
      resolveOAuthPostAuthRedirect({
        role: 'guest',
        intent: 'signin',
        next: '/account/bookings',
      }),
    ).toBe('/account/bookings');

    // Partners and admins always reach their workspace even if initiated from signup tab
    expect(resolveOAuthPostAuthRedirect({ role: 'partner', intent: 'signup' })).toBe(
      '/partners',
    );
    expect(
      resolveOAuthPostAuthRedirect({
        role: 'partner',
        intent: 'signin',
        next: '/partners/bookings?booking=bkg-1',
      }),
    ).toBe('/partners/bookings?booking=bkg-1');
    expect(resolveOAuthPostAuthRedirect({ role: 'admin', intent: 'signup' })).toBe('/admin');
  });

  it('extracts Google OIDC display names cleanly and formats friendly OAuth errors', () => {
    expect(extractOAuthDisplayName({ full_name: '  Adaeze   Okafor ' })).toBe(
      'Adaeze Okafor',
    );
    expect(extractOAuthDisplayName({ name: 'Tunde Bakare' })).toBe('Tunde Bakare');
    expect(
      extractOAuthDisplayName({ given_name: 'Chidi', family_name: 'Nwosu' }),
    ).toBe('Chidi Nwosu');
    expect(extractOAuthDisplayName({}, 'kemi.adebayo@gmail.com')).toBe('kemi adebayo');

    expect(formatOAuthErrorMessage('access_denied', 'User+cancelled')).toContain(
      'cancelled',
    );
    expect(
      formatOAuthErrorMessage(
        'validation_failed',
        'Unsupported provider: provider is not enabled',
      ),
    ).toContain('not yet enabled');
  });
});
