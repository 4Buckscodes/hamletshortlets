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
      className="flex flex-wrap gap-2"
    >
      {ACCOUNT_LINKS.map(item => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={active ? 'primary-button min-h-[42px]' : 'secondary-button min-h-[42px]'}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
