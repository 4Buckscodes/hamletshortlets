import { useState } from 'react';
import { ChevronDown, ChevronUp, CalendarDays, Users, ShieldCheck, Ban, Clock3, RefreshCcw, CheckCircle2, XOctagon, CircleDollarSign } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { BookingStatusPill } from '../../components/Badges';
import type { BookingStatus } from '../../lib/types';
import { formatNaira, formatDate, formatDateTime } from '../../lib/pricing';

const FILTERS: { key: BookingStatus | 'all' | 'needs_action'; label: string }[] = [
  { key: 'needs_action', label: 'Needs action' },
  { key: 'all', label: 'All' },
  { key: 'awaiting_payment', label: 'Awaiting payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function AdminBookings() {
  const { state, bookingTransition: transition, verifyPayment } = useHamlet();
  const { toast } = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('needs_action');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = state.bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return ['requested', 'checking'].includes(b.status);
    return b.status === filter;
  });

  const overlapping = (b: (typeof state.bookings)[number]) =>
    state.bookings.filter(o => o.id !== b.id && o.propertyId === b.propertyId && ['confirmed', 'awaiting_payment'].includes(o.status) && new Date(o.checkIn) < new Date(b.checkOut) && new Date(o.checkOut) > new Date(b.checkIn));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-brass-400">Lifecycle control</p>
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Booking operations</h1>
      <p className="mt-1 max-w-2xl text-[12px] font-medium text-ink-300">Every booking is request-to-book: requested → checking → accepted (awaiting payment, 48h deadline) → confirmed only after webhook-verified payment → completed / cancelled / expired / refunded / disputed. Overlaps on confirmed dates are prevented.</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-xl border px-3 py-2 text-[11px] font-bold transition ${filter === f.key ? 'border-brass-500 bg-brass-500 text-ink-950' : 'border-ink-800 text-ink-300 hover:border-ink-600'}`}>{f.label}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-4">
        {filtered.map(b => {
          const expand = open === b.id;
          const conflicts = overlapping(b);
          return (
            <article key={b.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
              <div className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold text-brass-300">{b.ref}</span>
                    <BookingStatusPill status={b.status} />
                    {conflicts.length > 0 && <span className="chip border border-red-400/50 bg-red-400/10 text-red-300">{conflicts.length} overlap flag(s)</span>}
                  </div>
                  <h2 className="mt-1.5 font-display text-[16px] font-bold text-ink-50">{b.propertyTitle}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] font-semibold text-ink-300">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights}n</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} />{b.guestName} · {b.guests} guest(s)</span>
                    <span className="inline-flex items-center gap-1"><CircleDollarSign size={12} />{formatNaira(b.guestTotal)} total</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button onClick={() => setOpen(expand ? null : b.id)} className="flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-300 hover:text-white">Timeline & actions {expand ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                </div>
              </div>

              {/* Action rail */}
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-800 bg-ink-850/50 px-5 py-3">
                {b.status === 'requested' && <button onClick={() => { transition(b.id, 'checking'); toast('Moved to "availability & terms being checked".', 'info'); }} className="btn-ghost-dark !border !border-ink-700 !px-3.5 !py-2 text-[11px]"><Clock3 size={13} /> Begin check</button>}
                {(b.status === 'requested' || b.status === 'checking') && <button onClick={() => { transition(b.id, 'awaiting_payment'); toast(`${b.ref} accepted — 48h payment deadline set.`); }} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-500"><CheckCircle2 size={13} /> Accept — set deadline</button>}
                {b.status === 'awaiting_payment' && <button onClick={() => { verifyPayment(b.id); toast('Payment verified server-side (webhook). Booking confirmed.'); }} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-500"><ShieldCheck size={13} /> Verify provider webhook</button>}
                {b.status === 'awaiting_payment' && <button onClick={() => { transition(b.id, 'expired'); toast('Payment deadline expired — booking expired, dates released.', 'info'); }} className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-950/40 px-3.5 py-2 text-[11px] font-bold text-amber-300 hover:bg-amber-950"><XOctagon size={13} /> Expire (deadline missed)</button>}
                {b.status === 'confirmed' && <button onClick={() => { transition(b.id, 'completed'); toast('Stay marked completed.'); }} className="flex items-center gap-1.5 rounded-xl bg-jade-700 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-600"><CheckCircle2 size={13} /> Mark completed</button>}
                {b.status === 'confirmed' && <button onClick={() => { transition(b.id, 'no_show', { note: 'Guest did not arrive — no-show recorded' }); toast('No-show recorded.', 'info'); }} className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-[11px] font-bold text-ink-200 hover:bg-ink-800"><Users size={13} /> No-show</button>}
                {['confirmed', 'awaiting_payment', 'disputed'].includes(b.status) && <button onClick={() => { transition(b.id, 'cancelled', { reason: 'Cancelled by HAMLET operations' }); toast('Booking cancelled.', 'info'); }} className="flex items-center gap-1.5 rounded-xl border border-red-800 bg-red-950/40 px-3.5 py-2 text-[11px] font-bold text-red-300 hover:bg-red-950"><Ban size={13} /> Cancel</button>}
                {b.status === 'disputed' && <button onClick={() => { transition(b.id, 'refunded', { note: 'Refund processed via provider after dispute resolution' }); toast('Marked refunded.'); }} className="flex items-center gap-1.5 rounded-xl border border-teal-700 bg-teal-950/40 px-3.5 py-2 text-[11px] font-bold text-teal-300 hover:bg-teal-950"><RefreshCcw size={13} /> Mark refunded</button>}
                {b.specialRequests && <span className="w-full text-[10.5px] font-medium italic text-ink-400">Guest note: “{b.specialRequests}”</span>}
              </div>

              <AnimatePresence>
                {expand && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-800">
                    <div className="grid gap-6 p-5 lg:grid-cols-2">
                      <div>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Price & ledger snapshot</p>
                        <dl className="mt-1.5 space-y-1 text-[11.5px] font-medium text-ink-200">
                          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd></div>
                          <div className="flex justify-between"><dt>Mandatory charges</dt><dd className="tabular-nums">{formatNaira(b.mandatoryTotal)}</dd></div>
                          <div className="flex justify-between"><dt>HAMLET guest fee (3%)</dt><dd className="tabular-nums">{formatNaira(b.hamletGuestFee)}</dd></div>
                          <div className="flex justify-between border-t border-ink-800 pt-1 font-bold text-paper"><dt>Guest total</dt><dd className="tabular-nums">{formatNaira(b.guestTotal)}</dd></div>
                          <div className="flex justify-between text-ink-400"><dt>Refundable deposit</dt><dd className="tabular-nums">{formatNaira(b.deposit)}</dd></div>
                        </dl>
                        {b.paymentRef && <p className="mt-2 font-mono text-[10px] font-bold text-ink-500">{b.paymentProvider} · {b.paymentRef}</p>}
                      </div>
                      <div>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Timeline</p>
                        <ol className="mt-1.5 space-y-2">
                          {b.timeline.map((t, i) => (
                            <li key={i} className="border-l-2 border-ink-800 pl-3 text-[10.5px] leading-snug text-ink-300">
                              <span className="font-bold text-ink-100">{t.label}</span><br />{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
        {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 py-14 text-center text-[12.5px] font-semibold text-ink-400">No bookings in this view.</p>}
      </div>
    </div>
  );
}
