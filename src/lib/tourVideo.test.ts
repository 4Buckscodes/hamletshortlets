import { describe, expect, it } from 'vitest';
import {
  isValidTourVideo,
  parseTourVideo,
  toTourVideo,
  tourVideoEmbedUrl,
  tourVideoThumbnailUrl,
  tourVideoWatchUrl,
} from './tourVideo';

const YT = 'dQw4w9WgXcQ';

describe('parseTourVideo: YouTube', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${YT}`],
    [`https://youtube.com/watch?v=${YT}&t=42s&list=PLx`],
    [`https://m.youtube.com/watch?v=${YT}`],
    [`https://youtu.be/${YT}?si=abc`],
    [`https://www.youtube.com/shorts/${YT}`],
    [`https://www.youtube.com/live/${YT}`],
    [`https://www.youtube.com/embed/${YT}`],
    [`youtu.be/${YT}`],
    [`  ${YT}  `],
  ])('accepts %s', input => {
    expect(parseTourVideo(input)).toEqual({ provider: 'youtube', id: YT });
  });
});

describe('parseTourVideo: Vimeo', () => {
  it.each([
    ['https://vimeo.com/76979871', '76979871'],
    ['https://www.vimeo.com/76979871', '76979871'],
    ['https://player.vimeo.com/video/76979871', '76979871'],
    ['https://vimeo.com/channels/staffpicks/76979871', '76979871'],
    ['https://vimeo.com/groups/shortfilms/videos/76979871', '76979871'],
    ['https://vimeo.com/76979871/a1b2c3d4e5', '76979871:a1b2c3d4e5'],
    ['https://player.vimeo.com/video/76979871?h=a1b2c3d4e5&autoplay=1', '76979871:a1b2c3d4e5'],
  ])('accepts %s', (input, id) => {
    expect(parseTourVideo(input)).toEqual({ provider: 'vimeo', id });
  });

  it('drops a malformed unlisted hash instead of trusting it', () => {
    expect(parseTourVideo('https://player.vimeo.com/video/76979871?h=%22%3E%3Cscript')).toEqual({
      provider: 'vimeo',
      id: '76979871',
    });
  });
});

describe('parseTourVideo: Instagram', () => {
  it.each([
    ['https://www.instagram.com/reel/C8abc123XyZ/', 'reel:C8abc123XyZ'],
    ['https://www.instagram.com/reels/C8abc123XyZ/', 'reel:C8abc123XyZ'],
    ['https://www.instagram.com/p/C8abc123XyZ/?utm_source=ig_web_copy_link', 'p:C8abc123XyZ'],
    ['https://instagram.com/tv/C8abc123XyZ', 'tv:C8abc123XyZ'],
    ['https://www.instagram.com/hamlet.stays/reel/C8abc123XyZ/', 'reel:C8abc123XyZ'],
    ['instagram.com/p/C8abc123XyZ', 'p:C8abc123XyZ'],
  ])('accepts %s', (input, id) => {
    expect(parseTourVideo(input)).toEqual({ provider: 'instagram', id });
  });
});

describe('parseTourVideo: rejects', () => {
  it.each([
    [''],
    ['   '],
    ['https://www.instagram.com/hamlet.stays/'],
    ['https://www.instagram.com/stories/hamlet.stays/123/'],
    ['https://www.instagram.com/explore/tags/lagos/'],
    ['https://instagram.com.evil.example/p/C8abc123XyZ/'],
    ['https://evil.example/instagram.com/p/C8abc123XyZ/'],
    ['https://vimeo.com/channels/staffpicks'],
    ['https://vimeo.com/abc'],
    ['https://vimeo.com.evil.example/76979871'],
    ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'],
    ['https://www.youtube.com/playlist?list=PLx'],
    ['https://www.tiktok.com/@a/video/7123456789012345678'],
    ['javascript:alert(1)'],
    ['not a link'],
  ])('%s', input => {
    expect(parseTourVideo(input)).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(parseTourVideo(undefined)).toBeNull();
    expect(parseTourVideo(42)).toBeNull();
  });
});

describe('validation and url builders', () => {
  it('validates provider/id pairs the same way the database does', () => {
    expect(isValidTourVideo('youtube', YT)).toBe(true);
    expect(isValidTourVideo('vimeo', '76979871:a1b2c3d4e5')).toBe(true);
    expect(isValidTourVideo('instagram', 'reel:C8abc123XyZ')).toBe(true);
    expect(isValidTourVideo('youtube', 'reel:C8abc123XyZ')).toBe(false);
    expect(isValidTourVideo('instagram', 'C8abc123XyZ')).toBe(false);
    expect(isValidTourVideo('tiktok', '1234567')).toBe(false);
    expect(toTourVideo('vimeo', 'nope')).toBeNull();
    expect(toTourVideo('vimeo', '76979871')).toEqual({ provider: 'vimeo', id: '76979871' });
  });

  it('rebuilds embed and watch urls from the id only', () => {
    expect(tourVideoEmbedUrl({ provider: 'youtube', id: YT })).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/,
    );
    expect(tourVideoEmbedUrl({ provider: 'vimeo', id: '76979871:a1b2c3d4e5' })).toBe(
      'https://player.vimeo.com/video/76979871?autoplay=1&dnt=1&h=a1b2c3d4e5',
    );
    expect(tourVideoEmbedUrl({ provider: 'instagram', id: 'reel:C8abc123XyZ' })).toBe(
      'https://www.instagram.com/reel/C8abc123XyZ/embed',
    );
    expect(tourVideoWatchUrl({ provider: 'instagram', id: 'p:C8abc123XyZ' })).toBe(
      'https://www.instagram.com/p/C8abc123XyZ/',
    );
    expect(tourVideoWatchUrl({ provider: 'vimeo', id: '76979871' })).toBe('https://vimeo.com/76979871');
    expect(tourVideoThumbnailUrl({ provider: 'youtube', id: YT })).toContain('ytimg.com');
    expect(tourVideoThumbnailUrl({ provider: 'vimeo', id: '76979871' })).toBeNull();
  });

  it('round-trips watch urls back through the parser', () => {
    for (const video of [
      { provider: 'youtube', id: YT },
      { provider: 'vimeo', id: '76979871:a1b2c3d4e5' },
      { provider: 'instagram', id: 'reel:C8abc123XyZ' },
    ] as const) {
      expect(parseTourVideo(tourVideoWatchUrl(video))).toEqual(video);
    }
  });
});
