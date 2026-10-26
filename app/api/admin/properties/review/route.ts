import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
type Body = { propertyId?: string; decision?: string; note?: string; verification?: Record<string, string> };
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: 'Admin review is not configured.' }, { status: 503 });
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in with an administrator account.' }, { status: 401 });
  let body: Body;
  try { body = await request.json() as Body; } catch { return NextResponse.json({ error: 'Invalid review request.' }, { status: 400 }); }
  const id = body.propertyId?.trim();
  const decision = body.decision;
  const note = body.note?.trim() || '';
  const allowed = ['approved', 'needs_correction', 'rejected', 'suspended', 'paused', 'archived'];
  if (!id || !decision || !allowed.includes(decision) || note.length < 10) return NextResponse.json({ error: 'Choose a valid decision and provide a review note of at least 10 characters.' }, { status: 400 });
  const db = createClient(url, key, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 });
  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin') return NextResponse.json({ error: 'Only HAMLET administrators can review listings.' }, { status: 403 });
  const verification = {
    ownership: body.verification?.ownership || 'pending_review',
    identity: body.verification?.identity || 'pending_review',
    authority: body.verification?.authority || 'pending_review',
    inspection: body.verification?.inspection || 'pending_review',
  };
  const { error } = await db.rpc('review_partner_property', {
    target_property_id: id, next_status: decision, reviewer_note: note, verification_data: verification,
  });
  if (error) return NextResponse.json({ error: error.message || 'Review action failed.' }, { status: 400 });
  return NextResponse.json({ ok: true, message: 'Property review saved.' });
}
