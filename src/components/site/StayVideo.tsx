'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import {
  isYouTubeVideoId,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
  youTubeWatchUrl,
} from '@/lib/youtube';

/**
 * Click-to-play YouTube tour. Nothing from YouTube loads until the visitor taps play, which keeps
 * the listing page light on mobile data and sets no tracking cookies for people who skip it.
 */
export function StayVideo({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (!isYouTubeVideoId(videoId)) return null;

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-ink-950"
      data-testid="stay-video"
    >
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={youTubeEmbedUrl(videoId)}
          title={`Video tour: ${title}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <>
          <img
            src={youTubeThumbnailUrl(videoId)}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video tour: ${title}`}
            className="absolute inset-0 flex items-center justify-center bg-ink-950/25 transition hover:bg-ink-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-950 shadow-lg">
              <Play size={26} aria-hidden="true" className="ml-1 fill-current" />
            </span>
          </button>
          <a
            href={youTubeWatchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 rounded-full bg-ink-950/70 px-3 py-1 text-[11px] font-semibold text-white"
          >
            Watch on YouTube
          </a>
        </>
      )}
    </div>
  );
}
