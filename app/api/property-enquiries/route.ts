import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseEnv, isMissingSchemaObjectError } from '@/lib/next-supabase';
import { normalizeShareToken } from '@/lib/share-engine';

export const runtime = 'nodejs';

type EnquiryBody = {
  propertyId?: string;
  name?: string;
  email?: string;
  message?: string;
  visitorSessionKey?: string | null;
  shareToken?: string | null;
};

export async function POST(request: Request) {
  const env = getPublicSupabaseEnv();
  if (!env) {
    return NextResponse.json(
      { error: 'Property enquiries are not configured on this deployment yet.' },
      { status: 503 },
    );
  }

  let body: EnquiryBody;
  try {
    body = (await request.json()) as EnquiryBody;
  } catch {
    return NextResponse.json({ error: 'Invalid enquiry payload.' }, { status: 400 });
  }

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const visitorSessionKey =
    typeof body.visitorSessionKey === 'string' && body.visitorSessionKey.trim().length >= 12
      ? body.visitorSessionKey.trim().slice(0, 128)
      : null;
  const shareToken = normalizeShareToken(body.shareToken);

  if (!propertyId) {
    return NextResponse.json({ error: 'Property is required.' }, { status: 400 });
  }
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: 'Enter your name (2–120 characters).' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (message.length < 10 || message.length > 1500) {
    return NextResponse.json(
      { error: 'Enter a question between 10 and 1,500 characters.' },
      { status: 400 },
    );
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  const db = createClient(env.url, env.publishableKey, {
    global: bearerToken ? { headers: { Authorization: `Bearer ${bearerToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await db.rpc('submit_property_enquiry', {
    target_property_id: propertyId,
    sender_name: name,
    sender_email: email,
    enquiry_message: message,
    visitor_session_key: visitorSessionKey,
    incoming_share_token: shareToken,
    client_idempotency_key: null,
  });

  if (error) {
    if (isMissingSchemaObjectError(error)) {
      return NextResponse.json(
        { error: 'Property enquiries are temporarily unavailable. Email hello@hamlet.rest.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: error.message || 'Could not submit your enquiry.' },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      enquiry: data,
      message: 'Enquiry sent. The host desk or HAMLET support will reply by email.',
    },
    { status: 201 },
  );
}
