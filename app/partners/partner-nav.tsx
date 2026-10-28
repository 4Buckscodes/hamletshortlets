import Link from 'next/link';

const PARTNER_LINKS = [
  { href: '/partners', label: 'Overview', id: 'overview' },
  { href: '/partners/properties/new', label: 'Submit stay', id: 'new-property' },
  { href: '/partners/bookings', label: 'Booking requests', id: 'bookings' },
  { href: '/partners/availability', label: 'Availability', id: 'availability' },
  { href: '/partners/earnings', label: 'Earnings & referrals', id: 'earnings' },
  { href: '/partners/profile', label: 'Profile & assignments', id: 'profile' },
] as const;

export function PartnerNav({
  current,
}: {
  current: (typeof PARTNER_LINKS)[number]['id'];
}) {
  return (
    <nav
      aria-label="Partner workspace navigation"
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2"
    >
      {PARTNER_LINKS.map(item => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'primary-button page-action min-h-[42px] shrink-0 shadow-sm'
                : 'secondary-button page-action min-h-[42px] shrink-0'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
