import imageCompression, { type Options as CompressionOptions } from 'browser-image-compression';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PROPERTY_MEDIA_POLICY } from './pricing';

// ─── Constants & Defaults ────────────────────────────────────────────────────

/** Target maximum width or height (~2,400px) while preserving exact aspect ratio. */
export const OPTIMISER_TARGET_MAX_DIMENSION = 2400;

/** Target output size window (300 KB – 700 KB) where image complexity permits. */
export const OPTIMISER_TARGET_MIN_BYTES = 300 * 1024;
export const OPTIMISER_TARGET_MAX_BYTES = 700 * 1024;

/** Hard Supabase Storage bucket ceiling (`property-media` = 5 MB). */
export const OPTIMISER_HARD_MAX_UPLOAD_BYTES = DEFAULT_PROPERTY_MEDIA_POLICY.maxImageFileBytes;

/** Raw device camera file ceiling (50 MB — covers 12 MP / 24 MP / 48 MP iPhone & Android photos). */
export const OPTIMISER_MAX_SOURCE_FILE_BYTES = 50 * 1024 * 1024;

/** Target WebP encoding quality window (80% – 85%). */
export const OPTIMISER_WEBP_INITIAL_QUALITY = 0.84;
export const OPTIMISER_WEBP_MIN_QUALITY = 0.80;

/** Quality safeguard thresholds. */
export const MIN_VALID_IMAGE_DIMENSION = 160;
export const LOW_RESOLUTION_MIN_SHORT_SIDE = 600;
export const LOW_RESOLUTION_MIN_LONG_SIDE = 900;
export const BLUR_LAPLACIAN_VARIANCE_THRESHOLD = 32;

/** Self-hosted worker bundle path (no external CDN requests). */
export const LOCAL_COMPRESSION_WORKER_URL = '/vendor/browser-image-compression.js';

/**
 * Resolves an absolute same-origin URL for `importScripts(...)` inside `blob:` Web Workers
 * (relative paths like `/vendor/...` cannot be resolved against a `blob:` worker base URL).
 */
export function resolveLocalCompressionWorkerUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location?.origin &&
    window.location.origin !== 'null'
  ) {
    return `${window.location.origin}${LOCAL_COMPRESSION_WORKER_URL}`;
  }
  return LOCAL_COMPRESSION_WORKER_URL;
}

/** File `<input accept="...">` attribute covering standard web formats + iPhone HEIC/HEIF. */
export const ACCEPTED_PROPERTY_IMAGE_ACCEPT_ATTR =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

export const OPTIMISING_USER_MESSAGE =
  'Optimising your photographs for the best viewing experience…';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SupportedSourceFormat = 'jpeg' | 'png' | 'webp' | 'heic';

export interface FileFormatClassification {
  supported: boolean;
  format: SupportedSourceFormat | null;
  canonicalMimeType: string | null;
  isHeic: boolean;
  reason?: string;
}

export interface ExifInspectionResult {
  hasExif: boolean;
  hasGps: boolean;
  orientation: number;
}

export interface ImageQualityWarning {
  code: 'low_resolution' | 'blurry';
  message: string;
}

export interface DecodedImageInspection {
  width: number;
  height: number;
  sharpnessScore: number | null;
}

export interface OptimisedImageResult {
  file: File;
  originalBytes: number;
  optimisedBytes: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  mimeType: 'image/webp' | 'image/jpeg' | 'image/png';
  exifStripped: boolean;
  gpsStripped: boolean;
  hadGpsInSource: boolean;
  exifOrientation: number;
  wasHeic: boolean;
  sharpnessScore: number | null;
  warnings: ImageQualityWarning[];
}

export interface OptimisePropertyImageDeps {
  convertHeic?: (blob: Blob) => Promise<Blob>;
  inspectDecoded?: (file: Blob) => Promise<DecodedImageInspection>;
  compressFile?: (file: File, options: CompressionOptions) => Promise<File>;
  supportsWebp?: () => Promise<boolean>;
}

export interface OptimisePropertyImageOptions {
  maxDimension?: number;
  targetMaxBytes?: number;
  hardMaxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  signal?: AbortSignal;
  onProgress?: (progressPct: number) => void;
  deps?: OptimisePropertyImageDeps;
}

// ─── Format & Magic-Byte Detection ───────────────────────────────────────────

const EXTENSION_TO_FORMAT: Record<string, SupportedSourceFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
};

const MIME_TO_FORMAT: Record<string, SupportedSourceFormat> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/heic-sequence': 'heic',
  'image/heif-sequence': 'heic',
};

const FORMAT_TO_MIME: Record<SupportedSourceFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'mif1',
  'msf1',
]);

