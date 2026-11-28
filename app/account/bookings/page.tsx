'use client';

import { loadBookingPropertySummaries, withPropertySummaries } from '@/lib/bookingProperties';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  RefreshCcw,
  Compass,
  MessageSquarePlus,
  AlertCircle,
} from 'lucide-react';
import { extractEdgeFunctionError } from '@/lib/supabase';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  triggerBookingNotificationDispatchBestEffort,
} from '@/lib/next-supabase';
import { isQuoteExpired } from '@/lib/pricing';
import { formatCurrencyAmount, useCurrency, type DisplayCurrency } from '@/lib/currency';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  FocusedDrawer,
  FormField,
} from '@/components/forms/ProgressiveFormPrimitives';
import { Chip, ChipRow, StatusPill } from '@/components/ui';
import { statusEntry } from '@/lib/statusLabels';
import { formatNaira } from '@/lib/pricing';
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
  payment_extension_status?: 'requested' | 'approved' | 'declined' | null;
  payment_reference?: string | null;
  quote_currency?: string | null;
  quoted_guest_total?: number | null;
  quote_expires_at?: string | null;
  created_at: string;
  properties?: { title?: string; area?: string; image_urls?: string[] | null } | null;
};

type BookingFilter = 'all' | 'upcoming' | 'requests' | 'past' | 'cancelled';
const BOOKING_FILTERS: Array<{ id: BookingFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'requests', label: 'Action needed' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

function bookingGroup(b: { status: string; check_out: string }, today: string): Exclude<BookingFilter, 'all'> {
  if (['requested', 'checking', 'awaiting_payment'].includes(b.status)) return 'requests';
  if (['cancelled', 'expired', 'refunded', 'declined'].includes(b.status)) return 'cancelled';
  if (b.status === 'confirmed' && b.check_out >= today) return 'upcoming';
  return 'past';
}

function formatStayDates(checkIn: string, checkOut: string) {
  const fmt = (iso: string) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  };
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}

/** True once the 2-hour payment deadline has passed (checkout can no longer start). */
function paymentWindowClosed(deadline: string | null | undefined, nowMs: number) {
  if (!deadline) return false;
  const when = new Date(deadline).getTime();
  return !Number.isNaN(when) && when <= nowMs;
}

/** "1 hr 24 min left · pay by Sat 21 Nov, 22:16 Lagos time (21:16 your time)" */
function deadlineLabel(deadline: string, nowMs: number) {
  const when = new Date(deadline);
  if (Number.isNaN(when.getTime())) return 'Pay within 2 hours of acceptance to keep these dates.';
  const lagos = when.toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
  const local = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const minutesLeft = Math.floor((when.getTime() - nowMs) / 60000);
  if (when.getTime() <= nowMs) {
    return `Payment window closed at ${lagos} Lagos time. If you already paid, we are verifying it; otherwise these dates will be released.`;
  }
  const left =
    minutesLeft < 1
      ? 'Less than a minute left'
      : minutesLeft < 60
        ? `${minutesLeft} min left`
        : `${Math.floor(minutesLeft / 60)} hr ${minutesLeft % 60} min left`;
  return `${left} · pay by ${lagos} Lagos time (${local} your time)`;
}

function nightsLabel(checkIn: string, checkOut: string) {
  const n = Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
  return Number.isFinite(n) && n > 0 ? ` · ${n} ${n === 1 ? 'night' : 'nights'}` : '';
}

