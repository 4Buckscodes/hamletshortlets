// Optional listing tour video (YouTube, Vimeo or Instagram).
//
// Safety model: partners paste a link, we recognise a small allowlist of sites and keep ONLY a
// validated provider + id. The embed/watch URLs are rebuilt from those, so an arbitrary URL can
// never reach an iframe or a link on a listing. The same formats are enforced in the database.

export type TourVideoProvider = 'youtube' | 'vimeo' | 'instagram';

export interface TourVideo {
  provider: TourVideoProvider;
  id: string;
}

export const TOUR_VIDEO_PROVIDERS: ReadonlyArray<TourVideoProvider> = ['youtube', 'vimeo', 'instagram'];

export const TOUR_VIDEO_PROVIDER_LABEL: Record<TourVideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  instagram: 'Instagram',
};

// id formats (mirrored by the check constraint in the database migration):
//   youtube   11 chars                           dQw4w9WgXcQ
//   vimeo     digits, optional ":<hash>" for     76979871   or   76979871:a1b2c3d4e5
//             unlisted videos
//   instagram "<p|reel|tv>:<shortcode>"          reel:C8abc123XyZ
const ID_PATTERNS: Record<TourVideoProvider, RegExp> = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  vimeo: /^[0-9]{5,12}(:[a-f0-9]{6,16})?$/,
  instagram: /^(p|reel|tv):[A-Za-z0-9_-]{6,30}$/,
};

export function isValidTourVideo(provider: unknown, id: unknown): boolean {
  return (
    typeof provider === 'string' &&
    typeof id === 'string' &&
    (TOUR_VIDEO_PROVIDERS as ReadonlyArray<string>).includes(provider) &&
    ID_PATTERNS[provider as TourVideoProvider].test(id)
  );
}

/** Narrow unknown database values to a TourVideo, or null. */
export function toTourVideo(provider: unknown, id: unknown): TourVideo | null {
  return isValidTourVideo(provider, id)
    ? { provider: provider as TourVideoProvider, id: id as string }
    : null;
}

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'instagr.am', 'www.instagr.am']);

function parseUrl(raw: string): URL | null {
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function parseYouTube(url: URL): TourVideo | null {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  let candidate: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidate = parts[0] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === 'watch') candidate = url.searchParams.get('v');
    else if (['shorts', 'live', 'embed', 'v'].includes(parts[0] ?? '')) candidate = parts[1] ?? null;
  }
  return candidate && ID_PATTERNS.youtube.test(candidate) ? { provider: 'youtube', id: candidate } : null;
}

function parseVimeo(url: URL): TourVideo | null {
  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let idPart: string | undefined;
  let hash: string | null = url.searchParams.get('h');

  if (host === 'player.vimeo.com') {
    if (parts[0] === 'video') idPart = parts[1];
  } else if (parts[0] === 'channels' || parts[0] === 'groups') {
    // vimeo.com/channels/<name>/<id>  and  vimeo.com/groups/<name>/videos/<id>
    idPart = parts[0] === 'groups' ? parts[3] : parts[2];
  } else {
    idPart = parts[0];
    // Unlisted videos: vimeo.com/<id>/<hash>
    if (!hash && parts[1] && /^[a-f0-9]{6,16}$/.test(parts[1])) hash = parts[1];
  }

  if (!idPart || !/^[0-9]{5,12}$/.test(idPart)) return null;
  if (hash && !/^[a-f0-9]{6,16}$/.test(hash)) hash = null;
  return { provider: 'vimeo', id: hash ? `${idPart}:${hash}` : idPart };
}

function parseInstagram(url: URL): TourVideo | null {
  if (!INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  // /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>, and /<username>/p|reel/<code>
  const at = parts.findIndex(part => ['p', 'reel', 'reels', 'tv'].includes(part));
  if (at < 0 || at > 1) return null;
  const kind = parts[at] === 'reels' ? 'reel' : parts[at];
  const code = parts[at + 1];
  if (!code) return null;
  const id = `${kind}:${code}`;
  return ID_PATTERNS.instagram.test(id) ? { provider: 'instagram', id } : null;
}

/**
 * Recognises a YouTube, Vimeo or Instagram (post / reel) link, or a bare 11-char YouTube id.
 * Returns null for empty input, any other site, profile pages, or malformed ids.
 */
export function parseTourVideo(input: unknown): TourVideo | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (ID_PATTERNS.youtube.test(raw)) return { provider: 'youtube', id: raw };

  const url = parseUrl(raw);
  if (!url) return null;
  return parseYouTube(url) ?? parseVimeo(url) ?? parseInstagram(url);
}

/** Embeddable iframe URL, rebuilt from the validated id only. */
export function tourVideoEmbedUrl(video: TourVideo): string {
  switch (video.provider) {
    case 'youtube':
      // Privacy-enhanced domain: no tracking cookies until the visitor plays the video.
      return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&autoplay=1`;
    case 'vimeo': {
      const [id, hash] = video.id.split(':');
      return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1${hash ? `&h=${hash}` : ''}`;
    }
    case 'instagram': {
      const [kind, code] = video.id.split(':');
      return `https://www.instagram.com/${kind}/${code}/embed`;
    }
  }
}

/** Canonical public page for the video (used for "Watch on …" links and the edit form). */
export function tourVideoWatchUrl(video: TourVideo): string {
  switch (video.provider) {
    case 'youtube':
      return `https://www.youtube.com/watch?v=${video.id}`;
    case 'vimeo': {
      const [id, hash] = video.id.split(':');
      return hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
    }
    case 'instagram': {
      const [kind, code] = video.id.split(':');
      return `https://www.instagram.com/${kind}/${code}/`;
    }
  }
}

/** Only YouTube offers a keyless thumbnail; other providers get a branded placeholder. */
export function tourVideoThumbnailUrl(video: TourVideo): string | null {
  return video.provider === 'youtube' ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;
}
