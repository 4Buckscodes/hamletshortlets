import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import PartnerApplicationForm from '../partner-application-form';

export const metadata: Metadata = {
  title: 'Partner Application — HAMLET.REST',
  description: 'Complete the HAMLET partner application for property owners, authorised managers, operators, closing agents and referrers.',
  alternates: { canonical: '/partners/apply/form' },
};

export default function PartnerApplyFormPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">HAMLET Partner Network · Lagos</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              List free. <span className="italic text-brass-300">Partner with clarity.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              Pricing, platform charges and any applicable partner rewards will be shown clearly before you commit. Complete the progressive application below. Every partner account is reviewed before listing or commission access is activated.
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <PartnerApplicationForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
