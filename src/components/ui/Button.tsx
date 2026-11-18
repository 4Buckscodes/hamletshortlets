import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'dark' | 'lime' | 'ghost' | 'quiet' | 'danger';

interface CommonProps {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  /** Adds the trailing arrow that nudges forward on hover. */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

type AsLink = CommonProps & { href: string; prefetch?: boolean; target?: string; rel?: string; 'aria-label'?: string };
type AsButton = CommonProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;

export type ButtonProps = AsLink | AsButton;

export function buttonClassName({ variant = 'primary', size = 'md', block, className }: Pick<CommonProps, 'variant' | 'size' | 'block' | 'className'>) {
  return cx('hm-btn', `hm-btn-${variant}`, size === 'sm' && 'hm-btn-sm', block && 'hm-btn-block', className);
}

/** HAMLET button. Renders a Next.js link when `href` is given, otherwise a native button. */
export function Button(props: ButtonProps) {
  const { variant, size, block, arrow, className, children } = props;
  const classes = buttonClassName({ variant, size, block, className });
  const content = (
    <>
      {children}
      {arrow ? <ArrowRight size={16} aria-hidden="true" /> : null}
    </>
  );

  if (typeof props.href === 'string') {
    const { href, prefetch, target, rel } = props;
    return (
      <Link href={href} prefetch={prefetch} target={target} rel={rel} aria-label={props['aria-label']} className={classes}>
        {content}
      </Link>
    );
  }

  const native: Record<string, unknown> = { ...(props as AsButton) };
  for (const key of ['variant', 'size', 'block', 'arrow', 'className', 'children', 'href', 'type']) delete native[key];
  return (
    <button type={(props as AsButton).type ?? 'button'} className={classes} {...native}>
      {content}
    </button>
  );
}
