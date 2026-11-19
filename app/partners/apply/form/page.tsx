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
  title: 'Payout Identity Verification — HAMLET.REST',
  description:
    'Complete identity verification for HAMLET partner payouts. Your partner workspace remains active while verification is reviewed.',
  pathname: '/partners/apply/form',
});

const PARTNER_APPLICATION_FORM_SCHEMA = buildInformationalPageSchema({
  title: 'Payout Identity Verification — HAMLET',
  description:
    'Complete identity verification for HAMLET partner payouts. Your partner workspace remains active while verification is reviewed.',
  pathname: '/partners/apply/form',
  breadcrumbName: 'Payout Verification',
  parentBreadcrumbs: [{ name: 'Partner with HAMLET', path: '/partners/apply' }],
});

export default function PartnerApplyFormPage() {
  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd
        id="hamlet-partner-apply-form-jsonld"
        data={PARTNER_APPLICATION_FORM_SCHEMA}
      />
      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">HAMLET Partner Network · Lagos</p>
            <h1 className="hm-display hm-content-title">
              List with confidence. <em>Partner with clarity.</em>
            </h1>
            <p className="hm-body hm-content-intro">
              {APPROVED_OWNER_SERVICES_POLICY_COPY}
            </p>
          </div>
        </section>
        <div className="hm-shell hm-section-tight" style={{ maxWidth: 720 }}>
          <PartnerApplicationForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
