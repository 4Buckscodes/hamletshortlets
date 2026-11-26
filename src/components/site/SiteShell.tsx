'use client';

import { HamletMark } from '@/components/Logo';
import { HoverImage } from '@/components/ui/motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Send,
  LayoutDashboard,
} from 'lucide-react';
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
import { formatNaira } from '@/lib/pricing';
import { stayPath } from '@/lib/stayRoutes';

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
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brass-500/20 text-brass-300">
              <Sparkles className="h-4 w-4 shrink-0" />
            </span>
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
  { href: '/lagos', label: 'Lagos guide' },
  { href: '/blog', label: 'Blog' },
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
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow =
      typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    // Dialog behaviour: page behind is inert, focus moves in, Tab stays inside, Esc closes.
    const drawer = drawerRef.current;
    const background: HTMLElement[] = [];
    for (let node: HTMLElement | null = drawer; node && node !== document.body; node = node.parentElement) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== node && sibling instanceof HTMLElement && !sibling.hasAttribute('inert')) background.push(sibling);
      }
    }
    background.forEach(node => node.setAttribute('inert', ''));
    const toggle = menuButtonRef.current;
    const focusables = () =>
      drawer
        ? (Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')) as HTMLElement[]).filter(
            node => node.offsetParent !== null,
          )
        : [];
    window.requestAnimationFrame(() => focusables()[1]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpenPath(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow;
      }
      background.forEach(node => node.removeAttribute('inert'));
      window.removeEventListener('keydown', onKeyDown);
      toggle?.focus();
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
      const [{ data: profile }, { data: membership }] = await Promise.all([
        db.from('profiles').select('full_name,role,account_status').eq('id', user.id).maybeSingle(),
        db.from('partner_network_memberships').select('status').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!active) return;
      const role =
        profile?.role === 'admin' ? 'admin' :
        (profile?.role === 'partner' || membership?.status === 'active') && profile?.account_status !== 'suspended' ? 'partner' : 'guest';
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

  const mobileGuestNav = [
    { href: '/stays', label: 'Explore stays' },
    { href: '/lagos', label: 'Lagos guide' },
    { href: '/blog', label: 'Blog' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/safety', label: 'Safety' },
    { href: '/faqs', label: 'FAQs' },
  ] as const;

  const mobileHostAndAboutNav = [
    // Partners and admins already have a workspace; "Partner with us" is noise for them.
    ...(session && session.role !== 'guest' ? [] : [{ href: '/partners/apply', label: 'Partner with us' }]),
    { href: '/about', label: 'About HAMLET' },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const WorkspaceIcon = session?.role === 'admin' ? ShieldCheck : session?.role === 'partner' ? Building2 : User;

  return (
    <header className="hm-header">
      <div className="hm-shell hm-header-inner">
        <Link href="/" aria-label="HAMLET.REST home" className="hm-wordmark">
          <HamletMark size={30} />HAMLET
        </Link>

        <nav aria-label="Primary navigation" className="hm-header-nav">
          {PRIMARY_NAV.map(item => (
            <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hm-header-actions">
          <button type="button" onClick={() => openHoratio()} aria-label="Ask Horatio — HAMLET assistant" className="hm-header-pill">
            <Sparkles size={14} aria-hidden="true" />
            <span>Horatio</span>
          </button>

          {(!session || session.role === 'guest') && (
            <Link href="/partners/apply" className="hm-header-pill hm-header-pill-wide">
              <LayoutDashboard size={14} aria-hidden="true" />
              <span>Partner with us</span>
            </Link>
          )}

          {session ? (
            <>
              <Link href={workspaceHref} className="hm-header-pill hm-header-pill-strong">
                <WorkspaceIcon size={14} aria-hidden="true" />
                <span>{workspaceLabel}</span>
              </Link>
              <button type="button" onClick={() => void handleSignOut()} aria-label="Sign out" title="Sign out" className="hm-header-icon">
                <LogOut size={15} aria-hidden="true" />
              </button>
            </>
          ) : (
            <Link href="/signin" className="hm-btn hm-btn-lime hm-btn-sm">
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          ref={menuButtonRef}
          onClick={() => setDrawerOpen(prev => !prev)}
          aria-expanded={drawerOpen}
          aria-controls="hamlet-mobile-drawer"
          aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="hm-header-icon hm-header-menu"
        >
          {drawerOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 8h16M4 16h16" />
            </svg>
          )}
        </button>
      </div>

      {drawerOpen && (
        <div ref={drawerRef} className="hm-drawer" role="dialog" aria-modal="true" aria-label="Menu">
          <nav id="hamlet-mobile-drawer" aria-label="Mobile navigation" className="hm-drawer-inner">
            <div className="hm-drawer-top">
              <Link href="/" onClick={() => setDrawerOpen(false)} aria-label="HAMLET.REST home" className="hm-wordmark">
                <HamletMark size={30} />HAMLET
              </Link>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu" className="hm-header-icon">
                <X size={18} aria-hidden="true" />
              </button>
            </div>


            <p className="hm-label">For guests</p>
            <div className="hm-drawer-list">
              {mobileGuestNav.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} aria-current={isActive(item.href) ? 'page' : undefined}>
                  {item.label}
                  {isActive(item.href) ? <span className="hm-drawer-here">You&apos;re here</span> : <ArrowRight size={18} aria-hidden="true" />}
                </Link>
              ))}
            </div>

            <p className="hm-label">For hosts &amp; about</p>
            <div className="hm-drawer-list">
              {mobileHostAndAboutNav.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} aria-current={isActive(item.href) ? 'page' : undefined}>
                  {item.label}
                  {isActive(item.href) ? <span className="hm-drawer-here">You&apos;re here</span> : <ArrowRight size={18} aria-hidden="true" />}
                </Link>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                openHoratio();
              }}
              className="hm-drawer-horatio"
            >
              <span>Ask Horatio — HAMLET assistant</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <div className="hm-drawer-actions">
              {session ? (
                <>
                  <p className="hm-drawer-signed">Signed in as {session.email}</p>
                  <Link href={workspaceHref} onClick={() => setDrawerOpen(false)} className="hm-btn hm-btn-lime hm-btn-block">
                    {workspaceLabel}
                  </Link>
                  <Link href="/account/bookings" onClick={() => setDrawerOpen(false)} className="hm-btn hm-btn-ghost hm-btn-block">
                    My bookings
                  </Link>
                  <button type="button" onClick={() => void handleSignOut()} className="hm-btn hm-btn-ghost hm-btn-block">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signin?mode=signup" onClick={() => setDrawerOpen(false)} className="hm-btn hm-btn-ghost hm-btn-block">
                    Create guest account
                  </Link>
                  <Link href="/signin" onClick={() => setDrawerOpen(false)} className="hm-btn hm-btn-lime hm-btn-block">
                    Sign in
                  </Link>
                </>
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
      { href: '/blog', label: 'Blog' },
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
    <footer className="hm-footer">
      <div className="hm-shell">
        <div className="hm-footer-grid">
          <div className="hm-footer-brand">
            <Link href="/" aria-label="HAMLET.REST home" className="hm-wordmark">
              <HamletMark size={30} />HAMLET
            </Link>
            <p>Your stay, sorted. Verified shortlets across Lagos Mainland and Lagos Island, built by Abundance Abodes.</p>
            <p>
              Contact: <a href="mailto:hello@hamlet.rest">hello@hamlet.rest</a>
            </p>
            <p>
              <a href="https://www.instagram.com/hamletrest/" target="_blank" rel="me noopener noreferrer" aria-label="HAMLET on Instagram (opens in a new tab)">
                Instagram @hamletrest
              </a>
            </p>
            <p>
              <a href="https://www.tiktok.com/@hamlet.rest" target="_blank" rel="me noopener noreferrer" aria-label="HAMLET on TikTok (opens in a new tab)">
                TikTok @hamlet.rest
              </a>
            </p>
          </div>

          {FOOTER_LINK_GROUPS.map(group => {
            const isOpen = Boolean(openSections[group.id]);
            const panelId = `footer-accordion-${group.id}`;
            return (
              <div key={group.id} className="hm-footer-group">
                <h2 className="hm-footer-heading">
                  <button type="button" onClick={() => toggleSection(group.id)} aria-expanded={isOpen} aria-controls={panelId}>
                    {group.title}
                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </button>
                  <span className="hm-footer-heading-static">{group.title}</span>
                </h2>
                <ul id={panelId} className="hm-footer-links" data-open={isOpen ? 'true' : undefined}>
                  {group.links.map(link => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="hm-footer-bottom">
          <p>© {new Date().getFullYear()} HAMLET.REST · An Abundance Abodes product · Lagos, Nigeria.</p>
          <p>Bookings confirm only after partner acceptance and server-verified payment.</p>
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
  withFeesNote = false,
}: {
  guestNightlyNgn: number;
  className?: string;
  /** Append "· fees included" when the surrounding card does not already say it. */
  withFeesNote?: boolean;
}) {
  const { formatPrice, currency, activeRateIsAvailable } = useCurrency();
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
      <strong className="hm-money text-lg font-extrabold text-ink-900">
        {formatPrice(domesticNightly, { roundWhole: true })}
      </strong>{' '}
      <span className="text-xs font-medium text-ink-500">
        / night{withFeesNote ? ' · fees included' : ''}
      </span>
      {currency !== 'NGN' && activeRateIsAvailable ? (
        <span className="hm-naira-ref">{formatNaira(domesticNightly)} / night in naira</span>
      ) : null}
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
  const detailHref = `${stayPath(stay)}${querySuffix}`;

  function stepPhoto(event: MouseEvent<HTMLButtonElement>, delta: number) {
    event.preventDefault();
    event.stopPropagation();
    if (usableImages.length <= 1) return;
    setPhotoIndex(prev => (prev + delta + usableImages.length) % usableImages.length);
  }

  const facts = [
    bedroomLabel,
    typeof stay.bathrooms === 'number' && stay.bathrooms > 0 ? `${stay.bathrooms} ${stay.bathrooms === 1 ? 'bath' : 'baths'}` : null,
    typeof stay.capacity === 'number' && stay.capacity > 0 ? `Up to ${stay.capacity} ${stay.capacity === 1 ? 'guest' : 'guests'}` : null,
  ].filter(Boolean).join(', ');

  return (
    <article className="hl-card" data-hamlet-reveal>
      <div className="hl-photo">
        <Link href={detailHref} aria-label={`View ${stay.title} in ${locationText}`} className="hl-photo-link">
          {activePhoto ? (
            <HoverImage>
              <img
                src={activePhoto}
                alt={`${stay.title} in ${locationText} — photo ${safeIdx + 1} of ${usableImages.length}`}
                loading="lazy"
                decoding="async"
                onError={() => setFailedUrls(prev => ({ ...prev, [activePhoto]: true }))}
              />
            </HoverImage>
          ) : (
            <span className="hl-photo-empty">Photo coming soon</span>
          )}
        </Link>
        <span className="hl-badge">
          {trust.verified ? <BadgeCheck size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
          {trust.badge}
        </span>
        {usableImages.length > 1 && (
          <>
            <button type="button" onClick={e => stepPhoto(e, -1)} aria-label={`Previous photo of ${stay.title}`} className="hl-step hl-step-prev"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" onClick={e => stepPhoto(e, 1)} aria-label={`Next photo of ${stay.title}`} className="hl-step hl-step-next"><ChevronRight size={18} aria-hidden="true" /></button>
            <span className="hl-count">{safeIdx + 1} of {usableImages.length}</span>
          </>
        )}
      </div>
      <Link href={detailHref} className="hl-body">
        <p className="hl-where">{locationText}{corridor && !locationText.toLowerCase().includes(corridor.toLowerCase()) ? `, ${corridor}` : ''}<span> · {accommodationLabel}</span></p>
        <h3 className="hl-title">{stay.title}</h3>
        <p className="hl-facts">{facts}{visibleAmenities.length ? ` · ${visibleAmenities.join(', ')}${extraAmenitiesCount > 0 ? ` +${extraAmenitiesCount}` : ''}` : ''}</p>
        <p className="hl-when">
          {stay.first_available_date ? `From ${stay.first_available_date}. Partner confirms dates.` : 'Request to book. Partner confirms dates.'}
        </p>
        <div className="hl-price"><StayNightlyPrice guestNightlyNgn={Number(stay.guest_nightly_ngn ?? 0)} withFeesNote /></div>
      </Link>
    </article>
  );
}
