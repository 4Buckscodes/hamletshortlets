import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, CalendarDays, Users, ShieldCheck, Ban, Clock3,
  RefreshCcw, CheckCircle2, XOctagon, CircleDollarSign, AlertTriangle, Mail,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { BookingStatusPill } from '../../components/Badges';
import type { Booking, BookingStatus } from '../../lib/types';
import { formatNaira, formatDate, formatDateTime } from '../../lib/pricing';

const FILTERS: { key: BookingStatus | 'all' | 'needs_action'; label: string }[] = [
  { key: 'needs_action', label: 'Needs action' },
  { key: 'all', label: 'All' },
  { key: 'awaiting_payment', label: 'Awaiting payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'refunded', label: 'Refunded' },
];

type PendingAction =
  | { bookingId: string; kind: 'cancel' | 'dispute' | 'no_show' }
  | { bookingId: string; kind: 'refund' };

export default function AdminBookings() {
  const {
    state,
    backendConfigured,
    bookingTransition,
    verifyPayment,
    recordBookingRefund,
    retryBookingNotifications,
  } = useHamlet();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const deepLinkedBooking = searchParams.get('booking')?.trim() || null;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>(() =>
    deepLinkedBooking ? 'all' : 'needs_action',
  );
  const [open, setOpen] = useState<string | null>(deepLinkedBooking);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryingNotifId, setRetryingNotifId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundRef, setRefundRef] = useState('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const resolvedOpenId = useMemo(() => {
    if (!open) return null;
    const match = state.bookings.find(
      b => b.id.toLowerCase() === open.toLowerCase() || b.ref.toLowerCase() === open.toLowerCase(),
    );
    return match ? match.id : open;
  }, [open, state.bookings]);

  const filtered = state.bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') return ['requested', 'checking'].includes(b.status);
    return b.status === filter;
  });

  const overlapping = (b: Booking) =>
    state.bookings.filter(
      o =>
        o.id !== b.id &&
        o.propertyId === b.propertyId &&
        ['confirmed', 'awaiting_payment'].includes(o.status) &&
        new Date(o.checkIn) < new Date(b.checkOut) &&
        new Date(o.checkOut) > new Date(b.checkIn),
    );

  const runTransition = async (
    booking: Booking,
    nextStatus: BookingStatus,
    successMsg: string,
    opts?: { note?: string; reason?: string },
  ) => {
    setBusyId(booking.id);
    try {
      await bookingTransition(booking.id, nextStatus, opts);
      toast(successMsg, ['cancelled', 'expired', 'no_show', 'disputed'].includes(nextStatus) ? 'info' : 'success');
      setPendingAction(null);
      setActionNote('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update booking.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openDocumentedAction = (booking: Booking, kind: PendingAction['kind']) => {
    setPendingAction({ bookingId: booking.id, kind });
    setActionNote('');
    if (kind === 'refund') {
      setRefundAmount(booking.guestTotal);
      setRefundRef('');
    }
  };

  const submitDocumentedAction = async (booking: Booking) => {
    if (!pendingAction) return;
    const trimmed = actionNote.trim();
    if (trimmed.length < 8) {
      toast('Provide a documented operational note (min 8 characters).', 'error');
      return;
    }
    if (pendingAction.kind === 'refund') {
      setBusyId(booking.id);
      try {
        await recordBookingRefund(booking.id, {
          amount: refundAmount,
          providerRef: refundRef.trim() || undefined,
          note: trimmed,
        });
        toast(`Refund recorded for ${booking.ref} and added to ledger.`);
        setPendingAction(null);
        setActionNote('');
        setRefundRef('');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not record refund.', 'error');
      } finally {
        setBusyId(null);
      }
      return;
    }

    if (pendingAction.kind === 'cancel') {
      await runTransition(booking, 'cancelled', `${booking.ref} cancelled.`, { reason: trimmed, note: trimmed });
    } else if (pendingAction.kind === 'dispute') {
      await runTransition(booking, 'disputed', `${booking.ref} marked disputed.`, { note: trimmed });
    } else if (pendingAction.kind === 'no_show') {
      await runTransition(booking, 'no_show', `No-show recorded for ${booking.ref}.`, { note: trimmed });
    }
  };

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
          const expand = resolvedOpenId === b.id;
          const conflicts = overlapping(b);
          const busy = busyId === b.id;
          const activePrompt = pendingAction?.bookingId === b.id ? pendingAction : null;
          const deadlineElapsed = b.paymentDeadline ? new Date(b.paymentDeadline).getTime() <= nowMs : false;
          const canRecordRefund = ['cancelled', 'disputed', 'no_show'].includes(b.status) && b.refundStatus !== 'processed';
          const bookingNotifications = state.notifications.filter(n => n.bookingId === b.id);
          const hasRetryableNotifications = bookingNotifications.some(
            n => (n.deliveryStatus === 'pending' || n.deliveryStatus === 'failed') && n.attemptCount < n.maxAttempts,
          );

          return (
            <article key={b.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold text-brass-300">{b.ref}</span>
                    <BookingStatusPill status={b.status} />
                    {b.refundStatus === 'pending_review' && <span className="chip border border-amber-400/50 bg-amber-400/10 text-amber-300">Refund pending review</span>}
                    {b.refundStatus === 'processed' && <span className="chip border border-teal-400/50 bg-teal-400/10 text-teal-300">Refunded {formatNaira(b.refundAmount ?? b.guestTotal)}</span>}
                    {conflicts.length > 0 && <span className="chip border border-red-400/50 bg-red-400/10 text-red-300">{conflicts.length} overlap flag(s)</span>}
                  </div>
                  <h2 className="mt-1.5 break-words font-display text-[16px] font-bold text-ink-50">{b.propertyTitle}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-ink-300">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="shrink-0" />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights}n</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} className="shrink-0" />{b.guestName} · {b.guests} guest(s)</span>
                    <span className="inline-flex items-center gap-1 tabular-nums"><CircleDollarSign size={12} className="shrink-0" />{formatNaira(b.guestTotal)} total</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  <button onClick={() => setOpen(expand ? null : b.id)} className="flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-300 hover:text-white">Timeline & actions {expand ? <ChevronUp size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}</button>
                </div>
              </div>

              {/* Action rail */}
              <div className="flex flex-wrap items-center gap-2 border-t border-ink-800 bg-ink-850/50 px-4 py-3 sm:px-5 [&>button>svg]:shrink-0">
                {b.status === 'requested' && (
                  <button disabled={busy} onClick={() => void runTransition(b, 'checking', 'Moved to "availability & terms being checked".')} className="btn-ghost-dark !border !border-ink-700 !px-3.5 !py-2 text-[11px] disabled:opacity-50"><Clock3 size={13} /> Begin check</button>
                )}
                {(b.status === 'requested' || b.status === 'checking') && (
                  <button disabled={busy} onClick={() => void runTransition(b, 'awaiting_payment', `${b.ref} accepted — 48h payment deadline set.`)} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-500 disabled:opacity-50"><CheckCircle2 size={13} /> Accept — set deadline</button>
                )}
                {b.status === 'awaiting_payment' && !backendConfigured && (
                  <button disabled={busy} onClick={() => { verifyPayment(b.id); toast('Demo payment verified (webhook simulation). Booking confirmed.'); }} className="flex items-center gap-1.5 rounded-xl bg-jade-600 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-500 disabled:opacity-50"><ShieldCheck size={13} /> Simulate provider webhook (demo)</button>
                )}
                {b.status === 'awaiting_payment' && backendConfigured && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-ink-700 bg-ink-900 px-3 py-1.5 text-[10.5px] font-semibold text-ink-300">
                    <ShieldCheck size={13} className="shrink-0 text-brass-400" /> Confirms automatically via verified Paystack webhook
                  </span>
                )}
                {b.status === 'awaiting_payment' && (!backendConfigured || deadlineElapsed) && (
                  <button disabled={busy} onClick={() => void runTransition(b, 'expired', 'Payment deadline expired — booking expired, dates released.')} className="flex items-center gap-1.5 rounded-xl border border-amber-700 bg-amber-950/40 px-3.5 py-2 text-[11px] font-bold text-amber-300 hover:bg-amber-950 disabled:opacity-50"><XOctagon size={13} /> Expire (deadline missed)</button>
                )}
                {b.status === 'confirmed' && (
                  <button disabled={busy} onClick={() => void runTransition(b, 'completed', 'Stay marked completed.')} className="flex items-center gap-1.5 rounded-xl bg-jade-700 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-jade-600 disabled:opacity-50"><CheckCircle2 size={13} /> Mark completed</button>
                )}
                {b.status === 'confirmed' && (
                  <button disabled={busy} onClick={() => openDocumentedAction(b, 'no_show')} className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-[11px] font-bold text-ink-200 hover:bg-ink-800 disabled:opacity-50"><Users size={13} /> No-show</button>
                )}
                {['confirmed', 'completed'].includes(b.status) && (
                  <button disabled={busy} onClick={() => openDocumentedAction(b, 'dispute')} className="flex items-center gap-1.5 rounded-xl border border-orange-800 bg-orange-950/40 px-3.5 py-2 text-[11px] font-bold text-orange-300 hover:bg-orange-950 disabled:opacity-50"><AlertTriangle size={13} /> Flag disputed</button>
                )}
                {['requested', 'checking', 'awaiting_payment', 'confirmed', 'disputed'].includes(b.status) && (
                  <button disabled={busy} onClick={() => openDocumentedAction(b, 'cancel')} className="flex items-center gap-1.5 rounded-xl border border-red-800 bg-red-950/40 px-3.5 py-2 text-[11px] font-bold text-red-300 hover:bg-red-950 disabled:opacity-50"><Ban size={13} /> Cancel</button>
                )}
                {canRecordRefund && (
                  <button disabled={busy} onClick={() => openDocumentedAction(b, 'refund')} className="flex items-center gap-1.5 rounded-xl border border-teal-700 bg-teal-950/40 px-3.5 py-2 text-[11px] font-bold text-teal-300 hover:bg-teal-950 disabled:opacity-50"><RefreshCcw size={13} /> Record refund</button>
                )}
                {b.specialRequests && <span className="w-full text-[10.5px] font-medium italic text-ink-400">Guest note: “{b.specialRequests}”</span>}
              </div>

              {activePrompt && (
                <div className="border-t border-brass-500/30 bg-ink-950/70 px-5 py-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brass-300">
                    {activePrompt.kind === 'refund'
                      ? 'Record verified guest refund (writes to ledger & audit log)'
                      : activePrompt.kind === 'cancel'
                        ? 'Operational cancellation — documented reason required'
                        : activePrompt.kind === 'dispute'
                          ? 'Flag booking as disputed — documented summary required'
                          : 'Record guest no-show — documented summary required'}
                  </p>
                  {activePrompt.kind === 'refund' && (
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                      <label>
                        <span className="label-dark">Refund amount (₦, max {formatNaira(b.guestTotal + b.deposit)})</span>
                        <input
                          type="number"
                          min={1}
                          max={b.guestTotal + b.deposit}
                          className="input-dark !py-2 text-[12px]"
                          value={refundAmount}
                          onChange={e => setRefundAmount(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        <span className="label-dark">Provider refund reference (optional)</span>
                        <input
                          className="input-dark !py-2 text-[12px]"
                          placeholder="e.g. PSK_RFD_20261023"
                          value={refundRef}
                          onChange={e => setRefundRef(e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  <label className="mt-2.5 block">
                    <span className="label-dark">Operational note (required, min 8 characters)</span>
                    <input
                      autoFocus
                      className="input-dark !py-2 text-[12px]"
                      placeholder="Document reason, approval basis, and operator context…"
                      value={actionNote}
                      onChange={e => setActionNote(e.target.value)}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => void submitDocumentedAction(b)} className="btn-brass !px-4 !py-2 text-[11.5px] disabled:opacity-50">
                      {busy ? 'Saving…' : 'Confirm & audit-log'}
                    </button>
                    <button disabled={busy} onClick={() => setPendingAction(null)} className="btn-ghost-dark !px-3.5 !py-2 text-[11px]">Back</button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {expand && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-800">
                    <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
                      <div>
                        <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-ink-500">Price & ledger snapshot</p>
                        <dl className="mt-1.5 space-y-1 text-[11.5px] font-medium text-ink-200">
                          <div className="flex justify-between gap-3"><dt>Subtotal</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd></div>
                          <div className="flex justify-between gap-3"><dt>Mandatory charges</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.mandatoryTotal)}</dd></div>
                          <div className="flex justify-between gap-3"><dt>HAMLET guest fee (3%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.hamletGuestFee)}</dd></div>
                          <div className="flex justify-between gap-3 border-t border-ink-800 pt-1 font-bold text-paper"><dt>Guest total</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.guestTotal)}</dd></div>
                          <div className="flex justify-between gap-3 text-ink-400"><dt>Refundable deposit</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.deposit)}</dd></div>
                        </dl>
                        {b.paymentRef && <p className="mt-2 break-all font-mono text-[10px] font-bold text-ink-500">{b.paymentProvider} · {b.paymentRef}</p>}
                        {b.cancelReason && <p className="mt-2 break-words text-[11px] font-semibold text-red-300">Cancellation reason: {b.cancelReason}</p>}
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

                    {/* Email Notification Outbox & Delivery Log */}
                    <div className="border-t border-ink-800 bg-ink-950/50 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-ink-400">
                          <Mail size={12} className="shrink-0 text-brass-400" /> Email notification outbox ({bookingNotifications.length})
                        </p>
                        {backendConfigured && hasRetryableNotifications && (
                          <button
                            type="button"
                            disabled={retryingNotifId === b.id}
                            onClick={() => {
                              setRetryingNotifId(b.id);
                              void retryBookingNotifications(b.id)
                                .then(res => {
                                  if (res.ok) {
                                    toast(`Sent ${res.sent} pending notification(s) for ${b.ref}.`, 'success');
                                  } else {
                                    toast(
                                      res.error || `Notification retry completed with ${res.failed} failure(s).`,
                                      'error',
                                    );
                                  }
                                })
                                .finally(() => setRetryingNotifId(null));
                            }}
                            className="btn-ghost-dark !border !border-ink-700 !px-3 !py-1.5 text-[10.5px] disabled:opacity-50"
                          >
                            <RefreshCcw size={11} className={retryingNotifId === b.id ? 'animate-spin' : ''} />
                            {retryingNotifId === b.id ? 'Dispatching…' : 'Dispatch / retry emails'}
                          </button>
                        )}
                      </div>

                      {bookingNotifications.length === 0 ? (
                        <p className="mt-2 text-[11px] font-medium text-ink-500">
                          No email notification records logged for this booking yet.
                        </p>
                      ) : (
                        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                          {bookingNotifications.map(notif => (
                            <div
                              key={notif.id}
                              className="rounded-xl border border-ink-800 bg-ink-900 p-3 text-[11px]"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <span className="font-mono text-[10px] font-bold uppercase text-brass-300">
                                  {notif.recipientType} · {notif.eventType.replace(/^booking_/, '').replace(/_/g, ' ')}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${
                                    notif.deliveryStatus === 'sent'
                                      ? 'bg-jade-950 text-jade-300'
                                      : notif.deliveryStatus === 'failed'
                                        ? 'bg-red-950 text-red-300'
                                        : 'bg-ink-800 text-ink-300'
                                  }`}
                                >
                                  {notif.deliveryStatus} ({notif.attemptCount}/{notif.maxAttempts})
                                </span>
                              </div>
                              {notif.recipientEmail && (
                                <p className="mt-1 break-all text-[10.5px] font-semibold text-ink-200">
                                  To: {notif.recipientEmail}
                                </p>
                              )}
                              {notif.providerMessageId && (
                                <p className="mt-0.5 break-all font-mono text-[9.5px] text-ink-400">
                                  Resend ID: {notif.providerMessageId}
                                </p>
                              )}
                              {notif.lastError && (
                                <p className="mt-1 break-words text-[10.5px] font-medium text-red-300">
                                  {notif.lastError}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
