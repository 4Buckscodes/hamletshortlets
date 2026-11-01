'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, MapPin, Sparkles } from 'lucide-react';

const AREAS = ['Anywhere in Lagos', 'Lekki Phase 1', 'Ikate', 'Victoria Island', 'Ikoyi', 'Yaba', 'Ikeja GRA', 'Surulere', 'Ajah'];
const TYPES = ['Any type', 'Studio', '1 bedroom', '2 bedrooms', '3+ bedrooms'];

/** A low-friction, privacy-conscious interest capture that does not pretend to reserve a stay. */
export function GuestInterestPanel() {
  const [email, setEmail] = useState('');
  const [area, setArea] = useState(AREAS[0]);
  const [type, setType] = useState(TYPES[0]);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!consent) {
      setError('Please confirm that HAMLET may contact you about relevant stay updates.');
      return;
    }
    const subject = encodeURIComponent('HAMLET early access — guest interest');
    const body = encodeURIComponent([
      'Hello HAMLET team,',
      '',
      'I would like to hear when relevant verified stays become available.',
      `Email: ${email.trim()}`,
      `Preferred area: ${area}`,
      `Stay type: ${type}`,
      '',
      'I consent to being contacted about this early-access request.',
    ].join('\n'));
    window.location.href = `mailto:hello@hamlet.rest?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section aria-labelledby="guest-interest-title" className="mt-5 rounded-2xl border border-ink-200 bg-paper p-4 text-left sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass-100 text-brass-800"><Sparkles className="h-5 w-5" /></span>
        <div>
          <h4 id="guest-interest-title" className="font-display text-lg font-bold text-ink-950">Be first to hear when stays go live.</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">Tell us what you are looking for. This is an expression of interest, not a booking or reservation.</p>
        </div>
      </div>

      {submitted ? (
        <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-jade-700/20 bg-white p-3 text-sm text-ink-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-jade-700" />
          <span>Your email app should open with your request ready to send. HAMLET has not received it until you send that email.</span>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-bold text-ink-800">Email address</span>
            <span className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 focus-within:ring-2 focus-within:ring-brass-500">
              <Mail className="h-4 w-4 shrink-0 text-ink-400" />
              <input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="w-full bg-transparent text-sm text-ink-950 outline-none placeholder:text-ink-400" />
            </span>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-ink-800">Preferred area</span>
            <span className="flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3">
              <MapPin className="h-4 w-4 shrink-0 text-ink-400" />
              <select value={area} onChange={event => setArea(event.target.value)} className="w-full bg-transparent text-sm text-ink-900 outline-none">{AREAS.map(value => <option key={value}>{value}</option>)}</select>
            </span>
          </label>
          <label>
            <span className="mb-1 block text-xs font-bold text-ink-800">Accommodation</span>
            <select value={type} onChange={event => setType(event.target.value)} className="min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none">{TYPES.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-ink-600 sm:col-span-2">
            <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#b49342]" />
            <span>I agree that HAMLET may contact me about relevant availability and early access. I can opt out at any time.</span>
          </label>
          {error && <p role="alert" className="text-xs font-semibold text-red-700 sm:col-span-2">{error}</p>}
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink-950 px-5 text-sm font-bold text-white transition hover:bg-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2 sm:col-span-2">Notify me when stays go live <Mail className="h-4 w-4" /></button>
          <p className="text-[10px] leading-relaxed text-ink-500 sm:col-span-2">Your email app will open with a pre-filled message to hello@hamlet.rest. Nothing is sent automatically, and this form does not create a HAMLET account or booking.</p>
        </form>
      )}
    </section>
  );
}
