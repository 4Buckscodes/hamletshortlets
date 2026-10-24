import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import {
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Heart,
  Sparkles,
  ShieldCheck,
  Lock,
  Banknote,
} from 'lucide-react';
import { HamletWordmark } from './Logo';
import { CurrencyToggle } from './CurrencyToggle';
import { useHoratio } from './HoratioDrawer';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import { useWishlist } from '../lib/wishlist';
import {
  HAMLET_BRAND_NAME,
  HAMLET_MANTRA,
  HAMLET_PARENT_COMPANY,
  HAMLET_POSITIONING,
  HAMLET_TAGLINE,
  HAMLET_USP,
} from '../lib/brand';
import { buildAuthPath } from '../lib/authRedirect';

export function GuestNavbar() {
  const { state, signOut } = useHamlet();
  const { toast } = useToast();
  const { savedIds } = useWishlist();
  const { openHoratio } = useHoratio();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const s = state.session;
  const dashboardPath =
    s?.role === 'admin' ? '/admin' : s?.role === 'partner' ? '/partner' : '/account';
  const propertyRedirect = location.pathname.startsWith('/stays/')
    ? `${location.pathname}${location.search}`
    : null;
  const signUpHref = buildAuthPath({ signup: true, redirect: propertyRedirect });
  const signInHref = buildAuthPath({ signup: false, redirect: propertyRedirect });

  const approvedIdSet = new Set(
    state.properties.filter(p => p.status === 'approved').map(p => p.id),
  );
  const savedCount = savedIds.filter(id => approvedIdSet.has(id)).length;

  const nav = [
    { to: '/stays', label: 'Explore stays' },
    { to: '/lagos', label: 'Lagos' },
    { to: '/how-it-works', label: 'How it works' },
    { to: '/safety', label: 'Safety' },
    { to: '/faqs', label: 'FAQs' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/90 bg-paper/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2.5 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" aria-label="HAMLET home" className="shrink-0">
            <HamletWordmark />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    isActive
                      ? 'bg-ink-900 text-white shadow-2xs'
                      : 'text-ink-600 hover:bg-white/80 hover:text-ink-900'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CurrencyToggle className="hidden sm:inline-flex" />
          <CurrencyToggle variant="compact" className="sm:hidden" />

          <button
            type="button"
            onClick={() => openHoratio()}
            aria-label="Ask Horatio — HAMLET assistant"
            className="hidden items-center gap-1.5 rounded-full border border-brass-400/60 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-900 shadow-2xs transition hover:border-brass-500 hover:bg-brass-200/25 md:inline-flex [&>svg]:shrink-0"
          >
            <Sparkles size={13} className="text-brass-600" />
            <span>Horatio</span>
          </button>

          <Link
            to={savedCount > 0 ? '/stays?saved=1' : '/stays'}
            aria-label={`Saved stays (${savedCount})`}
            title="Saved stays"
            className="hidden items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] font-bold text-ink-800 transition hover:border-ink-400 sm:inline-flex [&>svg]:shrink-0"
          >
            <Heart
              size={13}
              className={savedCount > 0 ? 'fill-brass-500 text-brass-600' : 'text-ink-500'}
            />
            <span className="tabular-nums">{savedCount}</span>
          </Link>

          <Link
            to="/partner/register"
            className="hidden items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-ink-800 transition hover:border-brass-500 hover:text-ink-950 xl:inline-flex [&>svg]:shrink-0"
          >
            <LayoutDashboard size={13} className="text-brass-600" />
            <span>Partner with us</span>
          </Link>

          {s ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu(v => !v)}
                className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-ink-400"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-black text-white">
                  {s.name
                    .split(' ')
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span className="hidden max-w-28 truncate text-[12px] font-bold text-ink-800 sm:block">
                  {s.name.split(' ')[0]}
                </span>
                <ChevronDown size={14} className="shrink-0 text-ink-400" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl">
                    <div className="border-b border-ink-50 px-4 py-3">
                      <p className="truncate text-sm font-bold text-ink-900">{s.name}</p>
                      <p className="truncate text-[11px] text-ink-500">
                        {s.email} · {s.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        navigate(dashboardPath);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"
                    >
                      <LayoutDashboard size={15} className="shrink-0" />
                      {s.role === 'admin'
                        ? 'Admin console (Elsinore)'
                        : s.role === 'partner'
                          ? 'Open partner workspace'
                          : 'My bookings'}
                    </button>
                    {s.role === 'guest' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenu(false);
                          navigate('/account');
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"
                      >
                        <User size={15} className="shrink-0" />
                        Account & support
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setMenu(false);
                        try {
                          await signOut();
                          toast('Signed out', 'info');
                          navigate('/');
                        } catch (error) {
                          toast(
                            error instanceof Error ? error.message : 'Could not sign out.',
                            'error',
                          );
                        }
                      }}
                      className="flex w-full items-center gap-2.5 border-t border-ink-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"
                    >
                      <LogOut size={15} className="shrink-0" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to={signUpHref}
                className="hidden rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[12px] font-bold text-ink-900 transition hover:border-ink-400 hover:bg-ink-50 sm:inline-flex"
              >
                Create account
              </Link>
              <Link to={signInHref} className="btn-dark !rounded-full !px-3.5 !py-2 text-[12px] sm:!px-4">
                Sign in
              </Link>
            </div>
          )}

          <button
            type="button"
            className="shrink-0 rounded-xl border border-ink-200 bg-white p-2 text-ink-900 lg:hidden"
            onClick={() => setOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-100 bg-paper px-4 py-4 shadow-lg lg:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5">
            <span className="text-[11.5px] font-bold text-ink-600">Stay currency</span>
            <CurrencyToggle />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openHoratio();
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-brass-400/60 bg-white px-3 py-2.5 text-xs font-bold text-ink-900"
            >
              <Sparkles size={14} className="shrink-0 text-brass-600" />
              Ask Horatio
            </button>
            <Link
              to={savedCount > 0 ? '/stays?saved=1' : '/stays'}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-xs font-bold text-ink-800"
            >
              <Heart
                size={14}
                className={`shrink-0 ${savedCount > 0 ? 'fill-brass-500 text-brass-600' : 'text-ink-500'}`}
              />
              Saved ({savedCount})
            </Link>
          </div>
          <div className="flex flex-col gap-1">
            {nav.map(n => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-white"
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/about"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-800 hover:bg-white"
            >
              About HAMLET
            </Link>
            <Link
              to="/partner/register"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 hover:bg-white"
            >
              <LayoutDashboard size={15} className="shrink-0 text-brass-600" />
              Join HAMLET as a partner
            </Link>
            {!s && (
              <Link
                to={signUpHref}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-900 hover:bg-white"
              >
                Create guest account
              </Link>
            )}
            {!s && (
              <Link
                to={signInHref}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink-800 bg-ink-950 text-ink-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <HamletWordmark light />
            <p className="mt-3 text-[11.5px] font-bold uppercase tracking-[0.18em] text-brass-400">
              {HAMLET_BRAND_NAME} · {HAMLET_USP}
            </p>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ink-300">
              <strong className="text-paper">{HAMLET_TAGLINE}</strong> You have plans to make. We help you find a verified place to stay in Lagos, understand every naira before you commit, and arrive with fewer unanswered questions.
            </p>
            <p className="mt-3 text-[12px] font-medium italic text-ink-300">
              “{HAMLET_MANTRA}”
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10.5px] font-bold text-ink-300">
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900 px-2.5 py-1">
                <ShieldCheck size={12} className="shrink-0 text-brass-400" /> NDPR-aligned
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900 px-2.5 py-1">
                <Lock size={12} className="shrink-0 text-brass-400" /> Paystack webhook-secured
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900 px-2.5 py-1">
                <Banknote size={12} className="shrink-0 text-brass-400" /> 0% owner fee
              </span>
            </div>
            <p className="mt-4 text-[11px] font-semibold text-ink-400">
              By {HAMLET_PARENT_COMPANY} · {HAMLET_POSITIONING}
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Discover Lagos
            </p>
            <ul className="mt-3.5 space-y-2.5 text-[13px] font-medium">
              <li><Link to="/stays" className="transition hover:text-white">Explore available stays</Link></li>
              <li><Link to="/stays?area=Lagos+Mainland" className="transition hover:text-white">Lagos Mainland (Yaba, Surulere, Shomolu)</Link></li>
              <li><Link to="/stays?area=Victoria+Island" className="transition hover:text-white">Victoria Island & Ikoyi</Link></li>
              <li><Link to="/stays?area=Lekki+Phase+1" className="transition hover:text-white">Lekki Phase 1, Oniru & Ajah</Link></li>
              <li><Link to="/lagos" className="transition hover:text-white">Lagos neighbourhood field guide</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Ceremony & trust
            </p>
            <ul className="mt-3.5 space-y-2.5 text-[13px] font-medium">
              <li><Link to="/how-it-works" className="transition hover:text-white">How HAMLET works</Link></li>
              <li><Link to="/safety" className="transition hover:text-white">Safety & protection</Link></li>
              <li><Link to="/about" className="transition hover:text-white">About & four pillars</Link></li>
              <li><Link to="/faqs" className="transition hover:text-white">Shortlet FAQs</Link></li>
              <li><Link to="/account" className="transition hover:text-white">My bookings & support</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-400">
              Partners & owners
            </p>
            <ul className="mt-3.5 space-y-2.5 text-[13px] font-medium">
              <li><Link to="/partner/register" className="transition hover:text-white">List a property · 0% owner fee</Link></li>
              <li><Link to="/partner/register" className="transition hover:text-white">Closing agents & referral partners</Link></li>
              <li><Link to="/signin" className="transition hover:text-white">Open partner workspace</Link></li>
              <li><Link to="/legal/pricing" className="transition hover:text-white">Fees, FX buffer & caution deposits</Link></li>
              <li><Link to="/legal/trust" className="transition hover:text-white">Verification & mandate rules</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-ink-800 pt-6 text-[11.5px] text-ink-400 sm:flex-row sm:items-center">
          <p>© 2026 HAMLET Marketplace Ltd · {HAMLET_PARENT_COMPANY} · {HAMLET_TAGLINE}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/legal/privacy" className="transition hover:text-white">Privacy & NDPR</Link>
            <Link to="/legal/terms" className="transition hover:text-white">Booking terms</Link>
            <Link to="/legal/pricing" className="transition hover:text-white">Fees & settlement</Link>
            <Link to="/safety" className="transition hover:text-white">Guest protection</Link>
            <a href="/llms.txt" className="transition hover:text-white">LLMs.txt</a>
            <a href="/sitemap.xml" className="transition hover:text-white">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <GuestNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
