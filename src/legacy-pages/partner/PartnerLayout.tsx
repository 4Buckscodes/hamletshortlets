import { useMemo, type ReactNode } from 'react';
import { LayoutDashboard, Home, CalendarDays, Banknote, KeyRound, UserRound, ShieldAlert, Gift } from 'lucide-react';
import { WorkspaceShell } from '../../components/WorkspaceShell';
import { WorkspaceGuard } from '../Account';
import { useHamlet } from '../../lib/store';
import { propertyIdsOf, myPartnerProperties } from '../../lib/partnerUtils';

export default function PartnerLayout({ children }: { children: ReactNode }) {
  const { state } = useHamlet();
  const userId = state.session?.userId;
  const isSuspended = state.session?.accountStatus === 'suspended';

  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const pendingBookings = state.bookings.filter(b => propIds.has(b.propertyId) && ['requested', 'checking'].includes(b.status)).length;
  const pendingListings = myProps.filter(p => ['submitted', 'needs_correction'].includes(p.status)).length;

  const nav = [
    { to: '/partner', label: 'Overview', icon: <LayoutDashboard size={17} />, end: true },
    { to: '/partner/properties', label: 'My Properties', icon: <Home size={17} />, badge: pendingListings },
    { to: '/partner/bookings', label: 'Bookings & Issues', icon: <CalendarDays size={17} />, badge: pendingBookings },
    { to: '/partner/earnings', label: 'Earnings & Commissions', icon: <Banknote size={17} /> },
    { to: '/partner/referrals', label: 'Partner Referrals', icon: <Gift size={17} /> },
    { to: '/partner/assignments', label: 'Assignments & Mandates', icon: <KeyRound size={17} /> },
    { to: '/partner/profile', label: 'Profile & Application', icon: <UserRound size={17} /> },
  ];

  return (
    <WorkspaceGuard expected="partner">
      <WorkspaceShell title="Partner Workspace" subtitle={state.session?.partnerRole ?? 'Partner'} accent="border-brass-500/40 bg-brass-500/10 text-brass-300" nav={nav}>
        {isSuspended && (
          <div role="alert" className="mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-950/50 px-5 py-4 text-[12px] font-semibold leading-relaxed text-red-200 sm:mx-6 lg:mx-8">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-400" />
            <div>
              <p className="font-extrabold uppercase tracking-wider text-red-300">Partner account suspended</p>
              <p className="mt-0.5">
                {state.session?.suspensionReason
                  ? `Reason: ${state.session.suspensionReason}`
                  : 'Your partner privileges have been suspended by HAMLET operations.'}{' '}
                Property submissions, edits, and booking decisions are disabled until HAMLET operations reinstates your account.
              </p>
            </div>
          </div>
        )}
        {children}
      </WorkspaceShell>
    </WorkspaceGuard>
  );
}
