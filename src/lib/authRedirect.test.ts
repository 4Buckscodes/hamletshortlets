import { describe, expect, it } from 'vitest';
import {
  buildAuthPath,
  buildWorkspaceSignInPath,
  normalizeDirectPathnameToHash,
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
});
