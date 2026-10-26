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

      <main className="shell flex-1 py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="eyebrow">Legal & Policies · Abundance Abodes</p>
          <h1 className="serif mt-2 text-4xl font-medium tracking-tight text-ink-900 sm:text-5xl">
            Marketplace terms, privacy & pricing disclosures
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Effective date: October 2026 · Operated by Abundance Abodes (Lagos, Nigeria). These plain-language policies govern guest booking requests, partner listings, data handling, and payment verification on HAMLET.REST.
          </p>

          <div className="mt-8 space-y-6">
            <section id="terms" className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                1. Marketplace role & booking confirmation
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                HAMLET.REST facilitates shortlet discovery, partner date confirmation, and audited payment tracking in Lagos. Submitting a booking request does not create a confirmed reservation until (a) the authorised property partner accepts the requested dates and (b) full stay payment is verified on HAMLET’s server via signed payment provider webhook.
              </p>
            </section>

            <section id="verification" className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                2. Listing review & verification labels
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Partners must hold lawful ownership or documented authority to list every submitted property. HAMLET tracks four distinct review pillars — Ownership/Title, Identity, Authority to List, and Physical Inspection — and displays each pillar’s recorded status honestly. Self-reported partner declarations are never represented as independently verified until reviewed by HAMLET operations.
              </p>
            </section>

            <section id="pricing" className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                3. Pricing, FX quotes, cancellations & caution deposits
              </h2>
              <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
                <li>
                  <strong>Domestic stay pricing:</strong> Property owners set their base accommodation price (<em>B</em>) in NGN with 0% owner fee deducted from <em>B</em>. Guest-facing domestic accommodation pricing reflects the platform’s active markup rules plus any stated mandatory cleaning/turnover fee.
                </li>
                <li>
                  <strong>USD & GBP quotes:</strong> Foreign-currency quotes convert the domestic guest stay total using HAMLET’s active reference rate and apply a single 10% international FX buffer with a 30-minute quote validity window.
                </li>
                <li>
                  <strong>Refundable caution deposits:</strong> Itemised separately with 0% markup and 0% FX buffer. Any post-stay deduction requires documented inspection notes and evidence logged on the caution deposit record.
                </li>
                <li>
                  <strong>Unpaid holds & cancellations:</strong> Accepted requests hold dates for 48 hours awaiting payment before expiring automatically. Guests may cancel pending or unpaid requests directly from their account; post-payment cancellations and refunds follow the listing’s cancellation terms and documented ledger reconciliation.
                </li>
              </ul>
            </section>

            <section id="privacy" className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                4. Privacy & NDPR notice
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                In line with the Nigeria Data Protection Act / NDPR principles, HAMLET collects only the account, contact, booking, listing verification, and audit information needed to operate stays, prevent fraud, and resolve disputes. Payment card credentials are handled directly by Paystack and are never stored on HAMLET servers. Access to private verification records, booking rows, and support issues is restricted by database Row-Level Security (RLS) to the relevant guest, authorised property partner, and HAMLET administrators.
              </p>
            </section>

            <section id="partners" className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                5. Partner, closing agent & referral terms
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Partner accounts require administrative review and approval. Closing agent commissions and direct partner referral rewards accrue only on completed, non-refunded bookings attributed under active platform rules (including self-referral prevention and the 90-day referral window). Administrative ledger statuses record reconciliation state and do not represent automated bank transfers.
              </p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/safety" className="secondary-button">
              Trust & safety overview
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
