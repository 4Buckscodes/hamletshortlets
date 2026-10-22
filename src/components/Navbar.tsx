import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, ShieldCheck, ChevronDown } from 'lucide-react';
import { HamletWordmark } from './Logo';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';

export function GuestNavbar() {
  const { state, signOut } = useHamlet();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const s = state.session;
  const dashboardPath = s?.role === 'admin' ? '/admin' : s?.role === 'partner' ? '/partner' : '/account';

  const nav = [
    { to: '/stays', label: 'Explore stays' },
    { to: '/#how', label: 'How it works' },
    { to: '/#trust', label: 'Trust & safety' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/80 bg-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="HAMLET home"><HamletWordmark /></Link>
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map(n =>
            n.to.startsWith('/#') ? (
              <a key={n.to} href={n.to} className="text-[13px] font-semibold text-ink-600 transition hover:text-jade-700">{n.label}</a>
            ) : (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `text-[13px] font-semibold transition hover:text-jade-700 ${isActive ? 'text-jade-700' : 'text-ink-600'}`}>{n.label}</NavLink>
            ),
          )}
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
                    <button onClick={() => { setMenu(false); signOut(); toast('Signed out', 'info'); navigate('/'); }} className="flex w-full items-center gap-2.5 border-t border-ink-50 px-4 py-2.5 text-[13px] font-semibold text-red-700 hover:bg-red-50"><LogOut size={15} />Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/signin" className="btn-dark !px-4 !py-2 text-[12px]">Sign in</Link>
          )}
          <button className="rounded-xl border border-ink-200 p-2 md:hidden" onClick={() => setOpen(v => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-ink-100 bg-paper px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {nav.map(n => <a key={n.to} href={n.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">{n.label}</a>)}
            <Link to="/partner/register" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-jade-800 hover:bg-jade-50"><LayoutDashboard size={15} /> List your property</Link>
            <Link to="/signin" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">Sign in</Link>
          </div>
        </div>
      )}
      {location.pathname.startsWith('/admin') || location.pathname.startsWith('/partner') ? null : null}
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
              A trusted, partner-inclusive shortlet marketplace for Lagos. Verified homes,
              request-to-book, transparent pricing — real accountability from listing to checkout.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-[11px] font-bold text-jade-300">
              <span className="live-dot h-2 w-2 rounded-full bg-jade-400" /> Lagos pilot · 50 approved properties by 31 Oct 2026
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Explore</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li><Link to="/stays" className="hover:text-white">Explore stays</Link></li>
              <li><Link to="/signin" className="hover:text-white">Sign in</Link></li>
              <li><Link to="/partner/register" className="hover:text-white">Partner with us</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Trust</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li>Every listing manually verified</li>
              <li>Request-to-book with owner approval</li>
              <li>Total price shown before you commit</li>
              <li>Controlled ledger & settlement records</li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brass-400">Pilot facts</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium">
              <li>Launch market: Lagos, Nigeria</li>
              <li>Guest fee: 3% · Owner fee: 0%</li>
              <li>Launch dependencies under formal sign-off</li>
              <li>Processing-fee policy: to be decided</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-ink-800 pt-6 text-[11.5px] text-ink-400 sm:flex-row sm:items-center">
          <p>© 2026 HAMLET Marketplace Ltd · RC 1876543 · Lagos, Nigeria</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/legal/privacy" className="hover:text-white">Privacy & data</Link>
            <Link to="/legal/terms" className="hover:text-white">Booking terms</Link>
            <Link to="/legal/trust" className="hover:text-white">Trust & verification</Link>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> NDPR-aligned</span>
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
