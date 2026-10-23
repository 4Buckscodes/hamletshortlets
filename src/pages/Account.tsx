import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CreditCard, X, ChevronDown, ChevronUp, MessageSquarePlus, ShieldCheck,
  Star, BedDouble, CalendarDays, AlertCircle, Loader2, Lock, Receipt, LifeBuoy, RefreshCcw,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { BookingStatusPill } from '../components/Badges';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
import { buildWorkspaceSignInPath } from '../lib/authRedirect';
import type { Booking } from '../lib/types';
import { formatNaira, formatDate, formatDateTime } from '../lib/pricing';

const STAGES = ['Requested', 'Checking', 'Accepted', 'Confirmed', 'Completed'] as const;
const STAGE_STATUS: Record<string, number> = {
  requested: 0, checking: 1, awaiting_payment: 2, confirmed: 3, completed: 4,
};

function BookingStepper({ status }: { status: Booking['status'] }) {
  const negative = ['cancelled', 'declined', 'expired', 'no_show', 'refunded', 'disputed'].includes(status);
  const current = STAGE_STATUS[status] ?? -1;
  return (
    <div className="mt-3">
      <div className="flex items-center">
        {STAGES.map((label, i) => {
          const done = !negative && current >= i;
          const active = !negative && current === i;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-black transition ${done ? 'border-jade-600 bg-jade-600 text-white' : 'border-ink-200 bg-white text-ink-400'} ${active ? 'ring-4 ring-jade-100' : ''}`}>
                  {done && current > i ? '✓' : i + 1}
                </div>
                <span className={`mt-1 hidden text-[9px] font-extrabold uppercase tracking-wide sm:block ${done ? 'text-jade-800' : 'text-ink-400'}`}>{label}</span>
              </div>
              {i < STAGES.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${!negative && current > i ? 'bg-jade-600' : 'bg-ink-100'}`} />}
            </div>
          );
        })}
      </div>
      {!negative && current >= 0 && (
        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-jade-800 sm:hidden">
          Stage {current + 1} of {STAGES.length} · {STAGES[current]}
        </p>
      )}
      {negative && <p className="mt-2 text-[11px] font-bold text-red-700">This booking closed as: {status.replace('_', ' ')}</p>}
    </div>
  );
}

function PaymentModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { verifyPayment, state } = useHamlet();
  const { toast } = useToast();
  const [stage, setStage] = useState<'idle' | 'processing' | 'verifying'>('idle');
  const session = state.session!;

  const pay = () => {
    setStage('processing');
    window.setTimeout(() => setStage('verifying'), 900);
    window.setTimeout(() => {
      verifyPayment(booking.id);
      toast('Payment verified server-side. Booking confirmed!');
      onClose();
    }, 2100);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={stage === 'idle' ? onClose : undefined} />
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="bg-[#0BA4DB] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 font-display text-sm font-black text-white">P</span>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-white">Paystack Checkout</p>
                <p className="truncate text-[9.5px] font-semibold text-white/80">Demo simulation · webhook-verified · {session.email}</p>
              </div>
            </div>
            {stage === 'idle' && <button onClick={onClose} aria-label="Close" className="shrink-0"><X size={20} className="text-white/80" /></button>}
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {stage === 'idle' && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold text-ink-500">Paying HAMLET for booking</span>
                <span className="shrink-0 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-600">{booking.ref}</span>
              </div>
              <p className="mt-2 font-display text-3xl font-black tracking-tight tabular-nums text-ink-900 sm:text-4xl">{formatNaira(booking.guestTotal)}</p>
              <dl className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 p-4 text-[12px] font-medium text-ink-700">
                <div className="flex justify-between gap-3"><dt className="min-w-0">Accommodation ({booking.nights} nights)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.accommodationSubtotal)}</dd></div>
                {booking.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET guest fee (3%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd></div>
                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1.5 font-bold text-ink-900"><dt>Total</dt><dd className="shrink-0 tabular-nums">{formatNaira(booking.guestTotal)}</dd></div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 border-[#0BA4DB] bg-sky-50 p-3 text-center"><CreditCard size={18} className="mx-auto shrink-0 text-[#0BA4DB]" /><p className="mt-1 text-[11px] font-black text-ink-800">Card</p><p className="text-[9px] font-semibold text-ink-400">4084 •••• 4081</p></div>
                <div className="rounded-xl border border-ink-200 p-3 text-center"><Receipt size={18} className="mx-auto shrink-0 text-ink-500" /><p className="mt-1 text-[11px] font-black text-ink-800">Bank transfer</p><p className="text-[9px] font-semibold text-ink-400">pay with your bank app</p></div>
              </div>
              <button onClick={pay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0BA4DB] py-4 font-display text-[15px] font-black text-white transition hover:bg-[#0993c3] [&>svg]:shrink-0">
                <Lock size={15} /> Pay {formatNaira(booking.guestTotal)}
              </button>
              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-ink-400">Confirmation is issued only after Paystack's webhook is verified server-side. A redirect or screenshot is never accepted as proof of payment.</p>
            </>
          )}
          {stage !== 'idle' && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 size={44} className="animate-spin text-[#0BA4DB]" />
              <p className="mt-4 font-display text-lg font-black text-ink-900">{stage === 'processing' ? 'Contacting your bank…' : 'Verifying webhook signature…'}</p>
              <p className="mt-1 max-w-[240px] text-[12px] font-medium text-ink-500">{stage === 'processing' ? 'Approve the transaction to continue' : 'Server-side verification · idempotency key checked'}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function IssueModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { reportIssue } = useHamlet();
  const { toast } = useToast();
  const [category, setCategory] = useState<Parameters<typeof reportIssue>[0]['category']>('Property condition');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !description.trim()) { toast('Please describe the issue.', 'error'); return; }
    setSubmitting(true);
    try {
      const issue = await reportIssue({
        bookingRef: booking.ref, propertyTitle: booking.propertyTitle,
        category, severity: 'medium', subject: subject.trim(), description: description.trim(),
        reporter: 'Guest', reporterType: 'guest',
      });
      toast(`Issue ${issue.ref} reported. HAMLET support will respond within the SLA.`);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not report the issue.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-black text-ink-900">Report an issue</h2>
          <button onClick={onClose} className="shrink-0" aria-label="Close"><X size={20} className="text-ink-400" /></button>
        </div>
        <p className="mt-1 break-words text-[11px] font-semibold text-ink-500">Booking {booking.ref} · {booking.propertyTitle}</p>
        <label className="mt-4 block"><span className="label">Category</span>
          <select className="input" value={category} onChange={e => setCategory(e.target.value as typeof category)}>
            {['Property condition', 'Access & check-in', 'Payment & billing', 'Booking conflict', 'Safety & security', 'Host conduct', 'Damages', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="label">Subject</span><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. AC not cooling on arrival" /></label>
        <label className="mt-3 block"><span className="label">What happened?</span><textarea className="input min-h-[80px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue, when it happened and what you need…" /></label>
        <button disabled={submitting} onClick={() => void submit()} className="btn-jade mt-4 w-full disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit issue to HAMLET support'}</button>
      </motion.div>
    </motion.div>
  );
}

export default function Account() {
  const {
    state,
    bookingTransition,
    submitBookingFeedback,
    initializeBookingCheckout,
    refreshState,
    backendConfigured,
    backendReady,
    backendError,
  } = useHamlet();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const session = state.session;
  const focusedBookingParam = searchParams.get('booking')?.trim() || null;
  const [expanded, setExpanded] = useState<string | null>(focusedBookingParam);
  const [payFor, setPayFor] = useState<Booking | null>(null);
  const [issueFor, setIssueFor] = useState<Booking | null>(null);
  const [fbRating, setFbRating] = useState(5);
  const [fbText, setFbText] = useState('');
  const [fbCategory, setFbCategory] = useState('Stay experience');
  const [submittingFbId, setSubmittingFbId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [checkoutBusyId, setCheckoutBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const returnedFromPayment = searchParams.get('payment') === 'returned';

  useEffect(() => {
    if (!returnedFromPayment || !backendConfigured) return;
    void refreshState().catch(() => { /* surfaced via manual refresh if needed */ });
  }, [returnedFromPayment, backendConfigured, refreshState]);

  const myBookings = useMemo(
    () => state.bookings.filter(b => b.guestId === session?.userId).sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
    [state.bookings, session],
  );

  const resolvedExpanded = useMemo(() => {
    if (expanded) {
      const match = myBookings.find(b => b.id === expanded || b.ref === expanded);
      if (match) return match.id;
    }
    return expanded;
  }, [expanded, myBookings]);

  if (!backendReady) {
    return <GuestLayout><div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-sm font-semibold text-ink-600">Connecting to your account…</p></div></GuestLayout>;
  }
  if (backendError) {
    return <GuestLayout><div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="font-display text-2xl font-black text-ink-900">Couldn't load your account</h1><p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p><button onClick={() => window.location.reload()} className="btn-jade mt-6">Try again</button></div></GuestLayout>;
  }
  if (!session) {
    const signInReturnPath = buildWorkspaceSignInPath(`${location.pathname}${location.search}`);
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-jade-600" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-900">Sign in to see your bookings</h1>
          <p className="mt-2 text-sm text-ink-500">Track requests, complete payment and report issues from one place.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link to={signInReturnPath} className="btn-jade">Sign in</Link>
            <Link to="/signin?mode=signup" className="btn-outline">Guest sign up</Link>
          </div>
        </div>
      </GuestLayout>
    );
  }
  if (session.role !== 'guest') {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-black text-ink-900">This area is for guests</h1>
          <p className="mt-2 text-sm text-ink-500">Your {session.role} workspace lives at {session.role === 'admin' ? '/admin' : '/partner'}.</p>
          <Link to={session.role === 'admin' ? '/admin' : '/partner'} className="btn-jade mt-6">Go to workspace</Link>
        </div>
      </GuestLayout>
    );
  }

  const submitFeedback = async (booking: Booking) => {
    if (fbText.trim().length < 5) { toast('Please write at least 5 characters.', 'error'); return; }
    setSubmittingFbId(booking.id);
    try {
      await submitBookingFeedback({
        bookingId: booking.id,
        bookingRef: booking.ref,
        propertyTitle: booking.propertyTitle,
        rating: fbRating,
        category: fbCategory,
        text: fbText.trim(),
      });
      setFbText('');
      setFbRating(5);
      toast('Thank you — feedback recorded privately for HAMLET operations.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not submit feedback.', 'error');
    } finally {
      setSubmittingFbId(null);
    }
  };

  const startConnectedCheckout = async (booking: Booking) => {
    setCheckoutBusyId(booking.id);
    try {
      const { authorizationUrl } = await initializeBookingCheckout(booking.id);
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Online checkout could not be started.', 'error');
    } finally {
      setCheckoutBusyId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshState();
      toast('Booking status refreshed.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not refresh status.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <GuestLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-jade-700">Guest account</p>
            <h1 className="mt-1 font-display text-3xl font-black text-ink-900">Good to see you, {session.name.split(' ')[0]}</h1>
            <p className="mt-1 text-[12px] font-medium text-ink-500">{session.email} · Bookings tracked end-to-end</p>
          </div>
          <Link to="/stays" className="btn-outline !py-2.5 text-[12px]">Book another stay</Link>
        </div>

        {returnedFromPayment && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3.5 text-[12px] font-semibold text-sky-950">
            <div className="max-w-2xl">
              <p className="font-bold">Returned from Paystack checkout</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-sky-900">
                A browser redirect is never proof of payment. Your booking transitions to <strong>Confirmed</strong> automatically as soon as Paystack's signed server webhook is verified.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={refreshing} onClick={() => void handleRefresh()} className="btn-outline !px-3 !py-1.5 text-[11px]">
                <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh status
              </button>
              <button onClick={() => setSearchParams({}, { replace: true })} className="text-[11px] font-bold text-sky-800 hover:underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* Pilot notice: private feedback, no public reviews yet */}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brass-400/40 bg-brass-200/30 px-4 py-3 text-[12px] font-semibold leading-relaxed text-ink-800">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-brass-700" />
          <span><strong>Pilot phase:</strong> Public reviews are not live yet. Feedback you leave after a stay is private and reviewed by HAMLET operations only — it shapes listings, never public ratings.</span>
        </div>

        <div className="mt-6 grid gap-5">
          {myBookings.length === 0 && (
            <div className="card px-6 py-16 text-center">
              <BedDouble size={36} className="mx-auto text-ink-300" />
              <h2 className="mt-3 font-display text-xl font-black text-ink-900">No bookings yet</h2>
              <p className="mt-1 text-sm text-ink-500">Explore approved Lagos homes and send your first request.</p>
              <Link to="/stays" className="btn-jade mt-5">Explore stays</Link>
            </div>
          )}

          {myBookings.map(b => {
            const open = resolvedExpanded === b.id;
            const canCancel = ['requested', 'checking', 'awaiting_payment'].includes(b.status);
            const canReport = ['confirmed', 'completed', 'disputed'].includes(b.status);
            const canFeedback = ['completed', 'disputed'].includes(b.status);
            const existingFeedback = state.feedback.find(f => f.bookingRef === b.ref);

            return (
              <article key={b.id} className="card overflow-hidden">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
                      <BookingStatusPill status={b.status} />
                    </div>
                    <h2 className="mt-1.5 break-words font-display text-[17px] font-bold leading-snug text-ink-900">{b.propertyTitle}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] font-semibold text-ink-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} className="shrink-0" />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights</span>
                      <span>{b.guests} guest{b.guests > 1 ? 's' : ''}</span>
                    </p>
                    <BookingStepper status={b.status} />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 border-t border-ink-50 pt-2.5 sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div>
                      <p className="font-display text-xl font-black tabular-nums text-ink-900 sm:text-right">{formatNaira(b.guestTotal)}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:text-right">total incl. 3% fee</p>
                    </div>
                    <button onClick={() => setExpanded(open ? null : b.id)} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-900">
                      Details {open ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
                    </button>
                  </div>
                </div>

                {b.status === 'awaiting_payment' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3">
                    <p className="max-w-xl text-[12px] font-bold text-amber-900">
                      Payment deadline: {b.paymentDeadline ? formatDateTime(b.paymentDeadline) : '48h from acceptance'} — pay only via verified HAMLET Paystack checkout (screenshots or off-platform transfers never confirm a stay).
                    </p>
                    {backendConfigured ? (
                      <button
                        disabled={checkoutBusyId === b.id}
                        onClick={() => void startConnectedCheckout(b)}
                        className="btn-brass !px-4 !py-2.5 text-[12px] disabled:opacity-50"
                      >
                        <CreditCard size={15} /> {checkoutBusyId === b.id ? 'Starting checkout…' : `Pay ${formatNaira(b.guestTotal)}`}
                      </button>
                    ) : (
                      <button onClick={() => setPayFor(b)} className="btn-brass !px-4 !py-2.5 text-[12px]"><CreditCard size={15} /> Pay {formatNaira(b.guestTotal)}</button>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-100">
                      <div className="grid gap-6 p-5 md:grid-cols-2">
                        <div>
                          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">Price breakdown</h3>
                          <dl className="mt-2 space-y-1 text-[12px] font-medium text-ink-700">
                            <div className="flex justify-between gap-3"><dt className="min-w-0">Subtotal ({b.nights} nights)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd></div>
                            {b.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between gap-3"><dt className="min-w-0">{c.label}</dt><dd className="shrink-0 tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                            <div className="flex justify-between gap-3"><dt className="min-w-0">HAMLET guest fee (3%)</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.hamletGuestFee)}</dd></div>
                            <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900"><dt>Total</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.guestTotal)}</dd></div>
                            <div className="flex justify-between gap-3 text-ink-400"><dt className="min-w-0">Refundable deposit</dt><dd className="shrink-0 tabular-nums">{formatNaira(b.deposit)}</dd></div>
                          </dl>
                          {b.paymentRef && <p className="mt-3 break-all font-mono text-[10px] font-bold text-ink-400">Provider ref: {b.paymentRef} · {b.paymentProvider}</p>}
                          {b.cancelReason && <p className="mt-2 break-words text-[11.5px] font-semibold text-red-700">Reason: {b.cancelReason}</p>}
                          {b.refundStatus === 'processed' && <p className="mt-1 text-[11.5px] font-bold text-teal-800">Refund processed: {formatNaira(b.refundAmount ?? b.guestTotal)}</p>}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canCancel && <button
                              disabled={cancelingId === b.id}
                              onClick={async () => {
                                setCancelingId(b.id);
                                try {
                                  await bookingTransition(b.id, 'cancelled', { reason: 'Cancelled by guest before confirmation' });
                                  toast('Booking cancelled.', 'info');
                                } catch (error) {
                                  toast(error instanceof Error ? error.message : 'Could not cancel this booking.', 'error');
                                } finally {
                                  setCancelingId(null);
                                }
                              }}
                              className="btn-outline !px-3.5 !py-2 text-[11px] text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                            ><X size={13} />{cancelingId === b.id ? 'Cancelling…' : 'Cancel booking'}</button>}
                            {canReport && <button onClick={() => setIssueFor(b)} className="btn-outline !px-3.5 !py-2 text-[11px]"><LifeBuoy size={13} />Report issue</button>}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">Timeline</h3>
                          <ol className="mt-2 space-y-0 border-l-2 border-ink-100 pl-4">
                            {b.timeline.map((t, i) => (
                              <li key={i} className="relative pb-3 text-[11.5px]">
                                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-jade-600" />
                                <p className="font-bold text-ink-800">{t.label}</p>
                                <p className="text-[10.5px] font-medium text-ink-400">{formatDateTime(t.at)} · {t.actor}{t.detail ? ` · ${t.detail}` : ''}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      {canFeedback && (
                        <div className="border-t border-ink-100 bg-clay/50 p-4 sm:p-5">
                          <h3 className="flex items-start gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500"><MessageSquarePlus size={14} className="mt-0.5 shrink-0" /> Private pilot feedback — reviewed by HAMLET operations only</h3>
                          {existingFeedback ? (
                            <div className="mt-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-medium text-ink-800">
                              <p className="font-bold text-jade-800">{existingFeedback.rating}/5 · {existingFeedback.category}</p>
                              <p className="mt-1 break-words">“{existingFeedback.text}”</p>
                              <p className="mt-1 text-[10px] font-semibold text-ink-400">Submitted privately on {formatDateTime(existingFeedback.at)}</p>
                            </div>
                          ) : (
                            <>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <button key={n} type="button" onClick={() => setFbRating(n)} aria-label={`${n} stars`}>
                                    <Star size={22} className={`shrink-0 ${n <= fbRating ? 'fill-brass-400 text-brass-500' : 'text-ink-200'}`} strokeWidth={1.5} />
                                  </button>
                                ))}
                                <select className="input w-full !py-1.5 text-[11px] sm:ml-3 sm:!w-auto" value={fbCategory} onChange={e => setFbCategory(e.target.value)}>
                                  {['Stay experience', 'Property condition', 'Check-in & access', 'Value for money', 'Host communication'].map(c => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <input className="input flex-1" placeholder="How was your stay? (private, reviewed by HAMLET only)" value={fbText} onChange={e => setFbText(e.target.value)} />
                                <button disabled={submittingFbId === b.id} className="btn-dark shrink-0 !px-4 !py-2 text-[12px] disabled:opacity-50" onClick={() => void submitFeedback(b)}>
                                  {submittingFbId === b.id ? 'Sending…' : 'Send'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{payFor && !backendConfigured && <PaymentModal booking={payFor} onClose={() => setPayFor(null)} />}</AnimatePresence>
      <AnimatePresence>{issueFor && <IssueModal booking={issueFor} onClose={() => setIssueFor(null)} />}</AnimatePresence>
    </GuestLayout>
  );
}

export function WorkspaceGuard({ expected, children }: { expected: 'partner' | 'admin'; children: React.ReactNode }) {
  const { state, backendReady, signOut } = useHamlet();
  const navigate = useNavigate();
  const location = useLocation();
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const intendedTarget = `${location.pathname}${location.search}`;
  const signInWithRedirect = buildWorkspaceSignInPath(intendedTarget);

  if (!backendReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <p className="text-[13px] font-semibold text-ink-300">Restoring your secure workspace session…</p>
      </div>
    );
  }

  const s = state.session;
  if (!s || s.role !== expected) {
    const switchToAuthorizedAccount = async () => {
      if (!s) {
        navigate(signInWithRedirect);
        return;
      }
      setSwitchingAccount(true);
      try {
        await signOut();
      } catch {
        // Proceed to sign-in even if session cleanup had already completed
      } finally {
        setSwitchingAccount(false);
      }
      navigate(signInWithRedirect);
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <div className="max-w-md text-center">
          <ShieldCheck size={44} className="mx-auto text-brass-400" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-50">
            {s
              ? 'Access denied for current account'
              : expected === 'admin'
                ? 'Admin access required'
                : 'Partner access required'}
          </h1>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-300">
            {s
              ? `You are signed in as ${s.email} (${s.role}), which is not authorised for the ${expected} workspace. Private property and booking details are hidden.`
              : `Sign in with your verified ${expected} account to continue. After signing in, you will return directly to this page.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              disabled={switchingAccount}
              onClick={() => void switchToAuthorizedAccount()}
              className="btn-brass !py-2.5 text-[12px] disabled:opacity-50"
            >
              {s ? `Sign in with ${expected} account` : 'Sign in'}
            </button>
            {expected === 'partner' && !s && (
              <button onClick={() => navigate('/partner/register')} className="btn-ghost-dark !py-2.5 text-[12px]">
                Apply as partner
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
