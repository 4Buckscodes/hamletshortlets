import { describe, expect, it } from 'vitest';
import {
  buildAuthPath,
  resolvePostSignInRedirect,
  resolvePostSignUpRedirect,
  sanitizeGuestRedirect,
} from './authRedirect';

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

  it('keeps role-based destinations for admin and partner sign-in and defaults normal guest sign-in to /account', () => {
    const propertyTarget = '/stays/prop-1?book=1';
    expect(resolvePostSignInRedirect('admin', propertyTarget)).toBe('/admin');
    expect(resolvePostSignInRedirect('partner', propertyTarget)).toBe('/partner');
    expect(resolvePostSignInRedirect('guest', null)).toBe('/account');
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
});
