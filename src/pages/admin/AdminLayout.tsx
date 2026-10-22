import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, CalendarDays, Receipt, LifeBuoy, UsersRound, KeyRound, ScrollText } from 'lucide-react';
import { WorkspaceShell } from '../../components/WorkspaceShell';
import { WorkspaceGuard } from '../Account';
import { useHamlet } from '../../lib/store';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { state, backendConfigured } = useHamlet();
  const { pathname } = useLocation();

  const pendingReviews = state.properties.filter(p => p.status === 'submitted' || p.status === 'needs_correction').length;
  const actionBookings = state.bookings.filter(b => ['requested', 'checking'].includes(b.status)).length;
  const openIssues = state.issues.filter(i => ['open', 'assigned', 'investigating', 'escalated'].includes(i.status)).length;
  const pendingApps = state.applications.filter(a => a.status === 'pending').length;
  const flaggedLedger = state.ledger.filter(l => l.status === 'flagged' || l.variance !== 0).length;

  const nav = [
    { to: '/admin', label: 'Overview', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/admin/properties', label: 'Property Review', icon: <Home size={17} />, badge: pendingReviews },
    { to: '/admin/bookings', label: 'Bookings', icon: <CalendarDays size={17} />, badge: actionBookings },
    { to: '/admin/ledger', label: 'Ledger & Settlement', icon: <Receipt size={17} />, badge: flaggedLedger },
    { to: '/admin/issues', label: 'Issues', icon: <LifeBuoy size={17} />, badge: openIssues },
    { to: '/admin/applications', label: 'Partner Applications', icon: <UsersRound size={17} />, badge: pendingApps },
    { to: '/admin/assignments', label: 'Assignments', icon: <KeyRound size={17} /> },
    { to: '/admin/audit', label: 'Audit Log', icon: <ScrollText size={17} /> },
  ];

  return (
    <WorkspaceGuard expected="admin">
      <WorkspaceShell title="Admin Console" subtitle="HAMLET operations · full accountability" accent="border-red-400/40 bg-red-400/10 text-red-300" nav={nav}>
        {backendConfigured && !['/admin/properties', '/admin/applications'].includes(pathname) ? (
          <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
            <h1 className="font-display text-xl font-black text-ink-900">This admin workflow is not connected yet</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">Property and partner-application reviews are connected. Booking transitions, ledger, assignments, issue management, and full audit views remain pending; changes from those demo screens are not saved to Supabase.</p>
          </div>
        ) : children}
      </WorkspaceShell>
    </WorkspaceGuard>
  );
}
