import Link from 'next/link';
import { LAGOS_AREAS } from '@/lib/areas';

/**
 * Slow marquee of Lagos areas, each linking to a filtered search. Pauses on hover/focus,
 * is static under reduced motion, and the duplicate run is hidden from assistive tech.
 */
export function AreaTicker({ areas = LAGOS_AREAS, label = 'Browse stays by area' }: { areas?: readonly string[]; label?: string }) {
  const items = (hidden: boolean) =>
    areas.map(area => (
      <Link key={`${hidden ? 'b' : 'a'}-${area}`} href={`/stays?area=${encodeURIComponent(area)}`} className="hm-ticker-item" tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined}>
        {area}
        <span aria-hidden="true">✦</span>
      </Link>
    ));
  return (
    <nav aria-label={label} className="hm-ticker">
      <div className="hm-ticker-track">
        {items(false)}
        {items(true)}
      </div>
    </nav>
  );
}
