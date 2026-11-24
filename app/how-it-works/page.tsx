import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  buildInformationalPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'How HAMLET Works — Book a Lagos Shortlet',
  description:
    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET.REST — with upfront pricing and server-verified Paystack checkout.',
  pathname: '/how-it-works',
});

const HOW_IT_WORKS_SCHEMA = buildInformationalPageSchema({
  title: 'How HAMLET Works — Booking Shortlets Made Clear',
  description:
    'Four clear steps to find, request, confirm, and check into a verified Lagos shortlet on HAMLET — with upfront pricing and server-verified Paystack checkout.',
  pathname: '/how-it-works',
  breadcrumbName: 'How HAMLET Works',
});

const STEPS = [
  {
    title: 'Request the stay',
    body: 'Pick your dates and guests and send a request. Nothing is charged at this point.',
    status: 'Request sent: waiting for the partner',
  },
  {
    title: 'The partner confirms',
    body: 'The partner checks the dates and accepts. That opens a 48-hour window for you to pay.',
    status: 'Accepted: pay within 48 hours',
  },
  {
    title: 'Pay inside your account',
    body: 'Pay securely with Paystack from your HAMLET account. The stay is confirmed once Paystack verifies the payment.',
    status: 'Confirmed: payment verified',
  },
  {
    title: 'Arrive and enjoy',
    body: 'The exact address and arrival guide unlock in your account. The caution deposit is returned after the check-out inspection.',
    status: 'Completed: deposit reviewed',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-how-it-works-jsonld" data={HOW_IT_WORKS_SCHEMA} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">How it works</p>
            <h1 className="hm-display hm-content-title">
              Booked clearly.{' '}
              <em>Paid only when confirmed.</em>
            </h1>
          </div>
        </section>

        <div className="hm-shell hm-section-tight space-y-10">
          <section data-hamlet-reveal>
            <p className="hm-label">Four steps</p>
            <h2 className="hm-h2" style={{ marginTop: 10 }}>
              From request <em>to front door.</em>
            </h2>
            <ol className="hm-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="hm-step">
                  <span className="hm-step-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="hm-h3">{step.title}</h3>
                    <p className="hm-body">{step.body}</p>
                    <span className="hm-status hm-status-neutral" style={{ marginTop: 10 }}>{step.status}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section data-hamlet-reveal className="hm-pay-box">
            <p className="hm-label">What you&apos;ll pay</p>
            <ul>
              <li><strong>The nightly price already includes HAMLET&apos;s 20% service fee.</strong> No fee is added at checkout.</li>
              <li>Cleaning and turnover, when a stay has one, is shown as its own line before you request.</li>
              <li>The refundable caution deposit is itemised separately and returned after the check-out inspection.</li>
              <li>Booking from abroad? Prices can be shown in USD or GBP with a 10% exchange buffer; you are charged in naira, and your bank may add its own card fee.</li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/stays" className="hm-btn hm-btn-primary">
              Find a verified stay <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/faqs" className="hm-link">Read the FAQs</Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
