import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { usePageMeta } from '../lib/brand';

const CEREMONY_STEPS = [
  {
    num: '01',
    badge: 'Step 01 · Guest · ~2 minutes',
    Icon: Search,
    title: 'Request the stay',
    body: 'Pick your Lagos neighbourhood, dates, guest count, and display currency (NGN ₦, USD $, or GBP £). Review the house rules, mandatory charges, and separate refundable caution deposit terms — then submit with zero card charge.',
    detail:
      'Your request lands in the property owner or authorised partner’s queue alongside your arrival notes. HAMLET checks calendar spans at the data layer so overlapping confirmed stays and active 48-hour payment holds cannot collide.',
    cta: { label: 'Explore available stays', to: '/stays' },
  },
  {
    num: '02',
    badge: 'Step 02 · Host or HAMLET ops',
    Icon: ClipboardCheck,
    title: 'Availability & terms are confirmed',
    body: 'The property owner, authorised partner, or HAMLET operations reviews your dates, occupancy, and terms before any payment link is opened.',
    detail:
      'Once accepted, your dates are locked under a dedicated 48-hour payment hold — so you never pay into an unconfirmed calendar.',
  },
  {
    num: '03',
    badge: 'Step 03 · Server-verified checkout',
    Icon: CreditCard,
    title: '48-hour Paystack payment window',
    body: 'Checkout opens inside your signed-in HAMLET guest account. International USD and GBP quotes display the 10% currency buffer transparently and settle in NGN via Paystack.',
    detail:
      'Browser redirects and payment screenshots never confirm a reservation. Only Paystack’s signed server-side webhook transitions a booking to Confirmed and records the controlled ledger entries.',
  },
  {
    num: '04',
    badge: 'Step 04 · Wayfinder & stay support',
    Icon: KeyRound,
    title: 'Arrive with Wayfinder & settle in',
    body: 'Once confirmed, HAMLET Wayfinder unlocks verified entrance coordinates, compound navigation, and check-in access instructions inside your account.',
    detail:
      'After check-out, the refundable caution deposit follows a recorded post-checkout inspection review — tracked to completion on the ledger.',
    cta: { label: 'Find your next stay', to: '/stays' },
  },
];

const LIFECYCLE_STATES = [
  { step: '1', code: 'requested / checking', sub: 'Host & ops reviewing dates' },
  { step: '2', code: 'awaiting_payment', sub: '48h hold · Paystack NGN' },
  { step: '3', code: 'confirmed', sub: 'Signed webhook + Wayfinder' },
  { step: '4', code: 'completed', sub: 'Caution deposit inspected' },
];

const CHECKLIST = [
  'Confirm your exact dates and guest count against property capacity.',
  'Review the full price breakdown and separate refundable caution deposit.',
  'Check power backup, Wi-Fi, workspace, and parking arrangements.',
  'Read the house rules and cancellation terms before submitting.',
  'Use Wayfinder inside your account once your booking is confirmed.',
];

