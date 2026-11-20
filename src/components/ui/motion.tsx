'use client';

import Link from 'next/link';
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';

const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Loads Motion's small DOM feature set once and makes every animation honour prefers-reduced-motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: EASE }}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

const MotionNextLink = m.create(Link);

/** Hover and press feedback shared by buttons, chips and links: 200ms, a few percent of movement at most. */
export const pressable = { whileHover: { scale: 1.015 }, whileTap: { scale: 0.975 }, transition: { duration: 0.2, ease: EASE } } as const;
export const liftable = { whileHover: { y: -1 }, whileTap: { scale: 0.97 }, transition: { duration: 0.2, ease: EASE } } as const;

export function MotionLink(props: ComponentProps<typeof MotionNextLink>) {
  return <MotionNextLink {...pressable} {...props} />;
}

export function MotionButton(props: ComponentProps<typeof m.button>) {
  return <m.button {...pressable} {...props} />;
}

/** Wraps a photo so it eases up a few percent while its card is hovered or focused. */
export function HoverImage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} initial="rest" whileHover="hover" variants={{ rest: { scale: 1 }, hover: { scale: 1.035 } }} transition={{ duration: 0.4, ease: EASE }} style={{ width: '100%', height: '100%' }}>
      {children}
    </m.div>
  );
}

export { m };
