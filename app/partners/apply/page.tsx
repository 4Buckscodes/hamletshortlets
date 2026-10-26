import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import PartnerApplicationForm from './partner-application-form';

export const metadata: Metadata = {
  title: 'Partner Onboarding — List, Manage or Refer Lagos Stays',
  description:
    'Apply to join HAMLET.REST as a property owner, authorised manager, shortlet operator, closing agent or partner referrer in Lagos.',
  alternates: { canonical: '/partners/apply' },
};

export default function PartnerApplyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">HAMLET Partner Network · Lagos</p>
          <h1 className="serif mt-2 text-4xl font-medium tracking-tight text-ink-900 sm:text-5xl">
            List free. Partner with clarity.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-600 sm:text-base">
            Property owners keep 100% of their base stay rate (<em>B</em>) with 0% owner fee deducted. Complete the short step-by-step application below — every partner account is reviewed before listing or commission access is activated.
          </p>

          <div className="mt-7">
            <PartnerApplicationForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
