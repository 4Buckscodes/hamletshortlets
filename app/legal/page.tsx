import Link from 'next/link';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { APPROVED_OWNER_SERVICES_POLICY_COPY } from '@/lib/pricing';
import {
  buildInformationalPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Legal, Privacy & Marketplace Terms',
  description:
    'Terms of use, Nigeria Data Protection Regulation (NDPR) privacy notice, pricing & caution deposit policies, and partner terms for HAMLET.REST.',
  pathname: '/legal',
});

const LEGAL_PAGE_SCHEMA = buildInformationalPageSchema({
  title: 'Legal, Privacy & Marketplace Terms | HAMLET',
  description:
    'Terms of use, Nigeria Data Protection Regulation (NDPR) privacy notice, pricing & caution deposit policies, and partner terms for HAMLET in Lagos.',
  pathname: '/legal',
  breadcrumbName: 'Legal, Privacy & Marketplace Terms',
});

export default function LegalPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <JsonLd id="hamlet-legal-jsonld" data={LEGAL_PAGE_SCHEMA} />

      <main className="flex-1">
        <section data-hamlet-reveal className="border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">Legal &amp; Policies · Abundance Abodes</p>
            <h1 className="mt-2.5 font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              Marketplace terms, privacy &amp;{' '}
              <span className="italic text-brass-300">NDPR disclosures.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              Effective October 2026 · Operated by Abundance Abodes (Lagos, Nigeria).
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6 sm:py-14">
          <section data-hamlet-reveal id="terms" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              1. Marketplace role &amp; booking confirmation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              HAMLET.REST connects guests with verified Lagos shortlet partners. A booking is confirmed only after the partner accepts the requested dates and full stay payment is verified via Paystack.
            </p>
          </section>

          <section data-hamlet-reveal id="verification" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              2. Listing review &amp; verification
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Partners must hold ownership or documented authority for every submitted property. HAMLET records four pillars — Ownership, Identity, Authority to List, and Physical Inspection — and labels unreviewed declarations honestly until verified.
            </p>
          </section>

          <section data-hamlet-reveal id="pricing" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              3. Pricing, FX quotes, cancellations &amp; caution deposits
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
              <li>
                <strong>Domestic stay pricing:</strong> Displayed NGN stay prices include the owner’s agreed rate plus HAMLET’s 20% guest service fee upfront and any stated cleaning charge.
              </li>
              <li>
                <strong>USD &amp; GBP quotes:</strong> International quotes convert at HAMLET’s active reference rate plus a single 10% FX buffer (30-minute quote validity) and settle in NGN via Paystack.
              </li>
              <li>
                <strong>Refundable caution deposits:</strong> Itemised separately with no service fee or FX buffer, and released after post-checkout inspection.
              </li>
              <li>
                <strong>Holds &amp; cancellations:</strong> Accepted requests hold dates for 48 hours awaiting payment. Unpaid requests can be cancelled free of charge; paid bookings follow the listing’s cancellation terms.
              </li>
            </ul>
          </section>

          <section data-hamlet-reveal id="privacy" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              4. Privacy &amp; NDPR notice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Under Nigeria Data Protection Act / NDPR principles, HAMLET collects only the account, booking, and verification data required to operate stays and resolve disputes. Card details are processed by Paystack and never stored on HAMLET. Private records are restricted to the guest, authorised partner, and HAMLET administrators. Contact <strong>hello@hamlet.rest</strong> for data requests.
            </p>
          </section>

          <section data-hamlet-reveal id="partners" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              5. Owner services, partner &amp; referral terms
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {APPROVED_OWNER_SERVICES_POLICY_COPY}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Closing agent commissions and 90-day recurring partner referral rewards accrue only on completed, non-refunded bookings attributed under active platform rules.
            </p>
          </section>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link href="/safety" className="secondary-button">
              Trust &amp; safety overview
            </Link>
            <Link href="/stays" className="primary-button">
              Explore Lagos stays
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
