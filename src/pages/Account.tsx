import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CreditCard, X, ChevronDown, ChevronUp, MessageSquarePlus, ShieldCheck,
  Star, BedDouble, CalendarDays, AlertCircle, Loader2, Lock, Receipt, LifeBuoy,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { BookingStatusPill } from '../components/Badges';
import { useHamlet } from '../lib/store';
import { useToast } from '../lib/toast';
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
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-black transition ${done ? 'border-jade-600 bg-jade-600 text-white' : 'border-ink-200 bg-white text-ink-400'} ${active ? 'ring-4 ring-jade-100' : ''}`}>
                  {done && current > i ? '✓' : i + 1}
                </div>
                <span className={`mt-1 hidden text-[9px] font-extrabold uppercase tracking-wide sm:block ${done ? 'text-jade-800' : 'text-ink-400'}`}>{label}</span>
              </div>
              {i < STAGES.length - 1 && <div className={`mx-1 h-0.5 flex-1 rounded ${!negative && current > i ? 'bg-jade-600' : 'bg-ink-100'}`} />}
            </div>
          );
        })}
      </div>
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
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="bg-[#0BA4DB] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 font-display text-sm font-black text-white">P</span>
              <div><p className="text-[13px] font-black text-white">Paystack Checkout</p><p className="text-[9.5px] font-semibold text-white/80">Test mode · webhook-verified · {session.email}</p></div>
            </div>
            {stage === 'idle' && <button onClick={onClose} aria-label="Close"><X size={20} className="text-white/80" /></button>}
          </div>
        </div>
        <div className="p-6">
          {stage === 'idle' && (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-bold text-ink-500">Paying HAMLET for booking</span>
                <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-600">{booking.ref}</span>
              </div>
              <p className="mt-2 font-display text-4xl font-black tracking-tight text-ink-900">{formatNaira(booking.guestTotal)}</p>
              <dl className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 p-4 text-[12px] font-medium text-ink-700">
                <div className="flex justify-between"><dt>Accommodation ({booking.nights} nights)</dt><dd className="tabular-nums">{formatNaira(booking.accommodationSubtotal)}</dd></div>
                {booking.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between"><dt>{c.label}</dt><dd className="tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                <div className="flex justify-between"><dt>HAMLET guest fee (3%)</dt><dd className="tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd></div>
                <div className="flex justify-between border-t border-ink-100 pt-1.5 font-bold text-ink-900"><dt>Total</dt><dd className="tabular-nums">{formatNaira(booking.guestTotal)}</dd></div>
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 border-[#0BA4DB] bg-sky-50 p-3 text-center"><CreditCard size={18} className="mx-auto text-[#0BA4DB]" /><p className="mt-1 text-[11px] font-black text-ink-800">Card</p><p className="text-[9px] font-semibold text-ink-400">4084 •••• 4081</p></div>
                <div className="rounded-xl border border-ink-200 p-3 text-center"><Receipt size={18} className="mx-auto text-ink-500" /><p className="mt-1 text-[11px] font-black text-ink-800">Bank transfer</p><p className="text-[9px] font-semibold text-ink-400">pay with your bank app</p></div>
              </div>
              <button onClick={pay} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0BA4DB] py-4 font-display text-[15px] font-black text-white transition hover:bg-[#0993c3]">
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

  const submit = () => {
    if (!subject.trim() || !description.trim()) { toast('Please describe the issue.', 'error'); return; }
    const issue = reportIssue({
      bookingRef: booking.ref, propertyTitle: booking.propertyTitle,
      category, severity: 'medium', subject: subject.trim(), description: description.trim(),
      reporter: 'Adaeze Okafor', reporterType: 'guest',
    });
    toast(`Issue ${issue.ref} reported. HAMLET support will respond within the SLA.`);
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60, opacity: 0 }} className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl font-black text-ink-900">Report an issue</h2>
          <button onClick={onClose}><X size={20} className="text-ink-400" /></button>
        </div>
        <p className="mt-1 text-[11px] font-semibold text-ink-500">Booking {booking.ref} · {booking.propertyTitle}</p>
        <label className="mt-4 block"><span className="label">Category</span>
          <select className="input" value={category} onChange={e => setCategory(e.target.value as typeof category)}>
            {['Property condition', 'Access & check-in', 'Payment & billing', 'Booking conflict', 'Safety & security', 'Host conduct', 'Damages', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="mt-3 block"><span className="label">Subject</span><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. AC not cooling on arrival" /></label>
        <label className="mt-3 block"><span className="label">What happened?</span><textarea className="input min-h-[80px] resize-none" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue, when it happened and what you need…" /></label>
        <button onClick={submit} className="btn-jade mt-4 w-full">Submit issue to HAMLET support</button>
      </motion.div>
    </motion.div>
  );
}

export default function Account() {
  const { state, bookingTransition, addFeedback } = useHamlet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const session = state.session;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<Booking | null>(null);
  const [issueFor, setIssueFor] = useState<Booking | null>(null);
  const [fbRating, setFbRating] = useState(5);
  const [fbText, setFbText] = useState('');
  const [fbCategory, setFbCategory] = useState('Stay experience');

  const myBookings = useMemo(
    () => state.bookings.filter(b => b.guestId === session?.userId).sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
    [state.bookings, session],
  );

  if (!session) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-jade-600" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-900">Sign in to see your bookings</h1>
          <p className="mt-2 text-sm text-ink-500">Track requests, complete payment and report issues from one place.</p>
          <Link to="/signin" className="btn-jade mt-6">Sign in</Link>
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

  const submitFeedback = (bookingRef: string) => {
    if (!fbText.trim()) { toast('Please write a few words.', 'error'); return; }
    addFeedback({ bookingRef, guestName: session.name, rating: fbRating, text: fbText.trim(), category: fbCategory });
    setFbText(''); setFbRating(5);
    toast('Thank you — feedback recorded privately for the pilot.');
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
            const open = expanded === b.id;
            const canPay = b.status === 'awaiting_payment';
            const canCancel = ['requested', 'checking', 'awaiting_payment'].includes(b.status);
            const canReport = ['confirmed', 'completed', 'disputed'].includes(b.status);
            const canFeedback = ['completed', 'disputed'].includes(b.status);
            return (
              <article key={b.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
                      <BookingStatusPill status={b.status} />
                    </div>
                    <h2 className="mt-1.5 font-display text-[17px] font-bold leading-snug text-ink-900">{b.propertyTitle}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] font-semibold text-ink-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights</span>
                      <span>{b.guests} guest{b.guests > 1 ? 's' : ''}</span>
                    </p>
                    <BookingStepper status={b.status} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="font-display text-xl font-black text-ink-900">{formatNaira(b.guestTotal)}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">total incl. 3% fee</p>
                    <button onClick={() => setExpanded(open ? null : b.id)} className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-jade-700 hover:text-jade-900">
                      Details {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {canPay && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3">
                    <p className="text-[12px] font-bold text-amber-900">Payment deadline: {b.paymentDeadline ? formatDateTime(b.paymentDeadline) : '48h from acceptance'} — after which the booking expires and dates are released.</p>
                    <button onClick={() => setPayFor(b)} className="btn-brass !px-4 !py-2.5 text-[12px]"><CreditCard size={15} /> Pay {formatNaira(b.guestTotal)}</button>
                  </div>
                )}

                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink-100">
                      <div className="grid gap-6 p-5 md:grid-cols-2">
                        <div>
                          <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">Price breakdown</h3>
                          <dl className="mt-2 space-y-1 text-[12px] font-medium text-ink-700">
                            <div className="flex justify-between"><dt>Subtotal ({b.nights} nights)</dt><dd className="tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd></div>
                            {b.mandatoryCharges.map(c => <div key={c.label} className="flex justify-between"><dt>{c.label}</dt><dd className="tabular-nums">{formatNaira(c.amount)}</dd></div>)}
                            <div className="flex justify-between"><dt>HAMLET guest fee (3%)</dt><dd className="tabular-nums">{formatNaira(b.hamletGuestFee)}</dd></div>
                            <div className="flex justify-between border-t border-ink-100 pt-1 font-bold text-ink-900"><dt>Total</dt><dd className="tabular-nums">{formatNaira(b.guestTotal)}</dd></div>
                            <div className="flex justify-between text-ink-400"><dt>Refundable deposit</dt><dd className="tabular-nums">{formatNaira(b.deposit)}</dd></div>
                          </dl>
                          {b.paymentRef && <p className="mt-3 font-mono text-[10px] font-bold text-ink-400">Provider ref: {b.paymentRef} · {b.paymentProvider}</p>}
                          {b.cancelReason && <p className="mt-2 text-[11.5px] font-semibold text-red-700">Reason: {b.cancelReason}</p>}
                          {b.refundStatus === 'processed' && <p className="mt-1 text-[11.5px] font-bold text-teal-800">Refund processed: {formatNaira(b.refundAmount ?? b.guestTotal)}</p>}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canCancel && <button onClick={() => { bookingTransition(b.id, 'cancelled', { reason: 'Cancelled by guest before confirmation' }); toast('Booking cancelled.', 'info'); }} className="btn-outline !px-3.5 !py-2 text-[11px] text-red-700 hover:border-red-300 hover:bg-red-50"><X size={13} />Cancel booking</button>}
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
                        <div className="border-t border-ink-100 bg-clay/50 p-5">
                          <h3 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500"><MessageSquarePlus size={14} /> Private pilot feedback — not public</h3>
                          <div className="mt-2 flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button key={n} onClick={() => setFbRating(n)} aria-label={`${n} stars`}>
                                <Star size={22} className={n <= fbRating ? 'fill-brass-400 text-brass-500' : 'text-ink-200'} strokeWidth={1.5} />
                              </button>
                            ))}
                            <select className="input ml-3 !w-auto !py-1.5 text-[11px]" value={fbCategory} onChange={e => setFbCategory(e.target.value)}>
                              {['Stay experience', 'Property condition', 'Check-in & access', 'Value for money', 'Host communication'].map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <input className="input" placeholder="How was your stay? (private, reviewed by HAMLET only)" value={fbText} onChange={e => setFbText(e.target.value)} />
                            <button className="btn-dark !px-4 !py-2 text-[12px]" onClick={() => submitFeedback(b.ref)}>Send</button>
                          </div>
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

      <AnimatePresence>{payFor && <PaymentModal booking={payFor} onClose={() => setPayFor(null)} />}</AnimatePresence>
      <AnimatePresence>{issueFor && <IssueModal booking={issueFor} onClose={() => setIssueFor(null)} />}</AnimatePresence>
    </GuestLayout>
  );
}

export function WorkspaceGuard({ expected, children }: { expected: 'partner' | 'admin'; children: React.ReactNode }) {
  const { state } = useHamlet();
  const navigate = useNavigate();
  const s = state.session;
  if (!s || s.role !== expected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <div className="max-w-sm text-center">
          <ShieldCheck size={44} className="mx-auto text-brass-400" />
          <h1 className="mt-4 font-display text-2xl font-black text-ink-50">{expected === 'admin' ? 'Admin access required' : 'Partner access required'}</h1>
          <p className="mt-2 text-[13px] font-medium text-ink-300">This area is role-protected. Public registration never grants {expected} access — accounts are provisioned after verification.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/signin')} className="btn-brass !py-2.5 text-[12px]">Sign in</button>
            {expected === 'partner' && <button onClick={() => navigate('/partner/register')} className="btn-ghost-dark !py-2.5 text-[12px]">Apply as partner</button>}
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
