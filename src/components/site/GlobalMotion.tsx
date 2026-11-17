'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR = '[data-hamlet-reveal]';

/**
 * Progressive, one-shot scroll reveals for the public experience.
 *
 * Motion is opt-in per element, and content is visible unless the observer has
 * been installed successfully. Any runtime/setup failure fails open by removing
 * the ready class and marking existing targets as revealed. Newly-rendered
 * targets are observed for client navigation and streamed content.
 */
export function GlobalMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    if (
      motionPreference?.matches ||
      typeof window.IntersectionObserver === 'undefined' ||
      typeof window.MutationObserver === 'undefined'
    ) {
      return;
    }

    let failedOpen = false;
    let observer: IntersectionObserver | null = null;
    let mutations: MutationObserver | null = null;

    const revealAll = () => {
      root.classList.remove('hamlet-motion-ready');
      try {
        document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(node => {
          node.dataset.revealed = 'true';
          delete node.dataset.motionArmed;
          delete node.dataset.motionAnimating;
        });
      } catch {
        // Removing the ready class is enough to keep every target visible.
      }
    };

    const finishRevealTransition = (event: Event) => {
      if (!root.classList.contains('hamlet-motion-ready')) return;
      const transition = event as TransitionEvent;
      const node = transition.target;
      if (!(node instanceof HTMLElement) || node.dataset.motionAnimating !== 'true') {
        return;
      }

      const isImageReveal = node.dataset.hamletReveal === 'image';
      const completed = isImageReveal
        ? transition.propertyName === 'clip-path'
        : transition.propertyName === 'opacity';
      if (completed) delete node.dataset.motionAnimating;
    };

    const failOpen = () => {
      if (failedOpen) return;
      failedOpen = true;
      revealAll();
      observer?.disconnect();
      mutations?.disconnect();
      document.removeEventListener('transitionend', finishRevealTransition);
    };

    const observe = (scope: ParentNode) => {
      if (failedOpen || !observer) return;
      try {
        if (
          scope instanceof HTMLElement &&
          scope.matches(REVEAL_SELECTOR) &&
          scope.dataset.revealed !== 'true'
        ) {
          observer.observe(scope);
        }

        scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(node => {
          if (node.dataset.revealed === 'true') return;
          observer?.observe(node);
        });
      } catch {
        failOpen();
      }
    };

    try {
      observer = new IntersectionObserver(
        entries => {
          if (failedOpen) return;
          try {
            entries.forEach(entry => {
              const node = entry.target as HTMLElement;
              const isFocused = node.matches(':focus-within');
              if (!entry.isIntersecting && !isFocused) {
                node.dataset.motionArmed = 'true';
                return;
              }
              if (node.dataset.motionArmed === 'true' && !isFocused) {
                node.dataset.motionAnimating = 'true';
              } else {
                delete node.dataset.motionAnimating;
              }
              node.dataset.revealed = 'true';
              delete node.dataset.motionArmed;
              observer?.unobserve(node);
            });
          } catch {
            failOpen();
          }
        },
        {
          threshold: 0,
          rootMargin: '0px 0px -6% 0px',
        },
      );

      mutations = new MutationObserver(records => {
        if (failedOpen) return;
        try {
          records.forEach(record => {
            if (
              record.type === 'attributes' &&
              record.target instanceof HTMLElement
            ) {
              observe(record.target);
              return;
            }

            record.addedNodes.forEach(node => {
              if (node instanceof HTMLElement) observe(node);
            });
          });
        } catch {
          failOpen();
        }
      });

      observe(document);
      if (failedOpen) return;

      mutations.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-hamlet-reveal'],
      });
      root.classList.add('hamlet-motion-ready');
      document.addEventListener('transitionend', finishRevealTransition);
    } catch {
      failOpen();
    }

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) failOpen();
    };
    try {
      motionPreference?.addEventListener?.('change', handleMotionPreferenceChange);
    } catch {
      failOpen();
    }

    return () => {
      motionPreference?.removeEventListener?.('change', handleMotionPreferenceChange);
      document.removeEventListener('transitionend', finishRevealTransition);
      mutations?.disconnect();
      observer?.disconnect();
      root.classList.remove('hamlet-motion-ready');
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(node => {
        delete node.dataset.motionArmed;
        delete node.dataset.motionAnimating;
      });
    };
  }, []);

  return null;
}
