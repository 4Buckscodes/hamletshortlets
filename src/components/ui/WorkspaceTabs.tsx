'use client';

import Link from 'next/link';
import { cx } from './cx';
import { useActiveTabInView } from './useActiveTabInView';

export interface WorkspaceTab {
  href: string;
  label: string;
}

/** Pill tabs inside a PageBand. Wrap on desktop; one swipeable row with a fade edge on phones, scrolled to the current tab. */
export function WorkspaceTabs({ tabs, current, label, className }: { tabs: readonly WorkspaceTab[]; current: string; label: string; className?: string }) {
  const ref = useActiveTabInView<HTMLElement>(current);
  return (
    <nav ref={ref} aria-label={label} className={cx('hm-tabs', className)}>
      {tabs.map(tab => (
        <Link key={tab.href} href={tab.href} aria-current={tab.href === current ? 'page' : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
