import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

/** Delay between grid items in a staggered reveal; items stagger across at most three columns. */
export const REVEAL_STAGGER_MS = 80;

export function revealProps(index = 0, kind: 'rise' | 'photo' = 'rise') {
  const style = { '--hm-reveal-delay': `${(index % 3) * REVEAL_STAGGER_MS}ms` } as CSSProperties;
  return {
    'data-hamlet-reveal': '',
    className: cx('hm-reveal', kind === 'photo' && 'hm-reveal-photo'),
    style,
  };
}

/**
 * Scroll reveal wrapper. Uses the existing GlobalMotion observer (data-hamlet-reveal),
 * so content stays visible without JavaScript and is static under reduced motion.
 */
export function Reveal({ index = 0, kind = 'rise', className, children, ...rest }: { index?: number; kind?: 'rise' | 'photo'; className?: string; children: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'className'>) {
  const props = revealProps(index, kind);
  return (
    <div {...rest} data-hamlet-reveal="" className={cx(props.className, className)} style={{ ...props.style, ...rest.style }}>
      {children}
    </div>
  );
}
