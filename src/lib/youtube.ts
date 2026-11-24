// YouTube video helpers for listing tours.
// Only the 11-character video ID is ever stored or rendered. Anything that is not a recognisable
// YouTube link is rejected, so a partner can never put an arbitrary URL into an iframe.

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID.test(value);
}

/**
 * Extracts a video ID from a watch / share / shorts / live / embed link, or a bare 11-char ID.
 * Returns null for empty input, other sites, playlists without a video, or malformed IDs.
 */
export function parseYouTubeVideoId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (VIDEO_ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  let candidate: string | null = null;

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') candidate = url.searchParams.get('v');
    else if (['shorts', 'live', 'embed', 'v'].includes(parts[0] ?? '')) candidate = parts[1] ?? null;
  }

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export function youTubeEmbedUrl(videoId: string): string {
  // Privacy-enhanced domain: no tracking cookies until the visitor plays the video.
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
}

export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
