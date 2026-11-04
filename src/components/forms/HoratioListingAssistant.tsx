'use client';

import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import type { PropertyWizardValues } from './PropertyListingWizard';

type HoratioDraft = Partial<PropertyWizardValues> & { missingInformation: string[]; unsupportedClaims: string[] };

export function HoratioListingAssistant({ onApply }: { onApply: (draft: Partial<PropertyWizardValues>) => void }) {
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<HoratioDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generateDraft() {
    setBusy(true); setError(''); setDraft(null);
    try {
      const db = getBrowserSupabase();
      const { data } = await db?.auth.getSession() ?? { data: { session: null } };
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch('/api/partner/horatio/listing-draft', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ description }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Horatio could not prepare the draft.');
      setDraft(payload.draft as HoratioDraft);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="mb-5 rounded-3xl border border-brass-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-950 text-lg font-semibold text-white">H</div>
        <div><p className="m-0 text-sm font-extrabold text-ink-950">Meet Horatio</p><p className="m-0 text-xs text-ink-600">Your AI listing assistant</p></div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-700">Describe your property naturally. Horatio will organise the information into an editable listing draft.</p>
      <textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={12000} rows={5} placeholder="Example: A 2-bedroom apartment in Lekki Phase 1 with 2 bathrooms, inverter backup, Wi-Fi and parking. Sleeps 4 guests. Owner rate is ₦150,000 per night..." className="mt-3 w-full rounded-2xl border border-ink-200 bg-paper p-3 text-sm text-ink-900 outline-none focus:border-brass-500" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-ink-500">Do not enter passwords, payment credentials or guests’ personal information.</span><button type="button" disabled={busy || description.trim().length < 30} onClick={() => void generateDraft()} className="primary-button disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Horatio is preparing…' : 'Generate listing draft'}</button></div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {draft && <div className="mt-4 rounded-2xl border border-ink-100 bg-paper p-4"><p className="m-0 text-sm font-bold text-ink-950">Your draft is ready to review</p><p className="mt-1 text-xs text-ink-600">Horatio has not verified these details. Check all fields before applying them.</p>{draft.unsupportedClaims.length > 0 && <div className="mt-3"><p className="text-xs font-bold text-amber-800">Claims to review</p><ul className="list-disc pl-5 text-xs text-ink-700">{draft.unsupportedClaims.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{draft.missingInformation.length > 0 && <div className="mt-3"><p className="text-xs font-bold text-ink-800">Still needed</p><ul className="list-disc pl-5 text-xs text-ink-700">{draft.missingInformation.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}<button type="button" onClick={() => onApply(draft)} className="primary-button mt-4">Apply draft to listing form</button></div>}
    </section>
  );
}