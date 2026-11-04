'use client';

import Link from 'next/link';

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

export function PartnerNav({ current }: { current: PartnerTab }) {
  return (
    <nav aria-label="Partner workspace navigation" className="flex flex-wrap gap-2">
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
