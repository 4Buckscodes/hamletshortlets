import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, CalendarDays, Banknote, KeyRound, UserRound } from 'lucide-react';
import { WorkspaceShell } from '../../components/WorkspaceShell';
import { WorkspaceGuard } from '../Account';
import { useHamlet } from '../../lib/store';
import { propertyIdsOf, myPartnerProperties } from '../../lib/partnerUtils';

export default function PartnerLayout({ children }: { children: ReactNode }) {
  const { state, backendConfigured } = useHamlet();
  const { pathname } = useLocation();
  const userId = state.session?.userId;

  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const pendingBookings = state.bookings.filter(b => propIds.has(b.propertyId) && ['requested', 'checking'].includes(b.status)).length;
  const pendingListings = myProps.filter(p => ['submitted', 'needs_correction'].includes(p.status)).length;

  const nav = [
    { to: '/partner', label: 'Overview', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/partner/properties', label: 'My Properties', icon: <Home size={17} />, badge: pendingListings },
    { to: '/partner/bookings', label: 'Bookings', icon: <CalendarDays size={17} />, badge: pendingBookings },
    { to: '/partner/earnings', label: 'Earnings (0% fee)', icon: <Banknote size={17} /> },
    { to: '/partner/assignments', label: 'Assignments & Commissions', icon: <KeyRound size={17} /> },
    { to: '/partner/profile', label: 'Profile & Application', icon: <UserRound size={17} /> },
  ];

  return (
    <WorkspaceGuard expected="partner">
      <WorkspaceShell title="Partner Workspace" subtitle={state.session?.partnerRole ?? 'Partner'} accent="border-brass-500/40 bg-brass-500/10 text-brass-300" nav={nav}>
        {backendConfigured && !['/partner/properties', '/partner/properties/new', '/partner/bookings'].includes(pathname) ? (
          <div role="status" className="rounded-2xl border border-brass-300 bg-brass-50 p-6">
            <h1 className="font-display text-xl font-black text-ink-900">This partner workflow is not connected yet</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">Property intake, listing status, and booking request decisions are connected. Earnings, assignments, and profile operations are still pending; changes to those demo screens are not saved to Supabase.</p>
          </div>
        ) : children}
      </WorkspaceShell>
    </WorkspaceGuard>
  );
}
