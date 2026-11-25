'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, ListChecks, Sparkles } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import { formatNaira } from '@/lib/pricing';
import type { PropertyWizardValues } from './PropertyListingWizard';

const EXAMPLES = [
  {
    label: 'Lekki 2-bed',
    text: '2-bedroom apartment in Lekki Phase 1 with 2 bathrooms, 24/7 power with inverter backup, fast Wi-Fi, secure parking and a small gym. Sleeps 4. Owner rate ₦150,000 per night, cleaning fee ₦20,000, refundable deposit ₦100,000.',
  },
  {
    label: 'Yaba studio',
    text: 'Furnished studio in Yaba, 1 bathroom, queen bed, air conditioning, Wi-Fi, kitchenette and 24-hour security. Sleeps 2. Owner rate ₦65,000 per night. Cleaning fee ₦10,000.',
  },
  {
    label: 'VI 3-bed',
    text: '3-bedroom serviced apartment on Victoria Island with 3 bathrooms, generator, pool access, parking and a dedicated workspace. Sleeps 6. Owner rate ₦280,000 per night, refundable deposit ₦200,000.',
  },
];

type HoratioDraft = Partial<PropertyWizardValues> & {
  missingInformation: string[];
  unsupportedClaims: string[];
};

export function HoratioListingAssistant({
  onApply,
}: {
  onApply: (draft: Partial<PropertyWizardValues>) => void;
}) {
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<HoratioDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  async function generateDraft() {
    setBusy(true);
    setError('');
    setDraft(null);
    setApplied(false);
    try {
      const db = getBrowserSupabase();
      const { data } = (await db?.auth.getSession()) ?? { data: { session: null } };
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const response = await fetch('/api/partner/horatio/listing-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ description }),
      });
      const payload = (await response.json()) as {
        error?: string;
        draft?: HoratioDraft;
      };
      if (!response.ok || !payload.draft) {
        throw new Error(payload.error || 'Horatio could not prepare the draft.');
      }
      setDraft(payload.draft);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const ready = description.trim().length >= 30;
  const slugPreview = draft?.title && draft?.area
    ? (draft.title + ' ' + draft.area).toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

  return (
    <section
      aria-labelledby="horatio-heading"
      className="relative mb-6 overflow-hidden rounded-3xl bg-ink-950 p-5 text-white shadow-lg sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brass-400/20 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brass-400/60 bg-white/5 font-display text-xl font-semibold text-brass-400">
            H
          </div>
          <div className="min-w-0">
            <h3 id="horatio-heading" className="m-0 flex flex-wrap items-center gap-2 text-base font-extrabold">
              Horatio
              <span className="inline-flex items-center gap-1 rounded-full bg-brass-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brass-400">
                <Sparkles size={11} aria-hidden="true" /> AI assistant
              </span>
            </h3>
            <p className="m-0 text-xs text-white/65">Describe it once. Review the draft. Done in a minute.</p>
          </div>
        </div>

        <label htmlFor="horatio-description" className="mt-5 block text-sm font-semibold text-white">
          Tell Horatio about your property
        </label>
        <textarea
          id="horatio-description"
          value={description}
          onChange={event => {
            setDescription(event.target.value);
            setApplied(false);
          }}
          maxLength={12000}
          rows={5}
          placeholder="Area, bedrooms and bathrooms, how many it sleeps, what's included (power, Wi-Fi, parking…) and your nightly rate."
          className="mt-2 w-full resize-y rounded-2xl border border-white/15 bg-white/10 p-3.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/45 focus:border-brass-400 focus:bg-white/15"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Example descriptions">
          <span className="text-xs text-white/55">Try an example:</span>
          {EXAMPLES.map(example => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setDescription(example.text);
                setDraft(null);
                setApplied(false);
              }}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/85 transition hover:border-brass-400 hover:text-brass-400"
            >
              {example.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-xs text-white/55">
            {ready
              ? 'Looks good. Horatio only uses what you write.'
              : `Add ${Math.max(0, 30 - description.trim().length)} more characters`}
            {' · '}Never include passwords or payment details.
          </p>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => void generateDraft()}
            className="btn-brass !py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Horatio is writing…' : 'Draft my listing'}
            {!busy && <ArrowRight size={15} aria-hidden="true" />}
          </button>
        </div>

        {busy && (
          <div role="status" className="mt-4 flex items-center gap-2 text-xs text-white/70">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brass-400" aria-hidden="true" />
            Reading your description and preparing an editable draft…
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-300/40 bg-red-500/15 p-3 text-sm text-red-100">
            {error}
          </p>
        )}

        {draft && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-ink-900 sm:p-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-ink-500">Draft ready</p>
            <p className="mb-0 mt-1 text-base font-extrabold text-ink-950">
              {draft.title || 'Untitled listing'}
            </p>
            {slugPreview && (
              <div className="mt-3 rounded-xl border border-ink-100 bg-paper p-3">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-ink-500">URL preview</p>
                <p className="m-0 mt-1 break-all text-xs font-semibold text-ink-800">hamlet.rest/stays/{slugPreview}-[unique-id]</p>
                <p className="m-0 mt-1 text-[10px] text-ink-500">The final unique URL is assigned automatically when you save the property.</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink-800">
              {draft.area && <span className="rounded-full bg-paper px-3 py-1">{draft.area}</span>}
              {draft.bedrooms ? <span className="rounded-full bg-paper px-3 py-1">{draft.bedrooms} bed</span> : null}
              {draft.bathrooms ? <span className="rounded-full bg-paper px-3 py-1">{draft.bathrooms} bath</span> : null}
              {draft.capacity ? <span className="rounded-full bg-paper px-3 py-1">Sleeps {draft.capacity}</span> : null}
              {draft.nightlyRate ? (
                <span className="rounded-full bg-paper px-3 py-1">{formatNaira(draft.nightlyRate)} / night</span>
              ) : null}
              {draft.amenities && draft.amenities.length > 0 ? (
                <span className="rounded-full bg-paper px-3 py-1">{draft.amenities.length} amenities</span>
              ) : null}
            </div>

            {draft.missingInformation.length > 0 && (
              <div className="mt-4">
                <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-ink-900">
                  <ListChecks size={14} aria-hidden="true" /> Still needed from you
                </p>
                <ul className="mb-0 mt-1.5 list-disc pl-5 text-xs leading-relaxed text-ink-700">
                  {draft.missingInformation.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {draft.unsupportedClaims.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 p-3">
                <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <AlertTriangle size={14} aria-hidden="true" /> Claims to double-check
                </p>
                <ul className="mb-0 mt-1.5 list-disc pl-5 text-xs leading-relaxed text-amber-950">
                  {draft.unsupportedClaims.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mb-0 mt-4 text-xs text-ink-600">
              Horatio has not verified any of this. You can edit every field after applying.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onApply(draft);
                  setApplied(true);
                }}
                className="btn-dark !py-2.5 text-[13px]"
              >
                {applied ? 'Applied to the form' : 'Apply to my listing'}
                {applied ? <Check size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
              </button>
              {applied && (
                <span role="status" className="text-xs font-semibold text-emerald-700">
                  Scroll down to review and continue.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
