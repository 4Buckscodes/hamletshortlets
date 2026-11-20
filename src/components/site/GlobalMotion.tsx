'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const REVEAL_SELECTOR = '[data-hamlet-reveal]';

/**
 * The one scroll-triggered motion on the site: content below the fold settles in with a short
 * fade and a small rise, in batches so a row of stays arrives together. Content that is already
 * on screen is never hidden, and nothing moves for visitors who ask for reduced motion.
 * The hero photo also moves a few pixels slower than the page inside its frame.
 */
export function GlobalMotion() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const seen = new WeakSet<Element>();
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const arm = (scope: ParentNode) => {
        const fresh = Array.from(scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(node => !seen.has(node));
        const below = fresh.filter(node => node.getBoundingClientRect().top > window.innerHeight * 0.92);
        fresh.forEach(node => seen.add(node));
        if (!below.length) return;
        gsap.set(below, { opacity: 0, y: 14 });
        ScrollTrigger.batch(below, {
          start: 'top 92%',
          once: true,
          onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.07, overwrite: true, clearProps: "transform,opacity" }),
        });
      };

      arm(document);

      const parallax = document.querySelector<HTMLElement>('[data-hero-parallax]');
      const heroImg = parallax?.querySelector('img');
      if (parallax && heroImg && window.matchMedia('(min-width: 901px)').matches) {
        gsap.fromTo(
          heroImg,
          { yPercent: -3, scale: 1.08 },
          { yPercent: 3, scale: 1.08, ease: 'none', scrollTrigger: { trigger: parallax, start: 'top 80%', end: 'bottom top', scrub: true } },
        );
      }

      // Client navigation and streamed content add sections after mount.
      const mutations = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) arm(node);
        }));
      });
      mutations.observe(document.body, { childList: true, subtree: true });

      return () => {
        mutations.disconnect();
        document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(node => gsap.set(node, { clearProps: 'all' }));
      };
    });

    return () => mm.revert();
  }, []);

  return null;
}
