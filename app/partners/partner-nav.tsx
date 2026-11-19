'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useActiveTabInView } from '@/components/ui/useActiveTabInView';

export type PartnerTab =
  | 'overview'
  | 'marketing'
  | 'analytics'
  | 'bookings'
  | 'availability'
  | 'earnings'
  | 'profile'
  | 'new-property';

const ITEMS: Array<{ id: PartnerTab; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: '/partners' },
  { id: 'marketing', label: 'Share & Studio', href: '/partners/marketing' },
  { id: 'analytics', label: 'Performance', href: '/partners/analytics' },
  { id: 'bookings', label: 'Booking requests', href: '/partners/bookings' },
  { id: 'availability', label: 'Calendar', href: '/partners/availability' },
  { id: 'earnings', label: 'Earnings & referrals', href: '/partners/earnings' },
  { id: 'profile', label: 'Profile & payout', href: '/partners/profile' },
];

export function PartnerNav({
  current,
  hideNewListingAction = false,
  applicant = false,
}: {
  current: PartnerTab;
  hideNewListingAction?: boolean;
  applicant?: boolean;
}) {
  const isNewPropertyActive = current === 'new-property';

  const navRef = useActiveTabInView<HTMLElement>(current);
  const items = applicant ? ITEMS.filter(item => item.id === 'overview') : ITEMS;

  return (
    <nav ref={navRef} aria-label="Partner workspace navigation" className="hm-tabs hm-partner-tabs">
      {items.map(item => (
        <Link key={item.id} href={item.href} aria-current={item.id === current ? 'page' : undefined}>
          {item.label}
        </Link>
      ))}
      {!hideNewListingAction && (
        <Link
          href="/partners/properties/new"
          aria-current={isNewPropertyActive ? 'page' : undefined}
          className="hm-partner-tabs-add"
        >
          <Plus size={14} strokeWidth={2.75} aria-hidden="true" />
          <span>Add a new listing</span>
        </Link>
      )}
    </nav>
  );
}
