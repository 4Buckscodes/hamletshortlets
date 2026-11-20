import { MotionLink, MotionButton, liftable } from './motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

type ChipProps =
  | ({ href: string; active?: boolean; children: ReactNode; className?: string })
  | ({ href?: undefined; pressed?: boolean; children: ReactNode; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>);

/** Filter / toggle chip. As a link it marks the active filter with aria-current; as a button it is a toggle with aria-pressed. */
export function Chip(props: ChipProps) {
  if (typeof props.href === 'string') {
    return (
      <MotionLink href={props.href} {...liftable} className={cx('hm-chip', props.className)} aria-current={props.active ? 'true' : undefined}>
        {props.children}
      </MotionLink>
    );
  }
  const { pressed, children, className, type, ...rest } = props;
  return (
    <MotionButton type={type ?? 'button'} {...liftable} className={cx('hm-chip', className)} aria-pressed={pressed === undefined ? undefined : pressed} {...(rest as object)}>
      {children}
    </MotionButton>
  );
}

export function ChipRow({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cx('hm-chip-row', className)}>
      {children}
    </div>
  );
}
