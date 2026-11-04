import { NextResponse } from 'next/server';
import { renderHamletDefaultOgBuffer } from '@/lib/share-artwork';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const png = await renderHamletDefaultOgBuffer();
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('[api/og/default] Failed to render default OG image:', err);
    return NextResponse.json(
      { error: 'Could not render default social preview.' },
      { status: 500 },
    );
  }
}
