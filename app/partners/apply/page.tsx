import type { Metadata } from 'next';
import PartnerStartDashboard from '../start/page';

export const metadata: Metadata = {
  title: 'Your HAMLET Partner Dashboard',
  description: 'Start with a simple HAMLET account and complete additional checks only when needed.',
  alternates: { canonical: '/partners/start' },
};

export default function PartnerApplyPage() {
  return <PartnerStartDashboard />;
}
