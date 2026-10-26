'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function StayGallery({
  title,
  images,
}: {
  title: string;
  images: string[];
}) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-3xl border border-ink-200 bg-gradient-to-br from-clay to-paper text-5xl text-brass-600 sm:min-h-[380px]">
        ⌂
      </div>
    );
  }

  const safeIdx = Math.min(active, images.length - 1);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-ink-200 bg-clay">
        <img
          src={images[safeIdx]}
          alt={`${title} — photo ${safeIdx + 1} of ${images.length}`}
          className="h-full w-full object-cover opacity-100"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous property photo"
              onClick={() =>
                setActive(prev => (prev - 1 + images.length) % images.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white/95 text-ink-900 shadow-sm hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
            </button>
            <button
              type="button"
              aria-label="Next property photo"
              onClick={() => setActive(prev => (prev + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white/95 text-ink-900 shadow-sm hover:bg-white"
            >
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>
          </>
        )}

        <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/80 px-3 py-1 font-mono text-xs font-bold text-white">
          {safeIdx + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {images.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Show photo ${idx + 1}`}
              aria-pressed={idx === safeIdx}
              className={`h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                idx === safeIdx
                  ? 'border-ink-900 ring-2 ring-ink-900/15'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover opacity-100"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
