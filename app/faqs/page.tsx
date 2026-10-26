import Link from 'next/link';
import type { Metadata } from 'next';
import { buildFaqStructuredData } from '@/lib/seo';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Clear answers about Lagos shortlet booking requests, pricing, USD/GBP currency quotes, caution deposits, cancellations and partner onboarding on HAMLET.REST.',
  alternates: { canonical: '/faqs' },
};

const FAQS = [
  {
    q: '1. Is every booking on HAMLET instantly confirmed?',
    a: 'No. Sending a booking request asks the property partner to confirm calendar availability and stay terms first. No card payment is taken until the partner accepts your dates.',
  },
  {
    q: '2. Does filtering by dates guarantee live availability?',
    a: 'Filtering removes stays with recorded calendar blocks or active holds in HAMLET, but properties may also be managed across external channels. Partner confirmation is always required.',
  },
  {
    q: '3. How does stay pricing and currency switching work?',
    a: 'Property cards and stay summaries show the guest-facing stay rate in NGN, USD, or GBP. USD and GBP quotes convert the domestic NGN stay total using the active reference rate and apply a single 10% international FX buffer (valid for 30 minutes).',
  },
  {
    q: '4. How are refundable caution deposits handled?',
    a: 'Refundable caution deposits are itemised separately from your accommodation price. HAMLET applies 0% markup and 0% international FX buffer to caution deposits, and release or documented deductions follow post-checkout inspection.',
  },
  {
    q: '5. When is my booking officially confirmed?',
    a: 'Only after the property partner accepts your request and HAMLET verifies the signed Paystack payment webhook on the server. Returning from a browser redirect alone does not mark a booking paid.',
  },
  {
    q: '6. Which cities does HAMLET currently cover?',
    a: 'HAMLET is currently focused on Lagos, covering both Lagos Island & Lekki (Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Ajah) and Lagos Mainland (Yaba, Shomolu, Surulere, Gbagada, Maryland, Ilupeju, Ikeja GRA and Magodo).',
  },
  {
    q: '7. What if the apartment is not as described or I cannot check in?',
    a: 'Sign in and open Report a Booking Issue under your account. Select your booking reference, choose the urgency level (including Critical for immediate access or safety problems), and submit details so HAMLET operations can intervene.',
  },
  {
    q: '8. How do owners, managers, closing agents and referrers join HAMLET?',
    a: 'Create a free account and complete the short step-by-step Partner Application. Property owners list with 0% owner fee deducted from their base rate B; approved partners gain access after HAMLET review.',
  },
] as const;

export default function FaqsPage() {
  const faqSchema = buildFaqStructuredData([...FAQS]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="shell flex-1 py-10 sm:py-14">
        <p className="eyebrow">Guest & Partner Help</p>
        <h1 className="serif mt-2 max-w-3xl text-4xl font-medium tracking-tight text-ink-900 sm:text-6xl">
          Frequently asked questions.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600">
          Plain-language answers on how booking requests, pricing, caution deposits, verification and partner onboarding work on HAMLET.REST.
        </p>

        <div className="mt-8 max-w-3xl space-y-3">
          {FAQS.map(item => (
            <details
              key={item.q}
              className="group rounded-2xl border border-ink-100 bg-white px-5 py-4"
            >
              <summary className="flex min-h-[36px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-ink-900 sm:text-base">
                <span>{item.q}</span>
                <span className="text-lg font-normal text-brass-600 group-open:rotate-45 transition">
                  +
                </span>
              </summary>
              <p className="mt-3 mb-0 border-t border-ink-100 pt-3 text-sm leading-relaxed text-ink-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/stays" className="primary-button">
            Explore Lagos stays
          </Link>
          <Link href="/account/issues" className="secondary-button">
            Report a booking issue
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
