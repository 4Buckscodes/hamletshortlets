import { WorkspaceTabs } from '@/components/ui';

const ACCOUNT_LINKS = [
  { href: '/account', label: 'Overview & profile', id: 'overview' },
  { href: '/account/bookings', label: 'My bookings', id: 'bookings' },
  { href: '/account/issues', label: 'Support issues', id: 'issues' },
] as const;

export function AccountNav({ current }: { current: (typeof ACCOUNT_LINKS)[number]['id'] }) {
  const active = ACCOUNT_LINKS.find(item => item.id === current)?.href ?? '/account';
  return <WorkspaceTabs label="Guest account navigation" current={active} tabs={ACCOUNT_LINKS} />;
}
