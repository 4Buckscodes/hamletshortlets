'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  BedDouble,
  Bath,
  Users,
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Send,
  LayoutDashboard,
} from 'lucide-react';
import { HamletWordmark } from '../Logo';
import {
  CurrencyProvider,
  useCurrency,
  type DisplayCurrency,
} from '@/lib/currency';
import { isMainlandArea } from '@/lib/areas';
import { resolveLegacyHashRoute } from '@/lib/authRedirect';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  getStayTrustStatus,
  getValidGuestNightlyNgn,
} from '@/lib/discovery';
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

interface NextHoratioContextValue {
  isOpen: boolean;
  openHoratio: (prompt?: string) => void;
  closeHoratio: () => void;
}

const NextHoratioContext = createContext<NextHoratioContextValue>({
  isOpen: false,
  openHoratio: () => {},
  closeHoratio: () => {},
});

export function useNextHoratio() {
  return useContext(NextHoratioContext);
}

interface HoratioMessage {
  id: string;
  role: 'user' | 'horatio';
  text: string;
  links?: Array<{ label: string; href: string }>;
}

const HORATIO_SUGGESTIONS = [
  'Compare Lagos Mainland vs Island areas',
  'How do stay prices and caution deposits work?',
  'When do I pay for a booking?',
  'How do I list or partner on HAMLET?',
] as const;

function buildHoratioReply(rawQuery: string, currency: DisplayCurrency): Omit<HoratioMessage, 'id' | 'role'> {
  const q = rawQuery.trim().toLowerCase();

  if (q.includes('mainland') || q.includes('yaba') || q.includes('surulere') || q.includes('shomolu') || q.includes('ikeja') || q.includes('island') || q.includes('lekki') || q.includes('ikate') || q.includes('ikoyi') || q.includes('area')) {
    return {
      text: 'HAMLET covers both sides of Lagos: Lagos Mainland (Yaba, Surulere, Shomolu, Gbagada, Maryland, Ilupeju, Ikeja GRA & Magodo) for central access, tech hubs, and MMIA airport proximity — and Lagos Island & Lekki (Victoria Island, Ikoyi, Lekki Phase 1, Ikate, Oniru & Ajah) for corporate districts and waterfront stays.',
      links: [
        { label: 'Browse Lagos Mainland stays', href: '/stays?area=Lagos+Mainland' },
        { label: 'Browse Lagos Island stays', href: '/stays?side=island' },
        { label: 'Read the Lagos area guide', href: '/lagos' },
      ],
    };
  }

  if (q.includes('price') || q.includes('fee') || q.includes('usd') || q.includes('gbp') || q.includes('dollar') || q.includes('pound') || q.includes('caution') || q.includes('deposit') || q.includes('₦') || q.includes('currency')) {
    return {
      text: `Stay prices are automatically displayed in ${currency} based on your location. Domestic NGN stay prices include the owner’s agreed accommodation rate plus HAMLET’s 20% guest service fee (never added again at checkout) and any stated cleaning charge. International USD ($) and GBP (£) quotes apply a single 10% FX buffer and settle in NGN via Paystack. Refundable caution deposits are itemised separately without markup or FX buffer.`,
      links: [
        { label: 'Explore stays', href: '/stays' },
        { label: 'Pricing & legal terms', href: '/legal' },
      ],
    };
  }

  if (q.includes('partner') || q.includes('owner') || q.includes('list') || q.includes('agent') || q.includes('commission')) {
    return {
      text: "HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies. Verified closing agents earn eligible commissions on attributed stays, and referring partners earn eligible rewards during an active referral window.",
      links: [
        { label: 'Apply as a partner', href: '/partners/apply' },
        { label: 'Partner workspace', href: '/partners' },
      ],
    };
  }

  if (q.includes('pay') || q.includes('paystack') || q.includes('confirm') || q.includes('cancel') || q.includes('hold')) {
    return {
      text: 'No card charge happens when you request dates. Once the host confirms availability, your dates are held for 48 hours so you can pay securely via Paystack inside My Account → My Bookings. Confirmation occurs only after server-verified payment.',
      links: [
        { label: 'How HAMLET works', href: '/how-it-works' },
        { label: 'My bookings', href: '/account/bookings' },
      ],
    };
  }

  return {
    text: 'I am Horatio, your HAMLET Lagos guide. Ask me about Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja GRA) vs Island neighbourhoods (Lekki Phase 1, Ikate, Victoria Island, Ikoyi, Ajah), 4-pillar property verification, upfront pricing, 48-hour Paystack holds, or listing a property.',
    links: [
      { label: 'Explore all Lagos stays', href: '/stays' },
      { label: 'Safety & 4-pillar verification', href: '/safety' },
      { label: 'Read FAQs', href: '/faqs' },
    ],
  };
}

