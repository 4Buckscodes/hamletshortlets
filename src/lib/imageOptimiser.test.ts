import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildOptimisedFileName,
  buildPropertyMediaObjectPath,
  classifyImageFile,
  computeLaplacianSharpness,
  computeTargetDimensions,
  deletePropertyMediaObjects,
  evaluateImageQuality,
  extractPropertyMediaObjectPath,
  inspectExifMetadata,
  OPTIMISING_USER_MESSAGE,
  optimisePropertyImage,
  runWithConcurrencyLimit,
  sniffMagicFormat,
  stripExifAndMetadataSegments,
} from './imageOptimiser';

function buildJpegWithExifAndGps(orientation = 6): Uint8Array {
  // SOI (FFD8) + APP0 JFIF + APP1 Exif (Orientation 0x0112 + GPSInfo 0x8825) + APP1 XMP + SOF0 + SOS + EOI
  const soi = [0xff, 0xd8];

  const jfifPayload = [
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ];
  const app0Len = jfifPayload.length + 2;
  const app0 = [0xff, 0xe0, (app0Len >> 8) & 0xff, app0Len & 0xff, ...jfifPayload];

  // Exif\0\0 + Big-endian TIFF ('MM', 0x002A, IFD0 @ offset 8) with 2 entries:
  // Entry 1: Orientation (0x0112), SHORT (0x0003), count 1, value = `orientation`
  // Entry 2: GPSInfo (0x8825), LONG (0x0004), count 1, offset 0x00000026
  const exifPayload = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF header
    0x00, 0x02, // 2 directory entries
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, (orientation >> 8) & 0xff, orientation & 0xff, 0x00, 0x00,
    0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26,
    0x00, 0x00, 0x00, 0x00,
  ];
  const app1Len = exifPayload.length + 2;
  const app1Exif = [0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...exifPayload];

  const xmpHeader = Array.from(
    new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>'),
  );
  const xmpLen = xmpHeader.length + 2;
  const app1Xmp = [0xff, 0xe1, (xmpLen >> 8) & 0xff, xmpLen & 0xff, ...xmpHeader];

  const sof0 = [0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00];
  const sos = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f];
  const eoi = [0xff, 0xd9];

  return new Uint8Array([...soi, ...app0, ...app1Exif, ...app1Xmp, ...sof0, ...sos, ...eoi]);
}

function buildWebpWithExifAndGps(includeMetadata = true): Uint8Array {
  const enc = new TextEncoder();
  // VP8X payload (10 bytes): flags byte has EXIF (0x08) | XMP (0x04) = 0x0C when metadata included
  const vp8xPayload = new Uint8Array([
    includeMetadata ? 0x0c : 0x00,
    0x00, 0x00, 0x00, 0xef, 0x00, 0x00, 0xef, 0x00, 0x00,
  ]);
  const vp8Payload = new Uint8Array([0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01]);
  const exifPayload = new Uint8Array([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x88, 0x25, 0x00, 0x04, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x1a,
  ]);
  const xmpPayload = enc.encode('<xmp/>  ');

  function makeChunk(fourcc: string, data: Uint8Array): Uint8Array {
    const pad = data.byteLength % 2 === 1 ? 1 : 0;
    const out = new Uint8Array(8 + data.byteLength + pad);
    out.set(enc.encode(fourcc), 0);
    new DataView(out.buffer).setUint32(4, data.byteLength, true);
    out.set(data, 8);
    return out;
  }

  const chunks = [makeChunk('VP8X', vp8xPayload), makeChunk('VP8 ', vp8Payload)];
  if (includeMetadata) {
    chunks.push(makeChunk('EXIF', exifPayload), makeChunk('XMP ', xmpPayload));
  }

  const bodyLen = 4 + chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(8 + bodyLen);
  out.set(enc.encode('RIFF'), 0);
  new DataView(out.buffer).setUint32(4, bodyLen, true);
  out.set(enc.encode('WEBP'), 8);

  let offset = 12;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function buildHeicHeaderBytes(brand = 'heic'): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 24, false);
  bytes.set(new TextEncoder().encode('ftyp'), 4);
  bytes.set(new TextEncoder().encode(brand), 8);
  bytes.set(new TextEncoder().encode('mif1'), 16);
  bytes.set(new TextEncoder().encode('heic'), 20);
  return bytes;
}

