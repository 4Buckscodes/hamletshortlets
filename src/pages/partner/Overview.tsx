import { Link } from 'react-router-dom';
import { Home, CalendarDays, Banknote, PlusCircle, Clock3, ArrowRight, Inbox, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useHamlet } from '../../lib/store';
import { PropertyStatusPill, BookingStatusPill } from '../../components/Badges';
import { myPartnerProperties, propertyIdsOf } from '../../lib/partnerUtils';
import { formatNaira, formatDate, ownerProceeds } from '../../lib/pricing';

export default function PartnerOverview() {
  const { state } = useHamlet();
  const userId = state.session!.userId;
  const myProps = useMemo(() => myPartnerProperties(state, userId), [state, userId]);
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const myBookings = state.bookings.filter(b => propIds.has(b.propertyId));
  const pending = myBookings.filter(b => ['requested', 'checking'].includes(b.status));
  const confirmed = myBookings.filter(b => b.status === 'confirmed');
  const approvedCount = myProps.filter(p => p.status === 'approved').length;
  const reviewingCount = myProps.filter(p => ['submitted', 'needs_correction'].includes(p.status)).length;

  // Earnings: completed + confirmed booking revenue for my properties (owner proceeds = 0% owner fee)
  const earnings = myBookings
    .filter(b => ['completed', 'confirmed', 'disputed'].includes(b.status))
    .reduce((sum, b) => sum + ownerProceeds({ accommodationSubtotal: b.accommodationSubtotal, mandatoryChargesTotal: b.mandatoryTotal }), 0);

  const cards = [
    { label: 'My properties', value: myProps.length, sub: `${approvedCount} approved · ${reviewingCount} in review`, Icon: Home, tone: 'text-brass-400' },
    { label: 'Awaiting my action', value: pending.length, sub: 'Requests needing availability check', Icon: Inbox, tone: 'text-sky-400' },
    { label: 'Confirmed bookings', value: confirmed.length, sub: `${myBookings.length} total requests`, Icon: CalendarDays, tone: 'text-jade-400' },
    { label: 'Owner proceeds', value: formatNaira(earnings).replace('.00', ''), sub: '0% HAMLET owner fee — always', Icon: Banknote, tone: 'text-brass-300' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Partner workspace</p>
          <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Welcome, {state.session!.name.split(' ')[0]}</h1>
          <p className="mt-1 text-[12px] font-medium text-ink-300">{state.session!.partnerRole} · {state.session!.company} · Role-based access — you see only your own profile, authorised properties and permitted booking data.</p>
        </div>
        <Link to="/partner/properties/new" className="btn-brass !py-3"><PlusCircle size={17} /> List a new property</Link>
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-ink-800 bg-ink-900 p-4 sm:p-5">
            <c.Icon size={20} className={`shrink-0 ${c.tone}`} />
            <p className="mt-2.5 break-words font-display text-lg font-black leading-none tabular-nums text-ink-50 sm:text-2xl">{c.value}</p>
            <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{c.label}</p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-ink-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-5">
        {/* Pending requests */}
        <section className="rounded-2xl border border-ink-800 bg-ink-900 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 px-4 py-4 sm:px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-black text-ink-50"><Clock3 size={17} className="shrink-0 text-brass-400" /> Requests needing your action</h2>
            <Link to="/partner/bookings" className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-brass-400 hover:text-brass-300">All bookings <ArrowRight size={11} className="inline shrink-0" /></Link>
          </div>
          <div className="divide-y divide-ink-800">
            {pending.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <CheckCircle2 size={30} className="shrink-0 text-jade-500" />
                <p className="text-[13px] font-bold text-ink-100">Nothing waiting on you right now.</p>
                <p className="text-[11.5px] font-medium text-ink-400">New guest requests for your approved properties will appear here.</p>
              </div>
            )}
            {pending.slice(0, 4).map(b => (
              <div key={b.id} className="flex flex-col gap-2.5 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink-50">{b.propertyTitle}</p>
                  <p className="text-[11px] font-medium text-ink-400">{b.ref} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights}n · {b.guests} guests</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <BookingStatusPill status={b.status} />
                  <Link to="/partner/bookings" className="btn-ghost-dark !px-3 !py-2 text-[11px]">Review</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* My properties pipeline */}
        <section className="rounded-2xl border border-ink-800 bg-ink-900 xl:col-span-2">
          <div className="flex items-center justify-between gap-2 border-b border-ink-800 px-4 py-4 sm:px-5">
            <h2 className="font-display text-base font-black text-ink-50">My properties</h2>
            <Link to="/partner/properties" className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-brass-400 hover:text-brass-300">Manage <ArrowRight size={11} className="inline shrink-0" /></Link>
          </div>
          <div className="divide-y divide-ink-800">
            {myProps.slice(0, 5).map(p => (
              <Link to="/partner/properties" key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-ink-850 sm:flex-nowrap sm:px-5">
                <img src={p.images[0]} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-ink-50">{p.title}</p>
                  <p className="text-[10.5px] font-semibold text-ink-400">{p.area} · {formatNaira(p.nightlyRate)}/night</p>
                </div>
                <PropertyStatusPill status={p.status} />
              </Link>
            ))}
            {myProps.length === 0 && <p className="px-5 py-10 text-center text-[12px] font-semibold text-ink-400">No properties yet — list your first home to begin onboarding.</p>}
          </div>
        </section>
      </div>

      {/* Review-note callout if correction needed */}
      {myProps.some(p => p.status === 'needs_correction') && (
        <div className="mt-5 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-5 py-4 text-[12px] font-semibold text-orange-200">
          <p className="font-extrabold uppercase tracking-wide">Action needed</p>
          {myProps.filter(p => p.status === 'needs_correction').map(p => (
            <p key={p.id} className="mt-1.5"><span className="font-bold text-orange-100">{p.title}:</span> {p.reviewNote} <Link to="/partner/properties" className="underline">Fix & resubmit →</Link></p>
          ))}
        </div>
      )}
    </div>
  );
}
