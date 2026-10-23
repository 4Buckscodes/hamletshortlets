import type { AccountRole } from './types';

/**
 * Validates an internal app redirect target and rejects external URLs,
 * protocol-relative URLs, auth-page loops, or privileged workspace paths.
 */
export function sanitizeGuestRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://')
  ) {
    return null;
  }

  const [pathname] = trimmed.split(/[?#]/);
  if (!pathname) return null;

  if (
    pathname === '/signin' ||
    pathname.startsWith('/signin/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/')
  ) {
    return null;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return null;
  }

  // Allow public /partner/register while rejecting protected /partner workspace routes
  if (pathname === '/partner' || (pathname.startsWith('/partner/') && pathname !== '/partner/register')) {
    return null;
  }

  return trimmed;
}

/**
 * Resolves where to navigate after Guest Sign Up:
 * - If the guest came from a particular property (e.g. `/stays/prop-1?...`) or valid guest route, go there.
 * - Otherwise default to `/stays` (Explore stays).
 */
export function resolvePostSignUpRedirect(redirectParam: string | null | undefined): string {
  return sanitizeGuestRedirect(redirectParam) ?? '/stays';
}

/**
 * Resolves where to navigate after Sign In:
 * - Admins go to `/admin`; Partners go to `/partner`.
 * - Guests go to their requested `redirect` (e.g. the property they were trying to book), or `/account` by default.
 */
export function resolvePostSignInRedirect(
  role: AccountRole | undefined,
  redirectParam: string | null | undefined,
): string {
  if (role === 'admin') return '/admin';
  if (role === 'partner') return '/partner';
  return sanitizeGuestRedirect(redirectParam) ?? '/account';
}

/**
 * Builds a `/signin` path preserving `mode=signup` and/or a validated internal `redirect` target.
 */
export function buildAuthPath(opts: { signup?: boolean; redirect?: string | null }): string {
  const params = new URLSearchParams();
  if (opts.signup) params.set('mode', 'signup');
  const safe = sanitizeGuestRedirect(opts.redirect);
  if (safe) params.set('redirect', safe);
  const qs = params.toString();
  return qs ? `/signin?${qs}` : '/signin';
}
