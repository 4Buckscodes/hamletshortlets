import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useHamlet } from '../lib/store';

interface ArrivalPhotoProps {
  src?: string;
  alt: string;
  caption?: string;
  className?: string;
}

/**
 * Renders an optional arrival guide photograph, resolving private
 * `storage://arrival-guide-media/...` paths via short-lived signed URLs and
 * providing a clean outdoor-readable fallback if the network or image fails.
 */
export function ArrivalPhoto({ src, alt, caption, className = '' }: ArrivalPhotoProps) {
  const { resolveArrivalPhotoUrl } = useHamlet();
  const [resolvedState, setResolvedState] = useState<{
    source: string;
    url: string | null;
    failed: boolean;
  }>({ source: '', url: null, failed: false });

  useEffect(() => {
    let active = true;
    const trimmed = src?.trim() ?? '';
    if (!trimmed) return () => { active = false; };

    void resolveArrivalPhotoUrl(trimmed)
      .then(url => {
        if (active) {
          setResolvedState({ source: trimmed, url, failed: !url });
        }
      })
      .catch(() => {
        if (active) {
          setResolvedState({ source: trimmed, url: null, failed: true });
        }
      });

    return () => {
      active = false;
    };
  }, [src, resolveArrivalPhotoUrl]);

  const trimmed = src?.trim() ?? '';
  if (!trimmed) return null;

  const isLoading = resolvedState.source !== trimmed;
  const hasFailed = !isLoading && (resolvedState.failed || !resolvedState.url);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading arrival photograph"
        className={`flex h-44 w-full animate-pulse items-center justify-center rounded-2xl border border-ink-100 bg-ink-50 text-xs font-semibold text-ink-400 ${className}`}
      >
        Loading arrival photo…
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div
        className={`flex items-start gap-2.5 rounded-2xl border border-ink-200 bg-ink-50/70 px-3.5 py-3 text-[12px] font-medium text-ink-600 ${className}`}
      >
        <ImageOff size={16} className="mt-0.5 shrink-0 text-ink-400" />
        <span>
          Arrival photo unavailable on your current connection ({alt}). Follow the written landmark and turn instructions above.
        </span>
      </div>
    );
  }

  return (
    <figure className={`overflow-hidden rounded-2xl border border-ink-100 bg-ink-50 ${className}`}>
      <img
        src={resolvedState.url!}
        alt={alt}
        loading="lazy"
        onError={() =>
          setResolvedState(prev => ({ ...prev, failed: true }))
        }
        className="h-48 w-full object-cover sm:h-56"
      />
      {caption && (
        <figcaption className="border-t border-ink-100 bg-white px-3.5 py-2 text-[11px] font-semibold text-ink-600">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
