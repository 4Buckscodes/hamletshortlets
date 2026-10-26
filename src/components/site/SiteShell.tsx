'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  Building2,
  ShieldCheck,
  ArrowRight,
  MapPin,
  BedDouble,
  Bath,
  Users,
  BadgeCheck,
} from 'lucide-react';
import { HamletMark } from '../Logo';
import {
  CurrencyProvider,
  CURRENCY_ORDER,
  CURRENCY_SYMBOLS,
  useCurrency,
  type DisplayCurrency,
} from '@/lib/currency';
import { guestFacingNightlyNgn } from '@/lib/pricing';
import {
  getBrowserSupabase,
  loadActiveExchangeRates,
  type PublicStayRecord,
} from '@/lib/next-supabase';
import type { ExchangeRateConfig } from '@/lib/types';

interface SessionSummary {
  userId: string;
  email: string;
  fullName: string;
  role: 'guest' | 'partner' | 'admin';
}

export function SiteProviders({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<ExchangeRateConfig[] | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const db = getBrowserSupabase();
    void loadActiveExchangeRates(db).then(loaded => {
      if (active && loaded.length > 0) {
        setRates(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return <CurrencyProvider exchangeRates={rates}>{children}</CurrencyProvider>;
}

export function NextCurrencySwitcher({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      role="group"
      aria-label="Display currency"
      className="inline-flex min-h-[44px] items-center rounded-full border border-ink-200 bg-paper p-1"
    >
      {CURRENCY_ORDER.map((code: DisplayCurrency) => {
        const active = currency === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setCurrency(code)}
            aria-pressed={active}
            className={`min-h-[36px] min-w-[44px] cursor-pointer rounded-full px-2.5 text-xs font-extrabold transition ${
              active
                ? 'bg-ink-900 text-white shadow-xs'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {CURRENCY_SYMBOLS[code]} {!compact && code}
          </button>
        );
      })}
    </div>
  );
}

const PRIMARY_NAV = [
  { href: '/stays', label: 'Explore stays' },
  { href: '/lagos', label: 'Lagos' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/safety', label: 'Safety' },
  { href: '/faqs', label: 'FAQs' },
] as const;

export function SiteHeader() {
  const pathname = usePathname() || '/';
  const [drawerOpenPath, setDrawerOpenPath] = useState<string | null>(null);
  const drawerOpen = drawerOpenPath === pathname;
  const setDrawerOpen = (open: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof open === 'function' ? open(drawerOpen) : open;
    setDrawerOpenPath(next ? pathname : null);
  };
  const [session, setSession] = useState<SessionSummary | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpenPath(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    const db = getBrowserSupabase();
    if (!db) return;
    let active = true;

    async function syncUser() {
      if (!db) return;
      const { data } = await db.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (active) setSession(null);
        return;
      }
      const { data: profile } = await db
        .from('profiles')
        .select('full_name,role')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      const role =
        profile?.role === 'admin' || profile?.role === 'partner' ? profile.role : 'guest';
      setSession({
        userId: user.id,
        email: user.email || '',
        fullName:
          (profile?.full_name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'Account',
        role,
      });
    }

    void syncUser();
    const { data: sub } = db.auth.onAuthStateChange(() => {
      void syncUser();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const db = getBrowserSupabase();
    if (db) {
      await db.auth.signOut();
    }
    setSession(null);
    setDrawerOpen(false);
    window.location.assign('/');
  }

  const workspaceHref =
    session?.role === 'admin'
      ? '/admin'
      : session?.role === 'partner'
        ? '/partners'
        : '/account';

  const workspaceLabel =
    session?.role === 'admin'
      ? 'Admin console'
      : session?.role === 'partner'
        ? 'Partner workspace'
        : 'My account';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur-md">
      <div className="shell flex min-h-[70px] items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="HAMLET.REST home"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2.5"
        >
          <HamletMark size={36} contained />
          <span className="font-display text-xl font-bold tracking-[0.04em] text-ink-900">
            HAMLET<span className="text-brass-500">.REST</span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {PRIMARY_NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-full px-3.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-paper text-ink-900 font-bold'
                    : 'text-ink-600 hover:bg-paper/70 hover:text-ink-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <NextCurrencySwitcher compact />
          {(!session || session.role === 'guest') && (
            <Link
              href="/partners/apply"
              className="inline-flex min-h-[44px] items-center rounded-full px-3.5 text-sm font-bold text-ink-700 hover:bg-paper hover:text-ink-900"
            >
              Become a partner
            </Link>
          )}
          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href={workspaceHref}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ink-200 bg-paper px-4 text-sm font-bold text-ink-900 hover:border-ink-900"
              >
                {session.role === 'admin' ? (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brass-600" />
                ) : session.role === 'partner' ? (
                  <Building2 className="h-4 w-4 shrink-0 text-brass-600" />
                ) : (
                  <User className="h-4 w-4 shrink-0 text-brass-600" />
                )}
                <span>{workspaceLabel}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
          ) : (
            <Link href="/signin" className="primary-button min-h-[44px] px-5">
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <NextCurrencySwitcher compact />
          <button
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-expanded={drawerOpen}
            aria-controls="hamlet-mobile-drawer"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-900"
          >
            {drawerOpen ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 top-[71px] z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="hamlet-mobile-drawer"
            aria-label="Mobile navigation"
            className="relative z-10 max-h-[calc(100dvh-71px)] overflow-y-auto overscroll-y-contain border-b border-ink-200 bg-white px-4 py-5 shadow-2xl"
          >
            <div className="mx-auto max-w-lg space-y-2">
              {PRIMARY_NAV.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-base font-bold ${
                      active ? 'bg-paper text-ink-900' : 'text-ink-800 hover:bg-paper/70'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
                  </Link>
                );
              })}
              <Link
                href="/about"
                className="flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-base font-bold text-ink-800 hover:bg-paper/70"
              >
                <span>About HAMLET</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
              <Link
                href="/partners/apply"
                className="flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-base font-bold text-ink-800 hover:bg-paper/70"
              >
                <span>Become a partner</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>

              <div className="my-3 border-t border-ink-100 pt-3">
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-ink-500">
                  Stay currency
                </p>
                <NextCurrencySwitcher />
              </div>

              <div className="grid gap-2.5 pt-2">
                {session ? (
                  <>
                    <Link href={workspaceHref} className="primary-button w-full">
                      {workspaceLabel}
                    </Link>
                    {session.role !== 'guest' && (
                      <Link href="/account" className="secondary-button w-full">
                        Guest account & bookings
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="secondary-button w-full"
                    >
                      Sign out ({session.email})
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/signin" className="primary-button w-full">
                      Sign in
                    </Link>
                    <Link href="/signin?mode=signup" className="secondary-button w-full">
                      Create guest account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950 text-ink-100">
      <div className="shell py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <HamletMark size={32} light />
              <span className="font-display text-xl font-bold tracking-[0.05em] text-white">
                HAMLET<span className="text-brass-400">.REST</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Your stay, sorted. Verified shortlets across Lagos Island and Lagos Mainland, built by Abundance Abodes.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-brass-400">
              Explore Lagos
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/stays" className="inline-block py-1 hover:text-white">All Lagos stays</Link></li>
              <li><Link href="/stays?area=Victoria+Island" className="inline-block py-1 hover:text-white">Victoria Island & Ikoyi</Link></li>
              <li><Link href="/stays?area=Lekki+Phase+1" className="inline-block py-1 hover:text-white">Lekki Phase 1 & Oniru</Link></li>
              <li><Link href="/stays?area=Lagos+Mainland" className="inline-block py-1 hover:text-white">Lagos Mainland (Yaba, Shomolu, Surulere)</Link></li>
              <li><Link href="/lagos" className="inline-block py-1 hover:text-white">Lagos neighbourhood guide</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-brass-400">
              Trust & Support
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/how-it-works" className="inline-block py-1 hover:text-white">How bookings work</Link></li>
              <li><Link href="/safety" className="inline-block py-1 hover:text-white">Verification & safety</Link></li>
              <li><Link href="/about" className="inline-block py-1 hover:text-white">About HAMLET</Link></li>
              <li><Link href="/faqs" className="inline-block py-1 hover:text-white">FAQs</Link></li>
              <li><Link href="/legal" className="inline-block py-1 hover:text-white">Legal, privacy & terms</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-brass-400">
              Accounts & Partners
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/signin" className="inline-block py-1 hover:text-white">Sign in / Create account</Link></li>
              <li><Link href="/account" className="inline-block py-1 hover:text-white">Guest account & bookings</Link></li>
              <li><Link href="/account/issues" className="inline-block py-1 hover:text-white">Report a booking issue</Link></li>
              <li><Link href="/partners/apply" className="inline-block py-1 hover:text-white">Apply as a partner</Link></li>
              <li><Link href="/partners" className="inline-block py-1 hover:text-white">Partner workspace</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink-800 pt-6 text-xs text-ink-400">
          <span>
            © {new Date().getFullYear()} HAMLET.REST · An Abundance Abodes product · Lagos, Nigeria.
          </span>
          <span>
            Bookings confirm only after partner acceptance and verified payment.
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Currency-aware nightly price formatted from owner's listed rate B via `guestFacingNightlyNgn`
 * (`src/lib/pricing.ts`), respecting the active NGN / USD / GBP toggle.
 */
export function StayNightlyPrice({
  ownerNightlyRateNgn,
  className = '',
}: {
  ownerNightlyRateNgn: number;
  className?: string;
}) {
  const { formatPrice, currency } = useCurrency();
  const domesticNightly = guestFacingNightlyNgn(ownerNightlyRateNgn);

  return (
    <span className={className}>
      <strong className="font-mono text-lg font-extrabold text-ink-900">
        {formatPrice(domesticNightly, { roundWhole: true })}
      </strong>{' '}
      <span className="text-xs font-medium text-ink-500">
        / night{currency !== 'NGN' ? ` (${currency} incl. FX buffer)` : ''}
      </span>
    </span>
  );
}

export function StayListingCard({
  stay,
  querySuffix = '',
}: {
  stay: PublicStayRecord;
  querySuffix?: string;
}) {
  const cover = stay.image_urls?.[0] || '';
  const isVerified =
    stay.trust_label?.toLowerCase().includes('verified') &&
    !stay.trust_label?.toLowerCase().includes('unverified');

  return (
    <Link
      href={`/stays/${encodeURIComponent(stay.id)}${querySuffix}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-clay">
        {cover ? (
          <img
            src={cover}
            alt={stay.title}
            loading="lazy"
            className="h-full w-full object-cover opacity-100 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-clay to-paper text-4xl text-brass-600">
            ⌂
          </div>
        )}
        {stay.trust_label && (
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs ${
              isVerified
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-white/95 text-ink-800 border border-ink-200'
            }`}
          >
            {isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />}
            {stay.trust_label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{stay.area || 'Lagos'}</span>
            {stay.property_type && (
              <span className="text-ink-400">· {stay.property_type}</span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug text-ink-900 group-hover:text-jade-600">
            {stay.title}
          </h3>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-medium text-ink-500">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 shrink-0" />
              {stay.bedrooms ?? 0} {stay.bedrooms === 1 ? 'bed' : 'beds'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 shrink-0" />
              {stay.bathrooms ?? 1} bath
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 shrink-0" />
              Up to {stay.capacity ?? 2}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-ink-100 pt-3">
          <StayNightlyPrice ownerNightlyRateNgn={Number(stay.nightly_rate || 0)} />
          <span className="text-xs font-bold text-ink-700 group-hover:translate-x-0.5 transition">
            View stay →
          </span>
        </div>
      </div>
    </Link>
  );
}
