import { NextResponse } from 'next/server';
import { createServerUserSupabase, isMissingSchemaObjectError } from '@/lib/next-supabase';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearerToken) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const db = createServerUserSupabase(bearerToken);
  if (!db) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  let visitorSessionKey = '';
  try {
    const body = (await request.json()) as { visitorSessionKey?: string };
    visitorSessionKey = typeof body.visitorSessionKey === 'string' ? body.visitorSessionKey.trim() : '';
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }

  if (visitorSessionKey.length < 12 || visitorSessionKey.length > 128) {
    return NextResponse.json({ ok: true, bound: 0 });
  }

  const { data, error } = await db.rpc('bind_share_attribution_to_guest', {
    visitor_session_key: visitorSessionKey,
  });

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    return NextResponse.json({ ok: false, reason: 'bind_failed' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, bound: Number(data ?? 0) });
}
