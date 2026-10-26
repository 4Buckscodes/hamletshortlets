import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { GuestLayout } from '../components/Navbar';
import { DocStatusBadge } from '../components/Badges';
import { usePageMeta } from '../lib/brand';
import type { DocStatus } from '../lib/types';

const VERIFICATION_PILLARS = [
  {
    num: '01',
    title: 'Ownership',
    body: 'Title or purchase documents checked against the property record.',
  },
  {
    num: '02',
    title: 'Identity',
    body: 'Government ID verified for the owner or authorised representative.',
  },
  {
    num: '03',
    title: 'Authority to list',
    body: 'Direct ownership or signed management mandate recorded.',
  },
  {
    num: '04',
    title: 'Physical inspection',
    body: 'On-site check of photos, power backup, and arrival accuracy.',
  },
] as const;

const HONEST_STATUSES: { status: DocStatus; code: string; desc: string }[] = [
  {
    status: 'verified',
    code: 'verified',
    desc: 'Evidence reviewed and recorded by HAMLET.',
  },
  {
    status: 'self_reported',
    code: 'self_reported',
    desc: 'Declared by the partner; awaiting review.',
  },
  {
    status: 'pending_review',
    code: 'pending_review',
    desc: 'Submitted and in the review queue.',
  },
  {
    status: 'missing',
    code: 'missing',
    desc: 'Not yet supplied.',
  },
];

export default function Safety() {
  usePageMeta(
    'Guest Safety & Booking Protection | HAMLET',
    'How HAMLET handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution.',
  );

  return (
    <GuestLayout>
      {/* Hero */}
      <section className="border-b border-ink-800 bg-ink-950 text-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="eyebrow-light">Safety &amp; protection</p>
          <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
            Four-pillar{' '}
            <span className="italic text-brass-300">verification.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-ink-200 sm:text-base">
            Clear verification records, in-account Paystack checkout, and structured support.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-14">
        <section>
          <p className="eyebrow">Recorded per listing</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            What we check
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VERIFICATION_PILLARS.map(pillar => (
              <article key={pillar.num} className="card flex flex-col p-5">
                <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                  {pillar.num}
                </span>
                <h3 className="mt-2.5 font-display text-xl font-bold text-ink-900">{pillar.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-ink-200 bg-white p-6">
          <p className="eyebrow">Transparent badges</p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">
            Pillar statuses
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {HONEST_STATUSES.map(item => (
              <div
                key={item.code}
                className="rounded-2xl border border-ink-100 bg-paper/75 p-4"
              >
                <DocStatusBadge status={item.status} />
                <p className="mt-2.5 text-xs font-medium leading-relaxed text-ink-700">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-6">
            <div className="flex items-center gap-2 text-ink-900">
              <CreditCard size={19} className="shrink-0 text-brass-600" />
              <h2 className="font-display text-xl font-bold">Payments</h2>
            </div>
            <ul className="mt-3.5 space-y-2 text-sm text-ink-700">
              {[
                'Pay only inside your HAMLET account after dates are confirmed',
                'Bookings confirm via Paystack’s server-side webhook — never screenshots',
                'Caution deposits are tracked separately and reviewed post-checkout',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-2 text-ink-900">
              <Lock size={19} className="shrink-0 text-brass-600" />
              <h2 className="font-display text-xl font-bold">Privacy &amp; access</h2>
            </div>
            <ul className="mt-3.5 space-y-2 text-sm text-ink-700">
              {[
                'Card details stay with Paystack — never stored on HAMLET',
                'Exact gate pins and door codes unlock only after confirmation',
                'NDPR-aligned access controls protect identity and booking records',
              ].map(line => (
                <li key={line} className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink-950 p-6 text-paper sm:flex-row sm:items-center sm:p-8">
          <div>
            <div className="flex items-center gap-2 text-brass-300">
              <LifeBuoy size={16} className="shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">
                Need help during a stay?
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
              Report issues from My Bookings.
            </h2>
          </div>
          <Link to="/account" className="btn-brass shrink-0 !rounded-full !px-6">
            Open My Bookings <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </GuestLayout>
  );
}
