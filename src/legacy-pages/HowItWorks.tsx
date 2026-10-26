import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  CreditCard,
  KeyRound,
  Search,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { usePageMeta } from '../lib/brand';

const CEREMONY_STEPS = [
  {
    num: '01',
    badge: 'Step 01 · Guest',
    Icon: Search,
    title: 'Request the stay',
    body: 'Choose your dates, guest count, and currency (₦, $, or £). Review house rules and total pricing — zero card charge on request.',
    cta: { label: 'Explore stays', to: '/stays' },
  },
  {
    num: '02',
    badge: 'Step 02 · Host',
    Icon: ClipboardCheck,
    title: 'Host confirms dates',
    body: 'The owner or authorised partner confirms availability and locks your dates under a 48-hour payment hold.',
  },
  {
    num: '03',
    badge: 'Step 03 · Checkout',
    Icon: CreditCard,
    title: 'Pay via Paystack (48h)',
    body: 'Pay inside your HAMLET account. Bookings confirm exclusively via Paystack’s signed server-side webhook — never screenshots.',
  },
  {
    num: '04',
    badge: 'Step 04 · Arrival',
    Icon: KeyRound,
    title: 'Arrive with Wayfinder',
    body: 'Confirmed stays unlock Wayfinder gate pins and check-in instructions. Refundable caution deposits are inspected post-checkout.',
    cta: { label: 'Find a stay', to: '/stays' },
  },
];

const LIFECYCLE_STATES = [
  { step: '1', code: 'requested', sub: 'Dates reviewed' },
  { step: '2', code: 'awaiting_payment', sub: '48h Paystack hold' },
  { step: '3', code: 'confirmed', sub: 'Webhook + Wayfinder' },
  { step: '4', code: 'completed', sub: 'Deposit inspected' },
];

export default function HowItWorks() {
  usePageMeta(
    'How HAMLET Works | Booking Shortlets Made Clear',
    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET — with upfront pricing and server-verified Paystack checkout.',
  );

  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <GuestLayout>
      {/* Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow-light">How it works</p>
          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Booked clearly.{' '}
            <span className="italic text-brass-300">Paid only when confirmed.</span>
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
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

        {/* Booking Lifecycle Strip */}
        <section className="mt-10 rounded-3xl bg-ink-950 p-6 text-paper sm:p-8">
          <p className="eyebrow-light">Booking lifecycle</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LIFECYCLE_STATES.map(s => (
              <div
                key={s.step}
                className="rounded-2xl border border-white/12 bg-ink-900/90 p-4"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brass-500 font-mono text-xs font-black text-ink-950">
                  {s.step}
                </span>
                <p className="mt-2.5 font-mono text-xs font-bold text-brass-300">{s.code}</p>
                <p className="mt-1 text-xs font-medium text-ink-300">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </GuestLayout>
  );
}
