import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Understand the HAMLET.REST shortlet booking lifecycle: search approved Lagos stays, request dates, receive partner confirmation, and pay securely.',
  alternates: { canonical: '/how-it-works' },
};

const STEPS = [
  {
    num: '01',
    title: 'Explore approved Lagos stays',
    detail:
      'Filter stays across Lagos Island and Lagos Mainland by neighbourhood, dates, guest capacity, bedrooms and budget. Switch between NGN, USD and GBP anytime.',
  },
  {
    num: '02',
    title: 'Send a free booking request',
    detail:
      'Select your dates and guest count. No card payment is taken at the request stage while the property partner verifies calendar availability and house rules.',
  },
  {
    num: '03',
    title: 'Partner confirms & 48-hour payment window opens',
    detail:
      'Once the partner accepts your dates, your booking moves to Awaiting Payment with a 48-hour hold so nobody else can double-book those nights.',
  },
  {
    num: '04',
    title: 'Server-verified payment & stay support',
    detail:
      'Complete payment via Paystack from your HAMLET account. Your booking confirms only when the signed Paystack webhook is verified on our server — never from a browser redirect alone.',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-10 sm:py-14">
        <p className="eyebrow">Request → Confirm → Stay</p>
        <h1 className="serif mt-2 max-w-3xl text-4xl font-medium tracking-tight text-ink-900 sm:text-6xl">
          Booked clearly. Paid only when real.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
          Every HAMLET booking follows a transparent state machine so guests, property partners and operations always see the exact status of a stay.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {STEPS.map(step => (
            <article
              key={step.num}
              className="rounded-3xl border border-ink-100 bg-white p-6"
            >
              <span className="font-mono text-xs font-extrabold text-brass-600">
                STEP {step.num}
              </span>
              <h2 className="serif mt-2 text-2xl font-medium text-ink-900">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {step.detail}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-ink-100 bg-white p-6 sm:p-8">
          <h2 className="serif m-0 text-2xl font-medium text-ink-900">
            Booking status reference
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-2xl bg-paper p-4">
              <strong className="block text-sm text-ink-900">Requested / Checking</strong>
              <p className="m-0 mt-1 leading-relaxed text-ink-600">
                Your inquiry is with the property partner. You can cancel free of charge from My Bookings.
              </p>
            </div>
            <div className="rounded-2xl bg-paper p-4">
              <strong className="block text-sm text-ink-900">Awaiting Payment (48h)</strong>
              <p className="m-0 mt-1 leading-relaxed text-ink-600">
                Dates are held for 48 hours while you complete verified Paystack checkout. Unpaid holds expire automatically.
              </p>
            </div>
            <div className="rounded-2xl bg-paper p-4">
              <strong className="block text-sm text-ink-900">Confirmed / Completed</strong>
              <p className="m-0 mt-1 leading-relaxed text-ink-600">
                Payment is verified on HAMLET’s ledger. Support and post-stay feedback remain linked to your booking reference.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/stays" className="primary-button">
              Explore stays →
            </Link>
            <Link href="/faqs" className="secondary-button">
              Read FAQs
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
