import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
type Payload = { title?: string; propertyType?: string; area?: string; address?: string; nightlyRate?: number; cleaningFee?: number; deposit?: number; bedrooms?: number; bathrooms?: number; capacity?: number; bedSetup?: string; amenities?: string[]; imageUrls?: string[]; houseRules?: string[] };

const text = (value: unknown, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value: unknown, maxItems = 20, maxLength = 120) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map(v => v.trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems) : [];

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: 'Property submissions are not configured.' }, { status: 503 });
  const token = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in with an approved partner account.' }, { status: 401 });
  let body: Payload;
  try { body = await request.json() as Payload; } catch { return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 }); }
  const title = text(body.title, 120);
  const propertyType = text(body.propertyType, 60);
  const area = text(body.area, 100);
  const address = text(body.address, 240);
  const nightlyRate = Number(body.nightlyRate);
  const cleaningFee = Number(body.cleaningFee || 0);
  const deposit = Number(body.deposit || 0);
  const bedrooms = Number(body.bedrooms);
  const bathrooms = Number(body.bathrooms);
  const capacity = Number(body.capacity);
  if (title.length < 4 || !propertyType || !area || address.length < 6) return NextResponse.json({ error: 'Complete the title, property type, neighbourhood and property address.' }, { status: 400 });
  if (!Number.isInteger(nightlyRate) || nightlyRate < 1 || nightlyRate > 100000000 || !Number.isInteger(cleaningFee) || cleaningFee < 0 || !Number.isInteger(deposit) || deposit < 0 || !Number.isInteger(bedrooms) || bedrooms < 0 || !Number.isInteger(bathrooms) || bathrooms < 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) return NextResponse.json({ error: 'Check the nightly rate, charges, bedrooms, bathrooms and guest capacity.' }, { status: 400 });
  const imageUrls = list(body.imageUrls, 10, 500).filter(value => { try { const u = new URL(value); return u.protocol === 'https:'; } catch { return false; } });
  const db = createClient(url, key, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: 'Your session expired. Sign in again.' }, { status: 401 });
  const { data: profile, error: profileError } = await db.from('profiles').select('role').eq('id', auth.user.id).maybeSingle();
  if (profileError || profile?.role !== 'partner') return NextResponse.json({ error: 'Only verified HAMLET partners can submit property listings. Partner access is granted after review.' }, { status: 403 });
  const { data, error } = await db.from('properties').insert({
    title, property_type: propertyType, area, public_address: address,
    nightly_rate: nightlyRate, cleaning_fee: cleaningFee, refundable_deposit: deposit,
    bedrooms, bathrooms, capacity, bed_setup: text(body.bedSetup, 120),
    amenities: list(body.amenities), image_urls: imageUrls, house_rules: list(body.houseRules, 20, 240),
    status: 'submitted', trust_label: 'Under review',
    verification: { ownership: 'pending_review', identity: 'pending_review', authority: 'pending_review', inspection: 'missing' },
  }).select('id,title,status').single();
  if (error || !data) return NextResponse.json({ error: error?.code === '42501' ? 'Your account does not have permission to submit listings yet.' : 'We could not save this listing. Please review the details and try again.' }, { status: 400 });
  return NextResponse.json({ property: data, message: 'Listing submitted for HAMLET review. It will not appear publicly until approved.' }, { status: 201 });
}
