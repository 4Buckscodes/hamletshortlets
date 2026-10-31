import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Guest Safety & Booking Protection',
  description:
    'How HAMLET.REST handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution.',
  alternates: { canonical: '/safety' },
};

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

const HONEST_STATUSES = [
  {
    label: 'Verified by HAMLET',
    code: 'verified',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    desc: 'Evidence reviewed and recorded by HAMLET operations.',
  },
  {
    label: 'Self-reported',
    code: 'self_reported',
    cls: 'border-ink-200 bg-white text-ink-800',
    desc: 'Declared by the partner; awaiting independent review.',
  },
  {
    label: 'Pending review',
    code: 'pending_review',
    cls: 'border-brass-300 bg-brass-200/40 text-brass-700',
    desc: 'Submitted by the partner and currently in the review queue.',
  },
  {
    label: 'Not yet provided',
    code: 'missing',
    cls: 'border-ink-200 bg-ink-50 text-ink-500',
    desc: 'Evidence has not yet been supplied for this pillar.',
  },
] as const;

export default function SafetyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section data-hamlet-reveal className="border-b border-ink-800 bg-ink-950 text-paper">
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
          <section data-hamlet-reveal>
            <p className="eyebrow">Recorded per listing</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 sm:text-3xl">
              What we check
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VERIFICATION_PILLARS.map(pillar => (
                <article key={pillar.num} className="card flex flex-col p-6">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-brass-600">
                    {pillar.num}
                  </span>
                  <h3 className="mt-2.5 font-display text-xl font-bold text-ink-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                    {pillar.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section data-hamlet-reveal className="rounded-3xl border border-ink-200 bg-white p-6">
            <p className="eyebrow">Honest status labelling</p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink-900 sm:text-2xl">
              Verified vs. self-reported badges
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HONEST_STATUSES.map(item => (
                <div
                  key={item.code}
                  className="rounded-2xl border border-ink-100 bg-paper/75 p-4"
                >
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.cls}`}
                  >
                    {item.code === 'verified' && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {item.label}
                  </span>
                  <p className="mt-2.5 text-xs font-medium leading-relaxed text-ink-700">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section data-hamlet-reveal className="card p-6">
              <div className="flex items-center gap-2 text-ink-900">
                <CreditCard className="h-5 w-5 shrink-0 text-brass-600" />
                <h2 className="font-display text-xl font-bold">Payments</h2>
              </div>
              <ul className="mt-3.5 space-y-2.5 text-sm text-ink-700">
                {[
                  'Pay only inside your HAMLET account after dates are confirmed',
                  'Bookings confirm via Paystack’s server-side webhook — never screenshots',
                  'Caution deposits are tracked separately and reviewed post-checkout',
                ].map(line => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section data-hamlet-reveal className="card p-6">
              <div className="flex items-center gap-2 text-ink-900">
                <Lock className="h-5 w-5 shrink-0 text-brass-600" />
                <h2 className="font-display text-xl font-bold">Privacy &amp; access</h2>
              </div>
              <ul className="mt-3.5 space-y-2.5 text-sm text-ink-700">
                {[
                  'Card details stay with Paystack — never stored on HAMLET',
                  'Exact gate pins and door codes unlock only after confirmation',
                  'NDPR-aligned access controls protect identity and booking records',
                ].map(line => (
                  <li key={line} className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section data-hamlet-reveal className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink-950 p-6 text-paper sm:flex-row sm:items-center sm:p-8">
            <div>
              <div className="flex items-center gap-2 text-brass-300">
                <LifeBuoy className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">
                  Need help during a stay?
                </span>
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-white">
                Report issues directly from your booking record.
              </h2>
            </div>
            <Link href="/account/issues" className="btn-brass shrink-0 !rounded-full !px-6">
              Report an issue <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
