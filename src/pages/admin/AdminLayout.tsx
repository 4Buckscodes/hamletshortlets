import type { ReactNode } from 'react';
import { LayoutDashboard, Home, CalendarDays, Receipt, LifeBuoy, UsersRound, KeyRound, ScrollText, UserCog } from 'lucide-react';
import { WorkspaceShell } from '../../components/WorkspaceShell';
import { WorkspaceGuard } from '../Account';
import { useHamlet } from '../../lib/store';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { state } = useHamlet();

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
    { to: '/admin/applications', label: 'Partners & Applications', icon: <UsersRound size={17} />, badge: pendingApps },
    { to: '/admin/assignments', label: 'Assignments', icon: <KeyRound size={17} /> },
    { to: '/admin/users', label: 'Users & Admin Access', icon: <UserCog size={17} /> },
    { to: '/admin/audit', label: 'Audit Log', icon: <ScrollText size={17} /> },
  ];

  return (
    <WorkspaceGuard expected="admin">
      <WorkspaceShell title="Admin Console" subtitle="HAMLET operations · full accountability" accent="border-red-400/40 bg-red-400/10 text-red-300" nav={nav}>
        {children}
      </WorkspaceShell>
    </WorkspaceGuard>
  );
}
