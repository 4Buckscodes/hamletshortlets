import Link from 'next/link';

const links = [
  { href: '/admin/properties', label: 'Properties', id: 'properties' },
  { href: '/admin/bookings', label: 'Bookings', id: 'bookings' },
  { href: '/admin/partners', label: 'Partners', id: 'partners' },
  { href: '/admin/issues', label: 'Issues', id: 'issues' },
  { href: '/admin/settlements', label: 'Settlements', id: 'settlements' },
] as const;

export default function AdminNav({ current }: { current: (typeof links)[number]['id'] }) {
  return <nav aria-label="Admin workspace" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {links.map((item) => <Link key={item.id} href={item.href} aria-current={current === item.id ? 'page' : undefined} className={current === item.id ? 'primary-button' : 'secondary-button'} style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{item.label}</Link>)}
  </nav>;
}
