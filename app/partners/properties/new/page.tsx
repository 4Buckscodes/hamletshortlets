import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { PartnerNav } from '../../partner-nav';
import PropertySubmissionForm from './property-submission-form';

export const metadata: Metadata = {
  title: 'Submit a Lagos Property Listing',
  description:
    'Submit a Lagos shortlet listing for HAMLET review in seven short steps with photo uploads, draft saving and live pricing preview.',
  robots: { index: false, follow: false },
};

export default function NewPropertySubmissionPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="workspace-heading flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Partner Listing Wizard</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Submit a Lagos stay
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              Complete each short step at your own pace. Your progress saves automatically as a draft, and submitted properties stay private until approved by HAMLET review.
            </p>
          </div>
          <PartnerNav current="new-property" />
        </div>

        <div className="mt-8 max-w-3xl">
          <PropertySubmissionForm />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
