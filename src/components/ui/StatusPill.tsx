import type { ReactNode } from 'react';
import { cx } from './cx';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

/** Status label on a soft tint. "warn" and "info" (waiting on someone) breathe gently. */
export function StatusPill({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return <span className={cx('hm-status', `hm-status-${tone}`, className)}>{children}</span>;
}
