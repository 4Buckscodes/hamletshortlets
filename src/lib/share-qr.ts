import QRCode from 'qrcode';

export interface QrRenderOptions {
  /** Pixel width/height of the square QR image (minimum 256, default 1024). */
  size?: number;
  /** Quiet-zone margin in modules (minimum 4 per ISO/IEC 18004 for reliable mobile scanning). */
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generates a high-contrast, standards-compliant PNG buffer for a URL.
 * Never overlays decorative logos on QR modules so every scanner reads cleanly.
 */
export async function generateQrCodePngBuffer(
  targetUrl: string,
  options?: QrRenderOptions,
): Promise<Buffer> {
  const cleanUrl = targetUrl.trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('QR code requires a valid HTTP(S) URL.');
  }

  const size = Math.max(256, Math.min(2048, Math.round(options?.size ?? 1024)));
  const margin = Math.max(4, Math.min(8, Math.round(options?.margin ?? 4)));

  return QRCode.toBuffer(cleanUrl, {
    type: 'png',
    width: size,
    margin,
    errorCorrectionLevel: 'M',
    color: {
      dark: options?.darkColor ?? '#0E1F3B',
      light: options?.lightColor ?? '#FFFFFF',
    },
  });
}

/**
 * Generates a PNG data URL suitable for embedding inside Satori (`next/og`) marketing cards.
 */
export async function generateQrCodeDataUrl(
  targetUrl: string,
  options?: QrRenderOptions,
): Promise<string> {
  const buf = await generateQrCodePngBuffer(targetUrl, {
    size: options?.size ?? 512,
    margin: options?.margin ?? 4,
    darkColor: options?.darkColor ?? '#0E1F3B',
    lightColor: options?.lightColor ?? '#FFFFFF',
  });
  return `data:image/png;base64,${buf.toString('base64')}`;
}
