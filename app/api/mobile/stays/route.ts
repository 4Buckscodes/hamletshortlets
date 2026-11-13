import { NextResponse } from 'next/server';
import { PUBLIC_PROPERTY_SELECT, toPublicStayRecord } from '@/lib/next-supabase';
import { getPublicSupabase } from '@/lib/supabase-public';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = getPublicSupabase();
  if (!db) {
    return NextResponse.json({ error: 'The HAMLET property catalogue is not configured.' }, { status: 503 });
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limit') || 30);
  const limit = Number.isInteger(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 30;
  const area = url.searchParams.get('area')?.trim().slice(0, 80);

  let query = db
    .from('properties')
    .select(PUBLIC_PROPERTY_SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (area) query = query.ilike('area', '%' + area.replace(/[%_]/g, '') + '%');

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'We could not load approved stays right now.' }, { status: 503 });
  }

  const properties = (data ?? []).map(row =>
    toPublicStayRecord(row as Record<string, unknown>),
  );

  return NextResponse.json(
    { properties, count: properties.length, market: 'Lagos', source: 'approved_public_inventory' },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
