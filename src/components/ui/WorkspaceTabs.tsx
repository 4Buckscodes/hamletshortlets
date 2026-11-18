import Link from 'next/link';
import { cx } from './cx';

export interface WorkspaceTab {
  href: string;
  label: string;
}

/** Pill tabs inside a PageBand. Wrap on desktop; one swipeable row with a fade edge on phones. */
export function WorkspaceTabs({ tabs, current, label, className }: { tabs: readonly WorkspaceTab[]; current: string; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cx('hm-tabs', className)}>
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? 'page' : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
