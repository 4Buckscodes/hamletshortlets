'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Image as ImageIcon, MessageCircle, QrCode, Share2 } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/next-supabase';
import {
  buildPartnerPropertyTrackingUrl,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppPropertyShareMessage,
} from '@/lib/share-engine';

export interface ShareableStaySummary {
  id: string;
  title: string;
  area?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  capacity?: number | null;
  guestNightlyNgn?: number | null;
  ownerNightlyRateNgn?: number | string | null;
  initialShareToken?: string | null;
}

export function PartnerShareActions({
  stay,
  compact = false,
}: {
  stay: ShareableStaySummary;
  compact?: boolean;
}) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'whatsapp' | 'copy' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const activeShareToken = shareToken ?? stay.initialShareToken ?? null;

  function resolveShareOrigin(): string {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://hamlet.rest';
  }

  async function ensureTokenAndRecord(
    primaryAction: 'whatsapp_handoff' | 'link_copied',
  ): Promise<string> {
    if (!db) {
      throw new Error('Partner sharing is not configured on this deployment.');
    }
    await db.rpc('record_partner_share_action', {
      target_property_id: stay.id,
      action_type: 'share_initiated',
      event_metadata: { channel: primaryAction },
      client_idempotency_key: null,
    });
    const { data, error: rpcError } = await db.rpc('record_partner_share_action', {
      target_property_id: stay.id,
      action_type: primaryAction,
      event_metadata: {},
      client_idempotency_key: null,
    });
    if (rpcError || !data) {
      throw new Error(
        rpcError?.message || 'You are not authorised to share this property.',
      );
    }
    const token = String((data as { share_token?: string }).share_token || '').trim();
    if (!token) {
      throw new Error('Could not generate a tracking link for this property.');
    }
    setShareToken(token);
    return token;
  }

  async function handleWhatsAppShare() {
    setBusyAction('whatsapp');
    setError('');
    try {
      const token = await ensureTokenAndRecord('whatsapp_handoff');
      const trackingUrl = buildPartnerPropertyTrackingUrl(
        stay.id,
        token,
        resolveShareOrigin(),
      );
      const message = buildWhatsAppPropertyShareMessage({
        title: stay.title,
        area: stay.area,
        propertyType: stay.propertyType,
        bedrooms: stay.bedrooms,
        capacity: stay.capacity,
        guestNightlyNgn: stay.guestNightlyNgn,
        ownerNightlyRateNgn:
          stay.ownerNightlyRateNgn != null
            ? Number(stay.ownerNightlyRateNgn)
            : null,
        trackingUrl,
      });
      const waUrl = buildWhatsAppClickToChatUrl(message);
      const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!popup) {
        window.location.assign(waUrl);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not open WhatsApp share.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCopyLink() {
    setBusyAction('copy');
    setError('');
    try {
      const token = await ensureTokenAndRecord('link_copied');
      const trackingUrl = buildPartnerPropertyTrackingUrl(
        stay.id,
        token,
        resolveShareOrigin(),
      );
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not copy property link.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => void handleWhatsAppShare()}
          className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-xs font-extrabold text-white shadow-2xs transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span>
            {busyAction === 'whatsapp' ? 'Preparing…' : 'Share on WhatsApp'}
          </span>
        </button>

        <button
          type="button"
          disabled={busyAction !== null}
          onClick={() => void handleCopyLink()}
          className="secondary-button min-h-[42px] text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
              <span>Link copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 shrink-0" />
              <span>{busyAction === 'copy' ? 'Copying…' : 'Copy link'}</span>
            </>
          )}
        </button>

        {!compact && (
          <>
            <Link
              href={`/partners/marketing?property=${encodeURIComponent(stay.id)}#studio`}
              className="secondary-button min-h-[42px] text-xs"
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Marketing card</span>
            </Link>

            <Link
              href={`/partners/marketing?property=${encodeURIComponent(stay.id)}&tab=qr#studio`}
              className="secondary-button min-h-[42px] text-xs"
            >
              <QrCode className="h-3.5 w-3.5 shrink-0" />
              <span>QR code</span>
            </Link>
          </>
        )}
      </div>

      {activeShareToken && !compact && (
        <p className="m-0 truncate font-mono text-[11px] text-ink-500">
          Tracked link active · ref={activeShareToken.slice(0, 14)}…
        </p>
      )}

      {error && (
        <p role="alert" className="m-0 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Renders a partner distribution bar on `/stays/[id]` ONLY when the signed-in
 * visitor is an authorised active HAMLET partner or admin. Invisible to guests.
 */
export function PartnerPropertyDetailBar({
  stay,
}: {
  stay: ShareableStaySummary;
}) {
  const db = useMemo(() => getBrowserSupabase(), []);
  const [authorised, setAuthorised] = useState(false);

  useEffect(() => {
    if (!db) return;
    let active = true;
    void (async () => {
      try {
        const { data: sess } = await db.auth.getSession();
        const user = sess.session?.user;
        if (!user || !active) return;

        const { data: canShare } = await db.rpc('can_partner_share_property', {
          target_property_id: stay.id,
          target_partner_id: user.id,
        });
        if (active && canShare === true) {
          setAuthorised(true);
        }
      } catch {
        // Keep invisible for guests or unconfigured deployments
      }
    })();
    return () => {
      active = false;
    };
  }, [db, stay.id]);

  if (!authorised) return null;

  return (
    <section
      aria-label="Partner distribution tools"
      className="mb-6 flex flex-col justify-between gap-3 rounded-3xl border border-brass-300/70 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:px-5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-brass-400">
          <Share2 className="h-4 w-4 shrink-0" />
        </span>
        <div>
          <p className="m-0 text-xs font-extrabold uppercase tracking-wider text-brass-700">
            HAMLET Partner Share
          </p>
          <p className="m-0 text-xs text-ink-600">
            Share with your tracked partner attribution link.
          </p>
        </div>
      </div>

      <PartnerShareActions stay={stay} />
    </section>
  );
}
