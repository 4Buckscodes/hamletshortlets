import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, XCircle, Users, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { BookingStatusPill } from '../../components/Badges';
import { propertyIdsOf } from '../../lib/partnerUtils';
import { formatNaira, formatDate, formatDateTime } from '../../lib/pricing';

export default function PartnerBookings() {
  const { state, bookingTransition } = useHamlet();
  const { toast } = useToast();
  const userId = state.session!.userId;
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const myBookings = state.bookings.filter(b => propIds.has(b.propertyId));
  const actionable = myBookings.filter(b => b.status === 'requested' || b.status === 'checking');
  const rest = myBookings.filter(b => b.status !== 'requested' && b.status !== 'checking');

  const accept = (id: string, ref: string) => {
    bookingTransition(id, 'awaiting_payment');
    toast(`${ref} accepted. Guest has a 48h payment deadline.`);
  };
  const startChecking = (id: string, ref: string) => {
    bookingTransition(id, 'checking');
    toast(`Now checking availability & terms for ${ref}.`, 'info');
  };
  const decline = (id: string, ref: string) => {
    bookingTransition(id, 'declined', { note: declineReason || 'Declined by property owner' });
    toast(`${ref} declined. The guest has been notified.`, 'info');
    setDeclineFor(null); setDeclineReason('');
  };

  const renderCard = (b: (typeof myBookings)[number]) => {
    const open = expanded === b.id;
    const needsAction = b.status === 'requested' || b.status === 'checking';
    return (
      <article key={b.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
              <BookingStatusPill status={b.status} />
            </div>
            <h2 className="mt-1.5 font-display text-[16px] font-bold text-ink-50">{b.propertyTitle}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] font-semibold text-ink-300">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights}n</span>
              <span className="inline-flex items-center gap-1"><Users size={12} />{b.guests} guests</span>
              <span>Guest: {b.guestName}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <p className="font-display text-lg font-black text-brass-300">{formatNaira(b.accommodationSubtotal + b.mandatoryTotal)}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-500">your proceeds · 0% fee</p>
            <button onClick={() => setExpanded(open ? null : b.id)} className="flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-300 hover:text-white">Timeline {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
          </div>
        </div>

        {needsAction && (
          <div className="flex flex-wrap items-center gap-2 border-t border-brass-500/25 bg-brass-500/5 px-5 py-3">
            {b.status === 'requested' && <button onClick={() => startChecking(b.id, b.ref)} className="btn-ghost-dark !border !border-ink-700 !px-4 !py-2.5 text-[11.5px]">Start availability check</button>}
            <button onClick={() => accept(b.id, b.ref)} className="btn-brass !px-4 !py-2.5 text-[11.5px]"><CheckCircle2 size={15} /> Accept — set payment deadline</button>
            <button onClick={() => setDeclineFor(b.id)} className="btn-ghost-dark !px-4 !py-2.5 text-[11.5px] text-red-300 hover:text-red-200"><XCircle size={15} /> Decline</button>
            {b.specialRequests && <p className="w-full text-[11px] font-medium text-ink-300">Guest note: “{b.specialRequests}”</p>}
          </div>
        )}
        {declineFor === b.id && (
          <div className="flex flex-wrap items-center gap-2 border-t border-red-500/25 bg-red-500/5 px-5 py-3">
            <input autoFocus className="input-dark flex-1 !py-2 text-[12px]" placeholder="Reason for declining (shared with guest)…" value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
            <button onClick={() => decline(b.id, b.ref)} className="rounded-xl bg-red-600 px-4 py-2 text-[11.5px] font-bold text-white hover:bg-red-500">Confirm decline</button>
            <button onClick={() => setDeclineFor(null)} className="btn-ghost-dark !px-3 !py-2 text-[11px]">Back</button>
          </div>
        )}
        <AnimatePresence>
          {open && (
            <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-800 bg-ink-850/50 px-5 py-4">
              {b.timeline.map((t, i) => (
                <li key={i} className="relative border-l-2 border-ink-800 pb-2.5 pl-4 text-[11px] last:pb-0">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-brass-400" />
                  <p className="font-bold text-ink-100">{t.label}</p>
                  <p className="text-[10px] font-medium text-ink-500">{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}</p>
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </article>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Request-to-book</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Bookings for my properties</h1>
      <p className="mt-1 flex max-w-lg items-start gap-2 text-[12px] font-medium text-ink-300"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-brass-400" />You see permitted booking data for authorised properties only. Confirming availability is a commitment to honour the dates at the stated price.</p>

      {actionable.length > 0 && (
        <>
          <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-400">Action required — {actionable.length}</h2>
          <div className="mt-2 grid gap-4">{actionable.map(renderCard)}</div>
        </>
      )}
      <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">History & upcoming — {rest.length}</h2>
      <div className="mt-2 grid gap-4">{rest.map(renderCard)}{rest.length === 0 && actionable.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 px-6 py-14 text-center text-[12.5px] font-semibold text-ink-400">No bookings yet. They appear here once guests request your approved properties.</p>}</div>
    </div>
  );
}
