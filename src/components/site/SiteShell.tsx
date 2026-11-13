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
  getValidPublicGuestNightlyNgn,
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
      text: 'Lagos Mainland covers Yaba, Surulere, Shomolu, Gbagada, Maryland, and Ikeja GRA. Lagos Island & Lekki covers Victoria Island, Ikoyi, Lekki Phase 1, Ikate, Oniru, and Ajah.',
      links: [
        { label: 'Lagos Mainland stays', href: '/stays?area=Lagos+Mainland' },
        { label: 'Lagos Island stays', href: '/stays?side=island' },
        { label: 'Lagos guide', href: '/lagos' },
      ],
    };
  }

  if (q.includes('price') || q.includes('fee') || q.includes('usd') || q.includes('gbp') || q.includes('dollar') || q.includes('pound') || q.includes('caution') || q.includes('deposit') || q.includes('₦') || q.includes('currency')) {
    return {
      text: `Prices display in ${currency}. NGN stay rates include our 20% guest service fee upfront. USD and GBP quotes include a single 10% FX buffer and settle in NGN via Paystack. Caution deposits are itemised separately without markup.`,
      links: [
        { label: 'Explore stays', href: '/stays' },
        { label: 'Pricing & legal terms', href: '/legal' },
      ],
    };
  }

  if (q.includes('partner') || q.includes('owner') || q.includes('list') || q.includes('agent') || q.includes('commission')) {
    return {
      text: "HAMLET provides property owners with access to listing, visibility, booking and property management services. Applicable service fees, verification charges, storage limits and optional paid services will be communicated transparently under HAMLET's current pricing and service policies.",
      links: [
        { label: 'Apply as a partner', href: '/partners/apply' },
        { label: 'Partner workspace', href: '/partners' },
      ],
    };
  }

  if (q.includes('pay') || q.includes('paystack') || q.includes('confirm') || q.includes('cancel') || q.includes('hold')) {
    return {
      text: 'No charge is taken on request. Once the host confirms, a 48-hour Paystack payment window opens in My Bookings.',
      links: [
        { label: 'How HAMLET works', href: '/how-it-works' },
        { label: 'My bookings', href: '/account/bookings' },
      ],
    };
  }

  return {
    text: 'Ask about Lagos neighbourhoods, property verification, pricing, 48-hour payment holds, or listing a property.',
    links: [
      { label: 'Explore stays', href: '/stays' },
      { label: 'Verification & safety', href: '/safety' },
      { label: 'FAQs', href: '/faqs' },
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
            <div>
              <h2 className="font-display text-lg font-bold text-white">Horatio</h2>
              <p className="text-[11px] font-medium text-ink-300">
                Stays, pricing &amp; booking guide
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
            <p className="font-bold text-ink-900">Quick questions</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
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
    const previousOverflow =
      typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpenPath(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow;
      }
      window.removeEventListener('keydown', onKeyDown);
    };
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

  const isHome = pathname === '/';

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

  const mobileNav = [
    { href: '/stays', label: 'Explore stays' },
    { href: '/lagos', label: 'Lagos guide' },
    { href: '/partners/apply', label: 'Partner with us' },
    { href: '/about', label: 'About HAMLET' },
  ] as const;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        isHome
          ? 'border-b border-[#E9E2D5] bg-[#F6F1E7]/95 text-[#1C2437] shadow-[0_4px_24px_rgba(35,45,34,.04)] backdrop-blur-xl'
          : 'border-b border-ink-100/90 bg-paper/95 lg:bg-paper/92 lg:backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-7">
          <Link
            href="/"
            aria-label="HAMLET.REST home"
            className="inline-flex min-h-[44px] shrink-0 items-center"
          >
            {isHome ? (
              <span className="font-display text-[26px] font-bold tracking-[1px] text-[#1C2437]">
                HAMLET<span className="text-[#C9A45C]">.</span>
              </span>
            ) : (
              <HamletWordmark />
            )}
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
                    isHome
                      ? active
                        ? 'font-bold text-[#1C2437] underline decoration-[#C9A45C] decoration-2 underline-offset-[9px]'
                        : 'text-[#5D6577] hover:text-[#1C2437]'
                      : active
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
            className={`inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition ${
              isHome
                ? 'border border-[#D8C9B1] bg-white/70 text-[#1C2437] hover:border-[#C9A45C] hover:bg-white'
                : 'border border-brass-400/60 bg-white text-ink-900 shadow-2xs hover:border-brass-500 hover:bg-brass-200/25'
            }`}
          >
            <span>Horatio</span>
          </button>

          {(!session || session.role === 'guest') && (
            <Link
              href="/partners/apply"
              className={`hidden min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition xl:inline-flex ${
                isHome
                  ? 'border border-[#E3D9C7] bg-transparent text-[#1C2437] hover:border-[#C9A45C]'
                  : 'border border-ink-200 bg-white text-ink-800 hover:border-brass-500 hover:text-ink-950'
              }`}
            >
              <LayoutDashboard
                className={`h-3.5 w-3.5 shrink-0 ${isHome ? 'text-[#C9A45C]' : 'text-brass-600'}`}
              />
              <span>Partner with us</span>
            </Link>
          )}

          {session ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={workspaceHref}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-full px-3.5 text-xs font-bold transition ${
                  isHome
                    ? 'border border-[#E3D9C7] bg-white text-[#1C2437] hover:border-[#C9A45C]'
                    : 'border border-ink-200 bg-white text-ink-900 hover:border-ink-900'
                }`}
              >
                {session.role === 'admin' ? (
                  <ShieldCheck
                    className={`h-3.5 w-3.5 shrink-0 ${isHome ? 'text-[#C9A45C]' : 'text-brass-600'}`}
                  />
                ) : session.role === 'partner' ? (
                  <Building2
                    className={`h-3.5 w-3.5 shrink-0 ${isHome ? 'text-[#C9A45C]' : 'text-brass-600'}`}
                  />
                ) : (
                  <User
                    className={`h-3.5 w-3.5 shrink-0 ${isHome ? 'text-[#C9A45C]' : 'text-brass-600'}`}
                  />
                )}
                <span>{workspaceLabel}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sign out"
                title="Sign out"
                className={`inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full transition ${
                  isHome
                    ? 'border border-[#232D45] bg-transparent text-[#EFE8D9] hover:border-[#C9A45C] hover:text-[#F6F1E7]'
                    : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900'
                }`}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className={`inline-flex min-h-[38px] items-center justify-center rounded-full px-4.5 text-[12.5px] font-bold shadow-2xs transition ${
                isHome
                  ? 'bg-[#1C2437] text-white hover:bg-[#232D45]'
                  : 'bg-ink-900 text-white hover:bg-ink-800'
              }`}
            >
              Sign in
            </Link>
          )}
        </div>

        <div className="flex items-center lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-expanded={drawerOpen}
            aria-controls="hamlet-mobile-drawer"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition ${
              isHome
                ? 'border border-[#E3D9C7] bg-white text-[#1C2437] hover:border-[#C9A45C]'
                : 'border border-[#E3D9C7] bg-white text-[#1C2437] shadow-2xs hover:border-[#1C2437]'
            }`}
          >
            {drawerOpen ? (
              <X className="h-5 w-5 shrink-0" />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M4 8h16M4 16h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[100] isolate h-dvh w-screen overflow-y-auto bg-[#F6F1E7] text-[#1C2437] lg:hidden">
          <nav
            id="hamlet-mobile-drawer"
            aria-label="Mobile navigation"
            className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overscroll-y-contain px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                aria-label="HAMLET.REST home"
                className="inline-flex min-h-[44px] items-center"
              >
                <span className="font-display text-[26px] font-bold tracking-[1px] text-[#1C2437]">
                  HAMLET<span className="text-[#C9A45C]">.</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#E3D9C7] bg-transparent text-[#1C2437] transition hover:border-[#1C2437]"
              >
                <X className="h-[18px] w-[18px] shrink-0" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                openHoratio();
              }}
              className="mt-1 flex min-h-[46px] w-full shrink-0 cursor-pointer items-center justify-between rounded-full border border-[#C9A45C]/80 bg-white px-4 text-[14px] font-semibold text-[#1C2437] transition hover:border-[#C9A45C] hover:bg-[#EFE8D9]"
            >
              <span>Ask Horatio</span>
              <span aria-hidden="true" className="text-[#8B6B36]">
                →
              </span>
            </button>

            <nav aria-label="Quick links" className="mt-4 grid gap-2">
              {mobileNav.map(item => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[48px] items-center justify-between border-b border-[#EFE8D9] px-1 text-[15px] font-semibold transition ${
                      active ? 'text-[#1C2437] underline decoration-[#C9A45C] decoration-2 underline-offset-8' : 'text-[#5D6577] hover:text-[#1C2437]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className={active ? 'text-[#C9A45C]' : 'text-[#8B6B36]'}>→</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-5">
              {session ? (
                <div className="grid gap-2.5">
                  <Link
                    href={workspaceHref}
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-[28px] bg-[#1C2437] px-6 text-[16px] font-semibold text-[#F6F1E7] transition hover:bg-[#232D45]"
                  >
                    {workspaceLabel}
                  </Link>
                  {session.role !== 'guest' && (
                    <Link
                      href="/account"
                      onClick={() => setDrawerOpen(false)}
                      className="flex min-h-[52px] w-full items-center justify-center rounded-[28px] border border-[#1C2437] bg-white px-5 text-[15px] font-semibold text-[#1C2437]"
                    >
                      Guest account &amp; bookings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-[28px] border border-[#E3D9C7] bg-white px-5 text-sm font-semibold text-[#1C2437]"
                  >
                    Sign out ({session.email})
                  </button>
                </div>
              ) : (
                <div className="grid gap-2.5">
                  <Link
                    href="/signin"
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-[28px] bg-[#1C2437] px-6 text-[16px] font-semibold text-[#F6F1E7] transition hover:bg-[#232D45]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signin?mode=signup"
                    onClick={() => setDrawerOpen(false)}
                    className="flex min-h-[56px] w-full items-center justify-center rounded-[28px] border border-[#1C2437] bg-white px-6 text-[16px] font-semibold text-[#1C2437] transition hover:bg-[#EEEAE0]"
                  >
                    Create guest account
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER_LINK_GROUPS = [
  {
    id: 'explore',
    title: 'Explore Lagos',
    links: [
      { href: '/stays', label: 'All Lagos stays' },
      { href: '/stays?area=Lagos+Mainland', label: 'Lagos Mainland (Yaba, Shomolu, Surulere)' },
      { href: '/stays?area=Victoria+Island', label: 'Victoria Island & Ikoyi' },
      { href: '/stays?area=Lekki+Phase+1', label: 'Lekki Phase 1, Ikate & Oniru' },
      { href: '/lagos', label: 'Lagos neighbourhood guide' },
    ],
  },
  {
    id: 'trust',
    title: 'Trust & Support',
    links: [
      { href: '/how-it-works', label: 'How bookings work' },
      { href: '/safety', label: 'Verification & safety' },
      { href: '/about', label: 'About HAMLET' },
      { href: '/faqs', label: 'FAQs' },
      { href: '/legal', label: 'Legal, privacy & NDPR' },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts & Partners',
    links: [
      { href: '/signin', label: 'Sign in / Create account' },
      { href: '/account', label: 'Guest account & bookings' },
      { href: '/account/issues', label: 'Report a booking issue' },
      { href: '/partners/apply', label: 'Apply as a partner' },
      { href: '/partners', label: 'Partner workspace' },
    ],
  },
] as const;

export function SiteFooter() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function toggleSection(sectionId: string) {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  return (
    <footer className="border-t border-[#232D45] bg-[#1C2437] text-[#F6F1E7]">
      <div className="mx-auto max-w-6xl px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:py-12">
        {/* Mobile editorial brand block + collapsible accordion navigation (< md) */}
        <div className="md:hidden">
          <Link href="/" className="inline-flex items-center">
            <span className="font-display text-[26px] font-bold tracking-[1px] text-[#F6F1E7]">
              HAMLET<span className="text-[#C9A45C]">.</span>
            </span>
          </Link>
          <p className="mt-2.5 text-[14px] leading-[1.5] text-[#EFE8D9]">
            Your stay, sorted. Verified shortlets across Lagos Mainland and Lagos Island, built by Abundance Abodes.
          </p>
          <p className="mt-2.5 text-[14px] text-[#EFE8D9]">
            Contact:{' '}
            <a
              href="mailto:hello@hamlet.rest"
              className="font-medium text-[#F3E7CF] underline underline-offset-4 transition hover:text-white"
            >
              hello@hamlet.rest
            </a>
          </p>

          <div className="mt-5 divide-y divide-[#232D45] border-t border-[#232D45]">
            {FOOTER_LINK_GROUPS.map(group => {
              const isOpen = Boolean(openSections[group.id]);
              const panelId = `footer-accordion-${group.id}`;
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(group.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex min-h-[52px] w-full cursor-pointer items-center justify-between py-3 text-left"
                  >
                    <span className="text-[12px] font-semibold uppercase tracking-[2px] text-[#C9A45C]">
                      {group.title}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-xl font-normal leading-none text-[#C9A45C]"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <ul
                      id={panelId}
                      className="space-y-1 pb-3 text-[15px] text-[#F6F1E7]"
                    >
                      {group.links.map(link => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="block py-2 transition hover:text-[#F3E7CF]"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop 4-column layout (>= md) */}
        <div className="hidden gap-8 md:grid md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <span className="font-display text-[26px] font-bold tracking-[1px] text-[#F6F1E7]">
                HAMLET<span className="text-[#C9A45C]">.</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[#EFE8D9]">
              Your stay, sorted. Verified shortlets across Lagos Mainland and Lagos Island, built by Abundance Abodes.
            </p>
            <p className="mt-2.5 text-xs text-[#EFE8D9]">
              Contact:{' '}
              <a
                href="mailto:hello@hamlet.rest"
                className="font-semibold text-[#F3E7CF] transition hover:text-white"
              >
                hello@hamlet.rest
              </a>
            </p>
          </div>

          {FOOTER_LINK_GROUPS.map(group => (
            <div key={group.id}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[2px] text-[#C9A45C]">
                {group.title}
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-[#F6F1E7]">
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block py-1 transition hover:text-[#F3E7CF]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-1 text-[12px] leading-[1.5] text-[#AAB8AC] md:mt-10 md:flex md:flex-wrap md:items-center md:justify-between md:gap-4 md:space-y-0 md:border-t md:border-[#232D45] md:pt-6">
          <p className="m-0">
            © {new Date().getFullYear()} HAMLET.REST · An Abundance Abodes product · Lagos, Nigeria.
          </p>
          <p className="m-0">
            Bookings confirm only after partner acceptance and server-verified payment.
          </p>
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
  guestNightlyNgn,
  className = '',
}: {
  guestNightlyNgn: number;
  className?: string;
}) {
  const { formatPrice, currency } = useCurrency();
  const domesticNightly = getValidPublicGuestNightlyNgn(guestNightlyNgn);

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
  const [carouselPaused, setCarouselPaused] = useState(false);

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

  useEffect(() => {
    if (usableImages.length < 2 || carouselPaused) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setPhotoIndex(prev => (prev + 1) % usableImages.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [carouselPaused, usableImages.length]);

  function stepPhoto(event: MouseEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    if (usableImages.length <= 1) return;
    setPhotoIndex(prev => (prev + delta + usableImages.length) % usableImages.length);
  }

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_1px_2px_rgba(14,31,59,0.05),0_10px_28px_-14px_rgba(14,31,59,0.16)] transition duration-300 hover:-translate-y-1 hover:border-ink-300 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-clay" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)} onFocusCapture={() => setCarouselPaused(true)} onBlurCapture={() => setCarouselPaused(false)}>
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
          <StayNightlyPrice guestNightlyNgn={Number(stay.guest_nightly_ngn ?? 0)} />
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold text-ink-900 transition group-hover:translate-x-0.5">
            View stay <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          </span>
        </div>
      </Link>
    </article>
  );
}
