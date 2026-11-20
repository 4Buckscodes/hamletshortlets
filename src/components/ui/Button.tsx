import { MotionLink, MotionButton } from './motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'dark' | 'lime' | 'ghost' | 'quiet' | 'danger';

interface CommonProps {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  block?: boolean;
  /** Kept for compatibility; buttons no longer carry arrows. */
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
  const { variant, size, block, className, children } = props;
  const classes = buttonClassName({ variant, size, block, className });
  const content = (
    <>
      {children}
    </>
  );

  if (typeof props.href === 'string') {
    const { href, prefetch, target, rel } = props;
    return (
      <MotionLink href={href} prefetch={prefetch} target={target} rel={rel} aria-label={props['aria-label']} className={classes}>
        {content}
      </MotionLink>
    );
  }

  const native: Record<string, unknown> = { ...(props as AsButton) };
  for (const key of ['variant', 'size', 'block', 'arrow', 'className', 'children', 'href', 'type']) delete native[key];
  return (
    <MotionButton type={(props as AsButton).type ?? 'button'} className={classes} {...(native as object)}>
      {content}
    </MotionButton>
  );
}
