import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { APPROVED_OWNER_SERVICES_POLICY_COPY } from '@/lib/pricing';
import {
  buildInformationalPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import PartnerApplicationForm from '../partner-application-form';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Partner Application — HAMLET.REST',
  description:
    'Complete the HAMLET partner application for property owners, authorised managers, operators, and closing agents in Lagos.',
  pathname: '/partners/apply/form',
});

const PARTNER_APPLICATION_FORM_SCHEMA = buildInformationalPageSchema({
  title: 'Partner Application — HAMLET',
  description:
    'Complete the HAMLET partner application for property owners, authorised managers, operators, and closing agents in Lagos.',
  pathname: '/partners/apply/form',
  breadcrumbName: 'Partner Application Form',
  parentBreadcrumbs: [{ name: 'Partner with HAMLET', path: '/partners/apply' }],
});

export default function PartnerApplyFormPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <JsonLd
        id="hamlet-partner-apply-form-jsonld"
        data={PARTNER_APPLICATION_FORM_SCHEMA}
      />
      <main className="flex-1">
        <section className="border-b border-ink-800 bg-ink-950 text-paper">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <p className="eyebrow-light">HAMLET Partner Network · Lagos</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-4xl font-bold leading-[1.06] text-white sm:text-5xl">
              List with confidence. <span className="italic text-brass-300">Partner with clarity.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              {APPROVED_OWNER_SERVICES_POLICY_COPY}
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
