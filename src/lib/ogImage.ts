import sharp from 'sharp';

/** WhatsApp and some other apps skip link previews whose image is larger than roughly 300 KB. */
export const SHARE_IMAGE_MAX_BYTES = 250 * 1024;

/**
 * Converts a rendered share card to a small JPEG (1200x630 stays 1200x630). Quality steps down
 * until the file fits under SHARE_IMAGE_MAX_BYTES, so previews appear in WhatsApp as well as
 * Telegram, Facebook, LinkedIn and X.
 */
export async function toShareJpeg(source: Buffer | Uint8Array): Promise<Buffer> {
  let best: Buffer = Buffer.alloc(0);
  for (const quality of [84, 76, 68, 60, 52]) {
    best = await sharp(source)
      .flatten({ background: '#0e1f3b' })
      .jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer();
    if (best.byteLength <= SHARE_IMAGE_MAX_BYTES) break;
  }
  return best;
}
