import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, isMissingSchemaObjectError } from '@/lib/next-supabase';
import { normalizeShareToken } from '@/lib/share-engine';

export const runtime = 'nodejs';

type VisitBody = {
  shareToken?: string;
  visitorSessionKey?: string;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  const env = getPublicSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, skipped: true }, { status: 200 });
  }

  let body: VisitBody;
  try {
    body = (await request.json()) as VisitBody;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 });
  }

  const shareToken = normalizeShareToken(body.shareToken);
  const visitorSessionKey =
    typeof body.visitorSessionKey === 'string' ? body.visitorSessionKey.trim() : '';
  const idempotencyKey =
    typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim().slice(0, 160) : null;

  if (!shareToken || visitorSessionKey.length < 12 || visitorSessionKey.length > 128) {
    return NextResponse.json({ ok: true, valid: false, reason: 'invalid_input' });
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  const db = createClient(env.url, env.publishableKey, {
    global: bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db.rpc('record_share_link_visit', {
    incoming_share_token: shareToken,
    visitor_session_key: visitorSessionKey,
    client_idempotency_key: idempotencyKey,
  });

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    return NextResponse.json({ ok: true, valid: false, reason: 'rpc_unavailable' });
  }

  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}
