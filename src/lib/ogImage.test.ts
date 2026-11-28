import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderHamletDefaultOgBuffer } from './share-artwork';
import { SHARE_IMAGE_MAX_BYTES, toShareJpeg } from './ogImage';

describe('share image size', () => {
  it('turns a large noisy PNG into a JPEG under the WhatsApp-safe limit, same dimensions', async () => {
    const width = 1200;
    const height = 630;
    // Mid-grey with mild random grain: heavy for a PNG, ordinary for a JPEG.
    const grain = randomBytes(width * height * 3);
    const noise = Buffer.alloc(grain.length);
    for (let i = 0; i < noise.length; i++) noise[i] = 110 + (grain[i]! % 36);
    const png = await sharp(noise, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer();
    expect(png.byteLength).toBeGreaterThan(SHARE_IMAGE_MAX_BYTES * 2);
    const jpeg = await toShareJpeg(png);
    expect(jpeg.byteLength).toBeLessThanOrEqual(SHARE_IMAGE_MAX_BYTES);
    const meta = await sharp(jpeg).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', width, height]);
  });

  it('keeps the real default HAMLET card well under the limit', async () => {
    const png = await renderHamletDefaultOgBuffer();
    const jpeg = await toShareJpeg(png);
    // eslint-disable-next-line no-console
    console.log(`default OG: png ${png.byteLength} bytes -> jpeg ${jpeg.byteLength} bytes`);
    expect(jpeg.byteLength).toBeLessThanOrEqual(SHARE_IMAGE_MAX_BYTES);
  });
});
