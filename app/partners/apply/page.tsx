import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Your HAMLET Partner Dashboard',
  description: 'Start with a simple HAMLET account and complete additional checks only when needed.',
  alternates: { canonical: '/partners/apply' },
};

export default function PartnerApplyPage() {
  redirect('/partners/start');
}
