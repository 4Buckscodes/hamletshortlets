import Link from 'next/link';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview', id: 'overview' },
  { href: '/admin/properties', label: 'Property review', id: 'properties' },
  { href: '/admin/partners', label: 'Partner queue', id: 'partners' },
  { href: '/admin/bookings', label: 'Bookings', id: 'bookings' },
  { href: '/admin/issues', label: 'Issues', id: 'issues' },
  { href: '/admin/settlements', label: 'Ledger & caution', id: 'settlements' },
  { href: '/admin/accounts', label: 'Accounts', id: 'accounts' },
  { href: '/admin/audit', label: 'Audit log', id: 'audit' },
] as const;

export function AdminNav({
  current,
}: {
  current: (typeof ADMIN_LINKS)[number]['id'];
}) {
  return (
    <nav
      aria-label="Administrator navigation"
      className="flex flex-wrap gap-2"
    >
      {ADMIN_LINKS.map(item => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'primary-button min-h-[40px] px-4 text-xs'
                : 'secondary-button min-h-[40px] px-4 text-xs'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
