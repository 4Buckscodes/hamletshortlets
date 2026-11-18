'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION_MS = 600;

/**
 * Counts from 0 to `target` once, the first time the element scrolls into view.
 * Shows the target as-is on the server, under reduced motion and without IntersectionObserver.
 */
export function useCountUp<T extends HTMLElement>(target: number) {
  const ref = useRef<T | null>(null);
  const [frameValue, setFrameValue] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (
      !node ||
      !Number.isFinite(target) ||
      target === 0 ||
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    let frame = 0;
    let played = false;
    const observer = new IntersectionObserver(entries => {
      if (played || !entries.some(entry => entry.isIntersecting)) return;
      played = true;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - progress, 3);
        setFrameValue(progress < 1 ? Math.round(target * eased) : null);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target]);

  return { ref, value: frameValue ?? target };
}