export function getFileExtension(fileName: string): string {
  const clean = (fileName || '').trim().toLowerCase();
  const dotIdx = clean.lastIndexOf('.');
  if (dotIdx < 0 || dotIdx === clean.length - 1) return '';
  return clean.slice(dotIdx + 1);
}

/**
 * Inspects the first 32 bytes of a file to identify JPEG, PNG, WebP, or ISO-BMFF HEIC/HEIF
 * containers even when mobile browsers or messaging apps strip `file.type` or rename extensions.
 */
export function sniffMagicFormat(header: Uint8Array): SupportedSourceFormat | 'unsupported' | null {
  if (header.byteLength < 4) return null;

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header.byteLength >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return 'png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    header.byteLength >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'webp';
  }

  // ISO Base Media File Format: [4-byte box size] "ftyp" [4-byte major brand]
  if (
    header.byteLength >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    const majorBrand = String.fromCharCode(header[8], header[9], header[10], header[11]).toLowerCase();
    if (HEIF_BRANDS.has(majorBrand)) {
      return 'heic';
    }
    // Inspect compatible brands inside ftyp box (bytes 16..32)
    for (let offset = 16; offset + 4 <= Math.min(header.byteLength, 32); offset += 4) {
      const compat = String.fromCharCode(
        header[offset],
        header[offset + 1],
        header[offset + 2],
        header[offset + 3],
      ).toLowerCase();
      if (HEIF_BRANDS.has(compat)) {
        return 'heic';
      }
    }
    return 'unsupported';
  }

  // Known non-photo signatures (GIF, PDF, BMP, SVG/XML, TIFF)
  if (
    (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) || // GIF
    (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) || // %PDF
    (header[0] === 0x42 && header[1] === 0x4d) || // BMP
    (header[0] === 0x3c && (header[1] === 0x73 || header[1] === 0x3f)) // <svg / <?xml
  ) {
    return 'unsupported';
  }

  return null;
}

export function classifyImageFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  headerBytes?: Uint8Array,
): FileFormatClassification {
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    return {
      supported: false,
      format: null,
      canonicalMimeType: null,
      isHeic: false,
      reason: `"${file?.name || 'Selected file'}" is empty (0 bytes). Please choose a valid photograph.`,
    };
  }

  if (file.size > OPTIMISER_MAX_SOURCE_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = Math.round(OPTIMISER_MAX_SOURCE_FILE_BYTES / (1024 * 1024));
    return {
      supported: false,
      format: null,
      canonicalMimeType: null,
      isHeic: false,
      reason: `"${file.name}" is ${sizeMb} MB, which exceeds the ${maxMb} MB camera photo limit.`,
    };
  }

  const rawMime = (file.type || '').trim().toLowerCase();
  const ext = getFileExtension(file.name || '');

  if (headerBytes && headerBytes.byteLength >= 4) {
    const sniffed = sniffMagicFormat(headerBytes);
    if (sniffed === 'unsupported') {
      return {
        supported: false,
        format: null,
        canonicalMimeType: null,
        isHeic: false,
        reason: `"${file.name}" uses an unsupported format. Upload JPEG, PNG, WebP, or iPhone HEIC/HEIF photographs.`,
      };
    }
    if (sniffed) {
      return {
        supported: true,
        format: sniffed,
        canonicalMimeType: FORMAT_TO_MIME[sniffed],
        isHeic: sniffed === 'heic',
      };
    }
  }

  // Explicit non-supported MIME types (e.g. GIF, SVG, video, PDF, BMP, TIFF)
  if (
    rawMime &&
    rawMime !== 'application/octet-stream' &&
    !MIME_TO_FORMAT[rawMime]
  ) {
    return {
      supported: false,
      format: null,
      canonicalMimeType: null,
      isHeic: false,
      reason: `"${file.name}" (${rawMime}) is not supported. Upload JPEG, PNG, WebP, or iPhone HEIC/HEIF photographs.`,
    };
  }

  const detectedFormat = MIME_TO_FORMAT[rawMime] ?? EXTENSION_TO_FORMAT[ext] ?? null;
  if (!detectedFormat) {
    return {
      supported: false,
      format: null,
      canonicalMimeType: null,
      isHeic: false,
      reason: `"${file.name}" is not a supported photograph format. Please select JPEG, PNG, WebP, or HEIC/HEIF photos.`,
    };
  }

  return {
    supported: true,
    format: detectedFormat,
    canonicalMimeType: FORMAT_TO_MIME[detectedFormat],
    isHeic: detectedFormat === 'heic',
  };
}

// ─── EXIF Orientation, GPS Detection & Binary Metadata Stripping ─────────────

