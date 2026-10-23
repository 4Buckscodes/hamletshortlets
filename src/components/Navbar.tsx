import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { HamletWordmark } from './Logo';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import { HAMLET_TAGLINE } from '../lib/brand';

export function GuestNavbar() {
  const { state, signOut } = useHamlet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const s = state.session;
  const dashboardPath = s?.role === 'admin' ? '/admin' : s?.role === 'partner' ? '/partner' : '/account';

  const nav = [
    { to: '/stays', label: 'Explore stays' },
    { to: '/legal/terms', label: 'How booking works' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="HAMLET home"><HamletWordmark /></Link>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `text-[13px] font-semibold transition hover:text-jade-700 ${isActive ? 'text-jade-700' : 'text-ink-600'}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/partner/register" className="hidden items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[12px] font-bold text-ink-800 transition hover:border-jade-400 hover:text-jade-800 lg:inline-flex">
            <LayoutDashboard size={14} /> List your property
          </Link>
          {s ? (
            <div className="relative">
              <button onClick={() => setMenu(v => !v)} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2 transition hover:border-ink-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-jade-700 text-[11px] font-black text-white">{s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                <span className="hidden text-[12px] font-bold text-ink-800 sm:block">{s.name.split(' ')[0]}</span>
                <ChevronDown size={14} className="text-ink-400" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl">
                    <div className="border-b border-ink-50 px-4 py-3">
                      <p className="text-sm font-bold text-ink-900">{s.name}</p>
                      <p className="text-[11px] text-ink-500">{s.email} · {s.role}</p>
                    </div>
                    <button onClick={() => { setMenu(false); navigate(dashboardPath); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"><LayoutDashboard size={15} />{s.role === 'admin' ? 'Admin console' : s.role === 'partner' ? 'Partner workspace' : 'My bookings'}</button>
                    {s.role === 'guest' && <button onClick={() => { setMenu(false); navigate('/account'); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-ink-800 hover:bg-ink-50"><User size={15} />Account & feedback</button>}
                    <button onClick={async () => {
                      setMenu(false);
                      try {
                        await signOut();
                        toast('Signed out', 'info');
                        navigate('/');
                      } catch (error) {
                        toast(error instanceof Error ? error.message : 'Could not sign out.', 'error');
                      }
                    }} className="flex w-full items-center gap-2.5 border-t border-ink-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"><LogOut size={15} />Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/signin?mode=signup" className="hidden rounded-xl border border-jade-200 bg-jade-50 px-3.5 py-2 text-[12px] font-bold text-jade-800 transition hover:border-jade-400 hover:bg-jade-100 sm:inline-flex">
                Guest sign up
              </Link>
              <Link to="/signin" className="btn-dark !px-4 !py-2 text-[12px]">Sign in</Link>
            </div>
          )}
          <button className="rounded-xl border border-ink-200 p-2 md:hidden" onClick={() => setOpen(v => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-ink-100 bg-paper px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {nav.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">{n.label}</Link>)}
            <Link to="/partner/register" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-jade-800 hover:bg-jade-50"><LayoutDashboard size={15} /> List your property</Link>
            {!s && <Link to="/signin?mode=signup" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-jade-800 hover:bg-jade-50">Guest sign up</Link>}
            {!s && <Link to="/signin" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Sign in</Link>}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-ink-200">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <HamletWordmark light />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-300">
              {HAMLET_TAGLINE} A welcoming place to discover stays, understand the details and book with greater confidence.
            </p>
            <p className="mt-3 text-[11px] font-semibold text-ink-400">By Abundance Abodes</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">For guests</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li><Link to="/stays" className="hover:text-white">Explore stays</Link></li>
              <li><Link to="/account" className="hover:text-white">Help with a booking</Link></li>
              <li><Link to="/signin" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">For property partners</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li><Link to="/partner/register" className="hover:text-white">Partner with HAMLET</Link></li>
              <li><Link to="/signin" className="hover:text-white">Partner sign in</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Useful information</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li><Link to="/legal/terms" className="hover:text-white">Booking terms</Link></li>
              <li><Link to="/legal/trust" className="hover:text-white">Property verification</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-ink-800 pt-6 text-[11.5px] text-ink-400 sm:flex-row sm:items-center">
          <p>© 2026 HAMLET Marketplace Ltd · RC 1876543</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/legal/privacy" className="hover:text-white">Privacy & data</Link>
            <Link to="/legal/terms" className="hover:text-white">Booking terms</Link>
            <Link to="/legal/trust" className="hover:text-white">Trust & verification</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <GuestNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
