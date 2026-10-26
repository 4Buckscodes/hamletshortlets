'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HERO_SLIDES = [
  {
    src: '/images/hero-sample-living.jpg',
    caption: 'Sample interior · Bright open-plan living space',
  },
  {
    src: '/images/hero-sample-bedroom.jpg',
    caption: 'Sample interior · Calm principal bedroom',
  },
  {
    src: '/images/hero-sample-kitchen.jpg',
    caption: 'Sample interior · Equipped apartment kitchen',
  },
  {
    src: '/images/hero-sample-lounge.jpg',
    caption: 'Sample interior · Relaxed evening lounge',
  },
] as const;

export function HomeSampleSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  const current = HERO_SLIDES[index];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-clay">
        <img
          src={current.src}
          alt={current.caption}
          className="h-full w-full object-cover opacity-100 transition duration-300"
        />
        <span className="absolute left-3.5 top-3.5 rounded-full border border-ink-200 bg-white/95 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-800 shadow-xs">
          Sample interior
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 bg-white px-4 py-3">
        <p className="m-0 truncate text-xs font-semibold text-ink-600">
          {current.caption}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous interior photo"
            onClick={() =>
              setIndex(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
            }
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-800 hover:border-ink-500"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </button>
          <span className="font-mono text-xs font-bold text-ink-500">
            {index + 1}/{HERO_SLIDES.length}
          </span>
          <button
            type="button"
            aria-label="Next interior photo"
            onClick={() => setIndex(prev => (prev + 1) % HERO_SLIDES.length)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-paper text-ink-800 hover:border-ink-500"
          >
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
