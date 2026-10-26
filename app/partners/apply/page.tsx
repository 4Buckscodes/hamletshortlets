import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import PartnerApplicationForm from './partner-application-form';

export const metadata: Metadata = {
  title: 'Partner Onboarding — List, Manage or Refer Lagos Stays',
  description:
    'Apply to join HAMLET.REST as a property owner, authorised manager, shortlet operator, closing agent or partner referrer in Lagos.',
  alternates: { canonical: '/partners/apply' },
};

const ECONOMICS = [
  { stat: '100%', label: 'Owner share of base rate B (0% owner fee)' },
  { stat: '10%', label: 'Closing agent commission on attributed B' },
  { stat: '2.5%', label: 'Direct referrer reward (90-day window)' },
] as const;

export default function PartnerApplyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">HAMLET Partner Network · Lagos</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              List free.{' '}
              <span className="italic text-brass-300">Partner with clarity.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              Property owners keep 100% of their listed stay rate (<em>B</em>). Complete the short progressive application below — every partner account is reviewed before listing or commission access is activated.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ECONOMICS.map(item => (
                <div
                  key={item.stat}
                  className="rounded-2xl border border-white/15 bg-ink-900/90 p-4"
                >
                  <p className="font-mono text-2xl font-black text-brass-300">{item.stat}</p>
                  <p className="mt-1 text-xs font-medium text-ink-200">{item.label}</p>
                </div>
              ))}
            </div>
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
