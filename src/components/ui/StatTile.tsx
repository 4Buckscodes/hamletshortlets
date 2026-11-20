'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from './cx';
import { useCountUp } from './useCountUp';

export interface StatTileProps {
  label: ReactNode;
  /** Numbers count up on first view; strings render as-is. */
  value: number | string;
  /** Text before/after numeric values, e.g. prefix "₦". Plain strings so server pages can pass them. */
  prefix?: string;
  suffix?: string;
  /** "band" for the highlighted forest tile, "attention" when it needs action. */
  tone?: 'default' | 'band' | 'attention';
  href?: string;
  className?: string;
}

/** Workspace number tile (partner and admin overviews). */
export function StatTile({ label, value, prefix = '', suffix = '', tone = 'default', href, className }: StatTileProps) {
  const numeric = typeof value === 'number' ? value : NaN;
  const { ref, value: shown } = useCountUp<HTMLSpanElement>(numeric);
  const classes = cx('hm-card', 'hm-stat', tone === 'band' && 'hm-card-band hm-stat-band', tone === 'attention' && 'hm-stat-attention', className);
  const body = (
    <>
      <p className="hm-meta">{label}</p>
      <span ref={ref} className="hm-num hm-stat-value">
        {typeof value === 'number' ? `${prefix}${shown.toLocaleString('en-NG')}${suffix}` : value}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('hm-stat-grid', className)}>{children}</div>;
}
