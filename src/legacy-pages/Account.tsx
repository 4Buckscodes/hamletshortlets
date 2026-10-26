import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CreditCard,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
  ShieldCheck,
  Star,
  BedDouble,
  CalendarDays,
  AlertCircle,
  Loader2,
  Lock,
  Receipt,
  LifeBuoy,
  RefreshCcw,
  UserCog,
  Building2,
  Printer,
  Paperclip,
  CheckCircle2,
  Compass,
  Navigation,
  ExternalLink,
  Heart,
  Sparkles,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { PropertyCard } from '../components/PropertyCard';
import { useHoratio } from '../components/HoratioDrawer';
import {
  BookingStatusPill,
  IssueStatusPill,
  SeverityPill,
  ApplicationStatusPill,
} from '../components/Badges';
import { useWishlist } from '../lib/wishlist';
import { useHamlet } from '../lib/store';
import { useCurrency, formatMinorCurrency } from '../lib/currency';
import { usePageMeta } from '../lib/brand';
import { useToast } from '../lib/toast';
import { buildWorkspaceSignInPath } from '../lib/authRedirect';
import type { Booking } from '../lib/types';
import { formatNaira, formatDate, formatDateTime, isQuoteExpired } from '../lib/pricing';
import { buildGoogleMapsDirectionsUrl, computeWayfinderReadiness } from '../lib/wayfinder';

const STAGES = ['Requested', 'Checking', 'Accepted', 'Confirmed', 'Completed'] as const;
const STAGE_STATUS: Record<string, number> = {
  requested: 0,
  checking: 1,
  awaiting_payment: 2,
  confirmed: 3,
  completed: 4,
};

