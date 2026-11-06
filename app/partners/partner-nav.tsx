'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

export type PartnerTab =
  | 'overview'
  | 'deals'
  | 'marketing'
  | 'analytics'
  | 'bookings'
  | 'availability'
  | 'earnings'
  | 'profile'
  | 'new-property';

const ITEMS: Array<{ id: PartnerTab; label: string; href: string }> = [
  { id: 'overview', label: 'Overview', href: '/partners' },
  { id: 'deals', label: 'Deal Board', href: '/partners/deals' },
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
}: {
  current: PartnerTab;
  hideNewListingAction?: boolean;
}) {
  const isNewPropertyActive = current === 'new-property';

  return (
    <nav aria-label="Partner workspace navigation" className="flex flex-wrap gap-2">
      {!hideNewListingAction && (
        <Link
          href="/partners/properties/new"
          aria-current={isNewPropertyActive ? 'page' : undefined}
          className={
            isNewPropertyActive
              ? 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-ink-950 px-4 text-xs font-extrabold text-white'
              : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-brass-400/80 bg-ink-900 px-4 text-xs font-extrabold text-white shadow-2xs transition hover:border-brass-400 hover:bg-ink-800'
          }
        >
          <Plus className="h-3.5 w-3.5 shrink-0 text-brass-400 stroke-[2.75]" />
          <span>Add a new listing</span>
        </Link>
      )}
      {ITEMS.map(item => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'inline-flex min-h-[40px] items-center rounded-full bg-ink-950 px-4 text-xs font-bold text-white'
                : 'inline-flex min-h-[40px] items-center rounded-full border border-ink-200 bg-white px-4 text-xs font-bold text-ink-800 transition hover:border-ink-900'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