function parseTiffIfd0(tiff: DataView): { orientation: number; hasGps: boolean } {
  if (tiff.byteLength < 8) return { orientation: 1, hasGps: false };
  const byteOrder = tiff.getUint16(0, false);
  const littleEndian = byteOrder === 0x4949;
  if (!littleEndian && byteOrder !== 0x4d4d) {
    return { orientation: 1, hasGps: false };
  }
  if (tiff.getUint16(2, littleEndian) !== 0x002a) {
    return { orientation: 1, hasGps: false };
  }
  const ifdOffset = tiff.getUint32(4, littleEndian);
  if (ifdOffset + 2 > tiff.byteLength) {
    return { orientation: 1, hasGps: false };
  }
  const entryCount = tiff.getUint16(ifdOffset, littleEndian);
  let orientation = 1;
  let hasGps = false;

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > tiff.byteLength) break;
    const tag = tiff.getUint16(entryOffset, littleEndian);
    if (tag === 0x0112) {
      const val = tiff.getUint16(entryOffset + 8, littleEndian);
      if (val >= 1 && val <= 8) orientation = val;
    } else if (tag === 0x8825) {
      // Tag 0x8825 = GPSInfo IFD pointer
      hasGps = true;
    }
  }

  return { orientation, hasGps };
}

/**
 * Inspects JPEG APP1 or WebP RIFF EXIF chunks to read EXIF orientation (1–8)
 * and detect whether EXIF or GPS metadata is embedded in the image bytes.
 */
export function inspectExifMetadata(bytes: Uint8Array): ExifInspectionResult {
  if (bytes.byteLength < 12) {
    return { hasExif: false, hasGps: false, orientation: 1 };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // JPEG: SOI = 0xFFD8
  if (view.getUint16(0, false) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset, false);
      if (marker === 0xffda || marker === 0xffd9) break; // SOS / EOI
      if ((marker & 0xff00) !== 0xff00) break;
      const segLength = view.getUint16(offset + 2, false);
      if (segLength < 2 || offset + 2 + segLength > view.byteLength) break;

      if (marker === 0xffe1 && segLength >= 10) {
        // Check "Exif\0\0" (0x45786966 0x0000)
        if (
          view.getUint32(offset + 4, false) === 0x45786966 &&
          view.getUint16(offset + 8, false) === 0x0000
        ) {
          const tiffStart = offset + 10;
          const tiffLen = segLength - 8;
          const tiffView = new DataView(
            bytes.buffer,
            bytes.byteOffset + tiffStart,
            tiffLen,
          );
          const parsed = parseTiffIfd0(tiffView);
          return {
            hasExif: true,
            hasGps: parsed.hasGps,
            orientation: parsed.orientation,
          };
        }
      }

      offset += 2 + segLength;
    }
    return { hasExif: false, hasGps: false, orientation: 1 };
  }

  // WebP: RIFF .... WEBP
  if (
    view.getUint32(0, false) === 0x52494646 &&
    view.getUint32(8, false) === 0x57454250
  ) {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const fourCc = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      const chunkSize = view.getUint32(offset + 4, true);
      const payloadStart = offset + 8;
      if (payloadStart + chunkSize > view.byteLength) break;

      if (fourCc === 'EXIF' && chunkSize >= 8) {
        let tiffStart = payloadStart;
        let tiffLen = chunkSize;
        if (
          chunkSize >= 14 &&
          view.getUint32(payloadStart, false) === 0x45786966 &&
          view.getUint16(payloadStart + 4, false) === 0x0000
        ) {
          tiffStart += 6;
          tiffLen -= 6;
        }
        const tiffView = new DataView(
          bytes.buffer,
          bytes.byteOffset + tiffStart,
          tiffLen,
        );
        const parsed = parseTiffIfd0(tiffView);
        return {
          hasExif: true,
          hasGps: parsed.hasGps,
          orientation: parsed.orientation,
        };
      }

      const paddedSize = chunkSize + (chunkSize % 2);
      offset = payloadStart + paddedSize;
    }
  }

  return { hasExif: false, hasGps: false, orientation: 1 };
}

/**
 * Deterministically strips EXIF (including GPS coordinates), XMP, IPTC, and comment
 * segments from WebP (RIFF) and JPEG outputs as a binary safeguard on top of canvas re-encoding.
 */
