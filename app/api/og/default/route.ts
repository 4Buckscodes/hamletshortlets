import { NextResponse } from 'next/server';
import { renderHamletDefaultOgBuffer } from '@/lib/share-artwork';

export const runtime = 'nodejs';

export async function GET() {
  const png = await renderHamletDefaultOgBuffer();
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
