import { WorkspaceTabs } from '@/components/ui';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview', id: 'overview' },
  { href: '/admin/communications', label: 'Communications', id: 'communications' },
  { href: '/admin/properties', label: 'Property review', id: 'properties' },
  { href: '/admin/partners', label: 'Partner queue', id: 'partners' },
  { href: '/admin/partners/network', label: 'Partner network', id: 'network' },
  { href: '/admin/bookings', label: 'Bookings', id: 'bookings' },
  { href: '/admin/issues', label: 'Issues', id: 'issues' },
  { href: '/admin/settlements', label: 'Ledger & caution', id: 'settlements' },
  { href: '/admin/accounts', label: 'Accounts', id: 'accounts' },
  { href: '/admin/audit', label: 'Audit log', id: 'audit' },
] as const;

export function AdminNav({ current }: { current: (typeof ADMIN_LINKS)[number]['id'] }) {
  const active = ADMIN_LINKS.find(item => item.id === current)?.href ?? '/admin';
  return <WorkspaceTabs label="Administrator navigation" current={active} tabs={ADMIN_LINKS} />;
}
