'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR = '[data-hamlet-reveal]';

/**
 * Progressive section reveals for the public experience.
 * Observes initial content and content added during client-side navigation.
 * Content remains visible when JavaScript or IntersectionObserver is unavailable,
 * and when the visitor requests reduced motion.
 */
export function GlobalMotion() {
  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    const root = document.documentElement;
    const observed = new WeakSet<HTMLElement>();

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          node.dataset.revealed = 'true';
          observer.unobserve(node);
        });
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    const observe = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches(REVEAL_SELECTOR)) {
        if (!observed.has(scope)) {
          observed.add(scope);
          observer.observe(scope);
        }
      }

      scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(node => {
        if (observed.has(node)) return;
        observed.add(node);
        observer.observe(node);
      });
    };

    // Set the ready class only after the observer is installed, avoiding a
    // flash of hidden content if setup fails.
    observe(document);
    root.classList.add('hamlet-motion-ready');

    // Next.js client navigation and streamed content can add sections later.
    const mutations = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) observe(node);
        });
      });
    });

    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
      root.classList.remove('hamlet-motion-ready');
    };
  }, []);

  return null;
}
