import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, X, LogOut, RotateCcw, ExternalLink } from 'lucide-react';
import { HamletMark } from './Logo';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: number;
}

export function WorkspaceShell({
  title, subtitle, accent, nav, children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { state, signOut, resetDemo } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const s = state.session;

  useEffect(() => { setOpen(false); }, [nav.length]);

  const initials = (s?.name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebar = (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-950 dark-scroll">
      <div className="border-b border-ink-800 px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <HamletMark size={28} light />
          <span className="font-display text-xl font-black text-ink-50">HAMLET<span className="text-brass-500">.</span></span>
        </Link>
        <p className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] ${accent}`}>{title}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${isActive ? 'bg-brass-500 text-ink-950' : 'text-ink-200 hover:bg-ink-800 hover:text-white'}`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9.5px] font-black text-white">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-800 p-3">
        <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-ink-300 transition hover:bg-ink-800 hover:text-white"><ExternalLink size={13} /> View public marketplace</Link>
        <button onClick={() => { resetDemo(); toast('Demo data restored to seed state.', 'info'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold text-ink-300 transition hover:bg-ink-800 hover:text-white"><RotateCcw size={13} /> Reset demo data</button>
        <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-ink-800 bg-ink-900 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brass-500 font-display text-[12px] font-black text-ink-950">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-ink-50">{s?.name}</p>
            <p className="truncate text-[9.5px] font-semibold text-ink-400">{subtitle}</p>
          </div>
          <button onClick={() => { signOut(); toast('Signed out', 'info'); navigate('/signin'); }} className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-white" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950 text-ink-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebar}</div>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-950 px-4 lg:px-6">
          <button className="rounded-lg p-2 text-ink-300 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <p className="hidden text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-500 lg:block">HAMLET · {title} · Lagos pilot</p>
          <p className="text-[10.5px] font-semibold text-ink-500">Thursday, 22 Oct 2026</p>
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto dark-scroll">{children}</main>
      </div>
    </div>
  );
}
