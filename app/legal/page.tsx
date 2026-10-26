import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'Legal, Privacy & Marketplace Terms',
  description:
    'Terms of use, Nigeria Data Protection Regulation (NDPR) privacy notice, pricing & caution deposit policies, and partner terms for HAMLET.REST.',
  alternates: { canonical: '/legal' },
};

export default function LegalPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-ink-800 bg-ink-950 text-paper">
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
          <section id="terms" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              1. Marketplace role &amp; booking confirmation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              HAMLET.REST facilitates shortlet discovery, partner date confirmation, and audited payment tracking in Lagos. Submitting a booking request does not create a confirmed reservation until (a) the authorised property partner accepts the requested dates and (b) full stay payment is verified on HAMLET’s server via signed payment provider webhook.
            </p>
          </section>

          <section id="verification" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              2. Listing review &amp; verification labels
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Partners must hold lawful ownership or documented authority to list every submitted property. HAMLET tracks four distinct review pillars — Ownership/Title, Identity, Authority to List, and Physical Inspection — and displays each pillar’s recorded status honestly. Self-reported partner declarations are never represented as independently verified until reviewed by HAMLET operations.
            </p>
          </section>

          <section id="pricing" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              3. Pricing, FX quotes, cancellations &amp; caution deposits
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
              <li>
                <strong>Domestic stay pricing:</strong> Property owners set their base accommodation price (<em>B</em>) in NGN with 0% owner fee deducted from <em>B</em>. Guest-facing domestic accommodation pricing reflects the platform’s active markup rules plus any stated mandatory cleaning/turnover fee.
              </li>
              <li>
                <strong>USD &amp; GBP quotes:</strong> Foreign-currency quotes convert the domestic guest stay total using HAMLET’s active reference rate and apply a single 10% international FX buffer with a 30-minute quote validity window.
              </li>
              <li>
                <strong>Refundable caution deposits:</strong> Itemised separately with 0% markup and 0% FX buffer. Any post-stay deduction requires documented inspection notes and evidence logged on the caution deposit record.
              </li>
              <li>
                <strong>Unpaid holds &amp; cancellations:</strong> Accepted requests hold dates for 48 hours awaiting payment before expiring automatically. Guests may cancel pending or unpaid requests directly from their account; post-payment cancellations and refunds follow the listing’s cancellation terms and documented ledger reconciliation.
              </li>
            </ul>
          </section>

          <section id="privacy" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              4. Privacy &amp; NDPR notice
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              In line with the Nigeria Data Protection Act / NDPR principles, HAMLET collects only the account, contact, booking, listing verification, and audit information needed to operate stays, prevent fraud, and resolve disputes. Payment card credentials are handled directly by Paystack and are never stored on HAMLET servers. Access to private verification records, booking rows, and support issues is restricted by database Row-Level Security (RLS) to the relevant guest, authorised property partner, and HAMLET administrators.
            </p>
          </section>

          <section id="partners" className="card p-6">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              5. Partner, closing agent &amp; referral terms
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Partner accounts require administrative review and approval. Closing agent commissions and direct partner referral rewards accrue only on completed, non-refunded bookings attributed under active platform rules (including self-referral prevention and the 90-day referral window). Administrative ledger statuses record reconciliation state and do not represent automated bank transfers.
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
