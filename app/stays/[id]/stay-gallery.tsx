'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function StayGallery({
  title,
  images,
}: {
  title: string;
  images: string[];
}) {
  const cleanImages = useMemo(
    () => (images ?? []).map(url => url.trim()).filter(Boolean),
    [images],
  );
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(0);

  const usableImages = useMemo(
    () => cleanImages.filter(url => !failedUrls[url]),
    [cleanImages, failedUrls],
  );

  if (!usableImages.length) {
    return (
      <div className="grid min-h-[260px] place-items-center rounded-3xl border border-ink-200 bg-gradient-to-br from-clay to-paper px-6 text-center sm:min-h-[380px]">
        <div>
          <span aria-hidden="true" className="block font-display text-5xl text-brass-600/80">
            ⌂
          </span>
          <span className="mt-2 block text-xs font-extrabold uppercase tracking-[0.18em] text-ink-600">
            Property photography not yet uploaded
          </span>
        </div>
      </div>
    );
  }

  const safeIdx = active % usableImages.length;
  const activeUrl = usableImages[safeIdx];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (usableImages.length <= 1) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive(prev => (prev - 1 + usableImages.length) % usableImages.length);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActive(prev => (prev + 1) % usableImages.length);
    }
  }

  return (
    <div
      tabIndex={usableImages.length > 1 ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`${title} photo gallery`}
      className="space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-ink-200 bg-clay">
        <img
          src={activeUrl}
          alt={`${title} — photo ${safeIdx + 1} of ${usableImages.length}`}
          decoding="async"
          onError={() =>
            setFailedUrls(prev => ({
              ...prev,
              [activeUrl]: true,
            }))
          }
          className="h-full w-full object-cover opacity-100"
        />

        {usableImages.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous property photo"
              onClick={() =>
                setActive(prev => (prev - 1 + usableImages.length) % usableImages.length)
              }
              className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white/95 text-ink-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
            </button>
            <button
              type="button"
              aria-label="Next property photo"
              onClick={() => setActive(prev => (prev + 1) % usableImages.length)}
              className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-ink-200 bg-white/95 text-ink-900 shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            >
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>
          </>
        )}

        <span className="absolute bottom-3 right-3 rounded-full bg-ink-950/80 px-3 py-1 font-mono text-xs font-bold text-white">
          {safeIdx + 1} / {usableImages.length}
        </span>
      </div>

      {usableImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {usableImages.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`Show photo ${idx + 1} of ${usableImages.length}`}
              aria-pressed={idx === safeIdx}
              className={`h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 ${
                idx === safeIdx
                  ? 'border-ink-900 ring-2 ring-ink-900/15'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() =>
                  setFailedUrls(prev => ({
                    ...prev,
                    [url]: true,
                  }))
                }
                className="h-full w-full object-cover opacity-100"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
