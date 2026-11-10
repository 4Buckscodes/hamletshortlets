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
    pathname.startsWith('/signup/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
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

  // Allow public partner onboarding routes while rejecting protected partner workspace routes
  const isPublicPartnerOnboardingPath =
    pathname === '/partners/apply' ||
    pathname === '/partners/apply/form' ||
    pathname === '/partners/start';

  if (
    pathname === '/partner' ||
    (pathname.startsWith('/partner/') && pathname !== '/partner/register') ||
    pathname === '/partners' ||
    (pathname.startsWith('/partners/') && !isPublicPartnerOnboardingPath)
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

export type OAuthAuthIntent = 'signin' | 'signup';

/**
 * Builds the absolute OAuth `redirectTo` callback URL (`/auth/callback`) preserving
 * whether the user initiated Google auth from Sign In or Create Account, plus any
 * validated internal `next` destination.
 */
export function buildOAuthCallbackUrl(
  origin: string,
  opts: { intent?: OAuthAuthIntent; next?: string | null } = {},
): string {
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  const params = new URLSearchParams();
  if (opts.intent === 'signup') {
    params.set('intent', 'signup');
  }
  const safeNext = sanitizeInternalRedirect(opts.next);
  if (safeNext) {
    params.set('next', safeNext);
  }
  const qs = params.toString();
  return qs ? `${cleanOrigin}/auth/callback?${qs}` : `${cleanOrigin}/auth/callback`;
}

/**
 * Resolves the post-OAuth destination after Google sign-in / sign-up:
 * - Administrators and approved partners always route via `resolveNextAppPostSignInRedirect`
 *   so privileged accounts reach `/admin` or `/partners` (or their requested workspace deep link).
 * - Guest accounts initiated via `intent=signup` (or newly created during this OAuth flow)
 *   route via `resolvePostSignUpRedirect` (requested guest path or `/stays`).
 * - Returning guest accounts route via `resolveNextAppPostSignInRedirect` (requested path or `/account`).
 */
export function resolveOAuthPostAuthRedirect(opts: {
  role?: AccountRole | string | null;
  intent?: string | null;
  next?: string | null;
  isNewlyCreatedAccount?: boolean;
}): string {
  if (opts.role === 'admin' || opts.role === 'partner') {
    return resolveNextAppPostSignInRedirect(opts.role, opts.next);
  }
  if (opts.intent === 'signup' || opts.isNewlyCreatedAccount) {
    return resolvePostSignUpRedirect(opts.next);
  }
  return resolveNextAppPostSignInRedirect(opts.role, opts.next);
}

/**
 * Extracts a clean display name (2–120 chars) from OAuth provider metadata
 * (`full_name`, `name`, `given_name` + `family_name`) with an email local-part fallback.
 */
export function extractOAuthDisplayName(
  metadata: Record<string, unknown> | null | undefined,
  email?: string | null,
): string {
  const candidates: string[] = [];
  if (metadata && typeof metadata === 'object') {
    if (typeof metadata.full_name === 'string') candidates.push(metadata.full_name);
    if (typeof metadata.name === 'string') candidates.push(metadata.name);
    const given = typeof metadata.given_name === 'string' ? metadata.given_name.trim() : '';
    const family = typeof metadata.family_name === 'string' ? metadata.family_name.trim() : '';
    const combined = [given, family].filter(Boolean).join(' ');
    if (combined) candidates.push(combined);
  }

  for (const raw of candidates) {
    const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 120);
    if (cleaned.length >= 2) return cleaned;
  }

  if (email && email.includes('@')) {
    const localPart = email
      .split('@')[0]!
      .replace(/[._-]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 120);
    if (localPart.length >= 2) return localPart;
  }

  return '';
}

/**
 * Converts authentication provider errors into non-enumerating, user-safe copy.
 * Never return raw provider messages to the browser UI.
 */
export function formatAuthErrorMessage(error: unknown): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '';
  const message = raw.trim().toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('email or password is incorrect')
  ) {
    return 'The email or password is incorrect. Check your details or reset your password.';
  }
  if (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('user exists') ||
    message.includes('duplicate key')
  ) {
    return 'We could not create that account. Try signing in or resetting your password.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'There have been too many attempts. Wait a moment, then try again.';
  }
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('length'))) {
    return 'Choose a stronger password and try again.';
  }
  if (message.includes('network') || message.includes('fetch failed') || message.includes('timeout')) {
    return 'We could not reach HAMLET securely. Check your connection and try again.';
  }

  return 'We could not complete that request. Please try again.';
}

/**
 * Translates raw Supabase GoTrue / Google OAuth error codes and descriptions
 * into calm, actionable user-facing copy.
 */
export function formatOAuthErrorMessage(
  errorCode?: string | null,
  errorDescription?: string | null,
): string {
  const code = (errorCode || '').trim().toLowerCase();
  const desc = (errorDescription || '').replace(/\+/g, ' ').trim();
  const combined = `${code} ${desc.toLowerCase()}`;

  if (code === 'access_denied' || combined.includes('access_denied') || combined.includes('canceled') || combined.includes('cancelled')) {
    return 'Google sign-in was cancelled before completion. You can try again or continue with your email address.';
  }

  if (combined.includes('provider is not enabled') || combined.includes('unsupported provider')) {
    return 'Google sign-in is not yet enabled on this HAMLET environment. Please continue with your email and password below.';
  }

  if (combined.includes('unverified email') || combined.includes('email not verified')) {
    return 'Your Google account needs a verified email address to sign in to HAMLET.';
  }

  if (desc) {
    return formatAuthErrorMessage(desc);
  }

  return 'Could not complete Google authentication right now. Please try again or continue with your email address.';
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

  if (rawPath === '/partners/apply/form' || rawPath === '/partners/start') {
    return appendSearch(rawPath);
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
    rawPath === '/admin/partners/network' ||
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
