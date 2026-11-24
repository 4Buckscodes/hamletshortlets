'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import {
  TOUR_VIDEO_PROVIDER_LABEL,
  isValidTourVideo,
  tourVideoEmbedUrl,
  tourVideoThumbnailUrl,
  tourVideoWatchUrl,
  type TourVideo,
} from '@/lib/tourVideo';

/**
 * Click-to-play listing tour (YouTube, Vimeo or Instagram). Nothing from the video site loads
 * until the visitor taps play, which keeps listing pages light on mobile data and sets no
 * tracking cookies for people who skip it. A "Watch on …" link is always shown as a fallback.
 */
export function StayVideo({ video, title }: { video: TourVideo; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (!isValidTourVideo(video.provider, video.id)) return null;

  const label = TOUR_VIDEO_PROVIDER_LABEL[video.provider];
  const thumbnail = tourVideoThumbnailUrl(video);
  // Instagram posts and reels are portrait; YouTube and Vimeo are landscape.
  const portrait = video.provider === 'instagram';

  return (
    <div className={portrait ? 'w-full max-w-sm' : 'w-full'} data-testid="stay-video" data-provider={video.provider}>
      <div
        className={`relative w-full overflow-hidden rounded-2xl bg-ink-950 ${
          portrait ? 'aspect-[9/14]' : 'aspect-video'
        }`}
      >
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full border-0"
            src={tourVideoEmbedUrl(video)}
            title={`Video tour: ${title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-end bg-gradient-to-br from-ink-900 via-ink-950 to-brass-700/60 p-4"
              >
                <span className="text-sm font-semibold text-white/80">{label} video tour</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play ${label} video tour: ${title}`}
              className="absolute inset-0 flex items-center justify-center bg-ink-950/25 transition hover:bg-ink-950/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-950 shadow-lg">
                <Play size={26} aria-hidden="true" className="ml-1 fill-current" />
              </span>
            </button>
          </>
        )}
      </div>
      <a
        href={tourVideoWatchUrl(video)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-semibold text-ink-700 underline underline-offset-2"
      >
        Watch on {label}
      </a>
    </div>
  );
}