export default function GuestBookingsPage() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  // Ticks every 30 seconds so the payment countdown stays current.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const visibleItems = useMemo(() => {
    if (filter === 'all') return items;
    const today = new Date().toISOString().slice(0, 10);
    return items.filter(b => bookingGroup(b, today) === filter);
  }, [items, filter]);
  const filterCounts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const counts: Record<string, number> = { all: items.length };
    for (const b of items) {
      const group = bookingGroup(b, today);
      counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [items]);
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
  const [rating, setRating] = useState(0);
  const [drawerError, setDrawerError] = useState('');
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

    // Opportunistically sweep expired payment holds (a scheduled job also runs every 5 minutes)
    await db.rpc('expire_overdue_bookings').then(
      () => undefined,
      () => undefined,
    );

    const { data, error: queryError } = await db
      .from('bookings')
      .select(
        'id,reference,property_id,check_in,check_out,guest_count,guest_total,refundable_deposit,status,payment_deadline,payment_extension_status,payment_reference,quote_currency,quoted_guest_total,quote_expires_at,created_at',
      )
      .order('created_at', { ascending: false });

    if (queryError) {
      setError('We could not load your booking requests. Please refresh and try again.');
    } else {
      const summaries = await loadBookingPropertySummaries(db);
      setItems(withPropertySummaries((data || []) as unknown as Booking[], summaries) as unknown as Booking[]);
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
    if (
      !db ||
      !window.confirm(
        `Cancel ${booking.reference}? The dates are released for other guests. Nothing has been charged, so there is nothing to refund.`,
      )
    )
      return;
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

  async function requestMoreTime(booking: Booking) {
    if (
      !db ||
      !window.confirm(
        `Ask the host for 30 more minutes to pay for ${booking.reference}? You can ask only once. Until they answer, your current deadline still applies.`,
      )
    )
      return;
    setError('');
    setNotice('');
    setBusyId(booking.id);
    try {
      const { error: rpcError } = await db.rpc('request_payment_extension', {
        target_booking_id: booking.id,
      });
      if (rpcError) throw new Error(rpcError.message);
      void triggerBookingNotificationDispatchBestEffort(db, booking.id);
      setNotice(`We've asked the host for 30 more minutes on ${booking.reference}. We'll email you when they answer.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not ask for more time.');
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
          'Online payment checkout is not available right now. Your payment hold remains active until the deadline and no charge was made.',
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
    setDrawerError('');
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
    if (!rating) {
      setDrawerError('Choose a rating from 1 to 5.');
      return;
    }
    setBusyId(feedbackBooking.id);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await db.rpc('submit_booking_feedback', {
        target_booking_id: feedbackBooking.id,
        feedback_rating: rating,
        feedback_category: 'overall_stay',
        feedback_comment: feedbackComment.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setNotice(`Thank you — your feedback for ${feedbackBooking.reference} has been recorded.`);
      setFeedbackBooking(null);
      setFeedbackComment('');
      setRating(0);
    } catch (caught) {
      setDrawerError(
        caught instanceof Error ? caught.message : 'Could not save stay feedback.',
      );
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />

      <main className="hm-main" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive" aria-labelledby="account-title">
          <div className="hm-shell hm-band-inner">
            <div className="hm-band-row">
              <div className="hm-band-copy">
                <p className="hm-label">Guest account</p>
                <h1 id="account-title" className="hm-display" style={{ fontSize: 'clamp(40px, 5.4vw, 72px)' }}>
                  Your bookings,
                  <br />
                  <em>all in one place.</em>
                </h1>
              </div>
              <Link href="/stays" className="hm-btn hm-btn-lime">
                Find a new stay
              </Link>
            </div>
            <AccountNav current="bookings" />
          </div>
        </section>
        <div className="hm-shell hm-section-tight hm-account">

        {/* Honest Server-Verified Payment Return Banner */}
        {paymentReturnRef && (
          <div
            role="status"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-xs leading-relaxed text-ink-800 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brass-700" />
              <span>
                <strong>Returned from checkout ({paymentReturnRef}):</strong> Status updates once Paystack confirms payment. Refresh if still processing.
              </span>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="hm-btn hm-btn-ghost min-h-[40px] shrink-0"
            >
              <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
              Refresh status
            </button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 hm-notice hm-notice-bad"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 hm-notice hm-notice-ok"
          >
            {notice}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">
            Loading your bookings…
          </p>
        ) : items.length > 0 ? (
          <div className="hm-booking-list">
            <ChipRow label="Filter bookings" className="hm-chip-row-scroll">
              {BOOKING_FILTERS.map(f => (
                <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label}
                  {filterCounts[f.id] ? <span className="hm-chip-count">{filterCounts[f.id]}</span> : null}
                </Chip>
              ))}
            </ChipRow>
            {visibleItems.length === 0 && (
              <div className="hm-empty"><p className="hm-empty-title">Nothing under {BOOKING_FILTERS.find(f => f.id === filter)?.label.toLowerCase()}.</p><p className="hm-body">Bookings move here as their status changes. Switch filter to see the rest.</p></div>
            )}
            {visibleItems.map(b => (
              <article key={b.id} className="hm-booking-item" data-hamlet-reveal>
                <div className="hm-media hm-booking-item-media">
                  {b.properties?.image_urls?.[0] ? (
                    <img src={b.properties.image_urls[0]} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </div>
                <div className="hm-booking-item-body">
                  <StatusPill tone={statusEntry(b.status).tone}>{statusEntry(b.status).label}</StatusPill>
                  <h2 className="hm-h3" style={{ fontSize: 22 }}>
                    {b.properties?.title || 'HAMLET stay'}
                    {b.properties?.area ? `, ${b.properties.area}` : ''}
                  </h2>
                  <p className="hm-meta">
                    {formatStayDates(b.check_in, b.check_out)}
                    {nightsLabel(b.check_in, b.check_out)} · {b.guest_count} {b.guest_count === 1 ? 'guest' : 'guests'}
                  </p>
                <div className="hm-booking-item-facts">
                  <span>
                    Stay total:{' '}
                    <strong className="font-mono text-ink-900">
                      {b.quote_currency &&
                      (b.quote_currency === 'USD' || b.quote_currency === 'GBP' || b.quote_currency === 'EUR') &&
                      Number.isFinite(Number(b.quoted_guest_total))
                        ? formatCurrencyAmount(
                            Number(b.quoted_guest_total),
                            b.quote_currency as DisplayCurrency,
                          )
                        : formatPrice(Number(b.guest_total || 0))}
                    </strong>
                    {b.quote_currency && b.quote_currency !== 'NGN' && (
                      <span className="ml-1 text-[12px] font-medium text-ink-500">
                        {isQuoteExpired(b.quote_expires_at)
                          ? `· ${b.quote_currency} rate refreshes when you pay`
                          : `· ${b.quote_currency} rate valid for 30 minutes from the quote`}
                      </span>
                    )}
                  </span>
                  <span>
                    Charged in naira: <strong className="text-ink-900">{formatNaira(Number(b.guest_total || 0))}</strong>
                  </span>
                  {Number(b.refundable_deposit) > 0 && (
                    <span>
                      Refundable caution deposit:{' '}
                      <strong className="font-mono text-ink-900">
                        {formatNaira(Number(b.refundable_deposit))}
                      </strong>
                    </span>
                  )}
                  {b.status === 'awaiting_payment' && b.payment_deadline && (
                    <span className="hm-notice hm-notice-warn" style={{ flexBasis: '100%', margin: '4px 0 0' }}>
                      {deadlineLabel(b.payment_deadline, nowMs)}
                    </span>
                  )}
                  {b.status === 'awaiting_payment' && b.payment_extension_status && (
                    <span className="hm-notice" style={{ flexBasis: '100%', margin: '4px 0 0' }}>
                      {b.payment_extension_status === 'requested'
                        ? "You've asked the host for 30 more minutes. Until they answer, the deadline above applies."
                        : b.payment_extension_status === 'approved'
                          ? 'The host gave you 30 more minutes. The deadline above includes them.'
                          : "The host couldn't give you more time. The deadline above still applies."}
                    </span>
                  )}
                  <span>Ref. <span className="font-mono">{b.reference}</span></span>
                  {b.payment_reference && (
                    <span>
                      Payment ref: <span className="font-mono">{b.payment_reference}</span>
                    </span>
                  )}
                </div>
                </div>

                <div className="hm-booking-item-actions">
                  {b.status === 'awaiting_payment' && (
                    <button
                      type="button"
                      disabled={busyId === b.id || paymentWindowClosed(b.payment_deadline, nowMs)}
                      onClick={() => void startPaystackCheckout(b)}
                      className="hm-btn hm-btn-primary min-h-[46px]"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      {busyId === b.id ? 'Preparing Paystack…' : 'Pay securely via Paystack'}
                    </button>
                  )}

                  {b.status === 'awaiting_payment' &&
                    !b.payment_extension_status &&
                    !paymentWindowClosed(b.payment_deadline, nowMs) && (
                      <button
                        type="button"
                        disabled={busyId === b.id}
                        onClick={() => void requestMoreTime(b)}
                        className="hm-btn hm-btn-ghost min-h-[46px]"
                      >
                        Ask for 30 more minutes
                      </button>
                    )}

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => void openWayfinder(b)}
                      className="hm-btn hm-btn-ghost min-h-[46px]"
                    >
                      <Compass className="h-4 w-4 shrink-0" />
                      Arrival guide
                    </button>
                  )}

                  {b.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerError('');
                        setFeedbackBooking(b);
                      }}
                      className="hm-btn hm-btn-ghost min-h-[46px]"
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
                      className="hm-btn hm-btn-ghost min-h-[46px]"
                    >
                      {busyId === b.id ? 'Cancelling…' : 'Cancel request'}
                    </button>
                  )}

                  <Link
                    href={`/account/issues?bookingId=${encodeURIComponent(b.id)}`}
                    className="hm-btn hm-btn-ghost min-h-[46px]"
                  >
                    Report an issue
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="hm-empty mt-8">
            <h2 className="hm-empty-title">No bookings yet</h2>
            <p className="hm-body">When you request a stay it appears here, with its status, payment deadline and arrival guide.</p>
            <div>
              <Link href="/stays" className="hm-btn hm-btn-primary">
                Explore Lagos stays
              </Link>
            </div>
          </div>
        )}

        {/* Safe Wayfinder Arrival Drawer (honestly gated if migration is not yet deployed) */}
        <FocusedDrawer
          error={drawerError}
          open={Boolean(wayfinderBooking)}
          title="Arrival guide"
          subtitle={wayfinderBooking?.reference}
          onClose={() => setWayfinderBooking(null)}
        >
          {wayfinderState?.loading ? (
            <p className="text-sm text-ink-600">Checking arrival guidance…</p>
          ) : !wayfinderState?.deployed ? (
            <div className="space-y-3 rounded-2xl border border-ink-200 bg-paper p-4 text-sm leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                Your arrival guide isn&apos;t available yet
              </p>
              <p className="m-0 text-xs text-ink-600">
                Your stay is confirmed ({wayfinderBooking?.reference}). If check-in is close and you still need directions, report an issue from this booking and HAMLET will help.
              </p>
            </div>
          ) : !wayfinderState.ready ? (
            <div className="space-y-3 rounded-2xl border border-ink-200 bg-paper p-4 text-sm leading-relaxed text-ink-700">
              <p className="m-0 font-bold text-ink-900">
                The arrival guide for this stay isn&apos;t ready yet
              </p>
              <p className="m-0 text-xs text-ink-600">
                {wayfinderState.summary ||
                  'It will appear here once it is ready. If check-in is close and it is still missing, report an issue from this booking.'}
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
          error={drawerError}
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
                  className="hm-input"
                >
                  <option value={0} disabled>
                    Choose a rating
                  </option>
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
                  className={`hm-input resize-y`}
                />
              )}
            </FormField>

            <button
              type="submit"
              disabled={Boolean(busyId)}
              className="hm-btn hm-btn-primary min-h-[48px] w-full"
            >
              {busyId ? 'Saving…' : 'Submit feedback'}
            </button>
          </form>
        </FocusedDrawer>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
