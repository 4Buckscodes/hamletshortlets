'use client';

import { useState } from 'react';
import { Copy, MessageCircle, Share2 } from 'lucide-react';
import {
  buildPropertyCanonicalShareUrl,
  buildWhatsAppPropertyShareMessage,
  extractDealCodeFromSearchParams,
  extractShareTokenFromSearchParams,
  readPropertyDealCodeHint,
  readPropertyShareTokenHint,
} from '@/lib/share-engine';

export function GuestShareStrip({
  stay,
}: {
  stay: {
    id: string;
    title: string;
    area: string | null;
    propertyType: string | null;
    bedrooms: number | null;
    capacity: number | null;
    ownerNightlyRateNgn: number | null;
  };
}) {
  const [copiedLabel, setCopiedLabel] = useState('');

  function resolveCurrentShareUrl(): string {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hamlet.rest';
    const canonical = buildPropertyCanonicalShareUrl(stay.id, origin);
    if (typeof window === 'undefined') return canonical;

    const search = new URLSearchParams(window.location.search);
    const activeToken =
      extractShareTokenFromSearchParams(search) || readPropertyShareTokenHint(stay.id);
    const activeDeal =
      extractDealCodeFromSearchParams(search) || readPropertyDealCodeHint(stay.id);

    if (!activeToken) return canonical;
    const tracked = new URL(canonical);
    tracked.searchParams.set('ref', activeToken);
    if (activeDeal) {
      tracked.searchParams.set('deal', activeDeal);
    }
    tracked.searchParams.set('src', 'whatsapp_forward');
    return tracked.toString();
  }

  function buildSummary(trackingUrl: string): string {
    return buildWhatsAppPropertyShareMessage({
      title: stay.title,
      area: stay.area,
      propertyType: stay.propertyType,
      bedrooms: stay.bedrooms,
      capacity: stay.capacity,
      ownerNightlyRateNgn: stay.ownerNightlyRateNgn,
      trackingUrl,
    });
  }

  async function handleCopyLink() {
    const url = resolveCurrentShareUrl();
    await navigator.clipboard.writeText(url);
    setCopiedLabel('Link copied');
    window.setTimeout(() => setCopiedLabel(''), 2200);
  }

  async function handleCopySummary() {
    const url = resolveCurrentShareUrl();
    await navigator.clipboard.writeText(buildSummary(url));
    setCopiedLabel('Summary copied');
    window.setTimeout(() => setCopiedLabel(''), 2200);
  }

  async function handleNativeOrWhatsApp(preferNative: boolean) {
    const url = resolveCurrentShareUrl();
    const summary = buildSummary(url);
    if (preferNative && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${stay.title} — HAMLET`,
          text: summary,
          url,
        });
        return;
      } catch {
        // Fall back to WhatsApp if cancelled or unsupported
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(summary)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void handleNativeOrWhatsApp(false)}
        className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-800 transition hover:border-ink-900"
      >
        <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
        <span>WhatsApp</span>
      </button>
      <button
        type="button"
        onClick={() => void handleCopyLink()}
        className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-800 transition hover:border-ink-900"
      >
        <Copy className="h-3.5 w-3.5 text-brass-700" />
        <span>Copy link</span>
      </button>
      <button
        type="button"
        onClick={() => void handleCopySummary()}
        className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-800 transition hover:border-ink-900"
      >
        <span>Copy summary</span>
      </button>
      <button
        type="button"
        onClick={() => void handleNativeOrWhatsApp(true)}
        className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-xs font-bold text-ink-800 transition hover:border-ink-900"
      >
        <Share2 className="h-3.5 w-3.5 text-ink-700" />
        <span>Share</span>
      </button>
      {copiedLabel && (
        <span className="text-xs font-bold text-emerald-800">{copiedLabel}</span>
      )}
    </div>
  );
}