export function stripExifAndMetadataSegments(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength < 12) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // 1. WebP RIFF container: strip EXIF and XMP chunks & clear VP8X metadata flags
  if (
    view.getUint32(0, false) === 0x52494646 &&
    view.getUint32(8, false) === 0x57454250
  ) {
    const keptChunks: Uint8Array[] = [];
    let strippedAny = false;
    let offset = 12;

    while (offset + 8 <= bytes.byteLength) {
      const fourCc = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      const chunkSize = view.getUint32(offset + 4, true);
      const paddedPayload = chunkSize + (chunkSize % 2);
      const chunkEnd = offset + 8 + paddedPayload;
      if (chunkEnd > bytes.byteLength) {
        // Malformed tail — return original intact rather than corrupting image
        return bytes;
      }

      if (fourCc === 'EXIF' || fourCc === 'XMP ' || fourCc === 'XMP\0') {
        strippedAny = true;
      } else {
        const copy = bytes.slice(offset, chunkEnd);
        if (fourCc === 'VP8X' && copy.byteLength >= 12) {
          // Clear EXIF (0x08) and XMP (0x04) feature flags in VP8X header byte 8
          copy[8] = copy[8] & ~0x0c;
        }
        keptChunks.push(copy);
      }

      offset = chunkEnd;
    }

    if (!strippedAny) return bytes;

    const totalBodyBytes = keptChunks.reduce((sum, c) => sum + c.byteLength, 0);
    const out = new Uint8Array(12 + totalBodyBytes);
    out.set(bytes.subarray(0, 12), 0);
    const outView = new DataView(out.buffer);
    outView.setUint32(4, 4 + totalBodyBytes, true); // "WEBP" (4) + chunks
    let writeOffset = 12;
    for (const chunk of keptChunks) {
      out.set(chunk, writeOffset);
      writeOffset += chunk.byteLength;
    }
    return out;
  }

  // 2. JPEG container: strip APP1 (Exif/XMP), APP13 (IPTC), and COM segments
  if (view.getUint16(0, false) === 0xffd8) {
    const segments: Uint8Array[] = [bytes.subarray(0, 2)];
    let strippedAny = false;
    let offset = 2;

    while (offset + 2 <= bytes.byteLength) {
      const marker = view.getUint16(offset, false);
      if (marker === 0xffda) {
        // Start of Scan: copy remaining compressed image data verbatim
        segments.push(bytes.subarray(offset));
        break;
      }
      if (marker === 0xffd9) {
        segments.push(bytes.subarray(offset, offset + 2));
        break;
      }
      if ((marker & 0xff00) !== 0xff00 || offset + 4 > bytes.byteLength) {
        return bytes;
      }
      const segLength = view.getUint16(offset + 2, false);
      const segEnd = offset + 2 + segLength;
      if (segLength < 2 || segEnd > bytes.byteLength) {
        return bytes;
      }

      // Strip APP1 (0xFFE1: EXIF & XMP), APP13 (0xFFED: IPTC), and COM (0xFFFE)
      if (marker === 0xffe1 || marker === 0xffed || marker === 0xfffe) {
        strippedAny = true;
      } else {
        segments.push(bytes.subarray(offset, segEnd));
      }

      offset = segEnd;
    }

    if (!strippedAny) return bytes;

    const totalLength = segments.reduce((sum, s) => sum + s.byteLength, 0);
    const out = new Uint8Array(totalLength);
    let writeOffset = 0;
    for (const seg of segments) {
      out.set(seg, writeOffset);
      writeOffset += seg.byteLength;
    }
    return out;
  }

  return bytes;
}

// ─── Aspect-Ratio-Preserving Resize & Quality Assessment ─────────────────────

export function computeTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = OPTIMISER_TARGET_MAX_DIMENSION,
): { width: number; height: number; resized: boolean; scale: number } {
  const safeW = Math.max(1, Math.round(srcWidth));
  const safeH = Math.max(1, Math.round(srcHeight));
  const longestSide = Math.max(safeW, safeH);

  if (longestSide <= maxDimension) {
    return { width: safeW, height: safeH, resized: false, scale: 1 };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
    resized: true,
    scale,
  };
}

/**
 * Computes the variance of the 3×3 discrete Laplacian operator over perceptual luminance.
 * Higher variance = sharper edges & architectural detail; very low variance = blurry/out-of-focus.
 */
export function computeLaplacianSharpness(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): number {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) {
    return 100;
  }

  const pixelCount = width * height;
  const luma = new Float32Array(pixelCount);
  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    luma[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      const lap =
        luma[idx - width] +
        luma[idx + width] +
        luma[idx - 1] +
        luma[idx + 1] -
        4 * luma[idx];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 100;
  const mean = sum / count;
  return Math.max(0, sumSq / count - mean * mean);
}

export function evaluateImageQuality(params: {
  width: number;
  height: number;
  sharpnessScore: number | null;
}): ImageQualityWarning[] {
  const warnings: ImageQualityWarning[] = [];
  const shortSide = Math.min(params.width, params.height);
  const longSide = Math.max(params.width, params.height);

  if (
    shortSide < LOW_RESOLUTION_MIN_SHORT_SIDE ||
    longSide < LOW_RESOLUTION_MIN_LONG_SIDE
  ) {
    warnings.push({
      code: 'low_resolution',
      message: `Low resolution (${params.width}×${params.height}px) — upload a photo at least 1200×800px where possible so rooms look crisp on desktop and tablet screens.`,
    });
  }

  if (
    params.sharpnessScore !== null &&
    Number.isFinite(params.sharpnessScore) &&
    params.sharpnessScore < BLUR_LAPLACIAN_VARIANCE_THRESHOLD
  ) {
    warnings.push({
      code: 'blurry',
      message:
        'This photo appears soft or slightly blurry — sharp, well-lit photographs improve review approval and guest confidence.',
    });
  }

  return warnings;
}

