'use client';

import { useEffect } from 'react';

/** Progressive enhancement: page content stays visible if JS or IO is unavailable. */
export default function MotionExperience({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(
      'main section, main article, main .home-belief-points > div, main .home-feature-card, main .property-card, main .stay-card, main .dashboard-panel, main .panel, main .stat-card'
    ));
    targets.forEach((element) => {
      if (element.dataset.motionIgnore !== 'true') element.classList.add('hamlet-reveal');
    });

    const groups = document.querySelectorAll<HTMLElement>(
      'main .home-destination-grid, main .property-grid, main .stays-grid, main .home-feature-grid, main .dashboard-grid'
    );
    groups.forEach((group) => Array.from(group.children).forEach((child, index) => {
      if (child instanceof HTMLElement) {
        child.classList.add('hamlet-reveal');
        child.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 85}ms`);
      }
    }));

    root.classList.add('hamlet-motion-ready');
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

    targets.forEach((element) => observer.observe(element));
    groups.forEach((group) => Array.from(group.children).forEach((child) => {
      if (child instanceof HTMLElement && child.classList.contains('hamlet-reveal')) observer.observe(child);
    }));
    return () => { observer.disconnect(); root.classList.remove('hamlet-motion-ready'); };
  }, []);
  return <>{children}</>;
}
