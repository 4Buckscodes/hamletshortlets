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
  const normalizedInput =
    nextOrRedirectParam && nextOrRedirectParam.trim().startsWith('/')
      ? resolveLegacyHashRoute(`#${nextOrRedirectParam.trim()}`, '/') ?? nextOrRedirectParam
      : nextOrRedirectParam;
  const safeInternal = sanitizeInternalRedirect(normalizedInput);
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

  return sanitizeGuestRedirect(normalizedInput) ?? '/account';
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
 * Maps legacy Vite `<HashRouter>` fragments (e.g. `#/stays?area=Yaba`,
 * `#/partner/register?ref=HML-1234`, `#/partner/bookings/bkg-1`,
 * `#/account?booking=bkg-1`, `#/legal/pricing`) to their canonical Next.js
 * App Router URLs during and after custom-domain cutover.
 *
 * Non-route hashes such as Supabase OAuth/recovery fragments (`#access_token=...`)
 * or in-page section anchors (`#pricing`) return `null` and are untouched.
 */
export function resolveLegacyHashRoute(
  rawHash: string | null | undefined,
  currentPathname = '/',
): string | null {
  if (!rawHash) return null;
  if (currentPathname === '/legacy' || currentPathname.startsWith('/legacy/')) {
    return null;
  }

  const trimmed = rawHash.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (
    !withoutHash.startsWith('/') ||
    withoutHash.startsWith('//') ||
    withoutHash.startsWith('/\\') ||
    withoutHash.includes('://')
  ) {
    return null;
  }

  const qIndex = withoutHash.indexOf('?');
  const rawPath = (qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash).replace(/\/+$/, '') || '/';
  const rawQuery = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : '';
  const params = new URLSearchParams(rawQuery);
  const appendSearch = (basePath: string, searchParams: URLSearchParams = params) => {
    const qs = searchParams.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  if (rawPath === '/') {
    return appendSearch('/');
  }

  if (
    rawPath === '/stays' ||
    rawPath.startsWith('/stays/') ||
    rawPath === '/lagos' ||
    rawPath === '/about' ||
    rawPath === '/how-it-works' ||
    rawPath === '/safety' ||
    rawPath === '/faqs'
  ) {
    return appendSearch(rawPath);
  }

  if (rawPath === '/legal' || rawPath.startsWith('/legal/')) {
    return appendSearch('/legal');
  }

  if (rawPath === '/signin' || rawPath === '/signup') {
    if (rawPath === '/signup' && !params.has('mode')) {
      params.set('mode', 'signup');
    }
    const legacyTarget = params.get('next') ?? params.get('redirect');
    if (legacyTarget && legacyTarget.startsWith('/')) {
      const mapped = resolveLegacyHashRoute(`#${legacyTarget}`, '/');
      if (mapped) {
        params.delete('redirect');
        params.set('next', mapped);
      }
    }
    return appendSearch('/signin');
  }

  if (rawPath === '/account') {
    if (params.has('booking')) {
      return appendSearch('/account/bookings');
    }
    return appendSearch('/account');
  }

  if (rawPath === '/account/bookings' || rawPath === '/account/issues') {
    return appendSearch(rawPath);
  }

  if (rawPath === '/partner/register' || rawPath === '/partners/apply') {
    return appendSearch('/partners/apply');
  }

  if (rawPath.startsWith('/partner/bookings/')) {
    const bookingId = decodeURIComponent(rawPath.slice('/partner/bookings/'.length));
    if (bookingId && !params.has('booking')) {
      params.set('booking', bookingId);
    }
    return appendSearch('/partners/bookings');
  }

  if (rawPath === '/partner/bookings' || rawPath === '/partners/bookings') {
    return appendSearch('/partners/bookings');
  }

  if (
    rawPath === '/partner/new-property' ||
    rawPath === '/partner/properties/new' ||
    rawPath === '/partners/properties/new'
  ) {
    return appendSearch('/partners/properties/new');
  }

  if (
    rawPath === '/partner/earnings' ||
    rawPath === '/partner/referrals' ||
    rawPath === '/partners/earnings'
  ) {
    return appendSearch('/partners/earnings');
  }

  if (
    rawPath === '/partner/profile' ||
    rawPath === '/partner/assignments' ||
    rawPath === '/partners/profile'
  ) {
    return appendSearch('/partners/profile');
  }

  if (rawPath === '/partner' || rawPath.startsWith('/partner/') || rawPath === '/partners') {
    return appendSearch('/partners');
  }

  if (rawPath === '/admin/applications' || rawPath === '/admin/referrals') {
    return appendSearch('/admin/partners');
  }

  if (rawPath === '/admin/users') {
    return appendSearch('/admin/accounts');
  }

  if (rawPath === '/admin/ledger') {
    return appendSearch('/admin/settlements');
  }

  if (rawPath === '/admin/assignments') {
    return appendSearch('/admin/properties');
  }

  if (
    rawPath === '/admin' ||
    rawPath === '/admin/properties' ||
    rawPath === '/admin/partners' ||
    rawPath === '/admin/bookings' ||
    rawPath === '/admin/issues' ||
    rawPath === '/admin/settlements' ||
    rawPath === '/admin/audit' ||
    rawPath === '/admin/accounts'
  ) {
    return appendSearch(rawPath);
  }

  return null;
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