// ─── Browser Decode, WebP Capability & HEIC Transcoding Helpers ──────────────

let cachedWebpEncodeSupport: boolean | null = null;

export async function defaultSupportsWebpEncoding(): Promise<boolean> {
  if (cachedWebpEncodeSupport !== null) return cachedWebpEncodeSupport;
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    canvas.width = 0;
    canvas.height = 0;
    cachedWebpEncodeSupport = dataUrl.startsWith('data:image/webp');
    return cachedWebpEncodeSupport;
  } catch {
    cachedWebpEncodeSupport = false;
    return false;
  }
}

export async function defaultInspectDecodedImage(
  blob: Blob,
): Promise<DecodedImageInspection> {
  if (typeof window === 'undefined' && typeof createImageBitmap === 'undefined') {
    throw new Error('Image decoding requires a browser environment.');
  }

  // Prefer createImageBitmap with EXIF 'from-image' orientation where supported
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      try {
        bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      } catch {
        bitmap = await createImageBitmap(blob);
      }
      const width = bitmap.width;
      const height = bitmap.height;
      let sharpnessScore: number | null = null;

      if (typeof document !== 'undefined') {
        const sampleScale = Math.min(1, 256 / Math.max(1, width, height));
        const sampleW = Math.max(8, Math.round(width * sampleScale));
        const sampleH = Math.max(8, Math.round(height * sampleScale));
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
          const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
          sharpnessScore = computeLaplacianSharpness(imgData.data, sampleW, sampleH);
        }
        canvas.width = 0;
        canvas.height = 0;
      }

      return { width, height, sharpnessScore };
    } finally {
      bitmap?.close();
    }
  }

  // Fallback HTMLImageElement decode
  return new Promise<DecodedImageInspection>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        let sharpnessScore: number | null = null;
        if (typeof document !== 'undefined') {
          const sampleScale = Math.min(1, 256 / Math.max(1, width, height));
          const sampleW = Math.max(8, Math.round(width * sampleScale));
          const sampleH = Math.max(8, Math.round(height * sampleScale));
          const canvas = document.createElement('canvas');
          canvas.width = sampleW;
          canvas.height = sampleH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, sampleW, sampleH);
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
            sharpnessScore = computeLaplacianSharpness(imgData.data, sampleW, sampleH);
          }
          canvas.width = 0;
          canvas.height = 0;
        }
        resolve({ width, height, sharpnessScore });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Browser could not decode the selected image.'));
    };
    img.src = objectUrl;
  });
}

export async function defaultConvertHeicToJpegBlob(heicBlob: Blob): Promise<Blob> {
  const mod = await import('heic2any');
  const heic2any = mod.default;
  const converted = await heic2any({
    blob: heicBlob,
    toType: 'image/jpeg',
    quality: 0.92,
  });
  return Array.isArray(converted) ? converted[0] : converted;
}

export function buildOptimisedFileName(
  originalName: string,
  outputMimeType: 'image/webp' | 'image/jpeg' | 'image/png',
): string {
  const base = (originalName || 'property-photo')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'property-photo';
  const ext =
    outputMimeType === 'image/webp'
      ? 'webp'
      : outputMimeType === 'image/png'
        ? 'png'
        : 'jpg';
  return `${base}.${ext}`;
}

