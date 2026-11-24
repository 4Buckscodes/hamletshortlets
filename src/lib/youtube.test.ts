import { describe, expect, it } from 'vitest';
import { isYouTubeVideoId, parseYouTubeVideoId, youTubeEmbedUrl } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTubeVideoId', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s&list=PLx`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`www.youtube.com/watch?v=${ID}`],
    [`youtu.be/${ID}`],
    [`  ${ID}  `],
  ])('accepts %s', input => {
    expect(parseYouTubeVideoId(input)).toBe(ID);
  });

  it.each([
    [''],
    ['   '],
    ['https://vimeo.com/123456789'],
    ['https://evil.example/watch?v=dQw4w9WgXcQ'],
    ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'],
    ['https://www.youtube.com/playlist?list=PLx'],
    ['https://www.youtube.com/watch?v=short'],
    ['https://www.youtube.com/watch?v="><script>alert(1)</script>'],
    ['javascript:alert(1)'],
    ['not a link'],
  ])('rejects %s', input => {
    expect(parseYouTubeVideoId(input)).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(parseYouTubeVideoId(undefined)).toBeNull();
    expect(parseYouTubeVideoId(42)).toBeNull();
  });
});

describe('embed helpers', () => {
  it('validates ids and builds a privacy-enhanced embed url', () => {
    expect(isYouTubeVideoId(ID)).toBe(true);
    expect(isYouTubeVideoId('x')).toBe(false);
    expect(youTubeEmbedUrl(ID)).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  });
});
