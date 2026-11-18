'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const VISIBLE_THUMBS = 4;

/**
 * Stay gallery: a large active photo with previous/next controls and a counter, plus a
 * 2×2 thumbnail mosaic on desktop (the fourth tile shows "+N more") and a swipe strip on
 * phones. Arrow keys move between photos; failed images drop out silently.
 */
export function StayGallery({ title, images }: { title: string; images: string[] }) {
  const cleanImages = useMemo(() => (images ?? []).map(url => url.trim()).filter(Boolean), [images]);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(0);
  const usableImages = useMemo(() => cleanImages.filter(url => !failedUrls[url]), [cleanImages, failedUrls]);

  if (!usableImages.length) {
    return (
      <div className="hm-gallery-empty">
        <span>Property photography not yet uploaded</span>
      </div>
    );
  }

  const count = usableImages.length;
  const safeIdx = active % count;
  const activeUrl = usableImages[safeIdx];
  const step = (delta: number) => setActive(prev => (prev + delta + count) % count);
  const markFailed = (url: string) => setFailedUrls(prev => ({ ...prev, [url]: true }));

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (count <= 1) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  }

  return (
    <div
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`${title} photo gallery`}
      className={count > 1 ? 'hm-gallery' : 'hm-gallery hm-gallery-single'}
    >
      <div className="hm-media hm-gallery-main">
        <img src={activeUrl} alt={`${title} — photo ${safeIdx + 1} of ${count}`} decoding="async" fetchPriority="high" onError={() => markFailed(activeUrl)} />
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous property photo" onClick={() => step(-1)} className="hm-gallery-nav hm-gallery-prev">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next property photo" onClick={() => step(1)} className="hm-gallery-nav hm-gallery-next">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
        <span className="hm-gallery-count">
          {safeIdx + 1} / {count}
        </span>
      </div>

      {count > 1 && (
        <div className="hm-gallery-thumbs">
          {usableImages.map((url, idx) => {
            const overflow = idx === VISIBLE_THUMBS - 1 && count > VISIBLE_THUMBS ? count - VISIBLE_THUMBS : 0;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setActive(overflow ? VISIBLE_THUMBS : idx)}
                aria-label={overflow ? `Show ${overflow} more photos` : `Show photo ${idx + 1} of ${count}`}
                aria-pressed={idx === safeIdx}
                className="hm-media hm-gallery-thumb"
              >
                <img src={url} alt="" loading="lazy" decoding="async" onError={() => markFailed(url)} />
                {overflow ? <span className="hm-gallery-more">+{overflow} photos</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
