import type { AccountRole } from './types';

/**
 * Validates any internal HAMLET path and rejects external URLs,
 * protocol-relative URLs, or authentication loop targets.
 */
export function sanitizeInternalRedirect(raw: string | null | undefined): string | null {
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

  return trimmed;
}

/**
 * Validates an internal guest redirect target and rejects external URLs,
 * protocol-relative URLs, auth-page loops, or privileged workspace paths.
 */
export function sanitizeGuestRedirect(raw: string | null | undefined): string | null {
  const safeInternal = sanitizeInternalRedirect(raw);
  if (!safeInternal) return null;

  const [pathname] = safeInternal.split(/[?#]/);
  if (!pathname) return null;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return null;
  }

  // Allow public /partner/register while rejecting protected /partner workspace routes
  if (pathname === '/partner' || (pathname.startsWith('/partner/') && pathname !== '/partner/register')) {
    return null;
  }

  return safeInternal;
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
 * - Admins go to a requested `/admin/...` deep link if valid, otherwise `/admin`.
 * - Partners go to a requested `/partner/...` workspace deep link (e.g. `/partner/bookings/:bookingId`) if valid, otherwise `/partner`.
 * - Guests go to their requested guest `redirect` (e.g. `/stays/prop-1?...` or `/account?booking=...`), or `/account` by default.
 */
export function resolvePostSignInRedirect(
  role: AccountRole | undefined,
  redirectParam: string | null | undefined,
): string {
  const safeInternal = sanitizeInternalRedirect(redirectParam);
  const [pathname] = (safeInternal ?? '').split(/[?#]/);

  if (role === 'admin') {
    if (safeInternal && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
      return safeInternal;
    }
    return '/admin';
  }

  if (role === 'partner') {
    if (
      safeInternal &&
      (pathname === '/partner' ||
        (pathname.startsWith('/partner/') && pathname !== '/partner/register'))
    ) {
      return safeInternal;
    }
    return '/partner';
  }

  return sanitizeGuestRedirect(redirectParam) ?? '/account';
}

/**
 * Builds a `/signin` path preserving `mode=signup` and/or a validated guest `redirect` target.
 */
export function buildAuthPath(opts: { signup?: boolean; redirect?: string | null }): string {
  const params = new URLSearchParams();
  if (opts.signup) params.set('mode', 'signup');
  const safe = sanitizeGuestRedirect(opts.redirect);
  if (safe) params.set('redirect', safe);
  const qs = params.toString();
  return qs ? `/signin?${qs}` : '/signin';
}

/**
 * Builds a `/signin` path preserving a protected partner/admin/account deep link
 * so email links return to the exact requested booking after authentication.
 */
export function buildWorkspaceSignInPath(targetPath: string | null | undefined): string {
  const safe = sanitizeInternalRedirect(targetPath);
  if (!safe) return '/signin';
  const params = new URLSearchParams();
  params.set('redirect', safe);
  return `/signin?${params.toString()}`;
}
