import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, XCircle, Users, ChevronDown, ChevronUp, AlertTriangle, LifeBuoy, SearchCheck, AlertOctagon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHamlet } from '../../lib/store';
import { useToast } from '../../lib/toast';
import { BookingStatusPill, IssueStatusPill, SeverityDot } from '../../components/Badges';
import { propertyIdsOf } from '../../lib/partnerUtils';
import { formatNaira, formatDate, formatDateTime } from '../../lib/pricing';
import type { Issue } from '../../lib/types';

export default function PartnerBookings() {
  const { state, bookingTransition, updateIssue } = useHamlet();
  const { toast } = useToast();
  const userId = state.session!.userId;
  const isSuspended = state.session?.accountStatus === 'suspended';
  const propIds = useMemo(() => new Set(propertyIdsOf(state, userId)), [state, userId]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issueNoteById, setIssueNoteById] = useState<Record<string, string>>({});
  const [busyIssueId, setBusyIssueId] = useState<string | null>(null);

  const myBookings = state.bookings.filter(b => propIds.has(b.propertyId));
  const myBookingRefs = useMemo(() => new Set(myBookings.map(b => b.ref)), [myBookings]);
  const myIssues = state.issues.filter(i => i.bookingRef && myBookingRefs.has(i.bookingRef));
  const actionable = myBookings.filter(b => b.status === 'requested' || b.status === 'checking');
  const rest = myBookings.filter(b => b.status !== 'requested' && b.status !== 'checking');

  const transition = async (id: string, ref: string, status: 'checking' | 'awaiting_payment' | 'declined', note?: string) => {
    setBusyId(id);
    try {
      await bookingTransition(id, status, { note });
      toast(
        status === 'awaiting_payment' ? `${ref} accepted. Guest has a 48h payment deadline.` :
          status === 'checking' ? `Now checking availability & terms for ${ref}.` :
            `${ref} declined.`,
        status === 'checking' || status === 'declined' ? 'info' : 'success',
      );
      if (status === 'declined') {
        setDeclineFor(null);
        setDeclineReason('');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update this booking.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const respondToIssue = async (issue: Issue, nextStatus: 'investigating' | 'escalated') => {
    const note = (issueNoteById[issue.id] ?? '').trim();
    if (note.length < 5) {
      toast('Enter an update note (min 5 characters) before saving.', 'error');
      return;
    }
    setBusyIssueId(issue.id);
    try {
      await updateIssue(issue.id, nextStatus, { note });
      toast(`${issue.ref} marked ${nextStatus}.`, nextStatus === 'escalated' ? 'error' : 'info');
      setIssueNoteById(prev => ({ ...prev, [issue.id]: '' }));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update issue.', 'error');
    } finally {
      setBusyIssueId(null);
    }
  };

  const renderCard = (b: (typeof myBookings)[number]) => {
    const open = expanded === b.id;
    const needsAction = !isSuspended && (b.status === 'requested' || b.status === 'checking');
    return (
      <article key={b.id} className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
              <BookingStatusPill status={b.status} />
            </div>
            <h2 className="mt-1.5 break-words font-display text-[16px] font-bold text-ink-50">{b.propertyTitle}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-300">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="shrink-0" />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights}n</span>
              <span className="inline-flex items-center gap-1"><Users size={12} className="shrink-0" />{b.guests} guests</span>
              <span>Guest: {b.guestName}</span>
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-ink-800 pt-2.5 sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <div>
              <p className="font-display text-lg font-black tabular-nums text-brass-300 sm:text-right">{formatNaira(b.accommodationSubtotal + b.mandatoryTotal)}</p>
              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-500 sm:text-right">your proceeds · 0% fee</p>
            </div>
            <button onClick={() => setExpanded(open ? null : b.id)} className="flex shrink-0 items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-ink-300 hover:text-white">Timeline {open ? <ChevronUp size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}</button>
          </div>
        </div>

        {needsAction && (
          <div className="flex flex-wrap items-center gap-2 border-t border-brass-500/25 bg-brass-500/5 px-4 py-3 sm:px-5">
            {b.status === 'requested' && <button disabled={busyId === b.id} onClick={() => void transition(b.id, b.ref, 'checking')} className="btn-ghost-dark !border !border-ink-700 !px-4 !py-2.5 text-[11.5px] disabled:opacity-50">Start availability check</button>}
            <button disabled={busyId === b.id} onClick={() => void transition(b.id, b.ref, 'awaiting_payment')} className="btn-brass !px-4 !py-2.5 text-[11.5px] disabled:opacity-50"><CheckCircle2 size={15} /> Accept — set payment deadline</button>
            <button disabled={busyId === b.id} onClick={() => setDeclineFor(b.id)} className="btn-ghost-dark !px-4 !py-2.5 text-[11.5px] text-red-300 hover:text-red-200 disabled:opacity-50"><XCircle size={15} /> Decline</button>
            {b.specialRequests && <p className="w-full break-words text-[11px] font-medium text-ink-300">Guest note: “{b.specialRequests}”</p>}
          </div>
        )}
        {declineFor === b.id && (
          <div className="flex flex-wrap items-center gap-2 border-t border-red-500/25 bg-red-500/5 px-4 py-3 sm:px-5">
            <input autoFocus className="input-dark w-full !py-2 text-[12px] sm:min-w-[220px] sm:w-auto sm:flex-1" placeholder="Reason for declining (shared with guest)…" value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
            <button disabled={busyId === b.id} onClick={() => void transition(b.id, b.ref, 'declined', declineReason.trim() || 'Declined after availability and terms review.')} className="rounded-xl bg-red-600 px-4 py-2 text-[11.5px] font-bold text-white hover:bg-red-500 disabled:opacity-50">Confirm decline</button>
            <button disabled={busyId === b.id} onClick={() => setDeclineFor(null)} className="btn-ghost-dark !px-3 !py-2 text-[11px]">Back</button>
          </div>
        )}
        {b.status === 'awaiting_payment' && (
          <p className="border-t border-amber-500/20 bg-amber-500/5 px-5 py-3 text-[11px] font-semibold text-amber-200">
            Awaiting guest payment{b.paymentDeadline ? ` until ${formatDateTime(b.paymentDeadline)}` : ''}. The booking is confirmed only after Paystack's signed server webhook is verified — never accept screenshots or off-platform receipts.
          </p>
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
      <h1 className="mt-1.5 font-display text-2xl font-black text-ink-50 sm:text-3xl">Bookings & reported issues</h1>
      <p className="mt-1 flex max-w-lg items-start gap-2 text-[12px] font-medium text-ink-300"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-brass-400" />You see permitted booking data for authorised properties only. Confirming availability is a commitment to honour the dates at the stated price.</p>

      {actionable.length > 0 && (
        <>
          <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-400">Action required — {actionable.length}</h2>
          <div className="mt-2 grid gap-4">{actionable.map(renderCard)}</div>
        </>
      )}
      <h2 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-ink-400">History & upcoming — {rest.length}</h2>
      <div className="mt-2 grid gap-4">{rest.map(renderCard)}{rest.length === 0 && actionable.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 px-6 py-14 text-center text-[12.5px] font-semibold text-ink-400">No bookings yet. They appear here once guests request your approved properties.</p>}</div>

      {myIssues.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-brass-400">
            <LifeBuoy size={14} /> Issues reported on my properties — {myIssues.length}
          </h2>
          <p className="mt-1 text-[11px] font-medium text-ink-400">
            You can post investigation updates or escalate urgent issues. HAMLET operations owns assignment, resolution, and final closure.
          </p>
          <div className="mt-3 grid gap-3">
            {myIssues.map(issue => {
              const closed = issue.status === 'resolved' || issue.status === 'closed';
              return (
                <article key={issue.id} className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold text-brass-300">{issue.ref}</span>
                    <SeverityDot severity={issue.severity} />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{issue.severity}</span>
                    <IssueStatusPill status={issue.status} />
                    {issue.bookingRef && <span className="font-mono text-[10px] text-ink-400">Booking {issue.bookingRef}</span>}
                  </div>
                  <h3 className="mt-1.5 font-display text-[15px] font-bold text-ink-50">{issue.subject}</h3>
                  <p className="mt-1 text-[12px] font-medium text-ink-300">{issue.description}</p>
                  {issue.resolution && (
                    <p className="mt-2 rounded-xl border border-jade-700/40 bg-jade-950/30 px-3 py-2 text-[11px] font-semibold text-jade-200">
                      Resolution: {issue.resolution}
                    </p>
                  )}
                  {!closed && !isSuspended && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
                      <input
                        className="input-dark w-full !py-2 text-[12px] sm:min-w-[220px] sm:w-auto sm:flex-1"
                        placeholder="Add technician dispatch, check-in action, or escalation note…"
                        value={issueNoteById[issue.id] ?? ''}
                        onChange={e => setIssueNoteById(prev => ({ ...prev, [issue.id]: e.target.value }))}
                      />
                      <button
                        disabled={busyIssueId === issue.id}
                        onClick={() => void respondToIssue(issue, 'investigating')}
                        className="flex items-center gap-1.5 rounded-xl border border-sky-800 bg-sky-950/40 px-3 py-2 text-[11px] font-bold text-sky-300 hover:bg-sky-950 disabled:opacity-50 [&>svg]:shrink-0"
                      >
                        <SearchCheck size={13} /> Post investigation update
                      </button>
                      <button
                        disabled={busyIssueId === issue.id}
                        onClick={() => void respondToIssue(issue, 'escalated')}
                        className="flex items-center gap-1.5 rounded-xl border border-orange-800 bg-orange-950/40 px-3 py-2 text-[11px] font-bold text-orange-300 hover:bg-orange-950 disabled:opacity-50 [&>svg]:shrink-0"
                      >
                        <AlertOctagon size={13} /> Escalate to HAMLET
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
