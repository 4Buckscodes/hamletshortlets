import { MotionLink } from './motion';
import type { ReactNode } from 'react';
import { cx } from './cx';

/** Text link with a hairline underline that darkens on hover. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <MotionLink href={href} className={cx('hm-link', className)} whileHover={{ x: 2 }}>
      {children}
    </MotionLink>
  );
}
