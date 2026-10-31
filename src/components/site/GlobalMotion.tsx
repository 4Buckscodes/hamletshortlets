'use client';

import { useEffect } from 'react';

/**
 * Progressive section reveals for the public experience.
 * Only opt-in elements carrying data-hamlet-reveal are animated; content remains
 * visible without JavaScript, with unsupported observers, and for reduced motion.
 */
export function GlobalMotion() {
  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-hamlet-reveal]'),
    );

    if (
      nodes.length === 0 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    document.documentElement.classList.add('hamlet-motion-ready');

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          node.dataset.revealed = 'true';
          observer.unobserve(node);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );

    nodes.forEach(node => observer.observe(node));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('hamlet-motion-ready');
    };
  }, []);

  return null;
}
