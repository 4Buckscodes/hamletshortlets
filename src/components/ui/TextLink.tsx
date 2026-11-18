import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from './cx';

/** Text link with the coral underline that grows on hover. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('hm-link', className)}>
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </Link>
  );
}
