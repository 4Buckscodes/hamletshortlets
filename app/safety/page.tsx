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
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import {
  buildInformationalPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Guest Safety & Booking Protection',
  description:
    'How HAMLET.REST handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution.',
  pathname: '/safety',
});

const SAFETY_PAGE_SCHEMA = buildInformationalPageSchema({
  title: 'Guest Safety & Booking Protection | HAMLET',
  description:
    'How HAMLET handles four-pillar property verification, honest status labelling, Paystack payment protection, NDPR privacy, and guest issue resolution in Lagos.',
  pathname: '/safety',
  breadcrumbName: 'Guest Safety & Booking Protection',
});

const VERIFICATION_PILLARS = [
  {
    num: '01',
    title: 'Ownership',
    body: 'Title or deed checked.',
  },
  {
    num: '02',
    title: 'Identity',
    body: 'Government ID verified.',
  },
  {
    num: '03',
    title: 'Authority to list',
    body: 'Ownership or signed mandate confirmed.',
  },
  {
    num: '04',
    title: 'Physical inspection',
    body: 'Photos, backup power, and address verified on-site.',
  },
] as const;


export default function SafetyPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-safety-jsonld" data={SAFETY_PAGE_SCHEMA} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">Safety &amp; protection</p>
            <h1 className="hm-display hm-content-title">
              Four-pillar{' '}
              <em>verification.</em>
            </h1>
          </div>
        </section>

        <div className="hm-shell hm-section-tight space-y-10">
          <section data-hamlet-reveal>
            <p className="hm-label">01 / What we check</p>
            <h2 className="hm-h2" style={{ marginTop: 10 }}>
              Four checks, <em>before it goes live.</em>
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VERIFICATION_PILLARS.map(pillar => (
                <article key={pillar.num} className="hm-card hm-card-pad flex flex-col gap-2">
                  <h3 className="hm-h3">{pillar.title}</h3>
                  <p className="hm-body">{pillar.body}</p>
                </article>
              ))}
            </div>
            <p className="hm-notice" style={{ marginTop: 18 }}>
              <BadgeCheck size={18} aria-hidden="true" />
              <span>
                Only listings that pass all four checks go live on HAMLET. The exact address and arrival guide unlock only after a confirmed, paid booking.
              </span>
            </p>
          </section>

          <section data-hamlet-reveal>
            <p className="hm-label">02 / Your money and your details</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="hm-card hm-card-pad">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 shrink-0 text-brass-700" aria-hidden="true" />
                  <h2 className="hm-h3">Payments</h2>
                </div>
                <ul className="mt-3.5 space-y-2.5">
                  {[
                    'Nothing to pay until the partner accepts your request',
                    'You pay inside your HAMLET account; the stay is confirmed only after Paystack verifies payment',
                    'The refundable caution deposit is held separately and reviewed after check-out',
                  ].map(line => (
                    <li key={line} className="hm-body flex items-start gap-2.5">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hm-card hm-card-pad">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 shrink-0 text-brass-700" aria-hidden="true" />
                  <h2 className="hm-h3">Privacy &amp; access</h2>
                </div>
                <ul className="mt-3.5 space-y-2.5">
                  {[
                    'Card details are handled by Paystack and never stored on HAMLET',
                    'Gate pins and door codes unlock only after confirmation',
                    'Identity and booking data are handled under Nigeria’s NDPR',
                  ].map(line => (
                    <li key={line} className="hm-body flex items-start gap-2.5">
                      <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section data-hamlet-reveal className="hm-card hm-card-band hm-card-pad flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="hm-label">Ready when you are</p>
              <h2 className="hm-h2" style={{ marginTop: 8, color: 'var(--hm-on-band)' }}>
                Every stay here <em>passed all four.</em>
              </h2>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Link href="/stays" className="hm-btn hm-btn-lime">
                Find a verified stay <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
              <Link href="/account/issues" className="hm-link" style={{ color: 'var(--hm-on-band)' }}>
                <LifeBuoy className="h-4 w-4 shrink-0" aria-hidden="true" /> Already booked? Report an issue
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
