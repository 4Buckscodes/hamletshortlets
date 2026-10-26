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

  // Allow public /partner/register and /partners/apply while rejecting protected partner workspace routes
  if (
    pathname === '/partner' ||
    (pathname.startsWith('/partner/') && pathname !== '/partner/register') ||
    pathname === '/partners' ||
    (pathname.startsWith('/partners/') && pathname !== '/partners/apply')
  ) {
    return null;
  }

  return safeInternal;
}

/**
 * Resolves where to navigate after Guest Sign Up (Legacy & Next.js):
 * - If the guest came from a particular property (e.g. `/stays/prop-1?...`), `/partners/apply`, or valid guest route, go there.
 * - Otherwise default to `/stays` (Explore stays).
 */
export function resolvePostSignUpRedirect(redirectParam: string | null | undefined): string {
  return sanitizeGuestRedirect(redirectParam) ?? '/stays';
}

/**
 * Resolves where to navigate after Sign In (Legacy SPA compatibility):
 * - Admins go to a requested `/admin/...` deep link if valid, otherwise `/admin`.
 * - Partners go to a requested `/partner/...` workspace deep link if valid, otherwise `/partner`.
 * - Guests go to their requested guest `redirect`, or `/account` by default.
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
 * Resolves where to navigate after Sign In inside the primary Next.js App Router:
 * - Admins go to a requested `/admin/...` deep link if valid, otherwise `/admin`.
 * - Partners go to a requested `/partners/...` deep link (or booking intent on `/stays/...` if explicitly requested? No — partner workspace deep link or `/partners`), otherwise `/partners`.
 * - Guests go to their requested guest `next`/`redirect` path (such as `/stays/[id]?checkIn=...`, `/partners/apply`, `/account/bookings`), or `/account` by default.
 */
export function resolveNextAppPostSignInRedirect(
  role: AccountRole | string | undefined | null,
  nextOrRedirectParam: string | null | undefined,
): string {
  const safeInternal = sanitizeInternalRedirect(nextOrRedirectParam);
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
      (pathname === '/partners' ||
        (pathname.startsWith('/partners/') && pathname !== '/partners/apply'))
    ) {
      return safeInternal;
    }
    return '/partners';
  }

  return sanitizeGuestRedirect(nextOrRedirectParam) ?? '/account';
}

/**
 * Reads either `?next=` or `?redirect=` from a search string safely.
 */
export function readRequestedRedirectFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return sanitizeInternalRedirect(params.get('next') ?? params.get('redirect'));
}

/**
 * Builds a `/signin` path for Next.js preserving `mode=signup` and a validated `next` target.
 */
export function buildNextSignInPath(opts: {
  signup?: boolean;
  next?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.signup) params.set('mode', 'signup');
  const safe = sanitizeInternalRedirect(opts.next);
  if (safe) params.set('next', safe);
  const qs = params.toString();
  return qs ? `/signin?${qs}` : '/signin';
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

/**
 * Normalizes direct non-hash SPA route requests (e.g. `/stays` or
 * `/partner/bookings/bkg-1?foo=bar`) into `<HashRouter>` URLs (`/#/stays`)
 * while leaving root (`/`), static file paths, and existing hashes untouched.
 */
export function normalizeDirectPathnameToHash(
  pathname: string,
  search = '',
  hash = '',
): string | null {
  if (!pathname || pathname === '/' || pathname === '/index.html') return null;
  if (hash && hash !== '#') return null;
  // Do not rewrite static file paths with extensions
  if (/\.[a-z0-9]{1,8}$/i.test(pathname)) return null;
  const cleanSearch = search && search !== '?' ? search : '';
  return `/#${pathname}${cleanSearch}`;
}