export function buildFileFingerprint(file: Pick<File, 'name' | 'size' | 'lastModified'>): string {
  return `${(file.name || '').toLowerCase()}::${file.size}::${file.lastModified || 0}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ─── Main Client-Side Property Image Optimiser ───────────────────────────────

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Photo optimisation cancelled.', 'AbortError');
  }
}

/**
 * Optimises a raw device photograph for HAMLET property listings:
 * - Validates format (JPEG, PNG, WebP, HEIC/HEIF) via MIME, extension & magic bytes
 * - Reads source EXIF orientation & GPS presence
 * - Converts HEIC/HEIF seamlessly (native Safari decode first, dynamic `heic2any` fallback)
 * - Evaluates resolution & Laplacian sharpness (blur/low-res quality warnings)
 * - Resizes to <= ~2,400px preserving exact aspect ratio (never stretching or upscaling)
 * - Encodes WebP at 80–85% quality targeting ~300–700 KB (with JPEG fallback on legacy browsers)
 * - Strips all EXIF / GPS / XMP / IPTC metadata segments
 */
export async function optimisePropertyImage(
  sourceFile: File,
  options: OptimisePropertyImageOptions = {},
): Promise<OptimisedImageResult> {
  const {
    maxDimension = OPTIMISER_TARGET_MAX_DIMENSION,
    targetMaxBytes = OPTIMISER_TARGET_MAX_BYTES,
    hardMaxBytes = OPTIMISER_HARD_MAX_UPLOAD_BYTES,
    initialQuality = OPTIMISER_WEBP_INITIAL_QUALITY,
    minQuality = OPTIMISER_WEBP_MIN_QUALITY,
    signal,
    onProgress,
    deps = {},
  } = options;

  const inspectDecoded = deps.inspectDecoded ?? defaultInspectDecodedImage;
  const convertHeic = deps.convertHeic ?? defaultConvertHeicToJpegBlob;
  const compressFile = deps.compressFile ?? imageCompression;
  const checkWebp = deps.supportsWebp ?? defaultSupportsWebpEncoding;

  throwIfAborted(signal);
  onProgress?.(5);

  // 1. Read header / EXIF window (up to first 128 KB — tiny memory footprint)
  const headerSliceBuf = await sourceFile.slice(0, Math.min(sourceFile.size, 131_072)).arrayBuffer();
  const headerBytes = new Uint8Array(headerSliceBuf);

  const classification = classifyImageFile(sourceFile, headerBytes.subarray(0, 32));
  if (!classification.supported || !classification.canonicalMimeType) {
    throw new Error(
      classification.reason ||
        `"${sourceFile.name}" is not a supported photograph format.`,
    );
  }

  const exifInfo = inspectExifMetadata(headerBytes);
  throwIfAborted(signal);
  onProgress?.(15);

  // 2. Prepare a browser-decodable File (handling HEIC/HEIF + missing MIME types)
  let workingFile: File =
    sourceFile.type === classification.canonicalMimeType
      ? sourceFile
      : new File([sourceFile], sourceFile.name, {
          type: classification.canonicalMimeType,
          lastModified: sourceFile.lastModified,
        });

  let decoded: DecodedImageInspection;
  if (classification.isHeic) {
    try {
      // iOS / macOS Safari decodes HEIC/HEIF natively at zero extra cost
      decoded = await inspectDecoded(workingFile);
    } catch {
      throwIfAborted(signal);
      onProgress?.(22);
      try {
        const jpegBlob = await convertHeic(sourceFile);
        workingFile = new File(
          [jpegBlob],
          sourceFile.name.replace(/\.(heic|heif)$/i, '.jpg'),
          {
            type: 'image/jpeg',
            lastModified: sourceFile.lastModified,
          },
        );
        decoded = await inspectDecoded(workingFile);
      } catch {
        throw new Error(
          `Could not decode HEIC/HEIF photo "${sourceFile.name}" on this device. Please export it as JPEG or upload directly from Safari/iPhone.`,
        );
      }
    }
  } else {
    try {
      decoded = await inspectDecoded(workingFile);
    } catch {
      throw new Error(
        `Could not read "${sourceFile.name}". The image file appears corrupted or unsupported.`,
      );
    }
  }

  if (
    decoded.width < MIN_VALID_IMAGE_DIMENSION ||
    decoded.height < MIN_VALID_IMAGE_DIMENSION
  ) {
    throw new Error(
      `"${sourceFile.name}" is too small (${decoded.width}×${decoded.height}px). Property photographs must be at least ${MIN_VALID_IMAGE_DIMENSION}×${MIN_VALID_IMAGE_DIMENSION}px.`,
    );
  }

  const warnings = evaluateImageQuality({
    width: decoded.width,
    height: decoded.height,
    sharpnessScore: decoded.sharpnessScore,
  });

  const targetDims = computeTargetDimensions(decoded.width, decoded.height, maxDimension);
  throwIfAborted(signal);
  onProgress?.(40);

  // 3. Compress & resize with browser-image-compression targeting 80–85% WebP & ~300–700 KB
  const webpSupported = await checkWebp();
  const desiredMime: 'image/webp' | 'image/jpeg' = webpSupported
    ? 'image/webp'
    : 'image/jpeg';

  const baseCompressionOpts: CompressionOptions = {
    maxWidthOrHeight: maxDimension,
    fileType: desiredMime,
    initialQuality,
    maxSizeMB: targetMaxBytes / (1024 * 1024),
    alwaysKeepResolution: true,
    preserveExif: false,
    useWebWorker: typeof Worker !== 'undefined',
    libURL: resolveLocalCompressionWorkerUrl(),
    signal,
    onProgress: pct => {
      const mapped = 40 + Math.round(Math.min(100, Math.max(0, pct)) * 0.45);
      onProgress?.(mapped);
    },
  };

  let compressed = await compressFile(workingFile, baseCompressionOpts);
  throwIfAborted(signal);

  // Step down cleanly to minQuality (0.80 = 80%) if > targetMaxBytes (~700 KB) while keeping 2,400px resolution
  if (compressed.size > targetMaxBytes && minQuality < initialQuality) {
    const stepped = await compressFile(workingFile, {
      ...baseCompressionOpts,
      initialQuality: minQuality,
      maxIteration: 2,
      onProgress: undefined,
    });
    if (stepped.size < compressed.size) {
      compressed = stepped;
    }
  }

  // Only if an extraordinarily dense image STILL exceeds the 5 MB Supabase bucket ceiling,
  // allow iterative dimension/quality reduction so the upload never fails Storage's 5 MB limit.
  if (compressed.size > hardMaxBytes) {
    compressed = await compressFile(workingFile, {
      ...baseCompressionOpts,
      initialQuality: 0.76,
      maxSizeMB: (hardMaxBytes * 0.92) / (1024 * 1024),
      alwaysKeepResolution: false,
      maxIteration: 8,
      onProgress: undefined,
    });
  }

  if (compressed.size > hardMaxBytes) {
    throw new Error(
      `"${sourceFile.name}" could not be optimised under the 5 MB storage limit. Try cropping or selecting a standard camera photo.`,
    );
  }

  onProgress?.(92);

  // 4. Binary EXIF / GPS / XMP strip guarantee + clean .webp/.jpg File wrapper
  const rawOutBytes = new Uint8Array(await compressed.arrayBuffer());
  const cleanBytes = stripExifAndMetadataSegments(rawOutBytes);
  const postCheck = inspectExifMetadata(cleanBytes);

  const actualMime: 'image/webp' | 'image/jpeg' | 'image/png' =
    compressed.type === 'image/webp' ||
    compressed.type === 'image/jpeg' ||
    compressed.type === 'image/png'
      ? compressed.type
      : desiredMime;

  const finalName = buildOptimisedFileName(sourceFile.name, actualMime);
  const cleanArrayBuffer = cleanBytes.buffer.slice(
    cleanBytes.byteOffset,
    cleanBytes.byteOffset + cleanBytes.byteLength,
  ) as ArrayBuffer;
  const optimisedFile = new File([cleanArrayBuffer], finalName, {
    type: actualMime,
    lastModified: Date.now(),
  });

  // Measure final dimensions if resized, falling back to proportional calculation
  let finalWidth = targetDims.width;
  let finalHeight = targetDims.height;
  try {
    const finalDecoded = await inspectDecoded(optimisedFile);
    if (finalDecoded.width > 0 && finalDecoded.height > 0) {
      finalWidth = finalDecoded.width;
      finalHeight = finalDecoded.height;
    }
  } catch {
    // Keep mathematically computed proportional dimensions
  }

  onProgress?.(100);

  return {
    file: optimisedFile,
    originalBytes: sourceFile.size,
    optimisedBytes: optimisedFile.size,
    originalWidth: decoded.width,
    originalHeight: decoded.height,
    width: finalWidth,
    height: finalHeight,
    mimeType: actualMime,
    exifStripped: !postCheck.hasExif,
    gpsStripped: !postCheck.hasGps,
    hadGpsInSource: exifInfo.hasGps,
    exifOrientation: exifInfo.orientation,
    wasHeic: classification.isHeic,
    sharpnessScore: decoded.sharpnessScore,
    warnings,
  };
}

// ─── Bounded Concurrency Queue (Mobile Memory Protection) ────────────────────

export function getRecommendedImageConcurrency(): number {
  if (typeof navigator !== 'undefined') {
    const navWithMem = navigator as Navigator & { deviceMemory?: number };
    if (typeof navWithMem.deviceMemory === 'number' && navWithMem.deviceMemory <= 4) {
      return 2;
    }
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) {
      return 2;
    }
  }
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return 2;
  }
  return 3;
}

/**
 * Executes asynchronous tasks with a strict concurrency cap (`maxConcurrency`) so
 * selecting 10 or 20 large camera photos never decodes all bitmaps in RAM simultaneously.
 */
export async function runWithConcurrencyLimit<T, R>(
  items: readonly T[],
  maxConcurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.trunc(maxConcurrency) || 2);
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const currentIndex = cursor++;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => next(),
  );
  await Promise.all(runners);
  return results;
}

// ─── Supabase Storage Upload (Progress + Retry + Orphan Prevention) ──────────

export function buildPropertyMediaObjectPath(userId: string, fileName: string): string {
  const safeName = (fileName || 'photo.webp')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${Date.now()}-${rand}-${safeName}`;
}