function NextHoratioDrawer({
  open,
  onClose,
  initialPrompt,
  onClearInitialPrompt,
}: {
  open: boolean;
  onClose: () => void;
  initialPrompt: string | null;
  onClearInitialPrompt: () => void;
}) {
  const { currency } = useCurrency();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<HoratioMessage[]>([]);

  const ask = useCallback(
    (question: string) => {
      const clean = question.trim();
      if (!clean) return;
      const reply = buildHoratioReply(clean, currency);
      setMessages(prev => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text: clean },
        { id: `h-${Date.now() + 1}`, role: 'horatio', ...reply },
      ]);
    },
    [currency],
  );

  useEffect(() => {
    if (!open || !initialPrompt) return;
    const timer = window.setTimeout(() => {
      ask(initialPrompt);
      onClearInitialPrompt();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, initialPrompt, ask, onClearInitialPrompt]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    ask(input);
    setInput('');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Horatio — HAMLET Lagos concierge"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 backdrop-blur-xs sm:items-stretch sm:justify-end"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:h-dvh sm:max-h-dvh sm:max-w-md sm:rounded-none">
        <div className="flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-5 py-4 text-paper">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brass-500/20 text-brass-300">
              <Sparkles className="h-4 w-4 shrink-0" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Horatio</h2>
              <p className="text-[11px] font-medium text-ink-300">
                HAMLET Lagos stay &amp; verification guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Horatio"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
          >
            <X className="h-4 w-4 shrink-0" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-contain p-5">
          <div className="rounded-2xl border border-ink-100 bg-white p-4 text-xs leading-relaxed text-ink-700 shadow-2xs">
            <p className="font-bold text-ink-900">How can I help sort your stay in Lagos?</p>
            <p className="mt-1 text-ink-500">
              Ask about neighbourhoods (Mainland &amp; Island), upfront pricing, 48-hour payment holds, or partner listing rules.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {HORATIO_SUGGESTIONS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="cursor-pointer rounded-full border border-ink-200 bg-paper px-3 py-1.5 text-left text-[11px] font-bold text-ink-800 transition hover:border-ink-900 hover:bg-ink-900 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'ml-8 bg-ink-900 font-semibold text-white'
                  : 'mr-4 border border-ink-100 bg-white text-ink-800 shadow-2xs'
              }`}
            >
              <p className="m-0">{msg.text}</p>
              {msg.links && msg.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-full border border-brass-400/60 bg-brass-200/30 px-3 py-1 text-[11px] font-extrabold text-ink-900 hover:bg-brass-300/50"
                    >
                      {link.label} <ArrowRight className="h-3 w-3 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-ink-100 bg-white p-3.5"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Horatio about Lagos stays…"
            aria-label="Ask Horatio a question"
            className="min-h-[44px] flex-1 rounded-full border border-ink-200 bg-paper/60 px-4 text-xs font-semibold text-ink-900 placeholder-ink-400 focus:border-ink-900 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send question"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink-900 text-white transition hover:bg-ink-800"
          >
            <Send className="h-4 w-4 shrink-0" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function SiteProviders({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<ExchangeRateConfig[] | undefined>(undefined);
  const [horatioOpen, setHoratioOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  useEffect(() => {
    const syncLegacyHash = () => {
      if (typeof window === 'undefined') return;
      const target = resolveLegacyHashRoute(window.location.hash, window.location.pathname);
      if (target) {
        window.location.replace(target);
      }
    };
    syncLegacyHash();
    window.addEventListener('hashchange', syncLegacyHash);
    return () => {
      window.removeEventListener('hashchange', syncLegacyHash);
    };
  }, []);

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

  const openHoratio = useCallback((prompt?: string) => {
    if (prompt) setInitialPrompt(prompt);
    setHoratioOpen(true);
  }, []);

  const closeHoratio = useCallback(() => {
    setHoratioOpen(false);
  }, []);

  const horatioCtx = useMemo(
    () => ({ isOpen: horatioOpen, openHoratio, closeHoratio }),
    [horatioOpen, openHoratio, closeHoratio],
  );

  return (
    <CurrencyProvider exchangeRates={rates}>
      <NextHoratioContext.Provider value={horatioCtx}>
        {children}
        <NextHoratioDrawer
          open={horatioOpen}
          onClose={closeHoratio}
          initialPrompt={initialPrompt}
          onClearInitialPrompt={() => setInitialPrompt(null)}
        />
      </NextHoratioContext.Provider>
    </CurrencyProvider>
  );
}

/**
 * Guest-facing currency switching UI has been intentionally removed so stay
 * prices automatically adapt to the visitor's detected currency.
 */
export function NextCurrencySwitcher(_props?: {
  compact?: boolean;
  variant?: 'light' | 'dark';
}) {
  void _props;
  return null;
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
  const { openHoratio } = useNextHoratio();
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
    <header className="sticky top-0 z-40 border-b border-ink-100/90 bg-paper/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/"
            aria-label="HAMLET.REST home"
            className="inline-flex min-h-[44px] shrink-0 items-center"
          >
            <HamletWordmark />
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
                  className={`inline-flex min-h-[36px] items-center rounded-full px-3.5 text-[13px] font-semibold transition ${
                    active
                      ? 'bg-ink-900 font-bold text-white shadow-2xs'
                      : 'text-ink-600 hover:bg-white/85 hover:text-ink-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={() => openHoratio()}
            aria-label="Ask Horatio — HAMLET assistant"
            className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-brass-400/60 bg-white px-3.5 text-[12px] font-bold text-ink-900 shadow-2xs transition hover:border-brass-500 hover:bg-brass-200/25"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brass-600" />
            <span>Horatio</span>
          </button>

          {(!session || session.role === 'guest') && (
            <Link
              href="/partners/apply"
              className="hidden min-h-[38px] items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-[12px] font-bold text-ink-800 transition hover:border-brass-500 hover:text-ink-950 xl:inline-flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-brass-600" />
              <span>Partner with us</span>
            </Link>
          )}

          {session ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={workspaceHref}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-900 transition hover:border-ink-900"
              >
                {session.role === 'admin' ? (
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brass-600" />
                ) : session.role === 'partner' ? (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-brass-600" />
                ) : (
                  <User className="h-3.5 w-3.5 shrink-0 text-brass-600" />
                )}
                <span>{workspaceLabel}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className="inline-flex min-h-[38px] items-center justify-center rounded-full bg-ink-900 px-4.5 text-[12.5px] font-bold text-white shadow-2xs transition hover:bg-ink-800"
            >
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/stays"
            className="inline-flex min-h-11 items-center rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-800 shadow-2xs transition hover:border-ink-900"
          >
            Stays
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-expanded={drawerOpen}
            aria-controls="hamlet-mobile-drawer"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white text-ink-900 shadow-2xs"
          >
            {drawerOpen ? <X className="h-5 w-5 shrink-0" /> : <Menu className="h-5 w-5 shrink-0" />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 top-[65px] z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/50 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="hamlet-mobile-drawer"
            aria-label="Mobile navigation"
            className="relative z-10 max-h-[calc(100dvh-65px)] overflow-y-auto overscroll-y-contain border-b border-ink-200 bg-paper px-4 py-5 shadow-2xl"
          >
            <div className="mx-auto max-w-lg space-y-1.5">
              {PRIMARY_NAV.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-base font-bold transition ${
                      active ? 'bg-ink-900 text-white' : 'bg-white text-ink-800 hover:bg-clay/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
                  </Link>
                );
              })}
              <Link
                href="/about"
                className="flex min-h-[48px] items-center justify-between rounded-2xl bg-white px-4 text-base font-bold text-ink-800 hover:bg-clay/60"
              >
                <span>About HAMLET</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
              <Link
                href="/partners/apply"
                className="flex min-h-[48px] items-center justify-between rounded-2xl bg-white px-4 text-base font-bold text-ink-800 hover:bg-clay/60"
              >
                <span>Partner with us</span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  openHoratio();
                }}
                className="flex min-h-[48px] w-full cursor-pointer items-center justify-between rounded-2xl border border-brass-400/60 bg-white px-4 text-base font-bold text-ink-900"
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-brass-600" />
                  Ask Horatio
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-brass-600" />
              </button>

              <div className="grid gap-2.5 border-t border-ink-200/70 pt-4">
                {session ? (
                  <>
                    <Link href={workspaceHref} className="primary-button w-full">
                      {workspaceLabel}
                    </Link>
                    {session.role !== 'guest' && (
                      <Link href="/account" className="secondary-button w-full">
                        Guest account &amp; bookings
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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <HamletWordmark light />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Your stay, sorted. Verified shortlets across Lagos Mainland and Lagos Island — built by Abundance Abodes.
            </p>
            <p className="mt-2.5 text-xs text-ink-300">
              Contact:{' '}
              <a
                href="mailto:hello@hamlet.rest"
                className="font-semibold text-brass-300 transition hover:text-white"
              >
                hello@hamlet.rest
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Explore Lagos
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/stays" className="inline-block py-1 transition hover:text-white">All Lagos stays</Link></li>
              <li><Link href="/stays?area=Lagos+Mainland" className="inline-block py-1 transition hover:text-white">Lagos Mainland (Yaba, Shomolu, Surulere)</Link></li>
              <li><Link href="/stays?area=Victoria+Island" className="inline-block py-1 transition hover:text-white">Victoria Island &amp; Ikoyi</Link></li>
              <li><Link href="/stays?area=Lekki+Phase+1" className="inline-block py-1 transition hover:text-white">Lekki Phase 1, Ikate &amp; Oniru</Link></li>
              <li><Link href="/lagos" className="inline-block py-1 transition hover:text-white">Lagos neighbourhood guide</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Trust &amp; Support
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/how-it-works" className="inline-block py-1 transition hover:text-white">How bookings work</Link></li>
              <li><Link href="/safety" className="inline-block py-1 transition hover:text-white">Verification &amp; safety</Link></li>
              <li><Link href="/about" className="inline-block py-1 transition hover:text-white">About HAMLET</Link></li>
              <li><Link href="/faqs" className="inline-block py-1 transition hover:text-white">FAQs</Link></li>
              <li><Link href="/legal" className="inline-block py-1 transition hover:text-white">Legal, privacy &amp; NDPR</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Accounts &amp; Partners
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-200">
              <li><Link href="/signin" className="inline-block py-1 transition hover:text-white">Sign in / Create account</Link></li>
              <li><Link href="/account" className="inline-block py-1 transition hover:text-white">Guest account &amp; bookings</Link></li>
              <li><Link href="/account/issues" className="inline-block py-1 transition hover:text-white">Report a booking issue</Link></li>
              <li><Link href="/partners/apply" className="inline-block py-1 transition hover:text-white">Apply as a partner</Link></li>
              <li><Link href="/partners" className="inline-block py-1 transition hover:text-white">Partner workspace</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink-800 pt-6 text-xs text-ink-400">
          <span>
            © {new Date().getFullYear()} HAMLET.REST · An Abundance Abodes product · Lagos, Nigeria.
          </span>
          <span>
            Bookings confirm only after partner acceptance and server-verified payment.
          </span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Currency-aware nightly price formatted from owner's listed rate B via `getValidGuestNightlyNgn`
 * (`src/lib/discovery.ts` + `src/lib/pricing.ts`). Never displays a misleading ₦0 price.
 */
export function StayNightlyPrice({
  ownerNightlyRateNgn,
  className = '',
}: {
  ownerNightlyRateNgn: number;
  className?: string;
}) {
  const { formatPrice, currency } = useCurrency();
  const domesticNightly = getValidGuestNightlyNgn(ownerNightlyRateNgn);

  if (domesticNightly === null) {
    return (
      <span className={`text-xs font-semibold text-ink-500 ${className}`}>
        Price unavailable
      </span>
    );
  }

  return (
    <span className={className}>
      <strong className="font-mono text-lg font-extrabold text-ink-900">
        {formatPrice(domesticNightly, { roundWhole: true })}
      </strong>{' '}
      <span className="text-xs font-medium text-ink-500">
        / night{currency !== 'NGN' ? ` (${currency})` : ''}
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
  const validImages = useMemo(
    () => (stay.image_urls ?? []).map(url => url.trim()).filter(Boolean),
    [stay.image_urls],
  );
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [photoIndex, setPhotoIndex] = useState(0);

  const usableImages = useMemo(
    () => validImages.filter(url => !failedUrls[url]),
    [validImages, failedUrls],
  );
  const safeIdx = usableImages.length > 0 ? photoIndex % usableImages.length : 0;
  const activePhoto = usableImages[safeIdx] || '';

  const trust = getStayTrustStatus(stay);
  const locationText = (stay.area || '').trim() || 'Location pending';
  const corridor = stay.area ? (isMainlandArea(stay.area) ? 'Mainland' : 'Island') : null;
  const accommodationLabel = formatAccommodationLabel(stay.property_type, stay.bedrooms);
  const bedroomLabel = formatBedroomCountLabel(stay.bedrooms, stay.property_type);
  const amenities = (stay.amenities ?? []).filter(Boolean);
  const visibleAmenities = amenities.slice(0, 3);
  const extraAmenitiesCount = Math.max(0, amenities.length - visibleAmenities.length);
  const detailHref = `/stays/${encodeURIComponent(stay.id)}${querySuffix}`;

  function stepPhoto(event: MouseEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    if (usableImages.length <= 1) return;
    setPhotoIndex(prev => (prev + delta + usableImages.length) % usableImages.length);
  }

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(14,31,59,0.05),0_10px_28px_-14px_rgba(14,31,59,0.16)] transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-clay">
        <Link
          href={detailHref}
          aria-label={`View ${stay.title} in ${locationText}`}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-500"
        >
          {activePhoto ? (
            <img
              src={activePhoto}
              alt={`${stay.title} in ${locationText} — photo ${safeIdx + 1} of ${usableImages.length}`}
              loading="lazy"
              decoding="async"
              onError={() =>
                setFailedUrls(prev => ({
                  ...prev,
                  [activePhoto]: true,
                }))
              }
              className="h-full w-full object-cover opacity-100 transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-clay via-paper to-clay px-4 text-center">
              <div>
                <span aria-hidden="true" className="block font-display text-3xl text-brass-700/80">
                  ⌂
                </span>
                <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-wider text-ink-600">
                  Property photo not yet uploaded
                </span>
              </div>
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/55 to-transparent" />

        {corridor && (
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-ink-950/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brass-300 backdrop-blur-md">
            {corridor}
          </span>
        )}

        <span
          className={`pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs ${
            trust.verified
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border border-ink-200 bg-white/95 text-ink-900'
          }`}
        >
          {trust.verified ? (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ink-700" />
          )}
          <span>{trust.badge}</span>
        </span>

        {usableImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={e => stepPhoto(e, -1)}
              aria-label={`Previous photo of ${stay.title}`}
              className="absolute left-2.5 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200/80 bg-white/95 text-ink-900 shadow-xs transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={e => stepPhoto(e, 1)}
              aria-label={`Next photo of ${stay.title}`}
              className="absolute right-2.5 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200/80 bg-white/95 text-ink-900 shadow-xs transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
            <span className="pointer-events-none absolute bottom-2.5 right-3 rounded-full bg-ink-950/75 px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {safeIdx + 1} / {usableImages.length}
            </span>
          </>
        )}
      </div>

      <Link
        href={detailHref}
        className="flex flex-1 flex-col justify-between p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass-500"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{locationText}</span>
            <span className="text-ink-400">·</span>
            <span className="truncate text-ink-600">{accommodationLabel}</span>
          </div>

          <h3 className="mt-1.5 line-clamp-2 font-display text-lg font-bold leading-snug text-ink-900 transition group-hover:text-jade-700">
            {stay.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-ink-600">
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 shrink-0 text-ink-400" />
              {bedroomLabel}
            </span>
            {typeof stay.bathrooms === 'number' && stay.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                {stay.bathrooms} {stay.bathrooms === 1 ? 'bath' : 'baths'}
              </span>
            )}
            {typeof stay.capacity === 'number' && stay.capacity > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                Up to {stay.capacity} {stay.capacity === 1 ? 'guest' : 'guests'}
              </span>
            )}
          </div>

          {visibleAmenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibleAmenities.map(amenity => (
                <span
                  key={amenity}
                  className="max-w-full truncate rounded-full border border-ink-100 bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink-700"
                >
                  {amenity}
                </span>
              ))}
              {extraAmenitiesCount > 0 && (
                <span className="rounded-full border border-ink-100 bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink-500">
                  +{extraAmenitiesCount} more
                </span>
              )}
            </div>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            <Calendar className="h-3 w-3 shrink-0 text-brass-600" />
            <span>
              {stay.first_available_date
                ? `From ${stay.first_available_date} · Partner confirms dates`
                : 'Request to book · Partner confirms dates'}
            </span>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-ink-100 pt-3.5">
          <StayNightlyPrice ownerNightlyRateNgn={Number(stay.nightly_rate ?? 0)} />
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-ink-900 transition group-hover:translate-x-0.5">
            View stay <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
      </Link>
    </article>
  );
}