export default function HowItWorks() {
  usePageMeta(
    'How HAMLET Works | Booking Shortlets Made Clear',
    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET — with upfront pricing and server-verified Paystack checkout.',
  );

  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <GuestLayout>
      {/* Editorial Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="eyebrow-light">The HAMLET ceremony</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Booked with clarity.{' '}
            <span className="italic text-brass-300">Paid only when confirmed.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
            Four accountable steps, zero guesswork. Select any step below to see the exact lifecycle every HAMLET reservation travels from request to check-out.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        {/* Interactive Step Selector + Detail Cards */}
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-2.5 lg:col-span-5">
            {CEREMONY_STEPS.map((item, idx) => {
              const selected = activeIdx === idx;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                    selected
                      ? 'border-ink-900 bg-ink-900 text-white shadow-md'
                      : 'border-ink-100 bg-white text-ink-900 hover:border-ink-300'
                  }`}
                >
                  <span
                    className={`font-mono text-xs font-extrabold tracking-widest ${
                      selected ? 'text-brass-300' : 'text-brass-600'
                    }`}
                  >
                    {item.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        selected ? 'text-ink-300' : 'text-ink-400'
                      }`}
                    >
                      {item.badge}
                    </p>
                    <p className="mt-0.5 font-display text-lg font-bold">{item.title}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            {(() => {
              const step = CEREMONY_STEPS[activeIdx]!;
              const StepIcon = step.Icon;
              return (
                <article className="card flex h-full flex-col justify-between p-6 sm:p-8">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-brass-400/50 bg-brass-200/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-900">
                        <StepIcon size={14} className="shrink-0 text-brass-700" />
                        {step.badge}
                      </span>
                      <span className="font-mono text-2xl font-black text-ink-200">{step.num}</span>
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                      {step.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink-700 sm:text-[15px]">
                      {step.body}
                    </p>
                    <div className="mt-4 rounded-2xl border border-ink-100 bg-paper/80 p-4 text-[13px] font-medium leading-relaxed text-ink-700">
                      {step.detail}
                    </div>
                  </div>
                  {step.cta && (
                    <div className="mt-6 pt-2">
                      <Link to={step.cta.to} className="btn-jade min-h-11 !rounded-full !px-6">
                        {step.cta.label} <ArrowRight size={15} />
                      </Link>
                    </div>
                  )}
                </article>
              );
            })()}
          </div>
        </div>

        {/* Controlled Ledger State Machine Strip */}
        <section className="mt-12 rounded-3xl bg-ink-950 p-6 text-paper sm:p-9">
          <p className="eyebrow-light">The ledger never guesses</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            Every booking follows an auditable state machine
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE_STATES.map(s => (
              <div
                key={s.step}
                className="rounded-2xl border border-white/12 bg-ink-900/90 p-4"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brass-500 font-mono text-xs font-black text-ink-950">
                  {s.step}
                </span>
                <p className="mt-3 font-mono text-xs font-bold text-brass-300">{s.code}</p>
                <p className="mt-1 text-xs font-medium text-ink-300">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium text-ink-300">
            Exception states — <code className="font-mono text-brass-300">expired</code>,{' '}
            <code className="font-mono text-brass-300">declined</code>,{' '}
            <code className="font-mono text-brass-300">cancelled</code>,{' '}
            <code className="font-mono text-brass-300">disputed</code>,{' '}
            <code className="font-mono text-brass-300">refunded</code>, and{' '}
            <code className="font-mono text-brass-300">no_show</code> — reconcile through the same controlled ledger so every outcome is explainable.
          </p>
        </section>

        {/* 3 Core Guarantees */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="card p-6">
            <ShieldCheck size={20} className="text-emerald-700" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">
              No charge before confirmation
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Your card is never charged at request time. You pay only after availability is locked and you choose to proceed.
            </p>
          </div>
          <div className="card p-6">
            <Clock size={20} className="text-brass-600" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">48-hour payment hold</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Long enough to complete payment comfortably, structured enough to keep property calendars accurate for every guest.
            </p>
          </div>
          <div className="card p-6">
            <Lock size={20} className="text-ink-900" />
            <h3 className="mt-3 font-display text-lg font-bold text-ink-900">
              Signed webhook verification
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
              Only Paystack’s signed server-side event confirms a booking — never browser redirects or uploaded screenshots.
            </p>
          </div>
        </div>

        {/* Before You Book Checklist */}
        <section className="mt-10 rounded-3xl border border-ink-200 bg-white p-6 sm:p-8">
          <p className="eyebrow">Before you book</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink-900">
            Five quick checks for a seamless Lagos arrival.
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {CHECKLIST.map(item => (
              <li
                key={item}
                className="flex items-start gap-2.5 rounded-2xl border border-ink-100 bg-paper/70 px-4 py-3 text-sm font-semibold text-ink-800"
              >
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/stays" className="btn-jade min-h-11 !rounded-full !px-6">
              Start with step 01 — find your stay <ArrowRight size={15} />
            </Link>
            <Link to="/safety" className="btn-outline min-h-11 !rounded-full">
              Guest safety &amp; protection
            </Link>
            <Link to="/faqs" className="btn-outline min-h-11 !rounded-full">
              Browse booking FAQs
            </Link>
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
