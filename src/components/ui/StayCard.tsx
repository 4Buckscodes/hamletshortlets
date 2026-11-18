import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { revealProps } from './Reveal';
import { cx } from './cx';

export interface StayCardProps {
  href: string;
  /** Empty string shows the "photo coming soon" placeholder. */
  imageSrc: string;
  imageAlt: string;
  onImageError?: () => void;
  /** Caps tag over the photo, e.g. "Verified · Lekki Phase 1". */
  tag?: string;
  title: string;
  meta?: ReactNode;
  /** Guest price, already including HAMLET's fee, e.g. <StayNightlyPrice />. */
  price?: ReactNode;
  priceSuffix?: string;
  /** Position in a grid, used to stagger the reveal. Omit to disable the reveal. */
  revealIndex?: number;
  className?: string;
}

/** Stay card: 4:3 photo with caption tag, Playfair title, one meta line, all-in guest price and a round arrow. */
export function StayCard({ href, imageSrc, imageAlt, onImageError, tag, title, meta, price, priceSuffix = '/ night · fees included', revealIndex, className }: StayCardProps) {
  const reveal = revealIndex === undefined ? null : revealProps(revealIndex, 'photo');
  return (
    <Link
      href={href}
      className={cx('hm-stay-card', reveal?.className, className)}
      {...(reveal ? { 'data-hamlet-reveal': '', style: reveal.style } : {})}
    >
      <div className="hm-media">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" onError={onImageError} />
        ) : (
          <span className="hm-media-placeholder">Photo coming soon</span>
        )}
        <span className="hm-media-tint" aria-hidden="true" />
        {tag ? <span className="hm-media-tag">{tag}</span> : null}
      </div>
      <div className="hm-stay-card-body">
        <div className="hm-stay-card-text">
          <h3 className="hm-h3">{title}</h3>
          {meta ? <p className="hm-meta">{meta}</p> : null}
          {price ? (
            <p className="hm-stay-card-price">
              {price} <span>{priceSuffix}</span>
            </p>
          ) : null}
        </div>
        <span className="hm-arrow" aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export function StayGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('hm-stay-grid', className)}>{children}</div>;
}
