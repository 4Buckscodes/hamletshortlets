'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { LAGOS_AREAS } from '@/lib/areas';

/**
 * Slow marquee of Lagos areas, each linking to a filtered search. Pauses on hover/focus and with
 * its own pause button (touch devices cannot hover), and the duplicate run is hidden from assistive tech.
 */
export function AreaTicker({ areas = LAGOS_AREAS, label = 'Browse stays by area' }: { areas?: readonly string[]; label?: string }) {
  const [paused, setPaused] = useState(false);
  const items = (hidden: boolean) =>
    areas.map(area => (
      <Link key={`${hidden ? 'b' : 'a'}-${area}`} href={`/stays?area=${encodeURIComponent(area)}`} className="hm-ticker-item" tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined}>
        {area}
        <svg className="hm-ticker-spark" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 0c.4 3.1 2.9 5.6 6 6-3.1.4-5.6 2.9-6 6-.4-3.1-2.9-5.6-6-6 3.1-.4 5.6-2.9 6-6Z" fill="currentColor" />
        </svg>
      </Link>
    ));
  return (
    <nav aria-label={label} className="hm-ticker" data-paused={paused ? 'true' : undefined}>
      <div className="hm-ticker-track">
        {items(false)}
        {items(true)}
      </div>
      <button type="button" className="hm-ticker-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Play area ticker' : 'Pause area ticker'}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </nav>
  );
}
