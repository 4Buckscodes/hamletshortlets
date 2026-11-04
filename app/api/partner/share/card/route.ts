import { NextResponse } from 'next/server';
import { createServerUserSupabase } from '@/lib/next-supabase';
import {
  buildPartnerPropertyTrackingUrl,
  type MarketingCardFormat,
  type MarketingCardTheme,
  type MarketingCardType,
  type PartnerDealTerms,
  type PartnerIdentityDisplay,
} from '@/lib/share-engine';
import { renderMarketingCardBuffer, type PropertyOgInput } from '@/lib/share-artwork';

export const runtime = 'nodejs';

function parseFormat(raw?: string | null): MarketingCardFormat {
  if (raw === 'portrait' || raw === 'story') return raw;
  return 'social';
}

function parseTheme(raw?: string | null): MarketingCardTheme {
  if (raw === 'ivory' || raw === 'lagoon') return raw;
  return 'midnight';
}

function parseCardType(raw?: string | null): MarketingCardType {
  return raw === 'partner' ? 'partner' : 'guest';
}

function parseIdentity(raw?: string | null): PartnerIdentityDisplay {
  if (raw === 'company' || raw === 'network') return raw;
  return 'name';
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearerToken) {
    return NextResponse.json(
      { error: 'Sign in as an approved HAMLET partner to generate marketing cards.' },
      { status: 401 },
    );
  }

  const db = createServerUserSupabase(bearerToken);
  if (!db) {
    return NextResponse.json(
      { error: 'Partner marketing studio is not configured on this deployment.' },
      { status: 503 },
    );
  }

  const { data: authData, error: authErr } = await db.auth.getUser(bearerToken);
  if (authErr || !authData.user) {
    return NextResponse.json({ error: 'Session expired. Sign in again.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId')?.trim() || '';
  if (!propertyId) {
    return NextResponse.json({ error: 'propertyId is required.' }, { status: 400 });
  }

  const cardType = parseCardType(searchParams.get('cardType'));
  const format = parseFormat(searchParams.get('format'));
  const theme = parseTheme(searchParams.get('theme'));
  const identityMode = parseIdentity(searchParams.get('identity'));
  const imageIndex = Math.max(0, Number(searchParams.get('imageIndex') || 0) || 0);
  const showAmenities = searchParams.get('showAmenities') !== '0';
  const showCapacity = searchParams.get('showCapacity') !== '0';
  const includeQr = searchParams.get('includeQr') !== '0';
  const download = searchParams.get('download') === '1';

  const [profileRes, stayRes, linkRes] = await Promise.all([
    db
      .from('profiles')
      .select('role,account_status,full_name,company')
      .eq('id', authData.user.id)
      .maybeSingle(),
    db
      .from('properties')
      .select(
        'id,title,area,property_type,bedrooms,bathrooms,capacity,nightly_rate,amenities,image_urls,status,verification',
      )
      .eq('id', propertyId)
      .eq('status', 'approved')
      .maybeSingle(),
    db.rpc(download ? 'record_partner_share_action' : 'get_or_create_partner_share_link', {
      target_property_id: propertyId,
      ...(download
        ? {
            action_type: 'card_generated',
            event_metadata: { cardType, format, theme },
            client_idempotency_key: null,
          }
        : {}),
    }),
  ]);

  if (
    !profileRes.data ||
    !['partner', 'admin'].includes(String(profileRes.data.role)) ||
    (profileRes.data.account_status && profileRes.data.account_status !== 'active')
  ) {
    return NextResponse.json(
      { error: 'Approved active partner access is required.' },
      { status: 403 },
    );
  }

  if (!stayRes.data) {
    return NextResponse.json(
      { error: 'This stay is unavailable or not currently approved.' },
      { status: 404 },
    );
  }

  if (linkRes.error || !linkRes.data) {
    return NextResponse.json(
      {
        error:
          linkRes.error?.message ||
          'You are not authorised to market this property.',
      },
      { status: 403 },
    );
  }

  const linkPayload = linkRes.data as {
    share_token: string;
    deal_terms: PartnerDealTerms;
  };

  const targetUrl = buildPartnerPropertyTrackingUrl(propertyId, linkPayload.share_token);

  let partnerDisplayName: string | null = null;
  if (cardType === 'partner') {
    if (identityMode === 'company' && profileRes.data.company?.trim()) {
      partnerDisplayName = profileRes.data.company.trim();
    } else if (identityMode === 'name' && profileRes.data.full_name?.trim()) {
      partnerDisplayName = profileRes.data.full_name.trim();
    } else {
      partnerDisplayName = 'HAMLET Partner Network';
    }
  }

  const png = await renderMarketingCardBuffer({
    stay: stayRes.data as PropertyOgInput & { amenities?: string[] | null },
    cardType,
    format,
    theme,
    targetUrl,
    imageIndex,
    showAmenities,
    showCapacity,
    includeQr,
    partnerDisplayName,
    dealTerms: cardType === 'partner' ? linkPayload.deal_terms : null,
  });

  const slug = propertyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'stay';
  const filename = `hamlet-${cardType}-${format}-${theme}-${slug}.png`;

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      ...(download
        ? { 'Content-Disposition': `attachment; filename="${filename}"` }
        : {}),
    },
  });
}
