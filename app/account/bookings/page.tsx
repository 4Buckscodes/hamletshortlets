'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  RefreshCcw,
  Compass,
  MessageSquarePlus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { extractEdgeFunctionError } from '@/lib/supabase';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  triggerBookingNotificationDispatchBestEffort,
} from '@/lib/next-supabase';
import { isQuoteExpired } from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';
import { AccountNav } from '../account-nav';

type Booking = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  guest_count: number;
  guest_total: number;
  refundable_deposit: number;
  status: string;
  payment_deadline?: string | null;
  payment_reference?: string | null;
  quote_currency?: string | null;
  quoted_guest_total?: number | null;
  quote_expires_at?: string | null;
  created_at: string;
  properties?: { title?: string; area?: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  requested: 'Awaiting partner response',
  checking: 'Availability being checked',
  awaiting_payment: 'Accepted — awaiting payment',
  confirmed: 'Confirmed (payment verified)',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Payment hold expired',
  refunded: 'Refunded',
  disputed: 'Under operations review',
  declined: 'Declined by partner',
  no_show: 'Recorded no-show',
};

const STAGES = ['Requested', 'Checking', 'Awaiting payment', 'Confirmed', 'Completed'] as const;
const STAGE_IDX: Record<string, number> = {
  requested: 0,
  checking: 1,
  awaiting_payment: 2,
  confirmed: 3,
  completed: 4,
};

