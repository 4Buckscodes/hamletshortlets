'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CalendarDays, ShieldCheck } from 'lucide-react';
import {
  calculateGuestPricing,
  guestFacingNightlyNgn,
  lagosIsoDateOffset,
  nightsBetween,
} from '@/lib/pricing';
import { useCurrency } from '@/lib/currency';
import { buildNextSignInPath } from '@/lib/authRedirect';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  FocusedDrawer,
  FormField,
  StepFooterActions,
  StepProgressHeader,
  StepperCounter,
  FIELD_INPUT_CLASS,
} from '@/components/forms/ProgressiveFormPrimitives';

type Props = {
  propertyId: string;
  propertyTitle: string;
  nightlyRate: number;
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
    description: 'Select your check-in, check-out and guest count to see the full stay total.',
  },
  {
    id: 'confirm',
    title: 'Review & request',
    shortLabel: '2. Request',
    description: 'No payment is taken now — the property partner confirms availability first.',
  },
] as const;

export default function BookingRequestForm({
  propertyId,
  propertyTitle,
  nightlyRate,
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

  const pricing = useMemo(
    () =>
      calculateGuestPricing({
        accommodationSubtotal: nightlyRate * Math.max(1, nights),
        mandatoryCharges:
          cleaningFee > 0 ? [{ label: 'Cleaning & turnover', amount: cleaningFee }] : [],
        refundableDeposit: deposit,
      }),
    [nightlyRate, nights, cleaningFee, deposit],
  );

  const domesticNightly = guestFacingNightlyNgn(nightlyRate);

  function buildIntentReturnUrl(targetStep: number) {
    const qs = new URLSearchParams();
    if (checkIn) qs.set('checkIn', checkIn);
    if (checkOut) qs.set('checkOut', checkOut);
    qs.set('guests', String(guests));
    if (targetStep === 1) qs.set('step', '2');
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
    if (createdReference || message) {
      return (
        <div
          role="status"
          className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h3 className="m-0 text-base font-bold text-ink-900">
                Booking request sent
              </h3>
              {createdReference && (
                <p className="m-0 mt-1 font-mono text-xs font-extrabold text-emerald-800">
                  Reference: {createdReference}
                </p>
              )}
              <p className="m-0 mt-2 text-xs leading-relaxed text-ink-700">
                {message}
              </p>
            </div>
          </div>

          <div className="grid gap-2 pt-1">
            <Link href="/account/bookings" className="primary-button w-full text-center">
              Track in My Bookings →
            </Link>
            <button
              type="button"
              onClick={() => {
                setCreatedReference(null);
                setMessage('');
                setStep(0);
              }}
              className="secondary-button w-full"
            >
              Start another date check
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleStepSubmit} className="space-y-4">
        <StepProgressHeader
          steps={BOOKING_STEPS}
          currentStep={step}
          onSelectStep={idx => setStep(idx)}
          maxCompletedStep={nights >= 1 && !calendarConflict ? 1 : 0}
        />

        {step === 0 ? (
          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
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
                    className={FIELD_INPUT_CLASS}
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
                    className={FIELD_INPUT_CLASS}
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
              <p className="m-0 text-xs text-ink-500">Checking recorded calendar dates…</p>
            )}
            {calendarConflict && (
              <p
                role="alert"
                className="m-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
              >
                {calendarConflict}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-ink-100 bg-paper p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-900">
                  <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-brass-700" />
                  {checkIn} → {checkOut} ({nights} {nights === 1 ? 'night' : 'nights'})
                </span>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="cursor-pointer font-bold text-ink-700 underline"
                >
                  Change
                </button>
              </div>
              <p className="m-0 mt-1 text-ink-600">
                {guests} {guests === 1 ? 'guest' : 'guests'} · {propertyTitle}
              </p>
            </div>

            <FormField
              label="Arrival window or special requests"
              optional
              hint="Share approximate arrival time or questions for the property partner."
            >
              {fieldProps => (
                <textarea
                  {...fieldProps}
                  rows={3}
                  maxLength={1000}
                  value={requests}
                  onChange={e => setRequests(e.target.value)}
                  placeholder="e.g. Arriving around 4 PM from MMIA…"
                  className={`${FIELD_INPUT_CLASS} resize-y`}
                />
              )}
            </FormField>

            <div className="flex items-start gap-2.5 rounded-2xl border border-ink-100 bg-paper/70 p-3 text-xs leading-relaxed text-ink-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                <strong>How payment works:</strong> No card charge happens now. Once the partner confirms your dates, a 48-hour Paystack payment window opens in your HAMLET account.
              </span>
            </div>
          </div>
        )}

        {/* Authoritative Price Breakdown (`src/lib/pricing.ts`) */}
        {nights > 0 && (
          <div className="space-y-2 rounded-2xl border border-ink-200 bg-paper/60 p-4 text-xs">
            <div className="flex justify-between gap-2 text-ink-700">
              <span>
                Stay ({formatPrice(domesticNightly, { roundWhole: true })} × {nights}{' '}
                {nights === 1 ? 'night' : 'nights'})
              </span>
              <span className="font-mono font-semibold">
                {formatPrice(pricing.domesticGuestAccommodationNgn)}
              </span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between gap-2 text-ink-700">
                <span>Cleaning & turnover (mandatory)</span>
                <span className="font-mono font-semibold">{formatPrice(cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-ink-200 pt-2 text-sm font-extrabold text-ink-900">
              <span>Total stay price</span>
              <span className="font-mono">{formatPrice(pricing.guestTotal)}</span>
            </div>
            {deposit > 0 && (
              <div className="flex justify-between gap-2 pt-1 text-ink-600">
                <span>Refundable caution deposit (post-checkout inspection)</span>
                <span className="font-mono font-semibold">
                  {formatCautionDeposit(deposit)}
                </span>
              </div>
            )}
            {currency !== 'NGN' && (
              <p className="m-0 pt-1 text-[11px] leading-relaxed text-ink-500">
                {currency} stay quote includes a single 10% international FX buffer (30-min quote validity). Refundable caution deposits are never marked up or buffered.
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="m-0 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-800"
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
      <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-ink-100 pb-4">
          <div>
            <p className="m-0 text-xs font-semibold text-ink-500">All-in stay rate</p>
            <p className="m-0 mt-0.5 font-mono text-2xl font-extrabold text-ink-900">
              {formatPrice(domesticNightly, { roundWhole: true })}{' '}
              <span className="font-sans text-xs font-normal text-ink-500">/ night</span>
            </p>
          </div>
          {deposit > 0 && (
            <span className="rounded-full bg-paper px-3 py-1 text-[11px] font-bold text-ink-700">
              Caution: {formatCautionDeposit(deposit, { roundWhole: true })}
            </span>
          )}
        </div>

        {renderFormBody()}
      </div>

      {/* Mobile Sticky Bottom Action Bar (never obscures content due to pb-24 on detail main) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-mono text-base font-extrabold text-ink-900">
              {nights > 0
                ? formatPrice(pricing.guestTotal)
                : formatPrice(domesticNightly, { roundWhole: true })}
              <span className="ml-1 font-sans text-xs font-normal text-ink-500">
                {nights > 0 ? `total (${nights}n)` : '/ night'}
              </span>
            </p>
            <p className="m-0 truncate text-[11px] text-ink-500">
              Partner confirms before payment
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="primary-button min-h-[46px] shrink-0 px-5"
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
        {renderFormBody()}
      </FocusedDrawer>
    </>
  );
}
