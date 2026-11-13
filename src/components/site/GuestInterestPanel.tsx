'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, MapPin } from 'lucide-react';
import { formatAccommodationFilterLabel, type AccommodationFilterValue } from '@/lib/discovery';

const INTEREST_AREAS = [
  'Anywhere in Lagos',
  'Lekki Phase 1',
  'Ikate',
  'Victoria Island',
  'Ikoyi',
  'Ajah',
  'Yaba',
  'Ikeja GRA',
  'Surulere',
  'Shomolu',
  'Lagos Mainland',
] as const;

const INTEREST_TYPES = [
  'Any type',
  'Studio',
  '1 bedroom',
  '2 bedrooms',
  '3+ bedrooms',
] as const;

function resolveSuggestedArea(preferredArea?: string): string {
  const clean = (preferredArea || '').trim();
  if (!clean) return INTEREST_AREAS[0];
  const match = INTEREST_AREAS.find(item => item.toLowerCase() === clean.toLowerCase());
  return match || clean;
}

function resolveSuggestedType(preferredType?: AccommodationFilterValue): string {
  if (!preferredType) return INTEREST_TYPES[0];
  const label = formatAccommodationFilterLabel(preferredType);
  const match = INTEREST_TYPES.find(item => item.toLowerCase() === label.toLowerCase());
  return match || INTEREST_TYPES[0];
}

/**
 * Low-friction, privacy-conscious early-access interest panel built on PR #56.
 * Opens the visitor's email client with a pre-filled inquiry to hello@hamlet.rest
 * and never claims to persist leads to a database, create an account, or reserve a stay.
 */
export function GuestInterestPanel({
  preferredArea,
  preferredType,
  compact = false,
}: {
  preferredArea?: string;
  preferredType?: AccommodationFilterValue;
  compact?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [customArea, setCustomArea] = useState<string | null>(null);
  const [customType, setCustomType] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const effectiveArea = customArea ?? resolveSuggestedArea(preferredArea);
  const effectiveType = customType ?? resolveSuggestedType(preferredType);

  const areaOptions = INTEREST_AREAS.includes(effectiveArea as (typeof INTEREST_AREAS)[number])
    ? INTEREST_AREAS
    : ([effectiveArea, ...INTEREST_AREAS] as const);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address so HAMLET knows where to reply.');
      return;
    }

    if (!consent) {
      setError('Please confirm that HAMLET may contact you about relevant stay updates.');
      return;
    }

    const subject = encodeURIComponent('HAMLET early access — guest stay interest');
    const body = encodeURIComponent(
      [
        'Hello HAMLET team,',
        '',
        'I would like to hear when verified shortlet stays matching my preferences become available in Lagos.',
        `Email: ${trimmedEmail}`,
        `Preferred neighbourhood: ${effectiveArea}`,
        `Preferred accommodation type: ${effectiveType}`,
        '',
        'I consent to HAMLET contacting me at this email address regarding this early-access request.',
      ].join('\n'),
    );

    window.location.href = `mailto:hello@hamlet.rest?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section
      aria-labelledby="guest-interest-title"
      className={`rounded-3xl border border-ink-200 bg-paper text-left shadow-2xs ${
        compact ? 'p-4 sm:p-5' : 'mx-auto max-w-2xl p-5 sm:p-6'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
            Early-access updates
          </p>
          <h3
            id="guest-interest-title"
            className="mt-0.5 font-display text-lg font-bold text-ink-950 sm:text-xl"
          >
            Get notified when verified stays go live.
          </h3>
        </div>
      </div>

      {submitted ? (
        <div
          role="status"
          className="mt-4 space-y-2.5 rounded-2xl border border-emerald-200 bg-white p-4 text-xs leading-relaxed text-ink-800 sm:text-sm"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div>
              <p className="m-0 font-bold text-ink-950">
                Email draft opened to hello@hamlet.rest.
              </p>
              <p className="m-0 mt-1 text-xs text-ink-600">
                Send the draft from your mail app to complete your request.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="min-h-10 cursor-pointer rounded-full border border-ink-200 bg-paper px-3.5 text-xs font-bold text-ink-800 transition hover:border-ink-900"
            >
              Edit preferences
            </button>
            <span className="text-xs text-ink-500">
              Direct email: <strong className="text-ink-800">hello@hamlet.rest</strong>
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="min-w-0 sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-ink-800">Email address</span>
            <span className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 focus-within:ring-2 focus-within:ring-brass-500">
              <Mail className="h-4 w-4 shrink-0 text-ink-400" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  if (error) setError('');
                }}
                placeholder="you@example.com"
                className="w-full min-w-0 bg-transparent text-sm text-ink-950 outline-none placeholder:text-ink-400"
              />
            </span>
          </label>

          <label className="min-w-0">
            <span className="mb-1 block text-xs font-bold text-ink-800">
              Preferred neighbourhood
            </span>
            <span className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 focus-within:ring-2 focus-within:ring-brass-500">
              <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
              <select
                value={effectiveArea}
                onChange={event => setCustomArea(event.target.value)}
                className="w-full min-w-0 bg-transparent text-sm text-ink-900 outline-none"
              >
                {areaOptions.map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label className="min-w-0">
            <span className="mb-1 block text-xs font-bold text-ink-800">
              Preferred accommodation type
            </span>
            <select
              value={effectiveType}
              onChange={event => setCustomType(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brass-500"
            >
              {INTEREST_TYPES.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={event => {
                setConsent(event.target.checked);
                if (error) setError('');
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0E1F3B]"
            />
            <span>
              I consent to HAMLET contacting me by email when relevant verified stays open in Lagos.
            </span>
          </label>

          {error && (
            <p role="alert" className="m-0 text-xs font-semibold text-red-700 sm:col-span-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink-950 px-5 text-sm font-bold text-white transition hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 sm:col-span-2"
          >
            <span>Open email to register interest</span>
            <Mail className="h-4 w-4 shrink-0" />
          </button>

          <p className="m-0 text-[11px] leading-relaxed text-ink-500 sm:col-span-2">
            Opens a pre-filled email to <strong>hello@hamlet.rest</strong>.
          </p>
        </form>
      )}
    </section>
  );
}