function LifecycleBar({ status }: { status: string }) {
  const closed = ['cancelled', 'declined', 'expired', 'refunded', 'disputed', 'no_show'].includes(
    status,
  );
  const current = STAGE_IDX[status] ?? -1;

  if (closed) {
    return (
      <p className="m-0 mt-3 text-xs font-semibold text-ink-500">
        Closed status: <strong className="text-ink-900">{STATUS_LABEL[status] || status}</strong>
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center">
        {STAGES.map((label, idx) => {
          const done = current >= idx;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${
                    done
                      ? 'bg-emerald-700 text-white'
                      : 'border border-ink-200 bg-paper text-ink-400'
                  }`}
                >
                  {current > idx ? <Check className="h-3 w-3 shrink-0" /> : idx + 1}
                </span>
                <span className="mt-1 hidden text-[10px] font-bold text-ink-600 sm:block">
                  {label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`mx-1.5 h-0.5 flex-1 rounded ${
                    current > idx ? 'bg-emerald-700' : 'bg-ink-100'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GuestBookingsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const { formatPrice, formatCautionDeposit } = useCurrency();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [paymentReturnRef, setPaymentReturnRef] = useState<string | null>(null);

  // Wayfinder probe drawer state
  const [wayfinderBooking, setWayfinderBooking] = useState<Booking | null>(null);
  const [wayfinderState, setWayfinderState] = useState<{
    loading: boolean;
    deployed: boolean;
    ready: boolean;
    summary?: string;
    steps?: Array<{ title?: string; instruction?: string }>;
  } | null>(null);

  // Post-stay feedback drawer state
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const load = useCallback(async () => {
    if (!db) {
      setError('Account access is not configured on this deployment.');
      setLoading(false);
      return;
    }
    const { data: session } = await db.auth.getSession();
    if (!session.session) {
      window.location.assign('/signin?next=/account/bookings');
      return;
    }

    // Opportunistically sweep expired 48h holds cleanly
    await db.rpc('expire_overdue_bookings').then(
      () => undefined,
      () => undefined,
    );

    const { data, error: queryError } = await db
      .from('bookings')
      .select(
        'id,reference,property_id,check_in,check_out,guest_count,guest_total,refundable_deposit,status,payment_deadline,payment_reference,quote_currency,quoted_guest_total,quote_expires_at,created_at,properties(title,area)',
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('We could not load your booking requests. Please refresh and try again.');
    } else {
      setItems((data || []) as unknown as Booking[]);
      setError('');
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'return') {
        setPaymentReturnRef(params.get('booking') || 'your booking');
      }
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function cancelBooking(booking: Booking) {
    if (!db || !window.confirm(`Cancel booking request ${booking.reference}?`)) return;
    setError('');
    setNotice('');
    setBusyId(booking.id);
    try {
      const { error: rpcError } = await db.rpc('transition_booking', {
        target_booking_id: booking.id,
        next_status: 'cancelled',
        transition_note: 'Cancelled by guest from account bookings.',
      });
      if (rpcError) throw new Error(rpcError.message);
      void triggerBookingNotificationDispatchBestEffort(db, booking.id);
      setNotice(`Booking request ${booking.reference} has been cancelled.`);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not cancel this booking request.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function startPaystackCheckout(booking: Booking) {
    if (!db) return;
    setError('');
    setNotice('');
    setBusyId(booking.id);
    try {
      // Refresh foreign-currency quote automatically if 30-min FX quote expired
      if (
        booking.quote_currency &&
        booking.quote_currency !== 'NGN' &&
        isQuoteExpired(booking.quote_expires_at)
      ) {
        const { error: fxErr } = await db.rpc('refresh_booking_fx_quote', {
          target_booking_id: booking.id,
          target_currency: booking.quote_currency,
        });
        if (fxErr) {
          throw new Error(fxErr.message);
        }
      }

      const callbackUrl = `${window.location.origin}/account/bookings?payment=return&booking=${encodeURIComponent(
        booking.reference,
      )}`;
      const { data, error: fnError } = await db.functions.invoke('paystack-initialize', {
        body: {
          booking_id: booking.id,
          callback_url: callbackUrl,
        },
      });

      if (fnError) {
        const message = await extractEdgeFunctionError(
          fnError,
          'Online payment checkout is not available right now. Your 48-hour hold remains active and no charge was made.',
        );
        throw new Error(message);
      }

      const payload = data as {
        ok?: boolean;
        authorization_url?: string;
        error?: string;
      } | null;

      if (!payload?.ok || !payload.authorization_url) {
        throw new Error(
          payload?.error ||
            'Online card checkout could not be initialized. No payment was taken.',
        );
      }

      window.location.assign(payload.authorization_url);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not start Paystack checkout. No charge was made.',
      );
    } finally {
      setBusyId('');
    }
  }

  async function openWayfinder(booking: Booking) {
    if (!db) return;
    setWayfinderBooking(booking);
    setWayfinderState({ loading: true, deployed: false, ready: false });
    const { data, error: rpcError } = await db.rpc('get_guest_booking_wayfinder', {
      target_booking_id: booking.id,
    });
    if (rpcError) {
      if (isMissingSchemaObjectError(rpcError)) {
        setWayfinderState({ loading: false, deployed: false, ready: false });
        return;
      }
      setWayfinderState({
        loading: false,
        deployed: true,
        ready: false,
        summary: rpcError.message,
      });
      return;
    }
    const payload = (data || {}) as {
      available?: boolean;
      guide?: { arrival_summary?: string };
      steps?: Array<{ title?: string; instruction?: string }>;
    };
    setWayfinderState({
      loading: false,
      deployed: true,
      ready: Boolean(payload.available),
      summary: payload.guide?.arrival_summary,
      steps: payload.steps || [],
    });
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !feedbackBooking) return;
    setBusyId(feedbackBooking.id);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('submit_booking_feedback', {
        target_booking_id: feedbackBooking.id,
        feedback_rating: rating,
        feedback_category: 'overall_stay',
        feedback_comment: feedbackComment.trim() || 'Smooth stay.',
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Thank you — your feedback for ${feedbackBooking.reference} has been recorded.`);
      setFeedbackBooking(null);
      setFeedbackComment('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save stay feedback.',
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your Account</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Your booking requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Track partner confirmation, complete verified Paystack checkout when accepted, and manage stay support.
            </p>
          </div>
          <AccountNav current="bookings" />
        </div>

        {/* Honest Server-Verified Payment Return Banner */}
        {paymentReturnRef && (
          <div
            role="status"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-xs leading-relaxed text-ink-800 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" />
              <span>
                <strong>Returned from payment checkout ({paymentReturnRef}):</strong> HAMLET marks a booking Confirmed only after verifying the signed Paystack webhook on our server — never from a browser redirect alone. Click Refresh below if your webhook is still processing.
              </span>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="secondary-button min-h-[40px] shrink-0"
            >
              <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
              Refresh verified status
            </button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
          >
            {notice}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">
            Loading your bookings…
          </p>
        ) : items.length > 0 ? (
          <div className="mt-6 space-y-4">
            {items.map(b => (
              <article
                key={b.id}
                className="rounded-3xl border border-ink-100 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 font-mono text-xs font-extrabold text-brass-700">
                      {b.reference}
                    </p>
                    <h2 className="serif m-0 mt-1 text-2xl font-medium text-ink-900">
                      {b.properties?.title || 'HAMLET stay'}
                    </h2>
                    <p className="m-0 mt-1 text-xs text-ink-500">
                      {b.properties?.area || 'Lagos'} · {b.check_in} → {b.check_out} ·{' '}
                      {b.guest_count} {b.guest_count === 1 ? 'guest' : 'guests'}
                    </p>
                  </div>
                  <span className="rounded-full border border-ink-200 bg-paper px-3.5 py-1.5 text-xs font-bold text-ink-900">
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </div>

                <LifecycleBar status={b.status} />

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-4 text-xs text-ink-700">
                  <span>
                    Stay total:{' '}
                    <strong className="font-mono text-ink-900">
                      {formatPrice(Number(b.guest_total || 0))}
                    </strong>
                  </span>
                  {Number(b.refundable_deposit) > 0 && (
                    <span>
                      Refundable caution deposit:{' '}
                      <strong className="font-mono text-ink-900">
                        {formatCautionDeposit(Number(b.refundable_deposit))}
                      </strong>
                    </span>
                  )}
                  {b.status === 'awaiting_payment' && b.payment_deadline && (
                    <span className="font-semibold text-brass-700">
                      48h payment hold until{' '}
                      {new Date(b.payment_deadline).toLocaleString('en-NG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Africa/Lagos',
                      })}
                    </span>
                  )}
                  {b.payment_reference && (
                    <span className="text-emerald-800">
                      Verified ref: <span className="font-mono">{b.payment_reference}</span>
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  {b.status === 'awaiting_payment' && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void startPaystackCheckout(b)}
                      className="primary-button min-h-[46px]"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      {busyId === b.id ? 'Preparing Paystack…' : 'Pay securely via Paystack'}
                    </button>
                  )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => void openWayfinder(b)}
                      className="secondary-button min-h-[46px]"
                    >
                      <Compass className="h-4 w-4 shrink-0" />
                      Arrival & Wayfinder guide
                    </button>
                  )}

                  {b.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => setFeedbackBooking(b)}
                      className="secondary-button min-h-[46px]"
                    >
                      <MessageSquarePlus className="h-4 w-4 shrink-0" />
                      Leave stay feedback
                    </button>
                  )}

                  {['requested', 'checking', 'awaiting_payment'].includes(b.status) && (
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void cancelBooking(b)}
                      className="secondary-button min-h-[46px]"
                    >
                      {busyId === b.id ? 'Cancelling…' : 'Cancel request'}
                    </button>
                  )}

                  <Link
                    href={`/account/issues?bookingId=${encodeURIComponent(b.id)}`}
                    className="secondary-button min-h-[46px]"
                  >
                    Report an issue
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <h2 className="serif text-2xl font-medium text-ink-900">
              No booking requests yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Explore approved shortlets across Lagos Island and Lagos Mainland to send your first booking request.
            </p>
            <div className="mt-5">
              <Link href="/stays" className="primary-button">
                Explore Lagos stays
              </Link>
            </div>
          </div>
        )}

        {/* Safe Wayfinder Arrival Drawer (honestly gated if migration is not yet deployed) */}
        <FocusedDrawer
          open={Boolean(wayfinderBooking)}
          title="Arrival & Wayfinder guide"
          subtitle={wayfinderBooking?.reference}
          onClose={() => setWayfinderBooking(null)}
        >
          {wayfinderState?.loading ? (
            <p className="text-sm text-ink-600">Checking arrival guidance…</p>
          ) : !wayfinderState?.deployed ? (
            <div className="space-y-3 rounded-2xl border border-ink-200 bg-paper p-4 text-sm leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                Door-to-door Wayfinder guides are not yet enabled on this environment
              </p>
              <p className="m-0 text-xs text-ink-600">
                Your stay remains confirmed ({wayfinderBooking?.reference}). Please use your confirmed booking email or contact HAMLET support if you need arrival assistance.
              </p>
            </div>
          ) : !wayfinderState.ready ? (
            <div className="space-y-3 rounded-2xl border border-ink-200 bg-paper p-4 text-sm leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                No verified Wayfinder guide published for this property yet
              </p>
              <p className="m-0 text-xs text-ink-600">
                {wayfinderState.summary ||
                  'Arrival details are shared directly by the verified property partner ahead of check-in.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wayfinderState.summary && (
                <p className="text-sm leading-relaxed text-ink-700">
                  {wayfinderState.summary}
                </p>
              )}
              {wayfinderState.steps && wayfinderState.steps.length > 0 && (
                <ol className="space-y-2.5 pl-5 text-sm text-ink-700">
                  {wayfinderState.steps.map((st, idx) => (
                    <li key={idx}>
                      <strong>{st.title || `Step ${idx + 1}`}:</strong>{' '}
                      {st.instruction || ''}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </FocusedDrawer>

        {/* Post-Stay Feedback Drawer */}
        <FocusedDrawer
          open={Boolean(feedbackBooking)}
          title="Share post-stay feedback"
          subtitle={feedbackBooking?.reference}
          onClose={() => setFeedbackBooking(null)}
        >
          <form onSubmit={submitFeedback} className="space-y-4">
            <FormField label="Overall rating (1–5)">
              {fieldProps => (
                <select
                  {...fieldProps}
                  value={rating}
                  onChange={e => setRating(Number(e.target.value))}
                  className={FIELD_INPUT_CLASS}
                >
                  {[5, 4, 3, 2, 1].map(r => (
                    <option key={r} value={r}>
                      {r} / 5
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            <FormField label="Comments" optional>
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={4}
                  maxLength={1500}
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder="How did the stay match the listing description?"
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>

            <button
              type="submit"
              disabled={Boolean(busyId)}
              className="primary-button min-h-[48px] w-full"
            >
              {busyId ? 'Saving…' : 'Submit feedback'}
            </button>
          </form>
        </FocusedDrawer>
      </main>

      <SiteFooter />
    </div>
  );
}
