'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CalendarDays, ShieldCheck } from 'lucide-react';
import { lagosIsoDateOffset, nightsBetween } from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
import { buildNextSignInPath } from '@/lib/authRedirect';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  extractShareTokenFromSearchParams,
  readPropertyShareTokenHint,
  readVisitorSessionKey,
} from '@/lib/share-engine';
import {
  FocusedDrawer,
  FormField,
  StepFooterActions,
  StepProgressHeader,
  StepperCounter,
} from '@/components/forms/ProgressiveFormPrimitives';

type Props = {
  propertyId: string;
  propertyTitle: string;
  guestNightlyRate: number;
  cleaningFee: number;
  deposit: number;
  capacity: number | null;
  firstAvailableDate?: string | null;
};

const BOOKING_STEPS = [
  {
    id: 'dates',
    title: 'Dates & guests',
    shortLabel: '1. Dates & guests',
  },
  {
    id: 'confirm',
    title: 'Review & request',
    shortLabel: '2. Request',
  },
] as const;

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

  const [step, setStep] = useState(0);
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

  // Hydrate booking intent from URL query params (?checkIn=...&checkOut=...&guests=...&step=2)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const qIn = params.get('checkIn');
      const qOut = params.get('checkOut');
      const qGuests = Number(params.get('guests'));
      const qStep = params.get('step');
      if (qIn && /^\d{4}-\d{2}-\d{2}$/.test(qIn)) setCheckIn(qIn);
      if (qOut && /^\d{4}-\d{2}-\d{2}$/.test(qOut)) setCheckOut(qOut);
      if (Number.isInteger(qGuests) && qGuests >= 1 && qGuests <= maxGuests) {
        setGuests(qGuests);
      }
      if (qStep === '2' && qIn && qOut && qOut > qIn) {
        setStep(1);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [maxGuests]);

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
          'Those dates have a recorded calendar block or active booking hold. Please pick different dates.',
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

  function buildIntentReturnUrl(targetStep: number) {
    const qs = new URLSearchParams();
    if (checkIn) qs.set('checkIn', checkIn);
    if (checkOut) qs.set('checkOut', checkOut);
    qs.set('guests', String(guests));
    if (targetStep === 1) qs.set('step', '2');
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

    if (!nights || nights < 1) {
      setError('Choose a check-in date and a later check-out date.');
      return;
    }
    if (nights > 60) {
      setError('Online booking requests are limited to 1–60 nights.');
      return;
    }
    if (checkIn < minCheckIn) {
      setError(`Check-in must be on or after ${minCheckIn}.`);
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

    if (step === 0) {
      setStep(1);
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
          buildNextSignInPath({ next: buildIntentReturnUrl(1) }),
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
            buildNextSignInPath({ next: buildIntentReturnUrl(1) }),
          );
          return;
        }
        throw new Error(result.error || 'We could not submit the booking request.');
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
          : 'We could not submit the request. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const renderFormBody = () => {
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
                setStep(0);
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
      <form onSubmit={handleStepSubmit} className="hm-booking-form">
        <StepProgressHeader
          steps={BOOKING_STEPS}
          currentStep={step}
          onSelectStep={idx => setStep(idx)}
          maxCompletedStep={nights >= 1 && !calendarConflict ? 1 : 0}
        />

        {step === 0 ? (
          <div className="space-y-3.5">
            <div className="hm-booking-dates">
              <FormField label="Check-in">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    required
                    type="date"
                    min={minCheckIn}
                    value={checkIn}
                    onChange={e => {
                      setCheckIn(e.target.value);
                      setError('');
                    }}
                    className="hm-input"
                  />
                )}
              </FormField>

              <FormField label="Check-out">
                {fieldProps => (
                  <input
                    {...fieldProps}
                    required
                    type="date"
                    min={checkIn || minCheckIn}
                    value={checkOut}
                    onChange={e => {
                      setCheckOut(e.target.value);
                      setError('');
                    }}
                    className="hm-input"
                  />
                )}
              </FormField>
            </div>

            <StepperCounter
              label="Guests"
              hint={`Up to ${maxGuests} ${maxGuests === 1 ? 'guest' : 'guests'}`}
              value={guests}
              min={1}
              max={maxGuests}
              onChange={setGuests}
            />

            {checkingCalendar && (
              <p className="hm-meta">Checking recorded calendar dates…</p>
            )}
            {calendarConflict && (
              <p
                role="alert"
                className="hm-notice hm-notice-bad"
              >
                {calendarConflict}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="hm-booking-summary">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  <CalendarDays size={14} aria-hidden="true" className="mr-1.5 inline" />
                  {checkIn} → {checkOut} ({nights} {nights === 1 ? 'night' : 'nights'})
                </span>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="hm-link"
                  style={{ fontSize: 13, paddingBottom: 2 }}
                >
                  Change
                </button>
              </div>
              <p className="hm-meta" style={{ marginTop: 4 }}>
                {guests} {guests === 1 ? 'guest' : 'guests'} · {propertyTitle}
              </p>
            </div>

            <FormField
              label="Arrival window or special requests"
              optional
            >
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={3}
                  maxLength={1000}
                  value={requests}
                  onChange={e => setRequests(e.target.value)}
                  placeholder="e.g. Arriving around 4 PM from MMIA…"
                  className="hm-input"
                  style={{ resize: 'vertical' }}
                />
              )}
            </FormField>

            <div className="hm-notice">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                No charge now. A 48-hour Paystack payment window opens after host confirmation.
              </span>
            </div>
          </div>
        )}

        {/* Authoritative Price Breakdown (`src/lib/pricing.ts`) */}
        {nights > 0 && domesticNightly !== null && (
          <div className="hm-booking-breakdown" aria-live="polite">
            <div className="hm-booking-line">
              <span>
                Stay ({formatPrice(domesticNightly, { roundWhole: true })} × {nights}{' '}
                {nights === 1 ? 'night' : 'nights'})
              </span>
              <span className="font-mono font-semibold">
                {formatPrice(guestAccommodationTotal)}
              </span>
            </div>
            {cleaningFee > 0 && (
              <div className="hm-booking-line">
                <span>Cleaning & turnover (mandatory)</span>
                <span className="font-mono font-semibold">{formatPrice(cleaningFee)}</span>
              </div>
            )}
            <div className="hm-booking-total">
              <span>Total stay price</span>
              <span className="font-mono">{formatPrice(guestStayTotal)}</span>
            </div>
            {deposit > 0 && (
              <div className="hm-booking-line hm-booking-line-muted">
                <span>Refundable caution deposit</span>
                <span className="font-mono font-semibold">
                  {formatCautionDeposit(deposit)}
                </span>
              </div>
            )}
            {currency !== 'NGN' && (
              <p className="hm-field-hint" style={{ margin: 0 }}>
                {currency} quote includes a single 10% FX buffer (30-min validity). Caution deposits are unbuffered.
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="hm-notice hm-notice-bad"
          >
            {error}
          </p>
        )}

        <StepFooterActions
          canGoBack={step > 0}
          onBack={() => setStep(0)}
          isLastStep={step === 1}
          nextLabel="Review request"
          submitLabel="Request to book"
          busy={busy}
          busyLabel="Sending request…"
        />
      </form>
    );
  };

  return (
    <>
      <div className="hm-card hm-booking hm-booking-scope">
        <div className="hm-booking-head">
          <div>
            <p className="hm-field-label">All-in stay rate</p>
            <p className="hm-booking-rate">
              {domesticNightly !== null ? (
                <>
                  {formatPrice(domesticNightly, { roundWhole: true })}{' '}
                  <span className="hm-meta" style={{ display: 'inline' }}>
                    / night · fees included{currency !== 'NGN' ? ` (${currency})` : ''}
                  </span>
                </>
              ) : (
                <span className="hm-meta" style={{ fontWeight: 700 }}>
                  Price unavailable
                </span>
              )}
            </p>
          </div>
          {deposit > 0 && (
            <span className="hm-status hm-status-neutral">
              Caution: {formatCautionDeposit(deposit, { roundWhole: true })}
            </span>
          )}
        </div>

        {renderFormBody()}
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
                    {nights > 0 ? `total (${nights}n)` : '/ night'}
                  </span>
                </>
              )}
            </p>
            <p className="hm-meta" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Partner confirms before payment
            </p>
          </div>
          <button
            type="button"
            disabled={domesticNightly === null}
            onClick={() => setMobileSheetOpen(true)}
            className="hm-btn hm-btn-primary"
          >
            {nights > 0 ? 'Request stay' : 'Check dates'}
          </button>
        </div>
      </div>

      <FocusedDrawer
        open={mobileSheetOpen}
        title="Request to book"
        subtitle={propertyTitle}
        onClose={() => setMobileSheetOpen(false)}
      >
        <div className="hm-booking-scope">{renderFormBody()}</div>
      </FocusedDrawer>
    </>
  );
}
