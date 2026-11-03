import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  buildInformationalPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import PartnerStartDashboard from '../start/page';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'HAMLET Partner Network — List & Partner in Lagos',
  description:
    'Join the HAMLET partner network in Lagos as a property owner, authorised manager, operator, or closing agent — with transparent listing, visibility, booking, and property management services.',
  pathname: '/partners/apply',
});

const PARTNER_APPLY_SCHEMA = buildInformationalPageSchema({
  title: 'HAMLET Partner Network — List & Partner in Lagos',
  description:
    'Join the HAMLET partner network in Lagos as a property owner, authorised manager, operator, or closing agent.',
  pathname: '/partners/apply',
  breadcrumbName: 'Partner with HAMLET',
});

export default function PartnerApplyPage() {
  return (
    <>
      <JsonLd id="hamlet-partner-apply-jsonld" data={PARTNER_APPLY_SCHEMA} />
      <PartnerStartDashboard />
    </>
  );
}