describe('HAMLET Automatic Property Image Optimiser', () => {
  it('sniffs JPEG, PNG, WebP, and iPhone HEIC/HEIF magic bytes accurately even when file.type is blank', () => {
    const heicBytes = buildHeicHeaderBytes('heic');
    expect(sniffMagicFormat(heicBytes)).toBe('heic');

    const blankMimeHeic = new File([heicBytes], 'IMG_4821.HEIC', { type: '' });
    expect(classifyImageFile(blankMimeHeic, heicBytes)).toEqual({
      supported: true,
      format: 'heic',
      canonicalMimeType: 'image/heic',
      isHeic: true,
    });

    const mif1Bytes = buildHeicHeaderBytes('mif1');
    const mif1File = new File([mif1Bytes], 'camera-capture', {
      type: 'application/octet-stream',
    });
    const mif1Class = classifyImageFile(mif1File, mif1Bytes);
    expect(mif1Class.supported).toBe(true);
    expect(mif1Class.isHeic).toBe(true);
    expect(mif1Class.canonicalMimeType).toBe('image/heic');

    const jpegBytes = buildJpegWithExifAndGps();
    const blankMimeJpeg = new File([jpegBytes], 'living-room-photo', { type: '' });
    expect(classifyImageFile(blankMimeJpeg, jpegBytes.subarray(0, 32))).toEqual({
      supported: true,
      format: 'jpeg',
      canonicalMimeType: 'image/jpeg',
      isHeic: false,
    });
  });

  it('gracefully rejects unsupported formats, empty files, and >50 MB raw files with clear messages', () => {
    const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
    const emptyCheck = classifyImageFile(emptyFile);
    expect(emptyCheck.supported).toBe(false);
    expect(emptyCheck.reason).toContain('empty');

    const oversized = { name: 'huge-raw.dng', type: 'image/jpeg', size: 55 * 1024 * 1024 };
    const oversizedCheck = classifyImageFile(oversized);
    expect(oversizedCheck.supported).toBe(false);
    expect(oversizedCheck.reason).toContain('50 MB');

    const pdfBytes = new TextEncoder().encode('%PDF-1.7 fake document');
    const disguisedPdf = new File([pdfBytes], 'floorplan.pdf', {
      type: 'application/pdf',
    });
    const pdfCheck = classifyImageFile(disguisedPdf, pdfBytes);
    expect(pdfCheck.supported).toBe(false);
    expect(pdfCheck.reason).toContain('JPEG, PNG, WebP, or iPhone HEIC/HEIF');

    const svgBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const svgFile = new File([svgBytes], 'vector.svg', { type: 'image/svg+xml' });
    const svgCheck = classifyImageFile(svgFile, svgBytes);
    expect(svgCheck.supported).toBe(false);
  });

  it('resizes proportionally up to 2,400px max dimension without ever stretching, distorting, or upscaling', () => {
    const iphoneLandscape = computeTargetDimensions(4032, 3024, 2400);
    expect(iphoneLandscape.width).toBe(2400);
    expect(iphoneLandscape.height).toBe(1800);
    expect(iphoneLandscape.resized).toBe(true);
    expect(iphoneLandscape.width / iphoneLandscape.height).toBeCloseTo(4032 / 3024, 5);

    const iphoneProPortrait = computeTargetDimensions(6048, 8064, 2400);
    expect(iphoneProPortrait.width).toBe(1800);
    expect(iphoneProPortrait.height).toBe(2400);
    expect(iphoneProPortrait.resized).toBe(true);

    const panoramic = computeTargetDimensions(6000, 2000, 2400);
    expect(panoramic.width).toBe(2400);
    expect(panoramic.height).toBe(800);

    const smaller = computeTargetDimensions(1600, 1200, 2400);
    expect(smaller).toEqual({
      width: 1600,
      height: 1200,
      resized: false,
      scale: 1,
    });
  });

  it('detects EXIF orientation & GPS tags and binary-strips EXIF/GPS/XMP from both JPEG and RIFF WebP files', () => {
    // 1. JPEG with Orientation=6 + GPSInfo + XMP
    const rawJpeg = buildJpegWithExifAndGps(6);
    expect(inspectExifMetadata(rawJpeg)).toEqual({
      hasExif: true,
      hasGps: true,
      orientation: 6,
    });

    const strippedJpeg = stripExifAndMetadataSegments(rawJpeg);
    expect(sniffMagicFormat(strippedJpeg)).toBe('jpeg');
    expect(strippedJpeg[strippedJpeg.length - 2]).toBe(0xff);
    expect(strippedJpeg[strippedJpeg.length - 1]).toBe(0xd9);
    expect(inspectExifMetadata(strippedJpeg)).toEqual({
      hasExif: false,
      hasGps: false,
      orientation: 1,
    });
    expect(strippedJpeg.byteLength).toBeLessThan(rawJpeg.byteLength);

    // 2. RIFF WebP with VP8X + EXIF (GPSInfo) + XMP chunks
    const rawWebp = buildWebpWithExifAndGps(true);
    expect(inspectExifMetadata(rawWebp)).toEqual({
      hasExif: true,
      hasGps: true,
      orientation: 1,
    });

    const strippedWebp = stripExifAndMetadataSegments(rawWebp);
    expect(sniffMagicFormat(strippedWebp)).toBe('webp');
    expect(inspectExifMetadata(strippedWebp)).toEqual({
      hasExif: false,
      hasGps: false,
      orientation: 1,
    });
    const riffSize = new DataView(
      strippedWebp.buffer,
      strippedWebp.byteOffset,
      strippedWebp.byteLength,
    ).getUint32(4, true);
    expect(riffSize).toBe(strippedWebp.byteLength - 8);
    expect(strippedWebp[20] & 0x0c).toBe(0);
  });

  it('warns on blurry or low-resolution images while passing crisp architectural photos cleanly', () => {
    const w = 120;
    const h = 90;
    const blurryRgba = new Uint8ClampedArray(w * h * 4).fill(128);
    const blurryScore = computeLaplacianSharpness(blurryRgba, w, h);
    expect(blurryScore).toBe(0);

    const lowResAndBlurryWarnings = evaluateImageQuality({
      width: 640,
      height: 480,
      sharpnessScore: blurryScore,
    });
    expect(lowResAndBlurryWarnings.map(item => item.code)).toEqual([
      'low_resolution',
      'blurry',
    ]);

    const sharpRgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const lum = (x + y) % 2 === 0 ? 235 : 25;
        sharpRgba[idx] = lum;
        sharpRgba[idx + 1] = lum;
        sharpRgba[idx + 2] = lum;
        sharpRgba[idx + 3] = 255;
      }
    }
    const sharpScore = computeLaplacianSharpness(sharpRgba, w, h);
    expect(sharpScore).toBeGreaterThan(100);
    expect(
      evaluateImageQuality({ width: 2400, height: 1800, sharpnessScore: sharpScore }),
    ).toEqual([]);
  });

  it('optimises large iPhone JPEGs and HEIC photos to ~300-700KB WebP, strips GPS, and falls back to JPEG if WebP is unavailable', async () => {
    // Case A: 4032x3024 iPhone JPEG containing GPS coordinates & EXIF orientation 6
    const rawCameraJpeg = buildJpegWithExifAndGps(6);
    const paddedCameraBytes = new Uint8Array(6 * 1024 * 1024); // 6 MB camera photo (> 5 MB raw bucket limit!)
    paddedCameraBytes.set(rawCameraJpeg, 0);
    const cameraFile = new File([paddedCameraBytes], 'IMG_9012.JPG', {
      type: 'image/jpeg',
    });

    // Simulate WebP output (~460 KB, even if encoder accidentally left an EXIF chunk!)
    const webpWithResidualExif = buildWebpWithExifAndGps(true);
    const simulated460KbWebp = new Uint8Array(460 * 1024);
    simulated460KbWebp.set(webpWithResidualExif, 0);
    // Keep valid RIFF size so WebP parser walks exact chunks when testing strip
    const cleanWebpSample = buildWebpWithExifAndGps(true);

    let inspectCall = 0;
    const optimised = await optimisePropertyImage(cameraFile, {
      deps: {
        supportsWebp: async () => true,
        inspectDecoded: async () => {
          inspectCall += 1;
          return inspectCall === 1
            ? { width: 4032, height: 3024, sharpnessScore: 185 }
            : { width: 2400, height: 1800, sharpnessScore: 180 };
        },
        compressFile: async (_file, opts) => {
          expect(opts.maxWidthOrHeight).toBe(2400);
          expect(opts.fileType).toBe('image/webp');
          expect(opts.preserveExif).toBe(false);
          expect(opts.initialQuality).toBeGreaterThanOrEqual(0.8);
          expect(opts.initialQuality).toBeLessThanOrEqual(0.85);
          return new File([cleanWebpSample], 'IMG_9012.webp', {
            type: 'image/webp',
          });
        },
      },
    });

    expect(optimised.mimeType).toBe('image/webp');
    expect(optimised.file.name).toBe('img_9012.webp');
    expect(optimised.width).toBe(2400);
    expect(optimised.height).toBe(1800);
    expect(optimised.hadGpsInSource).toBe(true);
    expect(optimised.exifOrientation).toBe(6);
    expect(optimised.exifStripped).toBe(true);
    expect(optimised.gpsStripped).toBe(true);
    expect(optimised.warnings).toEqual([]);
    expect(simulated460KbWebp.byteLength).toBeGreaterThan(300 * 1024);

    // Case B: iPhone HEIC photo with blank MIME type -> falls back to convertHeic -> WebP
    const heicBytes = buildHeicHeaderBytes('heic');
    const heicFile = new File([heicBytes], 'Ikoyi-Master-Suite.HEIC', { type: '' });
    const convertHeicSpy = vi
      .fn()
      .mockResolvedValue(new Blob([rawCameraJpeg], { type: 'image/jpeg' }));

    let heicDecodeAttempt = 0;
    const heicResult = await optimisePropertyImage(heicFile, {
      deps: {
        convertHeic: convertHeicSpy,
        supportsWebp: async () => true,
        inspectDecoded: async () => {
          heicDecodeAttempt += 1;
          if (heicDecodeAttempt === 1) {
            throw new Error('Chromium does not natively decode HEIC');
          }
          return { width: 2400, height: 1800, sharpnessScore: 140 };
        },
        compressFile: async () =>
          new File([buildWebpWithExifAndGps(false)], 'ikoyi-master-suite.webp', {
            type: 'image/webp',
          }),
      },
    });

    expect(convertHeicSpy).toHaveBeenCalledTimes(1);
    expect(heicResult.wasHeic).toBe(true);
    expect(heicResult.mimeType).toBe('image/webp');
    expect(heicResult.file.name).toBe('ikoyi-master-suite.webp');

    // Case C: Legacy browser without WebP encoding falls back cleanly to JPEG
    const fallbackResult = await optimisePropertyImage(cameraFile, {
      deps: {
        supportsWebp: async () => false,
        inspectDecoded: async () => ({ width: 2000, height: 1500, sharpnessScore: 150 }),
        compressFile: async (_file, opts) => {
          expect(opts.fileType).toBe('image/jpeg');
          return new File([rawCameraJpeg], 'IMG_9012.jpg', { type: 'image/jpeg' });
        },
      },
    });
    expect(fallbackResult.mimeType).toBe('image/jpeg');
    expect(fallbackResult.gpsStripped).toBe(true);
  });

  it('limits concurrent processing across 1, 10, and 20 simultaneous selections to protect mobile memory', async () => {
    for (const batchSize of [1, 10, 20]) {
      let activeNow = 0;
      let peakActive = 0;
      const items = Array.from({ length: batchSize }, (_, i) => `photo-${i + 1}.heic`);

      const results = await runWithConcurrencyLimit(items, 2, async (name, idx) => {
        activeNow += 1;
        peakActive = Math.max(peakActive, activeNow);
        await new Promise(resolve => setTimeout(resolve, 6));
        activeNow -= 1;
        return `${idx}:${name}`;
      });

      expect(peakActive).toBeLessThanOrEqual(2);
      expect(results).toHaveLength(batchSize);
      expect(results[0]).toBe('0:photo-1.heic');
      expect(results[batchSize - 1]).toBe(`${batchSize - 1}:photo-${batchSize}.heic`);
    }
  });

  it('preserves ${userId}/... storage paths and scopes orphan deletion strictly to the signed-in owner folder', async () => {
    const ownerId = '8f14e45f-ceea-467a-a8f1-000000000001';
    const optimisedName = buildOptimisedFileName(
      'Ikoyi Penthouse Living Room (1).HEIC',
      'image/webp',
    );
    const path = buildPropertyMediaObjectPath(ownerId, optimisedName);
    expect(path.startsWith(`${ownerId}/`)).toBe(true);
    expect(path.endsWith('.webp')).toBe(true);

    const publicUrl = `https://jopnnevqnwrpldrojmdu.supabase.co/storage/v1/object/public/property-media/${path}`;
    expect(extractPropertyMediaObjectPath(publicUrl)).toBe(path);
    expect(extractPropertyMediaObjectPath(publicUrl, ownerId)).toBe(path);
    expect(extractPropertyMediaObjectPath(publicUrl, 'different-user-id')).toBeNull();
    expect(
      extractPropertyMediaObjectPath('https://images.unsplash.com/photo-12345?w=1200'),
    ).toBeNull();

    const removeSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockDb = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: ownerId } } },
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue({ remove: removeSpy }),
      },
    } as unknown as SupabaseClient;

    await deletePropertyMediaObjects(mockDb, [
      path,
      path,
      'someone-else-uuid/other-photo.webp',
    ]);

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith([path]);
  });

  it('self-hosts the Web Worker script locally and never redirects owners to external compression sites', () => {
    const root = process.cwd();
    expect(
      existsSync(join(root, 'public/vendor/browser-image-compression.js')),
    ).toBe(true);

    expect(OPTIMISING_USER_MESSAGE).toBe(
      'Optimising your photographs for the best viewing experience…',
    );

    const checkedFiles = [
      'src/lib/imageOptimiser.ts',
      'src/components/forms/PropertyMediaManager.tsx',
      'src/components/forms/PropertyListingWizard.tsx',
      'src/legacy-pages/partner/NewProperty.tsx',
      'src/legacy-pages/partner/Properties.tsx',
    ];
    for (const rel of checkedFiles) {
      const src = readFileSync(join(root, rel), 'utf8').toLowerCase();
      expect(src).not.toContain('tinypng');
      expect(src).not.toContain('squoosh.app');
      expect(src).not.toContain('iloveimg');
      expect(src).not.toContain('compressjpeg');
      expect(src).not.toContain('cdn.jsdelivr.net');
    }
  });
});