/**
 * Extracts the bucket-relative object path (`<userId>/<filename>`) from a HAMLET
 * public `property-media` URL. Returns `null` for external HTTPS URLs or paths
 * owned by a different user.
 */
export function extractPropertyMediaObjectPath(
  publicUrl: string,
  expectedUserId?: string,
  bucketName = 'property-media',
): string | null {
  if (!publicUrl) return null;
  try {
    const parsed = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx < 0) return null;
    const rawPath = decodeURIComponent(parsed.pathname.slice(idx + marker.length));
    if (!rawPath || rawPath.includes('..')) return null;
    if (expectedUserId && !rawPath.startsWith(`${expectedUserId}/`)) {
      return null;
    }
    return rawPath;
  } catch {
    return null;
  }
}

export interface UploadPropertyImageParams {
  db: SupabaseClient;
  userId: string;
  accessToken?: string;
  file: File;
  bucket?: string;
  objectPath?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onProgress?: (progressPct: number) => void;
}

export interface UploadedStorageObject {
  objectPath: string;
  publicUrl: string;
}

function getSupabasePublicConfig(): { url: string; key: string } | null {
  const url =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL?.trim()) ||
    '';
  const key =
    (typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) ||
    '';
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
}

/**
 * Uploads an optimised image directly to Supabase Storage (`property-media`),
 * emitting real byte-level upload progress on slow mobile networks via XHR when
 * available, with automatic fallback to `db.storage.from(bucket).upload(...)`.
 */
