import { NextResponse } from 'next/server';
import { createServerUserSupabase } from '@/lib/next-supabase';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  buildPartnerPropertyTrackingUrl,
  buildPropertyCanonicalShareUrl,
  normalizeShareToken,
  type QrVariant,
} from '@/lib/share-engine';
import { renderBrandedQrPlacardBuffer } from '@/lib/share-artwork';
import { generateQrCodePngBuffer } from '@/lib/share-qr';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId')?.trim() || '';
    const variant: QrVariant =
      searchParams.get('variant') === 'branded' ? 'branded' : 'standalone';
    const requestedToken = normalizeShareToken(searchParams.get('shareToken'));
    const download = searchParams.get('download') === '1';

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required.' }, { status: 400 });
    }

    const publicDb = getPublicSupabase();
    if (!publicDb) {
      return NextResponse.json(
        { error: 'Property directory is not configured on this deployment.' },
        { status: 503 },
      );
    }

    const { data: stay } = await publicDb
      .from('properties')
      .select('id,title,area,status')
      .eq('id', propertyId)
      .eq('status', 'approved')
      .maybeSingle();

    if (!stay) {
      return NextResponse.json(
        { error: 'This stay is unavailable or not currently approved.' },
        { status: 404 },
      );
    }

    let validatedToken: string | null = null;
    const authHeader = request.headers.get('authorization') || '';
    const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

    if (bearerToken) {
      const userDb = createServerUserSupabase(bearerToken);
      if (userDb) {
        const { data: linkData } = await userDb.rpc(
          download ? 'record_partner_share_action' : 'get_or_create_partner_share_link',
          download
            ? {
                target_property_id: propertyId,
                action_type: 'qr_generated',
                event_metadata: { variant },
                client_idempotency_key: null,
              }
            : { target_property_id: propertyId },
        );
        const rpcToken = normalizeShareToken(
          (linkData as { share_token?: string } | null)?.share_token,
        );
        if (rpcToken) {
          validatedToken = rpcToken;
        }
      }
    } else if (requestedToken) {
      // Rendering a QR is not a guest visit. Validate the bearer token without
      // creating a visit event or first-touch attribution session.
      const { data: tokenIsValid, error: tokenValidationError } = await publicDb.rpc(
        'validate_partner_share_token',
        {
          incoming_share_token: requestedToken,
          target_property_id: propertyId,
        },
      );
      if (tokenValidationError || tokenIsValid !== true) {
        return NextResponse.json(
          { error: 'This tracked QR link is no longer available.' },
          { status: 403 },
        );
      }
      validatedToken = requestedToken;
    }

    const targetUrl = validatedToken
      ? buildPartnerPropertyTrackingUrl(propertyId, validatedToken)
      : buildPropertyCanonicalShareUrl(propertyId);

    const png =
      variant === 'branded'
        ? await renderBrandedQrPlacardBuffer({
            title: stay.title,
            area: stay.area,
            targetUrl,
          })
        : await generateQrCodePngBuffer(targetUrl, { size: 1024, margin: 4 });

    const slug = propertyId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'stay';
    const filename = `hamlet-qr-${variant}-${slug}.png`;

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
  } catch (err) {
    console.error('[api/share/qr] Failed to render QR asset:', err);
    return NextResponse.json(
      { error: 'Could not render QR code asset. Please retry in a moment.' },
      { status: 500 },
    );
  }
}
