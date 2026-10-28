import Link from 'next/link';

const ACCOUNT_LINKS = [
  { href: '/account', label: 'Overview & profile', id: 'overview' },
  { href: '/account/bookings', label: 'My bookings', id: 'bookings' },
  { href: '/account/issues', label: 'Support issues', id: 'issues' },
] as const;

export function AccountNav({
  current,
}: {
  current: (typeof ACCOUNT_LINKS)[number]['id'];
}) {
  return (
    <nav
      aria-label="Guest account navigation"
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2"
    >
      {ACCOUNT_LINKS.map(item => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={active ? 'primary-button page-action min-h-[42px] shrink-0 shadow-sm' : 'secondary-button page-action min-h-[42px] shrink-0'}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