function BookingStepper({ status }: { status: Booking['status'] }) {
  const negative = ['cancelled', 'declined', 'expired', 'no_show', 'refunded', 'disputed'].includes(status);
  const current = STAGE_STATUS[status] ?? -1;
  return (
    <div className="mt-3.5">
      <div className="flex items-center">
        {STAGES.map((label, i) => {
          const done = !negative && current >= i;
          const active = !negative && current === i;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-extrabold transition ${
                    done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-ink-200 bg-white text-ink-400'
                  } ${active ? 'ring-4 ring-emerald-100' : ''}`}
                >
                  {done && current > i ? '✓' : i + 1}
                </div>
                <span
                  className={`mt-1 hidden text-[9px] font-extrabold uppercase tracking-wide sm:block ${
                    done ? 'text-ink-900' : 'text-ink-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 rounded ${
                    !negative && current > i ? 'bg-emerald-600' : 'bg-ink-100'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {!negative && current >= 0 && (
        <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-800 sm:hidden">
          Stage {current + 1} of {STAGES.length} · {STAGES[current]}
        </p>
      )}
      {negative && (
        <p className="mt-2 text-[11px] font-bold text-red-700">
          This booking closed as: {status.replace('_', ' ')}
        </p>
      )}
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
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        onClick={stage === 'idle' ? onClose : undefined}
      />
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="bg-[#0BA4DB] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 font-display text-sm font-bold text-white">
                P
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white">Paystack Checkout</p>
                <p className="truncate text-[9.5px] font-semibold text-white/80">
                  Demo simulation · webhook-verified · {session.email}
                </p>
              </div>
            </div>
            {stage === 'idle' && (
              <button onClick={onClose} aria-label="Close" className="shrink-0">
                <X size={20} className="text-white/80" />
              </button>
            )}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          {stage === 'idle' && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-ink-500">Paying HAMLET for booking</span>
                <span className="shrink-0 rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-600">
                  {booking.ref}
                </span>
              </div>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight tabular-nums text-ink-900 sm:text-4xl">
                {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
              </p>
              {booking.quoteCurrency && booking.quoteCurrency !== 'NGN' && booking.quotedStayTotalMinor && (
                <p className="mt-1 text-[11.5px] font-semibold text-sky-900">
                  Quoted stay: {formatMinorCurrency(booking.quotedStayTotalMinor, booking.quoteCurrency)} (incl. 10% buffer @ ₦{booking.fxRate?.toLocaleString('en-NG')}) · Settled in NGN
                </p>
              )}
              <dl className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 p-4 text-xs font-medium text-ink-700">
                <div className="flex justify-between gap-3">
                  <dt className="min-w-0">Owner accommodation ({booking.nights} nights)</dt>
                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.accommodationSubtotal)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.hamletGuestFee)}</dd>
                </div>
                {booking.mandatoryCharges.map(c => (
                  <div key={c.label} className="flex justify-between gap-3">
                    <dt className="min-w-0">{c.label}</dt>
                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
                  </div>
                ))}
                {(booking.internationalBufferNgnEquiv ?? 0) > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="min-w-0">International currency buffer (10%)</dt>
                    <dd className="shrink-0 font-mono tabular-nums">
                      {formatNaira(booking.internationalBufferNgnEquiv ?? 0)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1.5 font-bold text-ink-900">
                  <dt>Paystack NGN Stay Settlement Total</dt>
                  <dd className="shrink-0 font-mono tabular-nums">
                    {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
                  </dd>
                </div>
                {booking.deposit > 0 && (
                  <div className="flex justify-between gap-3 pt-1 text-[11px] text-ink-500">
                    <dt className="min-w-0">Separate refundable caution deposit (tracked post-inspection)</dt>
                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(booking.deposit)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border-2 border-[#0BA4DB] bg-sky-50 p-3 text-center">
                  <CreditCard size={18} className="mx-auto shrink-0 text-[#0BA4DB]" />
                  <p className="mt-1 text-[11px] font-bold text-ink-800">Card</p>
                  <p className="text-[9px] font-semibold text-ink-400">4084 •••• 4081</p>
                </div>
                <div className="rounded-xl border border-ink-200 p-3 text-center">
                  <Receipt size={18} className="mx-auto shrink-0 text-ink-500" />
                  <p className="mt-1 text-[11px] font-bold text-ink-800">Bank transfer</p>
                  <p className="text-[9px] font-semibold text-ink-400">pay with your bank app</p>
                </div>
              </div>
              <button
                onClick={pay}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0BA4DB] py-4 font-display text-[15px] font-bold text-white transition hover:bg-[#0993c3] [&>svg]:shrink-0"
              >
                <Lock size={15} /> Pay {formatNaira(booking.settlementTotalNgn ?? booking.guestTotal)}
              </button>
              <p className="mt-2 text-center text-[10px] font-medium leading-snug text-ink-400">
                Confirmation is issued only after Paystack’s webhook is verified server-side. A redirect or screenshot is never accepted as proof of payment.
              </p>
            </>
          )}
          {stage !== 'idle' && (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2 size={44} className="animate-spin text-[#0BA4DB]" />
              <p className="mt-4 font-display text-lg font-bold text-ink-900">
                {stage === 'processing' ? 'Contacting your bank…' : 'Verifying webhook signature…'}
              </p>
              <p className="mt-1 max-w-[240px] text-xs font-medium text-ink-500">
                {stage === 'processing'
                  ? 'Approve the transaction to continue'
                  : 'Server-side verification · idempotency key checked'}
              </p>
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
  const [severity, setSeverity] = useState<Parameters<typeof reportIssue>[0]['severity']>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (subject.trim().length < 4 || description.trim().length < 10) {
      toast('Enter a clear subject (min 4 chars) and description (min 10 chars).', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const issue = await reportIssue({
        bookingRef: booking.ref,
        propertyTitle: booking.propertyTitle,
        category,
        severity,
        subject: subject.trim(),
        description: description.trim(),
        reporter: 'Guest',
        reporterType: 'guest',
        evidence: evidenceNote.trim() ? [evidenceNote.trim()] : [],
      });
      toast(`Issue ${issue.ref} reported. Track updates under Support Issues.`);
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not report the issue.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink-900">Report an issue</h2>
          <button onClick={onClose} className="shrink-0" aria-label="Close">
            <X size={20} className="text-ink-400" />
          </button>
        </div>
        <p className="mt-1 break-words text-[11px] font-semibold text-ink-500">
          Booking {booking.ref} · {booking.propertyTitle}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Category</span>
            <select
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value as typeof category)}
            >
              {[
                'Property condition',
                'Access & check-in',
                'Payment & billing',
                'Booking conflict',
                'Safety & security',
                'Host conduct',
                'Damages',
                'Other',
              ].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Urgency</span>
            <select
              className="input"
              value={severity}
              onChange={e => setSeverity(e.target.value as typeof severity)}
            >
              {(['low', 'medium', 'high', 'critical'] as const).map(s => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="label">Subject</span>
          <input
            className="input"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. AC not cooling on arrival"
          />
        </label>
        <label className="mt-3 block">
          <span className="label">What happened?</span>
          <textarea
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue, when it happened and what support you need…"
          />
        </label>
        <label className="mt-3 block">
          <span className="label">Initial evidence reference (optional)</span>
          <input
            className="input"
            value={evidenceNote}
            onChange={e => setEvidenceNote(e.target.value)}
            placeholder="e.g. Arrival video taken 3:15 PM / gate pass ref…"
          />
        </label>
        <button
          disabled={submitting}
          onClick={() => void submit()}
          className="btn-jade mt-4 w-full !rounded-full disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit issue to HAMLET support'}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Account() {
  usePageMeta(
    'My Bookings & Account | HAMLET',
    'Track your shortlet booking requests, complete verified payment, view arrival details, and manage guest support on HAMLET.',
  );

  const {
    state,
    bookingTransition,
    submitBookingFeedback,
    initializeBookingCheckout,
    refreshBookingFxQuote,
    appendIssueEvidence,
    updateProfile,
    updatePassword,
    recordWayfinderEvent,
    refreshState,
    backendConfigured,
    backendReady,
    backendError,
  } = useHamlet();
  const { currency, formatMoney } = useCurrency();
  const { savedIds, clearSaved } = useWishlist();
  const { openHoratio } = useHoratio();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const session = state.session;
  const focusedBookingParam = searchParams.get('booking')?.trim() || null;

  const [activeTab, setActiveTab] = useState<'bookings' | 'saved' | 'issues' | 'profile'>(() =>
    searchParams.get('tab') === 'saved' ? 'saved' : 'bookings',
  );
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
  const [arrivalEaseRecorded, setArrivalEaseRecorded] = useState<Record<string, 'easy' | 'difficult'>>({});

  // Evidence attachment state
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [savingEvidenceId, setSavingEvidenceId] = useState<string | null>(null);

  // Profile & password settings state
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftPhone, setDraftPhone] = useState<string | null>(null);
  const profileName = draftName ?? session?.name ?? '';
  const profilePhone = draftPhone ?? session?.phone ?? '';
  const setProfileName = (v: string) => setDraftName(v);
  const setProfilePhone = (v: string) => setDraftPhone(v);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const returnedFromPayment = searchParams.get('payment') === 'returned';

  useEffect(() => {
    if (!returnedFromPayment || !backendConfigured) return;
    void refreshState().catch(() => {
      /* surfaced via manual refresh if needed */
    });
  }, [returnedFromPayment, backendConfigured, refreshState]);

  const myBookings = useMemo(
    () =>
      state.bookings
        .filter(b => b.guestId === session?.userId)
        .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
    [state.bookings, session],
  );

  const savedProperties = useMemo(
    () =>
      state.properties.filter(
        p => p.status === 'approved' && savedIds.includes(p.id),
      ),
    [state.properties, savedIds],
  );

  const myBookingRefs = useMemo(() => new Set(myBookings.map(b => b.ref)), [myBookings]);
  const myIssues = useMemo(
    () => state.issues.filter(i => i.bookingRef && myBookingRefs.has(i.bookingRef)),
    [state.issues, myBookingRefs],
  );

  const heldCautionTotalNgn = useMemo(() => {
    const myIds = new Set(myBookings.map(b => b.id));
    return state.cautionDeposits
      .filter(cd => myIds.has(cd.bookingId) && ['held', 'pending_inspection'].includes(cd.status))
      .reduce((sum, cd) => sum + cd.amountNgn, 0);
  }, [state.cautionDeposits, myBookings]);

  const myPartnerApplication = useMemo(() => {
    if (!session) return undefined;
    return state.applications.find(
      a =>
        a.applicantId === session.userId ||
        a.email.toLowerCase() === session.email.toLowerCase(),
    );
  }, [state.applications, session]);

  const resolvedExpanded = useMemo(() => {
    if (expanded) {
      const match = myBookings.find(b => b.id === expanded || b.ref === expanded);
      if (match) return match.id;
    }
    return expanded;
  }, [expanded, myBookings]);

  if (!backendReady) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-sm font-semibold text-ink-600">Connecting to your account…</p>
        </div>
      </GuestLayout>
    );
  }
  if (backendError) {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">Couldn’t load your account</h1>
          <p role="alert" className="mt-2 text-sm text-red-700">{backendError}</p>
          <button onClick={() => window.location.reload()} className="btn-jade mt-6">
            Try again
          </button>
        </div>
      </GuestLayout>
    );
  }
  if (!session) {
    const signInReturnPath = buildWorkspaceSignInPath(`${location.pathname}${location.search}`);
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <ShieldCheck size={40} className="mx-auto text-brass-600" />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
            Sign in to see your bookings
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Track requests, complete verified Paystack payment, open Wayfinder, and report issues from one place.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link to={signInReturnPath} className="btn-jade !rounded-full">
              Sign in
            </Link>
            <Link to="/signin?mode=signup" className="btn-outline !rounded-full">
              Create account
            </Link>
          </div>
        </div>
      </GuestLayout>
    );
  }
  if (session.role !== 'guest') {
    return (
      <GuestLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Your {session.role} workspace is active
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Open your {session.role === 'admin' ? 'Admin Console' : 'Partner Workspace'} directly.
          </p>
          <Link
            to={session.role === 'admin' ? '/admin' : '/partner'}
            className="btn-jade mt-6 !rounded-full"
          >
            Go to workspace
          </Link>
        </div>
      </GuestLayout>
    );
  }

  const initials = session.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');

  const submitFeedback = async (booking: Booking) => {
    if (fbText.trim().length < 5) {
      toast('Please write at least 5 characters.', 'error');
      return;
    }
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
      toast('Account & booking status refreshed.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not refresh status.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile({ name: profileName, phone: profilePhone });
      if (!res.ok) {
        toast(res.error ?? 'Could not save profile changes.', 'error');
        return;
      }
      setDraftName(null);
      setDraftPhone(null);
      toast('Profile details updated.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await updatePassword(newPassword);
      if (!res.ok) {
        toast(res.error ?? 'Could not update password.', 'error');
        return;
      }
      setNewPassword('');
      setConfirmNewPassword('');
      toast('Password updated.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <GuestLayout>
      {/* Midnight Navy Profile Banner */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brass-500/40 bg-brass-500/15 font-display text-xl font-bold text-brass-300">
                {initials || 'HM'}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow-light">Guest account</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    <ShieldCheck size={11} /> NDPR protected
                  </span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                  Good to see you, {session.name.split(' ')[0]}
                </h1>
                <p className="mt-1 text-xs font-medium text-ink-300">
                  {session.email}
                  {session.phone ? ` · ${session.phone}` : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CurrencyToggle variant="dark" />
              <button
                type="button"
                onClick={() => openHoratio()}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/15"
              >
                <Sparkles size={13} className="text-brass-400" /> Ask Horatio
              </button>
              {backendConfigured && (
                <button
                  type="button"
                  disabled={refreshing}
                  onClick={() => void handleRefresh()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
                >
                  <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
                </button>
              )}
              <Link to="/stays" className="btn-brass !rounded-full !px-4 !py-2 text-xs">
                Explore stays
              </Link>
            </div>
          </div>

          {/* Account Summary Metrics (Real Authorised Data Only) */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
                Bookings
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
                {myBookings.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
                Saved stays
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
                {savedProperties.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
                Caution held
              </p>
              <p className="mt-1 font-display text-xl font-bold tabular-nums text-brass-300 sm:text-2xl">
                {formatNaira(heldCautionTotalNgn)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink-300">
                Support issues
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
                {myIssues.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Partner Application Status Banner */}
        {myPartnerApplication && (
          <div className="mb-6 rounded-3xl border border-ink-200 bg-white p-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Building2 size={17} className="shrink-0 text-brass-600" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                  Partner application
                </span>
                <ApplicationStatusPill status={myPartnerApplication.status} />
              </div>
              {myPartnerApplication.status === 'needs_correction' && (
                <Link to="/partner/register" className="btn-jade !rounded-full !px-4 !py-2 text-xs">
                  Fix &amp; resubmit application
                </Link>
              )}
            </div>
            <p className="mt-2 font-display text-base font-bold text-ink-900">
              {myPartnerApplication.company} · {myPartnerApplication.role}
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium text-ink-500">
              Submitted {formatDateTime(myPartnerApplication.submittedAt)} · {myPartnerApplication.areas.join(', ')}
            </p>
            {myPartnerApplication.reviewNote && (
              <p className="mt-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-950">
                Reviewer note: {myPartnerApplication.reviewNote}
              </p>
            )}
          </div>
        )}

        {returnedFromPayment && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-sky-300 bg-sky-50 px-5 py-4 text-xs font-semibold text-sky-950">
            <div className="max-w-2xl">
              <p className="font-bold">Returned from Paystack checkout</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-sky-900">
                A browser redirect is never proof of payment. Your booking transitions to <strong>Confirmed</strong> automatically as soon as Paystack’s signed server webhook is verified.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                className="btn-outline !rounded-full !px-3.5 !py-1.5 text-[11px]"
              >
                <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh status
              </button>
              <button
                onClick={() => setSearchParams({}, { replace: true })}
                className="text-[11px] font-bold text-sky-800 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Account sections"
          className="flex flex-wrap gap-2 border-b border-ink-200 pb-4"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bookings'}
            onClick={() => setActiveTab('bookings')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'bookings'
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
            }`}
          >
            <BedDouble size={14} /> My bookings ({myBookings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'saved'}
            onClick={() => setActiveTab('saved')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'saved'
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
            }`}
          >
            <Heart size={14} className={savedProperties.length > 0 ? 'fill-brass-500 text-brass-500' : ''} />
            Saved stays ({savedProperties.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'issues'}
            onClick={() => setActiveTab('issues')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'issues'
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
            }`}
          >
            <LifeBuoy size={14} /> Support issues ({myIssues.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === 'profile'
                ? 'bg-ink-900 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-400'
            }`}
          >
            <UserCog size={14} /> Profile &amp; security
          </button>
        </div>

        {/* ── TAB 1: BOOKINGS ── */}
        {activeTab === 'bookings' && (
          <>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brass-400/40 bg-brass-200/30 px-4 py-3 text-xs font-semibold leading-relaxed text-ink-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0 text-brass-700" />
              <span>
                <strong>Operational feedback:</strong> Public reviews are not enabled yet. Feedback you leave after a stay is private and reviewed by HAMLET operations only — shaping listing accuracy without fabricated ratings.
              </span>
            </div>

            <div className="mt-5 grid gap-5">
              {myBookings.length === 0 && (
                <div className="card px-6 py-16 text-center">
                  <BedDouble size={36} className="mx-auto text-ink-300" />
                  <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
                    No bookings yet
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Explore verified Lagos homes and send your first booking request.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    <Link to="/stays" className="btn-jade !rounded-full">
                      Explore stays
                    </Link>
                    {!myPartnerApplication && (
                      <Link to="/partner/register" className="btn-outline !rounded-full">
                        Own a property? Apply as partner
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {myBookings.map(b => {
                const open = resolvedExpanded === b.id;
                const canCancel = ['requested', 'checking', 'awaiting_payment'].includes(b.status);
                const canReport = ['confirmed', 'completed', 'disputed'].includes(b.status);
                const canFeedback = ['completed', 'disputed'].includes(b.status);
                const isConfirmed = b.status === 'confirmed';
                const isCompleted = b.status === 'completed';
                const existingFeedback = state.feedback.find(f => f.bookingRef === b.ref);
                const linkedProperty = state.properties.find(p => p.id === b.propertyId);
                const linkedGuide = state.wayfinderGuides.find(
                  g => g.propertyId === b.propertyId && g.publicationStatus === 'approved',
                );
                const wayfinderReadiness = linkedProperty
                  ? computeWayfinderReadiness(linkedProperty, linkedGuide ?? b.wayfinderSnapshot ?? null)
                  : null;
                const bookingDirectionsUrl = buildGoogleMapsDirectionsUrl({
                  latitude: b.wayfinderSnapshot?.destinationLatitude ?? linkedGuide?.destinationLatitude,
                  longitude: b.wayfinderSnapshot?.destinationLongitude ?? linkedGuide?.destinationLongitude,
                });
                const existingEaseEvent = state.wayfinderEvents.find(
                  ev => ev.bookingId === b.id && ev.eventType === 'ease_of_arrival_feedback',
                );
                const recordedEase =
                  arrivalEaseRecorded[b.id] ??
                  (existingEaseEvent?.metadata?.ease === 'easy' ||
                  existingEaseEvent?.metadata?.ease === 'difficult'
                    ? (existingEaseEvent.metadata.ease as 'easy' | 'difficult')
                    : undefined);
                const cautionRecord = state.cautionDeposits.find(cd => cd.bookingId === b.id);
                const quoteExpired =
                  b.status === 'awaiting_payment' &&
                  b.quoteCurrency &&
                  b.quoteCurrency !== 'NGN' &&
                  isQuoteExpired(b.quoteExpiresAt ?? null);
                const payableTotalNgn = b.settlementTotalNgn ?? b.guestTotal;

                return (
                  <article key={b.id} className="card overflow-hidden">
                    <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10.5px] font-bold text-ink-400">{b.ref}</span>
                          <BookingStatusPill status={b.status} />
                          {b.quoteCurrency && b.quoteCurrency !== 'NGN' && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                              {b.quoteCurrency} quote
                            </span>
                          )}
                          {cautionRecord && (
                            <span className="rounded-full border border-ink-200 bg-paper px-2 py-0.5 text-[10px] font-bold text-ink-700">
                              Caution: {cautionRecord.status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <h2 className="mt-1.5 break-words font-display text-lg font-bold leading-snug text-ink-900 sm:text-xl">
                          <Link to={`/stays/${b.propertyId}`} className="hover:underline">
                            {b.propertyTitle}
                          </Link>
                        </h2>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-ink-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} className="shrink-0" />
                            {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights
                          </span>
                          <span>
                            {b.guests} guest{b.guests > 1 ? 's' : ''}
                          </span>
                          {b.area && <span>{b.area}, Lagos</span>}
                        </p>
                        <BookingStepper status={b.status} />
                      </div>
                      <div className="flex items-baseline justify-between gap-2 border-t border-ink-100 pt-3 sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                        <div>
                          <p className="font-display text-xl font-bold tabular-nums text-ink-900 sm:text-right">
                            {formatMoney(b.guestTotal)}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:text-right">
                            stay total incl. 20% markup
                            {currency !== 'NGN' ? ` · ${formatNaira(b.guestTotal)}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpanded(open ? null : b.id)}
                          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-900 hover:text-brass-700"
                        >
                          Details{' '}
                          {open ? (
                            <ChevronUp size={13} className="shrink-0" />
                          ) : (
                            <ChevronDown size={13} className="shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>

                    {(b.status === 'requested' || b.status === 'checking') && (
                      <div className="border-t border-ink-100 bg-clay/50 px-5 py-2.5 text-xs font-medium text-ink-700">
                        <strong className="text-ink-900">Your request is on its way.</strong> Availability and terms are being checked before any payment link opens.
                      </div>
                    )}

                    {b.status === 'awaiting_payment' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-amber-50 px-5 py-3.5">
                        <div className="max-w-xl">
                          <p className="text-xs font-bold text-amber-900">
                            Payment deadline: {b.paymentDeadline ? formatDateTime(b.paymentDeadline) : '48h from acceptance'} — pay only via verified HAMLET Paystack checkout (NGN settlement).
                          </p>
                          {quoteExpired && (
                            <p className="mt-1 text-[11px] font-semibold text-red-800">
                              Your {b.quoteCurrency} FX quote expired ({b.quoteExpiresAt ? formatDateTime(b.quoteExpiresAt) : ''}). Refresh your quote before proceeding to checkout.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {quoteExpired ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await refreshBookingFxQuote(b.id, b.quoteCurrency ?? 'NGN');
                                  toast(`${b.quoteCurrency} FX quote refreshed.`);
                                } catch (err) {
                                  toast(err instanceof Error ? err.message : 'Could not refresh quote.', 'error');
                                }
                              }}
                              className="btn-outline !rounded-full !px-3.5 !py-2 text-xs"
                            >
                              <RefreshCcw size={14} /> Refresh {b.quoteCurrency} quote
                            </button>
                          ) : backendConfigured ? (
                            <button
                              disabled={checkoutBusyId === b.id}
                              onClick={() => void startConnectedCheckout(b)}
                              className="btn-brass !rounded-full !px-4 !py-2.5 text-xs disabled:opacity-50"
                            >
                              <CreditCard size={15} />{' '}
                              {checkoutBusyId === b.id
                                ? 'Starting checkout…'
                                : `Pay via Paystack · ${formatNaira(payableTotalNgn)}`}
                            </button>
                          ) : (
                            <button
                              onClick={() => setPayFor(b)}
                              className="btn-brass !rounded-full !px-4 !py-2.5 text-xs"
                            >
                              <CreditCard size={15} /> Pay via Paystack · {formatNaira(payableTotalNgn)}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="border-t border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-emerald-800">
                                <Compass size={13} className="shrink-0 text-emerald-700" /> HAMLET Wayfinder
                              </span>
                              {wayfinderReadiness && (
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                    wayfinderReadiness.tone === 'jade'
                                      ? 'border-emerald-200 bg-white text-emerald-800'
                                      : wayfinderReadiness.tone === 'sky'
                                        ? 'border-sky-200 bg-sky-50 text-sky-900'
                                        : 'border-amber-200 bg-amber-50 text-amber-900'
                                  }`}
                                >
                                  {wayfinderReadiness.badgeLabel}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[12.5px] font-semibold text-ink-800">
                              {wayfinderReadiness && !wayfinderReadiness.hasValidCoordinates
                                ? 'Your arrival guide is being prepared. Contact support if you need help planning your arrival.'
                                : 'Get directions to your property and follow your door-to-door arrival guide.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/wayfinder/${b.id}`}
                              className="btn-jade !rounded-full !px-4 !py-2.5 text-xs"
                            >
                              <Compass size={14} /> Open Wayfinder
                            </Link>
                            {bookingDirectionsUrl && (
                              <a
                                href={bookingDirectionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  void recordWayfinderEvent(b.id, 'directions_clicked', { source: 'account_card' })
                                }
                                className="btn-outline !rounded-full !px-3.5 !py-2.5 text-xs"
                              >
                                <Navigation size={13} /> Get Directions <ExternalLink size={11} />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : b.id)}
                              className="btn-outline !rounded-full !px-3 !py-2.5 text-[11.5px]"
                            >
                              {open ? 'Hide details' : 'View details'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 pt-2 text-[11px] font-semibold text-emerald-900">
                          <span>
                            {linkedProperty
                              ? `${linkedProperty.address}, ${linkedProperty.area}`
                              : `${b.area ?? 'Lagos'}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1 font-extrabold text-emerald-800 hover:underline"
                          >
                            <Printer size={12} /> Print booking summary
                          </button>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="border-t border-ink-100 bg-paper/70 px-4 py-3 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-800">
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-700" />
                            <span>
                              <strong>Stay completed.</strong> Active entry codes are retired after check-out.
                            </span>
                          </span>
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              to={`/wayfinder/${b.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-ink-900 hover:underline"
                            >
                              <Compass size={12} /> Archived arrival summary
                            </Link>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-ink-700 hover:underline"
                            >
                              <Printer size={12} /> Print receipt
                            </button>
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-200/70 pt-2.5 text-[11.5px]">
                          <span className="font-semibold text-ink-700">
                            Did you find the apartment easily with HAMLET Wayfinder?
                          </span>
                          {recordedEase ? (
                            <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              Recorded: {recordedEase === 'easy' ? 'Straight to the door' : 'Reported difficulty'} · Thank you
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  setArrivalEaseRecorded(prev => ({ ...prev, [b.id]: 'easy' }));
                                  await recordWayfinderEvent(b.id, 'ease_of_arrival_feedback', { ease: 'easy' });
                                  toast('Arrival feedback recorded — thank you.');
                                }}
                                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                              >
                                Yes, straight to the door
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  setArrivalEaseRecorded(prev => ({ ...prev, [b.id]: 'difficult' }));
                                  await recordWayfinderEvent(b.id, 'ease_of_arrival_feedback', { ease: 'difficult' });
                                  toast('Logged for operations review — you can also report details via Report issue.');
                                }}
                                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-50"
                              >
                                Had some difficulty
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-ink-100"
                        >
                          <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
                            <div>
                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                                Price &amp; settlement breakdown
                              </h3>
                              <dl className="mt-2 space-y-1 text-xs font-medium text-ink-700">
                                <div className="flex justify-between gap-3">
                                  <dt className="min-w-0">Owner accommodation ({b.nights} nights)</dt>
                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.accommodationSubtotal)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <dt className="min-w-0">HAMLET domestic markup (20%)</dt>
                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.hamletGuestFee)}</dd>
                                </div>
                                {b.mandatoryCharges.map(c => (
                                  <div key={c.label} className="flex justify-between gap-3">
                                    <dt className="min-w-0">{c.label}</dt>
                                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(c.amount)}</dd>
                                  </div>
                                ))}
                                {b.quoteCurrency && b.quoteCurrency !== 'NGN' && b.quotedStayTotalMinor && (
                                  <div className="flex justify-between gap-3 text-sky-900">
                                    <dt className="min-w-0">
                                      Quoted international stay ({b.quoteCurrency} incl. 10% buffer)
                                    </dt>
                                    <dd className="shrink-0 font-mono font-bold tabular-nums">
                                      {formatMinorCurrency(b.quotedStayTotalMinor, b.quoteCurrency)}
                                    </dd>
                                  </div>
                                )}
                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900">
                                  <dt>Domestic stay base (NGN)</dt>
                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.guestTotal)}</dd>
                                </div>
                                <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-bold text-ink-900">
                                  <dt>Paystack NGN stay settlement</dt>
                                  <dd className="shrink-0 font-mono tabular-nums">{formatNaira(payableTotalNgn)}</dd>
                                </div>
                                {b.deposit > 0 && (
                                  <div className="flex justify-between gap-3 pt-1 text-[11.5px] text-ink-500">
                                    <dt className="min-w-0">
                                      Separate refundable caution deposit (tracked post-inspection)
                                    </dt>
                                    <dd className="shrink-0 font-mono tabular-nums">{formatNaira(b.deposit)}</dd>
                                  </div>
                                )}
                              </dl>
                              {cautionRecord && (
                                <div className="mt-3 rounded-2xl border border-ink-200 bg-paper p-3 text-[11.5px]">
                                  <p className="font-bold text-ink-900">
                                    Caution deposit status:{' '}
                                    <span className="uppercase text-emerald-800">
                                      {cautionRecord.status.replace(/_/g, ' ')}
                                    </span>
                                  </p>
                                  <p className="mt-0.5 text-ink-600">
                                    Amount: {formatNaira(cautionRecord.amountNgn)}
                                    {cautionRecord.deductedAmountNgn > 0
                                      ? ` · Deducted: ${formatNaira(cautionRecord.deductedAmountNgn)}`
                                      : ''}
                                    {cautionRecord.refundedAmountNgn > 0
                                      ? ` · Refunded: ${formatNaira(cautionRecord.refundedAmountNgn)}`
                                      : ''}
                                  </p>
                                  {cautionRecord.inspectionNotes && (
                                    <p className="mt-1 text-ink-500">
                                      Inspection note: {cautionRecord.inspectionNotes}
                                    </p>
                                  )}
                                  {cautionRecord.deductionReason && (
                                    <p className="mt-0.5 font-semibold text-amber-900">
                                      Deduction reason: {cautionRecord.deductionReason}
                                    </p>
                                  )}
                                </div>
                              )}
                              {b.paymentRef && (
                                <p className="mt-3 break-all font-mono text-[10px] font-bold text-ink-400">
                                  Provider ref: {b.paymentRef} · {b.paymentProvider}
                                </p>
                              )}
                              {b.cancelReason && (
                                <p className="mt-2 break-words text-[11.5px] font-semibold text-red-700">
                                  Reason: {b.cancelReason}
                                </p>
                              )}
                              {b.refundStatus === 'processed' && (
                                <p className="mt-1 text-[11.5px] font-bold text-teal-800">
                                  Refund processed: {formatNaira(b.refundAmount ?? b.guestTotal)}
                                </p>
                              )}
                              <div className="mt-4 flex flex-wrap gap-2">
                                {canCancel && (
                                  <button
                                    disabled={cancelingId === b.id}
                                    onClick={async () => {
                                      setCancelingId(b.id);
                                      try {
                                        await bookingTransition(b.id, 'cancelled', {
                                          reason: 'Cancelled by guest before confirmation',
                                        });
                                        toast('Booking cancelled.', 'info');
                                      } catch (error) {
                                        toast(
                                          error instanceof Error ? error.message : 'Could not cancel this booking.',
                                          'error',
                                        );
                                      } finally {
                                        setCancelingId(null);
                                      }
                                    }}
                                    className="btn-outline !rounded-full !px-3.5 !py-2 text-[11px] text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <X size={13} />
                                    {cancelingId === b.id ? 'Cancelling…' : 'Cancel booking'}
                                  </button>
                                )}
                                {canReport && (
                                  <button
                                    onClick={() => setIssueFor(b)}
                                    className="btn-outline !rounded-full !px-3.5 !py-2 text-[11px]"
                                  >
                                    <LifeBuoy size={13} />
                                    Report issue
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                                Timeline
                              </h3>
                              <ol className="mt-2 space-y-0 border-l-2 border-ink-100 pl-4">
                                {b.timeline.map((t, i) => (
                                  <li key={i} className="relative pb-3 text-[11.5px]">
                                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600" />
                                    <p className="font-bold text-ink-800">{t.label}</p>
                                    <p className="text-[10.5px] font-medium text-ink-400">
                                      {formatDateTime(t.at)} · {t.actor}
                                      {t.detail ? ` · ${t.detail}` : ''}
                                    </p>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </div>
                          {canFeedback && (
                            <div className="border-t border-ink-100 bg-clay/50 p-4 sm:p-5">
                              <h3 className="flex items-start gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-500">
                                <MessageSquarePlus size={14} className="mt-0.5 shrink-0" /> Private stay feedback — reviewed by HAMLET operations only
                              </h3>
                              {existingFeedback ? (
                                <div className="mt-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-xs font-medium text-ink-800">
                                  <p className="font-bold text-ink-900">
                                    {existingFeedback.rating}/5 · {existingFeedback.category}
                                  </p>
                                  <p className="mt-1 break-words">“{existingFeedback.text}”</p>
                                  <p className="mt-1 text-[10px] font-semibold text-ink-400">
                                    Submitted privately on {formatDateTime(existingFeedback.at)}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map(n => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => setFbRating(n)}
                                        aria-label={`${n} stars`}
                                      >
                                        <Star
                                          size={22}
                                          className={`shrink-0 ${
                                            n <= fbRating
                                              ? 'fill-brass-400 text-brass-500'
                                              : 'text-ink-200'
                                          }`}
                                          strokeWidth={1.5}
                                        />
                                      </button>
                                    ))}
                                    <select
                                      className="input w-full !py-1.5 text-[11px] sm:ml-3 sm:!w-auto"
                                      value={fbCategory}
                                      onChange={e => setFbCategory(e.target.value)}
                                    >
                                      {[
                                        'Stay experience',
                                        'Property condition',
                                        'Check-in & access',
                                        'Value for money',
                                        'Host communication',
                                      ].map(c => (
                                        <option key={c}>{c}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                    <input
                                      className="input flex-1"
                                      placeholder="How was your stay? (private, reviewed by HAMLET only)"
                                      value={fbText}
                                      onChange={e => setFbText(e.target.value)}
                                    />
                                    <button
                                      disabled={submittingFbId === b.id}
                                      className="btn-dark shrink-0 !rounded-full !px-4 !py-2 text-xs disabled:opacity-50"
                                      onClick={() => void submitFeedback(b)}
                                    >
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
          </>
        )}

        {/* ── TAB 2: SAVED STAYS (WISHLIST) ── */}
        {activeTab === 'saved' && (
          <div className="mt-6">
            {savedProperties.length === 0 ? (
              <div className="card px-6 py-16 text-center">
                <Heart size={36} className="mx-auto text-ink-300" />
                <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
                  No saved stays yet
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Tap the heart icon on any HAMLET apartment to shortlist stays for comparison.
                </p>
                <Link to="/stays" className="btn-jade mt-5 !rounded-full">
                  Browse verified stays
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-ink-600">
                    {savedProperties.length} shortlisted Lagos home{savedProperties.length === 1 ? '' : 's'}
                  </p>
                  <button
                    type="button"
                    onClick={clearSaved}
                    className="text-xs font-bold text-ink-500 hover:text-ink-900 hover:underline"
                  >
                    Clear shortlist
                  </button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {savedProperties.map(p => (
                    <PropertyCard key={p.id} p={p} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB 3: SUPPORT ISSUES ── */}
        {activeTab === 'issues' && (
          <div className="mt-6 grid gap-4">
            {myIssues.length === 0 ? (
              <div className="card px-6 py-14 text-center">
                <LifeBuoy size={36} className="mx-auto text-ink-300" />
                <h2 className="mt-3 font-display text-xl font-bold text-ink-900">
                  No support issues reported
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  If anything needs attention during a confirmed stay, open the booking card and click “Report issue”.
                </p>
              </div>
            ) : (
              myIssues.map(issue => (
                <article key={issue.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] font-bold text-ink-500">{issue.ref}</span>
                    <SeverityPill severity={issue.severity} />
                    <IssueStatusPill status={issue.status} />
                    <span className="chip border border-ink-200 bg-paper text-ink-700">
                      {issue.category}
                    </span>
                    {issue.bookingRef && (
                      <span className="font-mono text-[10.5px] font-semibold text-ink-900">
                        Booking {issue.bookingRef}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{issue.subject}</h3>
                  <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-600">
                    {issue.description}
                  </p>
                  {issue.assignee && (
                    <p className="mt-2 text-[11px] font-semibold text-ink-500">
                      Assigned operator: <strong className="text-ink-800">{issue.assignee}</strong>
                    </p>
                  )}
                  {issue.evidence.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-ink-100 bg-paper p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                        Recorded evidence ({issue.evidence.length})
                      </p>
                      <ul className="mt-1 space-y-1 text-[11.5px] font-medium text-ink-700">
                        {issue.evidence.map((ev, idx) => (
                          <li key={idx}>• {ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {issue.resolution && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
                      Resolution summary: {issue.resolution}
                    </div>
                  )}
                  {!['resolved', 'closed'].includes(issue.status) && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="input flex-1 !py-2 text-xs"
                        placeholder="Add supporting detail, timestamp or photo/receipt reference…"
                        value={evidenceDrafts[issue.id] ?? ''}
                        onChange={e =>
                          setEvidenceDrafts(prev => ({ ...prev, [issue.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={savingEvidenceId === issue.id}
                        onClick={async () => {
                          const draft = (evidenceDrafts[issue.id] ?? '').trim();
                          if (draft.length < 4) {
                            toast('Enter at least 4 characters.', 'error');
                            return;
                          }
                          setSavingEvidenceId(issue.id);
                          try {
                            await appendIssueEvidence(issue.id, draft);
                            setEvidenceDrafts(prev => ({ ...prev, [issue.id]: '' }));
                            toast('Evidence note attached to issue.');
                          } catch (err) {
                            toast(err instanceof Error ? err.message : 'Could not attach evidence.', 'error');
                          } finally {
                            setSavingEvidenceId(null);
                          }
                        }}
                        className="btn-outline shrink-0 !rounded-full !px-3.5 !py-2 text-[11.5px] disabled:opacity-50"
                      >
                        <Paperclip size={13} /> {savingEvidenceId === issue.id ? 'Saving…' : 'Add evidence'}
                      </button>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        )}

        {/* ── TAB 4: PROFILE & SECURITY ── */}
        {activeTab === 'profile' && (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <form onSubmit={handleSaveProfile} className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-ink-900">
                Contact &amp; profile details
              </h2>
              <p className="mt-1 text-xs font-medium text-ink-500">
                Keep your full name and reachable Nigerian/international mobile number updated for estate gate passes and check-in coordination.
              </p>
              <label className="mt-4 block">
                <span className="label">Email (verified sign-in address)</span>
                <input className="input bg-paper text-ink-500" value={session.email} disabled />
              </label>
              <label className="mt-3 block">
                <span className="label">Full name</span>
                <input
                  className="input"
                  required
                  minLength={2}
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                />
              </label>
              <label className="mt-3 block">
                <span className="label">Phone number</span>
                <input
                  className="input"
                  type="tel"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                />
              </label>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-jade mt-4 w-full !rounded-full !py-2.5 text-[12.5px] disabled:opacity-50"
              >
                {savingProfile ? 'Saving…' : 'Save profile changes'}
              </button>
            </form>

            <form onSubmit={handleChangePassword} className="card p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-ink-900">Account password</h2>
              <p className="mt-1 text-xs font-medium text-ink-500">
                Update the password used to sign in to HAMLET.
              </p>
              <label className="mt-4 block">
                <span className="label">New password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                />
              </label>
              <label className="mt-3 block">
                <span className="label">Confirm new password</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter new password"
                />
              </label>
              <button
                type="submit"
                disabled={savingPassword}
                className="btn-dark mt-4 w-full !rounded-full !py-2.5 text-[12.5px] disabled:opacity-50"
              >
                {savingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        )}
      </div>

      <AnimatePresence>
        {payFor && !backendConfigured && (
          <PaymentModal booking={payFor} onClose={() => setPayFor(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {issueFor && <IssueModal booking={issueFor} onClose={() => setIssueFor(null)} />}
      </AnimatePresence>
    </GuestLayout>
  );
}

export function WorkspaceGuard({
  expected,
  children,
}: {
  expected: 'partner' | 'admin';
  children: React.ReactNode;
}) {
  const { state, backendReady, signOut } = useHamlet();
  const navigate = useNavigate();
  const location = useLocation();
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const intendedTarget = `${location.pathname}${location.search}`;
  const signInWithRedirect = buildWorkspaceSignInPath(intendedTarget);

  if (!backendReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
        <p className="text-[13px] font-semibold text-ink-300">
          Restoring your secure workspace session…
        </p>
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
          <h1 className="mt-4 font-display text-2xl font-bold text-white">
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
              className="btn-brass !rounded-full !py-2.5 text-xs disabled:opacity-50"
            >
              {s ? `Sign in with ${expected} account` : 'Sign in'}
            </button>
            {expected === 'partner' && !s && (
              <button
                onClick={() => navigate('/partner/register')}
                className="btn-ghost-dark !rounded-full !py-2.5 text-xs"
              >
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
