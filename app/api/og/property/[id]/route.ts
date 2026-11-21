import { NextResponse } from 'next/server';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  renderHamletDefaultOgBuffer,
  renderPropertyOgBuffer,
  type PropertyOgInput,
} from '@/lib/share-artwork';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const db = getPublicSupabase();

    if (!db || !id?.trim()) {
      const fallback = await renderHamletDefaultOgBuffer();
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      });
    }

    const { data } = await db
      .from('public_properties')
      .select(
        'id,title,area,property_type,bedrooms,bathrooms,capacity,guest_nightly_ngn,image_urls,status,verification',
      )
      .eq('id', id.trim())
      .eq('status', 'approved')
      .maybeSingle();

    if (!data) {
      const fallback = await renderHamletDefaultOgBuffer();
      return new NextResponse(new Uint8Array(fallback), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=120',
        },
      });
    }

    const png = await renderPropertyOgBuffer(data as PropertyOgInput);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[api/og/property/[id]] Failed to render property OG image:', err);
    return NextResponse.json(
      { error: 'Could not render property social preview.' },
      { status: 500 },
    );
  }
}