export async function uploadOptimisedPropertyImage({
  db,
  userId,
  accessToken,
  file,
  bucket = 'property-media',
  objectPath: explicitObjectPath,
  signal,
  timeoutMs = 90_000,
  onProgress,
}: UploadPropertyImageParams): Promise<UploadedStorageObject> {
  throwIfAborted(signal);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'Your internet connection appears offline. Check your network and tap Retry.',
    );
  }

  const objectPath = explicitObjectPath || buildPropertyMediaObjectPath(userId, file.name);
  const publicCfg = getSupabasePublicConfig();

  if (typeof XMLHttpRequest !== 'undefined' && accessToken && publicCfg) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const encodedPath = objectPath
        .split('/')
        .map(seg => encodeURIComponent(seg))
        .join('/');
      xhr.open('POST', `${publicCfg.url}/storage/v1/object/${bucket}/${encodedPath}`, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.setRequestHeader('apikey', publicCfg.key);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', '3600');
      xhr.setRequestHeader('Content-Type', file.type || 'image/webp');

      const onAbort = () => {
        xhr.abort();
        reject(new DOMException('Upload cancelled.', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0) {
          onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      };

      xhr.onload = () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve();
          return;
        }
        let errMsg = `Storage upload failed (HTTP ${xhr.status}).`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          if (parsed?.message) errMsg = parsed.message;
          else if (parsed?.error) errMsg = parsed.error;
        } catch {
          // Keep HTTP status message
        }
        reject(new Error(errMsg));
      };

      xhr.onerror = () => {
        signal?.removeEventListener('abort', onAbort);
        reject(
          new Error(
            'Connection interrupted during upload. Your optimised photo is saved in memory — tap Retry.',
          ),
        );
      };

      xhr.ontimeout = () => {
        signal?.removeEventListener('abort', onAbort);
        reject(
          new Error(
            'Upload timed out on a slow connection. Tap Retry to resume without re-selecting the photo.',
          ),
        );
      };

      xhr.send(file);
    });
  } else {
    onProgress?.(20);
    const { error: uploadError } = await db.storage.from(bucket).upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/webp',
    });
    if (uploadError) {
      throw new Error(uploadError.message);
    }
    onProgress?.(100);
  }

  const { data: pub } = db.storage.from(bucket).getPublicUrl(objectPath);
  if (!pub?.publicUrl) {
    throw new Error('Could not resolve public URL for uploaded photo.');
  }

  return {
    objectPath,
    publicUrl: pub.publicUrl,
  };
}

/**
 * Best-effort cleanup of orphaned `property-media` objects owned by the signed-in user.
 * Never throws so UI flows are never blocked if network cleanup fails transiently.
 */
export async function deletePropertyMediaObjects(
  db: SupabaseClient | null,
  objectPaths: readonly string[],
  bucket = 'property-media',
): Promise<void> {
  if (!db || objectPaths.length === 0) return;
  const unique = Array.from(
    new Set(objectPaths.filter(p => Boolean(p) && !p.includes('..'))),
  );
  if (unique.length === 0) return;
  try {
    const { data: sessionData } = await db.auth.getSession();
    const userId = sessionData.session?.user?.id;
    const ownedPaths = userId
      ? unique.filter(path => path.startsWith(`${userId}/`))
      : [];
    if (ownedPaths.length === 0) return;
    await db.storage.from(bucket).remove(ownedPaths);
  } catch {
    // Non-fatal best-effort storage cleanup
  }
}
