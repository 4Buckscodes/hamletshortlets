'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ClipboardCheck, CreditCard, KeyRound, Search } from 'lucide-react';

const CEREMONY_STEPS = [
  {
    num: '01',
    badge: 'Step 01 · Guest',
    Icon: Search,
    title: 'Request the stay',
    body: 'Choose your dates, guest count, and currency (₦, $, or £). Review house rules and total stay pricing — zero card charge on request.',
    cta: { label: 'Explore stays', href: '/stays' },
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
    body: 'Pay securely inside your HAMLET account. Bookings confirm exclusively via Paystack’s signed server-side webhook — never browser redirects or screenshots.',
  },
  {
    num: '04',
    badge: 'Step 04 · Arrival',
    Icon: KeyRound,
    title: 'Arrive & enjoy your stay',
    body: 'Confirmed stays unlock check-in instructions inside your account. Separate refundable caution deposits are inspected post-checkout.',
    cta: { label: 'Find a stay', href: '/stays' },
  },
] as const;

export function CeremonyExplorer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const step = CEREMONY_STEPS[activeIdx]!;
  const StepIcon = step.Icon;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-2.5 lg:col-span-5">
        {CEREMONY_STEPS.map((item, idx) => {
          const selected = activeIdx === idx;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
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
        <article className="card flex h-full flex-col justify-between p-6 sm:p-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-brass-400/50 bg-brass-200/25 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-900">
                <StepIcon className="h-3.5 w-3.5 shrink-0 text-brass-700" />
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
          {'cta' in step && step.cta && (
            <div className="mt-6 pt-2">
              <Link href={step.cta.href} className="btn-jade min-h-11 !rounded-full !px-6">
                {step.cta.label} <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
