import { describe, expect, it } from 'vitest';
import {
  buildOAuthCallbackUrl,
  formatAuthErrorMessage,
  formatOAuthErrorMessage,
  resolveNextAppPostSignInRedirect,
  resolveOAuthPostAuthRedirect,
  resolvePostSignUpRedirect,
  sanitizeGuestRedirect,
  sanitizeInternalRedirect,
} from './authRedirect';

describe('HAMLET authentication redirect security', () => {
  it.each([
    'https://attacker.example',
    '//attacker.example/path',
    '/\\\\attacker.example/path',
    'javascript:alert(1)',
    'data:text/html,hello',
    '/signin',
    '/auth/callback',
  ])('rejects unsafe or looping redirect target %s', target => {
    expect(sanitizeInternalRedirect(target)).toBeNull();
  });

  it('preserves safe internal booking paths and their query strings', () => {
    expect(sanitizeInternalRedirect('/stays/lagos-suite?checkIn=2026-12-01&guests=2'))
      .toBe('/stays/lagos-suite?checkIn=2026-12-01&guests=2');
  });

  it('prevents guest sign-up from entering privileged workspaces', () => {
    expect(sanitizeGuestRedirect('/admin')).toBeNull();
    expect(sanitizeGuestRedirect('/partners/bookings')).toBeNull();
    expect(resolvePostSignUpRedirect('/admin/accounts')).toBe('/stays');
  });

  it('allows public partner onboarding without allowing the private partner workspace', () => {
    expect(sanitizeGuestRedirect('/partners/apply')).toBe('/partners/apply');
    expect(sanitizeGuestRedirect('/partners/apply/form')).toBe('/partners/apply/form');
    expect(sanitizeGuestRedirect('/partners')).toBeNull();
  });

  it('routes a partner only to the partner workspace or a safe partner deep link', () => {
    expect(resolveNextAppPostSignInRedirect('partner', '/partners/bookings?status=requested'))
      .toBe('/partners/bookings?status=requested');
    expect(resolveNextAppPostSignInRedirect('partner', '/admin'))
      .toBe('/partners');
  });

  it('routes an administrator only to the admin workspace or a safe admin deep link', () => {
    expect(resolveNextAppPostSignInRedirect('admin', '/admin/audit')).toBe('/admin/audit');
    expect(resolveNextAppPostSignInRedirect('admin', '/partners/bookings')).toBe('/admin');
  });

  it('normalizes authentication errors without exposing account existence', () => {
    const duplicateAccountMessage = formatAuthErrorMessage('User already registered');
    expect(duplicateAccountMessage).not.toMatch(/registered|exists|already/i);
    expect(duplicateAccountMessage).toContain('signing in');

    const invalidCredentialsMessage = formatAuthErrorMessage('Invalid login credentials');
    expect(invalidCredentialsMessage).toContain('email or password is incorrect');
  });

  it('does not echo unrecognized OAuth provider error descriptions', () => {
    const message = formatOAuthErrorMessage(null, 'internal provider stack trace: secret-token-123');
    expect(message).not.toContain('secret-token-123');
    expect(message).not.toContain('stack trace');
  });

  it('keeps OAuth callback destinations on the supplied HAMLET origin', () => {
    expect(buildOAuthCallbackUrl('https://www.hamlet.rest/', {
      intent: 'signup',
      next: 'https://attacker.example',
    })).toBe('https://www.hamlet.rest/auth/callback?intent=signup');
  });

  it('does not let a guest OAuth sign-up redirect into a privileged workspace', () => {
    expect(resolveOAuthPostAuthRedirect({
      role: 'guest',
      intent: 'signup',
      next: '/admin',
      isNewlyCreatedAccount: true,
    })).toBe('/stays');
  });
});
