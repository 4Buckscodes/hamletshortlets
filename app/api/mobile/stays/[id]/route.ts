import { NextResponse } from 'next/server';
import { PUBLIC_PROPERTY_SELECT, toPublicStayRecord } from '@/lib/next-supabase';
import { getPublicSupabase } from '@/lib/supabase-public';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.length > 128) {
    return NextResponse.json({ error: 'Choose a valid stay.' }, { status: 400 });
  }
  const db = getPublicSupabase();
  if (!db) {
    return NextResponse.json({ error: 'The HAMLET property catalogue is not configured.' }, { status: 503 });
  }

  const { data, error } = await db
    .from('properties')
    .select(PUBLIC_PROPERTY_SELECT)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'We could not load this stay right now.' }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ error: 'This stay is not currently available.' }, { status: 404 });
  }

  return NextResponse.json(
    { property: toPublicStayRecord(data as Record<string, unknown>) },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
