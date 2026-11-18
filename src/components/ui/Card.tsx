import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type CardElement = 'div' | 'article' | 'section' | 'aside' | 'li';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  as?: CardElement;
  /** Forest card for highlights (earnings, share prompts). Becomes a raised card in dark mode. */
  tone?: 'surface' | 'band';
  padded?: boolean;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ as: Tag = 'div', tone = 'surface', padded = true, interactive, className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('hm-card', tone === 'band' && 'hm-card-band', padded && 'hm-card-pad', interactive && 'hm-card-interactive', className)} {...rest}>
      {children}
    </Tag>
  );
}
