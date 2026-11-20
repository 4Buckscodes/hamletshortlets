'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatNaira, lagosIsoDateOffset, nightsBetween } from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
import { buildNextSignInPath } from '@/lib/authRedirect';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  extractShareTokenFromSearchParams,
  readPropertyShareTokenHint,
  readVisitorSessionKey,
} from '@/lib/share-engine';
import { FocusedDrawer, FormField } from '@/components/forms/ProgressiveFormPrimitives';

type Props = {
  propertyId: string;
  propertyTitle: string;
  guestNightlyRate: number;
  cleaningFee: number;
  deposit: number;
  capacity: number | null;
  firstAvailableDate?: string | null;
};

function formatDay(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function BookingRequestForm({
  propertyId,
  propertyTitle,
  guestNightlyRate,
  cleaningFee,
  deposit,
  capacity,
  firstAvailableDate,
}: Props) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const { currency, formatPrice, formatCautionDeposit } = useCurrency();
  const maxGuests = Math.max(1, Math.min(capacity || 10, 20));
  const minCheckIn = useMemo(() => {
    const today = lagosIsoDateOffset(0);
    return firstAvailableDate && firstAvailableDate > today ? firstAvailableDate : today;
  }, [firstAvailableDate]);

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [requests, setRequests] = useState('');
  const [calendarConflict, setCalendarConflict] = useState<string | null>(null);
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdReference, setCreatedReference] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!db) return;
    let active = true;
    void db.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, [db]);

  // Hydrate booking intent from URL query params (?checkIn=...&checkOut=...&guests=...)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const qIn = params.get('checkIn');
      const qOut = params.get('checkOut');
      const qGuests = Number(params.get('guests'));
      if (qIn && /^\d{4}-\d{2}-\d{2}$/.test(qIn)) setCheckIn(qIn);
      if (params.get('resume') === '1') {
        try {
          const note = window.sessionStorage.getItem(`hamlet:booking-note:${propertyId}`);
          if (note) setRequests(note);
        } catch {
          // ignore
        }
      }
      if (qOut && /^\d{4}-\d{2}-\d{2}$/.test(qOut)) setCheckOut(qOut);
      if (Number.isInteger(qGuests) && qGuests >= 1 && qGuests <= maxGuests) {
        setGuests(qGuests);
      }
      // Back from sign-in with a booking intent: bring the request straight back into view.
      if (params.get('resume') === '1' && qIn && qOut && qOut > qIn) {
        setResumed(true);
        if (window.matchMedia('(max-width: 1023px)').matches) {
          setMobileSheetOpen(true);
        } else {
          document.querySelector('.hm-detail-aside')?.scrollIntoView({ block: 'start' });
        }
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [maxGuests, propertyId]);

  const nights =
    checkIn && checkOut && checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 0;

  // Check calendar conflicts automatically when valid dates are chosen
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setCalendarConflict(null);
      if (!db || !nights || nights < 1) return;
      setCheckingCalendar(true);
      const { data, error: rpcErr } = await db.rpc('get_unavailable_property_ids', {
        requested_check_in: checkIn,
        requested_check_out: checkOut,
      });
      if (!active) return;
      setCheckingCalendar(false);
      if (!rpcErr && Array.isArray(data) && (data as string[]).includes(propertyId)) {
        setCalendarConflict(
          'Those dates aren’t available for this stay. Please pick different dates.',
        );
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [db, propertyId, checkIn, checkOut, nights]);

  // This prop is already the guest-facing nightly price (markup included).
  // Do not feed it back through calculateGuestPricing or the markup would be applied twice.
  const domesticNightly = Number.isFinite(guestNightlyRate) && guestNightlyRate > 0
    ? Math.round(guestNightlyRate)
    : null;
  const guestAccommodationTotal = domesticNightly === null ? 0 : domesticNightly * Math.max(1, nights);
  const guestStayTotal = guestAccommodationTotal + Math.max(0, Math.round(cleaningFee));

  function buildIntentReturnUrl() {
    const qs = new URLSearchParams();
    if (checkIn) qs.set('checkIn', checkIn);
    if (checkOut) qs.set('checkOut', checkOut);
    qs.set('guests', String(guests));
    qs.set('resume', '1');
    // Keep the guest's arrival note across sign-in (this tab only).
    try {
      if (requests.trim()) window.sessionStorage.setItem(`hamlet:booking-note:${propertyId}`, requests);
    } catch {
      // Storage can be unavailable; the note is optional.
    }
    const activeShareToken =
      (typeof window !== 'undefined'
        ? extractShareTokenFromSearchParams(new URLSearchParams(window.location.search))
        : null) || readPropertyShareTokenHint(propertyId);
    if (activeShareToken) qs.set('ref', activeShareToken);
    return `/stays/${encodeURIComponent(propertyId)}?${qs.toString()}`;
  }

  async function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!checkIn || !checkOut) {
      setError('Choose your check-in and check-out dates to send a request.');
      setDateError(true);
      return;
    }
    if (!nights || nights < 1) {
      setError('Check-out must be at least one night after check-in.');
      setDateError(true);
      return;
    }
    if (nights > 60) {
      setError('Online booking requests are limited to 1–60 nights.');
      return;
    }
    if (checkIn < minCheckIn) {
      setError(`The earliest check-in for this stay is ${formatDay(minCheckIn)}.`);
      return;
    }
    if (guests > maxGuests) {
      setError(`This stay accommodates up to ${maxGuests} guests.`);
      return;
    }
    if (calendarConflict) {
      setError(calendarConflict);
      return;
    }

    if (!db) {
      setError('Booking requests are not configured on this deployment yet.');
      return;
    }

    setBusy(true);
    try {
      const { data: sessionData } = await db.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        window.location.assign(
          buildNextSignInPath({ next: buildIntentReturnUrl() }),
        );
        return;
      }

      const response = await fetch('/api/booking-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          propertyId,
          checkIn,
          checkOut,
          guests,
          specialRequests: requests.trim(),
          quoteCurrency: currency,
          visitorSessionKey: readVisitorSessionKey(),
          shareToken:
            extractShareTokenFromSearchParams(new URLSearchParams(window.location.search)) ||
            readPropertyShareTokenHint(propertyId),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        booking?: { reference?: string };
        message?: string;
      };
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(
            buildNextSignInPath({ next: buildIntentReturnUrl() }),
          );
          return;
        }
        throw new Error(result.error || 'We couldn’t send your request. Nothing has been charged; please try again.');
      }
      setCreatedReference(result.booking?.reference || null);
      setMessage(
        result.message ||
          'Booking request sent. The property partner will confirm availability before payment opens.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We couldn’t send your request. Check your connection and try again; nothing has been charged.',
      );
    } finally {
      setBusy(false);
    }
  }

  const renderFormBody = (variant: 'card' | 'sheet') => {
    if (domesticNightly === null) {
      return (
        <div
          role="status"
          className="hm-notice"
          style={{ flexDirection: 'column', gap: 4 }}
        >
          <p className="m-0 font-bold">Price currently unavailable</p>
          <p className="m-0">
            Contact <strong>hello@hamlet.rest</strong> for rate confirmation.
          </p>
        </div>
      );
    }

    if (createdReference || message) {
      return (
        <div
          role="status"
          className="hm-booking-success"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} aria-hidden="true" className="hm-booking-success-icon" />
            <div>
              <h3 className="hm-h3" style={{ fontSize: 20 }}>
                Booking request sent
              </h3>
              {createdReference && (
                <p className="hm-booking-ref">
                  Reference: {createdReference}
                </p>
              )}
              <p className="hm-meta" style={{ marginTop: 8 }}>
                {message}
              </p>
            </div>
          </div>

          <div className="grid gap-2 pt-1">
            <Link href="/account/bookings" className="hm-btn hm-btn-primary hm-btn-block">
              Track in My Bookings →
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedReference(null);
                setMessage('');
              }}
              className="hm-btn hm-btn-ghost hm-btn-block"
            >
              Start another date check
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleStepSubmit} className="hm-booking-form" noValidate>
        <div className="hm-booking-dates">
          <FormField label="Check-in">
            {fieldProps => (
              <span className="hm-date-wrap" data-empty={checkIn ? 'false' : 'true'}>
                <input
                  {...fieldProps}
                  aria-invalid={dateError || undefined}
                  aria-describedby={dateError && error ? `booking-error-${variant}` : fieldProps['aria-describedby']}
                  required
                  type="date"
                  min={minCheckIn}
                  value={checkIn}
                  onChange={e => {
                    const next = e.target.value;
                    setCheckIn(next);
                    if (next && (!checkOut || checkOut <= next)) setCheckOut(addDays(next, 1));
                    setError('');
                    setDateError(false);
                  }}
                  className="hm-input"
                />
                <span className="hm-date-ph" aria-hidden="true">Add date</span>
              </span>
            )}
          </FormField>
          <FormField label="Check-out">
            {fieldProps => (
              <span className="hm-date-wrap" data-empty={checkOut ? 'false' : 'true'}>
                <input
                  {...fieldProps}
                  aria-invalid={dateError || undefined}
                  aria-describedby={dateError && error ? `booking-error-${variant}` : fieldProps['aria-describedby']}
                  required
                  type="date"
                  min={checkIn ? addDays(checkIn, 1) : addDays(minCheckIn, 1)}
                  value={checkOut}
                  onChange={e => {
                    setCheckOut(e.target.value);
                    setError('');
                    setDateError(false);
                  }}
                  className="hm-input"
                />
                <span className="hm-date-ph" aria-hidden="true">Add date</span>
              </span>
            )}
          </FormField>
        </div>

        <FormField label="Guests">
          {fieldProps => (
            <select {...fieldProps} value={guests} onChange={e => setGuests(Number(e.target.value) || 1)} className="hm-input">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map(count => (
                <option key={count} value={count}>
                  {count} {count === 1 ? 'guest' : 'guests'}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField label="Arrival window or special requests" optional>
          {fieldProps => (
            <textarea
              {...fieldProps}
              rows={2}
              maxLength={1000}
              value={requests}
              onChange={e => setRequests(e.target.value)}
              placeholder="e.g. Arriving around 9pm from the airport"
              className="hm-input"
              style={{ resize: 'vertical' }}
            />
          )}
        </FormField>

        {checkingCalendar && <p className="hm-meta">Checking the dates…</p>}
        {calendarConflict && (
          <p role="alert" className="hm-notice hm-notice-bad">
            {calendarConflict}
          </p>
        )}

        {/* Authoritative Price Breakdown (`src/lib/pricing.ts`) */}
        {domesticNightly !== null && (
          <div className="hm-booking-breakdown" aria-live="polite">
            {nights > 0 ? (
              <>
                <div className="hm-booking-line">
                  <span>
                    {nights} {nights === 1 ? 'night' : 'nights'} · fees included
                  </span>
                  <span className="hm-money">{formatPrice(guestAccommodationTotal)}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="hm-booking-line">
                    <span>Cleaning & turnover</span>
                    <span className="hm-money">{formatPrice(cleaningFee)}</span>
                  </div>
                )}
                <div className="hm-booking-total">
                  <span>Total to pay once accepted</span>
                  <span className="hm-money">{formatPrice(guestStayTotal)}</span>
                </div>
              </>
            ) : (
              <div className="hm-booking-line">
                <span>Add dates to see your total</span>
              </div>
            )}
            {deposit > 0 && (
              <div className="hm-booking-line hm-booking-line-muted">
                <span>
                  Refundable caution deposit
                  <small>Held separately and returned after check-out</small>
                </span>
                <span className="hm-money">{formatCautionDeposit(deposit)}</span>
              </div>
            )}
            {currency !== 'NGN' && nights > 0 && (
              <p className="hm-field-hint" style={{ margin: 0 }}>
                Shown in {currency} at today’s rate, including a 10% exchange buffer. In naira the stay is {formatNaira(guestStayTotal)}.
              </p>
            )}
          </div>
        )}

        {error && (
          <p id={`booking-error-${variant}`} role="alert" className="hm-notice hm-notice-bad">
            {error}
          </p>
        )}

        <button type="submit" className="hm-btn hm-btn-primary hm-btn-block" disabled={busy}>
          {busy ? 'Sending request…' : 'Request to book'}
          {!busy && <ArrowRight size={16} aria-hidden="true" />}
        </button>
        <p className="hm-field-hint" style={{ margin: 0, textAlign: 'center' }}>
          {resumed && signedIn
            ? 'Signed in. Your dates are saved; tap Request to book to send it.'
            : signedIn === false
              ? 'You won’t be charged yet. Next, sign in or create a free account; your dates are kept and your request is ready to send.'
              : 'You won’t be charged yet. The partner reviews your request first.'}
        </p>
      </form>
    );
  };

  return (
    <>
      <div className="hm-card hm-booking hm-booking-scope">
        <div className="hm-booking-head">
          <p className="hm-booking-rate">
            {domesticNightly !== null ? (
              <>
                {formatPrice(domesticNightly, { roundWhole: true })}{' '}
                <span className="hm-meta" style={{ display: 'inline' }}>
                  / night · fees included
                </span>
              </>
            ) : (
              <span className="hm-meta" style={{ fontWeight: 700 }}>
                Price unavailable
              </span>
            )}
          </p>
        </div>

        {renderFormBody('card')}
      </div>

      {/* Mobile Sticky Bottom Action Bar (never obscures content due to pb-24 on detail main) */}
      <div className="hm-booking-bar">
        <div className="hm-booking-bar-inner">
          <div className="min-w-0">
            <p className="hm-booking-bar-price">
              {domesticNightly === null ? (
                <span className="hm-meta" style={{ fontWeight: 700 }}>
                  Price unavailable
                </span>
              ) : (
                <>
                  {nights > 0
                    ? formatPrice(guestStayTotal)
                    : formatPrice(domesticNightly, { roundWhole: true })}
                  <span className="hm-meta" style={{ display: 'inline', marginLeft: 4 }}>
                    {nights > 0 ? `total · ${nights} ${nights === 1 ? 'night' : 'nights'}` : '/ night · fees included'}
                  </span>
                </>
              )}
            </p>
            <p className="hm-meta" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              No charge until accepted
            </p>
          </div>
          <button
            type="button"
            disabled={domesticNightly === null}
            onClick={() => setMobileSheetOpen(true)}
            className="hm-btn hm-btn-primary"
          >
            {nights > 0 ? 'Request to book' : 'Check dates'}
          </button>
        </div>
      </div>

      <FocusedDrawer
        open={mobileSheetOpen}
        title="Request to book"
        subtitle={propertyTitle}
        onClose={() => setMobileSheetOpen(false)}
      >
        <div className="hm-booking-scope">{renderFormBody('sheet')}</div>
      </FocusedDrawer>
    </>
  );
}
