'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  MessageCircle,
  QrCode,
  Search,
  Sparkles,
} from 'lucide-react';
import { formatAccommodationLabel, getValidGuestNightlyNgn } from '@/lib/discovery';
import {
  getBrowserSupabase,
  isMissingSchemaObjectError,
  PUBLIC_PROPERTY_SELECT,
} from '@/lib/next-supabase';
import { formatNaira, multiplyNairaBasisPoints } from '@/lib/pricing';
import {
  buildPartnerPropertyTrackingUrl,
  buildPropertyCanonicalShareUrl,
  buildWhatsAppClickToChatUrl,
  buildWhatsAppPropertyShareMessage,
  MARKETING_CARD_FORMATS,
  MARKETING_CARD_THEMES,
  type MarketingCardFormat,
  type MarketingCardTheme,
  type MarketingCardType,
  type PartnerDealTerms,
  type PartnerIdentityDisplay,
  type QrVariant,
} from '@/lib/share-engine';
import { PartnerShareActions } from '@/components/share/PartnerShareActions';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { FIELD_INPUT_CLASS, FormField } from '@/components/forms/ProgressiveFormPrimitives';
import { PartnerNav } from '../partner-nav';

interface ShareablePropertyRow {
  id: string;
  title: string;
  area: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  nightly_rate: number;
  guest_nightly_ngn: number;
  amenities: string[] | null;
  image_urls: string[] | null;
  trust_label: string | null;
  allow_partner_sharing: boolean;
  share_token: string | null;
  deal_terms: PartnerDealTerms | null;
}

function PartnerMarketingContent() {
  const db = useMemo(() => getBrowserSupabase(), []);
  const searchParams = useSearchParams();

  const [role, setRole] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [stays, setStays] = useState<ShareablePropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Catalogue filters
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  // Studio controls (initialised directly from URL query params when navigated from quick actions)
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    () => searchParams.get('property') || '',
  );
  const [studioTab, setStudioTab] = useState<'card' | 'qr'>(() =>
    searchParams.get('tab') === 'qr' ? 'qr' : 'card',
  );
  const [cardType, setCardType] = useState<MarketingCardType>('guest');
  const [format, setFormat] = useState<MarketingCardFormat>('portrait');
  const [theme, setTheme] = useState<MarketingCardTheme>('midnight');
  const [identityMode, setIdentityMode] = useState<PartnerIdentityDisplay>('name');
  const [imageIndex, setImageIndex] = useState(0);
  const [showAmenities, setShowAmenities] = useState(true);
  const [showCapacity, setShowCapacity] = useState(true);
  const [includeQr, setIncludeQr] = useState(true);

  // QR generator controls
  const [qrTracked, setQrTracked] = useState(true);
  const [qrVariant, setQrVariant] = useState<QrVariant>('branded');

  // Live preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewRetryCount, setPreviewRetryCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  useEffect(() => {
    if (!db) return;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.access_token) {
        setAccessToken(nextSession.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, [db]);

  const load = useCallback(async () => {
    if (!db) {
      setError('Partner workspace is not configured on this deployment.');
      setLoading(false);
      return;
    }

    const { data: sessionRes } = await db.auth.getSession();
    const session = sessionRes.session;
    if (!session?.user) {
      window.location.assign('/signin?next=/partners/marketing');
      return;
    }

    setAccessToken(session.access_token);

    const { data: profile } = await db
      .from('profiles')
      .select('role,account_status')
      .eq('id', session.user.id)
      .maybeSingle();

    const userRole = String(profile?.role || 'guest');
    setRole(userRole);
    if (userRole !== 'partner' && userRole !== 'admin') {
      setLoading(false);
      return;
    }

    const rpcRes = await db.rpc('list_partner_shareable_properties');
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      const normalized = (rpcRes.data as ShareablePropertyRow[]).map(item => ({
        ...item,
        nightly_rate: Number(item.nightly_rate || 0),
        guest_nightly_ngn:
          Number(item.guest_nightly_ngn || 0) ||
          getValidGuestNightlyNgn(item.nightly_rate) ||
          0,
      }));
      setStays(normalized);
    } else if (isMissingSchemaObjectError(rpcRes.error)) {
      // Schema-tolerant fallback if migration is pending on an environment
      const { data: fallbackRows } = await db
        .from('properties')
        .select(PUBLIC_PROPERTY_SELECT)
        .eq('status', 'approved')
        .order('updated_at', { ascending: false });

      const normalized: ShareablePropertyRow[] = (fallbackRows || []).map(raw => {
        const rate = Number(raw.nightly_rate || 0);
        const estPerNight = multiplyNairaBasisPoints(rate, 1_000);
        return {
          id: raw.id,
          title: raw.title,
          area: raw.area,
          property_type: raw.property_type,
          bedrooms: raw.bedrooms,
          bathrooms: raw.bathrooms,
          capacity: raw.capacity,
          nightly_rate: rate,
          guest_nightly_ngn: getValidGuestNightlyNgn(rate) || 0,
          amenities: raw.amenities,
          image_urls: raw.image_urls,
          trust_label: raw.trust_label,
          allow_partner_sharing: true,
          share_token: null,
          deal_terms: {
            authorised: true,
            relationship: 'closing_agent',
            commission_rate: 0.1,
            estimated_per_night_ngn: estPerNight,
            basis_label: '10% of owner base rate on completed stays',
            disclaimer: 'Estimated opportunity on completed stays; not a guaranteed payout.',
          },
        };
      });
      setStays(normalized);
    } else if (rpcRes.error) {
      setError(rpcRes.error.message || 'Could not load shareable stays.');
    }

    setLoading(false);
  }, [db]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selectedStay = useMemo(
    () => stays.find(s => s.id === selectedPropertyId) || stays[0] || null,
    [stays, selectedPropertyId],
  );

  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    for (const s of stays) {
      if (s.area?.trim()) set.add(s.area.trim());
    }
    return Array.from(set).sort();
  }, [stays]);

  const filteredStays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stays.filter(s => {
      if (areaFilter !== 'all' && (s.area || '') !== areaFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.area || '').toLowerCase().includes(q) ||
        (s.property_type || '').toLowerCase().includes(q)
      );
    });
  }, [stays, areaFilter, searchQuery]);

  // Build API URL for live preview / download
  const buildArtworkEndpoint = useCallback(
    (download: boolean): string | null => {
      if (!selectedStay) return null;
      if (studioTab === 'qr') {
        const params = new URLSearchParams({
          propertyId: selectedStay.id,
          variant: qrVariant,
          ...(download ? { download: '1' } : {}),
        });
        return `/api/share/qr?${params.toString()}`;
      }

      const params = new URLSearchParams({
        propertyId: selectedStay.id,
        cardType,
        format,
        theme,
        identity: identityMode,
        imageIndex: String(imageIndex),
        showAmenities: showAmenities ? '1' : '0',
        showCapacity: showCapacity ? '1' : '0',
        includeQr: includeQr ? '1' : '0',
        ...(download ? { download: '1' } : {}),
      });
      return `/api/partner/share/card?${params.toString()}`;
    },
    [
      selectedStay,
      studioTab,
      qrVariant,
      cardType,
      format,
      theme,
      identityMode,
      imageIndex,
      showAmenities,
      showCapacity,
      includeQr,
    ],
  );

  // Render live preview whenever studio configuration changes
  useEffect(() => {
    const endpoint = buildArtworkEndpoint(false);
    if (!endpoint || !accessToken) return;

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError('');

      try {
        let token = accessToken;
        if (db) {
          const { data: sessionRes } = await db.auth.getSession();
          if (sessionRes.session?.access_token) {
            token = sessionRes.session.access_token;
          }
        }
        if (controller.signal.aborted) return;

        const headers: Record<string, string> = {};
        if (studioTab === 'card' || qrTracked) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(endpoint, { headers, signal: controller.signal });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || 'Could not generate preview.');
        }

        const bytes = await res.arrayBuffer();
        if (controller.signal.aborted) return;

        const blob = new Blob([bytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError')
        ) {
          return;
        }
        setPreviewError(
          err instanceof Error ? err.message : 'Could not load preview.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [buildArtworkEndpoint, accessToken, db, studioTab, qrTracked, previewRetryCount]);

  async function handleDownloadAsset() {
    const endpoint = buildArtworkEndpoint(true);
    if (!endpoint || !selectedStay) return;

    setDownloading(true);
    setPreviewError('');
    try {
      let token = accessToken;
      if (db) {
        const { data: sessionRes } = await db.auth.getSession();
        if (sessionRes.session?.access_token) {
          token = sessionRes.session.access_token;
        }
      }

      const headers: Record<string, string> = {};
      if ((studioTab === 'card' || qrTracked) && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not download image.');
      }
      const bytes = await res.arrayBuffer();
      const blob = new Blob([bytes], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      const slug = selectedStay.id.slice(0, 12);
      a.download =
        studioTab === 'qr'
          ? `hamlet-qr-${qrVariant}-${slug}.png`
          : `hamlet-${cardType}-${format}-${theme}-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (caught) {
      setPreviewError(
        caught instanceof Error ? caught.message : 'Download failed.',
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyQrTargetLink() {
    if (!selectedStay || !db) return;
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://hamlet.rest';
      let targetUrl = buildPropertyCanonicalShareUrl(selectedStay.id, origin);

      if (qrTracked) {
        const { data } = await db.rpc('record_partner_share_action', {
          target_property_id: selectedStay.id,
          action_type: 'link_copied',
          event_metadata: { source: 'qr_studio' },
          client_idempotency_key: null,
        });
        const token = (data as { share_token?: string } | null)?.share_token;
        if (token) {
          targetUrl = buildPartnerPropertyTrackingUrl(selectedStay.id, token, origin);
        }
      }

      await navigator.clipboard.writeText(targetUrl);
      setCopiedQrLink(true);
      window.setTimeout(() => setCopiedQrLink(false), 2400);
    } catch (caught) {
      setPreviewError(
        caught instanceof Error ? caught.message : 'Could not copy QR target URL.',
      );
    }
  }

  async function handleStudioWhatsAppShare() {
    if (!selectedStay || !db) return;
    try {
      await db.rpc('record_partner_share_action', {
        target_property_id: selectedStay.id,
        action_type: 'share_initiated',
        event_metadata: { source: 'marketing_studio' },
        client_idempotency_key: null,
      });
      const { data, error: rpcErr } = await db.rpc('record_partner_share_action', {
        target_property_id: selectedStay.id,
        action_type: 'whatsapp_handoff',
        event_metadata: { source: 'marketing_studio' },
        client_idempotency_key: null,
      });
      if (rpcErr || !data) {
        throw new Error(rpcErr?.message || 'Could not create tracking link.');
      }
      const token = String((data as { share_token?: string }).share_token || '');
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://hamlet.rest';
      const trackingUrl = buildPartnerPropertyTrackingUrl(
        selectedStay.id,
        token,
        origin,
      );
      const msg = buildWhatsAppPropertyShareMessage({
        title: selectedStay.title,
        area: selectedStay.area,
        propertyType: selectedStay.property_type,
        bedrooms: selectedStay.bedrooms,
        capacity: selectedStay.capacity,
        guestNightlyNgn: selectedStay.guest_nightly_ngn,
        ownerNightlyRateNgn: selectedStay.nightly_rate,
        trackingUrl,
      });
      const waUrl = buildWhatsAppClickToChatUrl(msg);
      const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (!popup) window.location.assign(waUrl);
    } catch (caught) {
      setPreviewError(
        caught instanceof Error ? caught.message : 'Could not open WhatsApp.',
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="shell flex-1 py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">HAMLET Share Engine</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-900 sm:text-5xl">
              Share & Marketing Studio
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Share verified Lagos stays on WhatsApp with one tap, generate branded flyers and scannable QR codes, and keep attribution through booking settlement.
            </p>
          </div>
          {(role === 'partner' || role === 'admin') && (
            <PartnerNav current="marketing" />
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800"
          >
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" className="mt-8 text-sm text-ink-600">
            Loading shareable stays & studio…
          </p>
        ) : role !== 'partner' && role !== 'admin' ? (
          <section className="mt-8 max-w-2xl rounded-3xl border border-ink-200 bg-white p-7">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              Partner approval required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Activate your HAMLET partner account to access tracked WhatsApp links, marketing cards, and referral commissions.
            </p>
            <div className="mt-5">
              <Link href="/partners/apply" className="primary-button">
                Join Partner Network →
              </Link>
            </div>
          </section>
        ) : stays.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-dashed border-ink-300 bg-white p-10 text-center">
            <h2 className="serif m-0 text-2xl font-medium text-ink-900">
              No approved stays open for sharing yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-600">
              Only approved, live properties authorised for partner sharing appear here. Draft, paused, and under-review stays cannot be shared publicly.
            </p>
          </section>
        ) : (
          <>
            {/* Interactive Marketing Studio & QR Generator */}
            <section
              id="studio"
              aria-label="Marketing Card Studio and QR Code Generator"
              className="mt-8 scroll-mt-24 rounded-3xl border border-ink-200 bg-white p-5 shadow-2xs sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-brass-400">
                    <Sparkles className="h-4 w-4 shrink-0" />
                  </span>
                  <div>
                    <h2 className="serif m-0 text-2xl font-medium text-ink-950">
                      {studioTab === 'card'
                        ? 'Branded Property Card Studio'
                        : 'Property QR Code Generator'}
                    </h2>
                    <p className="m-0 text-xs text-ink-500">
                      Accurate HAMLET pricing and tracked attribution baked into every export.
                    </p>
                  </div>
                </div>

                <div
                  role="tablist"
                  aria-label="Studio mode"
                  className="inline-flex rounded-full border border-ink-200 bg-paper p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'card'}
                    onClick={() => setStudioTab('card')}
                    className={`inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-bold transition ${
                      studioTab === 'card'
                        ? 'bg-ink-950 text-white'
                        : 'text-ink-700 hover:text-ink-950'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>Marketing cards</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={studioTab === 'qr'}
                    onClick={() => setStudioTab('qr')}
                    className={`inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-bold transition ${
                      studioTab === 'qr'
                        ? 'bg-ink-950 text-white'
                        : 'text-ink-700 hover:text-ink-950'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5 shrink-0" />
                    <span>QR generator</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 grid items-start gap-7 lg:grid-cols-12">
                {/* Left Controls */}
                <div className="space-y-5 lg:col-span-6">
                  <FormField label="1. Select approved stay">
                    {fieldProps => (
                      <select
                        {...fieldProps}
                        value={selectedStay?.id || ''}
                        onChange={e => {
                          setSelectedPropertyId(e.target.value);
                          setImageIndex(0);
                        }}
                        className={FIELD_INPUT_CLASS}
                      >
                        {stays.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.title} — {s.area || 'Lagos'} (
                            {formatNaira(s.guest_nightly_ngn)}/night)
                          </option>
                        ))}
                      </select>
                    )}
                  </FormField>

                  {studioTab === 'card' ? (
                    <>
                      {/* Card Type */}
                      <div>
                        <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                          2. Card audience
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setCardType('guest')}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                              cardType === 'guest'
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-paper/60 text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Guest-facing card
                            </p>
                            <p
                              className={`m-0 mt-1 text-[11px] leading-snug ${
                                cardType === 'guest'
                                  ? 'text-white/75'
                                  : 'text-ink-500'
                              }`}
                            >
                              Clean stay flyer with guest price & tracked booking QR. Zero earnings shown.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCardType('partner')}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                              cardType === 'partner'
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-paper/60 text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Partner opportunity card
                            </p>
                            <p
                              className={`m-0 mt-1 text-[11px] leading-snug ${
                                cardType === 'partner'
                                  ? 'text-white/75'
                                  : 'text-ink-500'
                              }`}
                            >
                              Includes authorised partner earning opportunity & co-branded attribution.
                            </p>
                          </button>
                        </div>

                        {cardType === 'partner' && selectedStay && (
                          <p className="m-0 mt-2 rounded-xl border border-brass-300/70 bg-brass-500/10 px-3 py-2 text-[11px] text-ink-800">
                            {selectedStay.deal_terms?.authorised &&
                            (selectedStay.deal_terms.estimated_per_night_ngn ?? 0) > 0 ? (
                              <>
                                <strong>Authorised opportunity:</strong> Est.{' '}
                                {formatNaira(
                                  selectedStay.deal_terms.estimated_per_night_ngn ?? 0,
                                )}
                                /night ({selectedStay.deal_terms.basis_label || 'completed stays'}).
                              </>
                            ) : (
                              <>
                                <strong>Note:</strong> No partner commission rate is active on this stay; the flyer omits earnings rather than inventing figures.
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Format */}
                      <div>
                        <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                          3. Export dimensions
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {MARKETING_CARD_FORMATS.map(spec => {
                            const active = format === spec.id;
                            return (
                              <button
                                key={spec.id}
                                type="button"
                                onClick={() => setFormat(spec.id)}
                                className={`cursor-pointer rounded-2xl border px-3 py-2.5 text-left transition ${
                                  active
                                    ? 'border-ink-950 bg-ink-950 text-white'
                                    : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
                                }`}
                              >
                                <p className="m-0 text-xs font-extrabold">
                                  {spec.label}
                                </p>
                                <p
                                  className={`m-0 mt-0.5 font-mono text-[10px] ${
                                    active ? 'text-brass-400' : 'text-ink-500'
                                  }`}
                                >
                                  {spec.width} × {spec.height}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visual Theme */}
                      <div>
                        <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                          4. Visual template
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {MARKETING_CARD_THEMES.map(t => {
                            const active = theme === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setTheme(t.id)}
                                className={`cursor-pointer rounded-2xl border px-3 py-2.5 text-left transition ${
                                  active
                                    ? 'border-brass-600 bg-brass-500/15 text-ink-950'
                                    : 'border-ink-200 bg-white text-ink-800 hover:border-ink-500'
                                }`}
                              >
                                <p className="m-0 text-xs font-extrabold">
                                  {t.label}
                                </p>
                                <p className="m-0 mt-0.5 text-[10px] text-ink-500">
                                  {t.summary}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Photo Selection (when multiple photos exist) */}
                      {selectedStay?.image_urls &&
                        selectedStay.image_urls.length > 1 && (
                          <div>
                            <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                              5. Featured photo ({selectedStay.image_urls.length}{' '}
                              available)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedStay.image_urls.slice(0, 6).map((url, idx) => (
                                <button
                                  key={`${url}-${idx}`}
                                  type="button"
                                  onClick={() => setImageIndex(idx)}
                                  className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                                    imageIndex === idx
                                      ? 'border-ink-950 bg-ink-950 text-white'
                                      : 'border-ink-200 bg-white text-ink-700 hover:border-ink-500'
                                  }`}
                                >
                                  Photo {idx + 1}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Optional Non-Sensitive Toggles & Partner Identity */}
                      <div className="space-y-3 rounded-2xl border border-ink-100 bg-paper/70 p-4">
                        <p className="m-0 text-xs font-bold text-ink-900">
                          Card details
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-ink-800">
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={showAmenities}
                              onChange={e => setShowAmenities(e.target.checked)}
                              className="h-4 w-4 accent-ink-950"
                            />
                            Show amenities
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={showCapacity}
                              onChange={e => setShowCapacity(e.target.checked)}
                              className="h-4 w-4 accent-ink-950"
                            />
                            Show guest capacity
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={includeQr}
                              onChange={e => setIncludeQr(e.target.checked)}
                              className="h-4 w-4 accent-ink-950"
                            />
                            Embed tracked QR
                          </label>
                        </div>

                        {cardType === 'partner' && (
                          <FormField label="Co-branded partner identity">
                            {fieldProps => (
                              <select
                                {...fieldProps}
                                value={identityMode}
                                onChange={e =>
                                  setIdentityMode(
                                    e.target.value as PartnerIdentityDisplay,
                                  )
                                }
                                className={FIELD_INPUT_CLASS}
                              >
                                <option value="name">My full name</option>
                                <option value="company">My company name</option>
                                <option value="network">
                                  HAMLET Partner Network (anonymous)
                                </option>
                              </select>
                            )}
                          </FormField>
                        )}
                      </div>
                    </>
                  ) : (
                    /* QR Generator Controls */
                    <>
                      <div>
                        <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                          2. QR target & attribution
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setQrTracked(true)}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                              qrTracked
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-paper/60 text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Partner-tracked QR
                            </p>
                            <p
                              className={`m-0 mt-1 text-[11px] ${
                                qrTracked ? 'text-white/75' : 'text-ink-500'
                              }`}
                            >
                              Encodes your unique HAMLET partner attribution link.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrTracked(false)}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                              !qrTracked
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-paper/60 text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Canonical property QR
                            </p>
                            <p
                              className={`m-0 mt-1 text-[11px] ${
                                !qrTracked ? 'text-white/75' : 'text-ink-500'
                              }`}
                            >
                              Direct public stay URL without partner tracking.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="m-0 mb-2 text-xs font-bold text-ink-900">
                          3. QR export style
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => setQrVariant('branded')}
                            className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                              qrVariant === 'branded'
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Branded HAMLET QR
                            </p>
                            <p
                              className={`m-0 mt-0.5 text-[10px] ${
                                qrVariant === 'branded'
                                  ? 'text-brass-400'
                                  : 'text-ink-500'
                              }`}
                            >
                              1080 × 1350 print placard
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrVariant('standalone')}
                            className={`cursor-pointer rounded-2xl border p-3 text-left transition ${
                              qrVariant === 'standalone'
                                ? 'border-ink-950 bg-ink-950 text-white'
                                : 'border-ink-200 bg-white text-ink-900 hover:border-ink-500'
                            }`}
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Standalone QR
                            </p>
                            <p
                              className={`m-0 mt-0.5 text-[10px] ${
                                qrVariant === 'standalone'
                                  ? 'text-brass-400'
                                  : 'text-ink-500'
                              }`}
                            >
                              1024 × 1024 crisp matrix
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIncludeQr(true);
                              setStudioTab('card');
                            }}
                            className="cursor-pointer rounded-2xl border border-ink-200 bg-white p-3 text-left text-ink-900 transition hover:border-ink-500"
                          >
                            <p className="m-0 text-xs font-extrabold">
                              Card + embedded QR →
                            </p>
                            <p className="m-0 mt-0.5 text-[10px] text-ink-500">
                              Full photo flyer with QR
                            </p>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Live Preview & Actions */}
                <div className="rounded-3xl border border-ink-100 bg-paper p-4 sm:p-6 lg:col-span-6">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-ink-600">
                      Live export preview
                    </span>
                    {previewLoading && (
                      <span className="text-xs font-semibold text-brass-700">
                        Rendering…
                      </span>
                    )}
                  </div>

                  <div className="flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-ink-200/80 bg-ink-950/5 p-3">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={
                          selectedStay
                            ? `${selectedStay.title} HAMLET marketing preview`
                            : 'HAMLET marketing preview'
                        }
                        className="max-h-[460px] w-auto max-w-full rounded-xl object-contain shadow-md"
                      />
                    ) : previewError ? (
                      <div className="flex flex-col items-center gap-2.5 text-center">
                        <p className="m-0 max-w-xs text-xs font-semibold text-ink-700">
                          Preview unavailable right now.
                        </p>
                        <button
                          type="button"
                          onClick={() => setPreviewRetryCount(c => c + 1)}
                          className="secondary-button min-h-[36px] px-4 text-xs"
                        >
                          Retry preview
                        </button>
                      </div>
                    ) : (
                      <p className="m-0 text-xs text-ink-500">
                        {previewLoading
                          ? 'Generating high-resolution PNG…'
                          : 'Select a stay to preview artwork.'}
                      </p>
                    )}
                  </div>

                  {previewError && (
                    <p
                      role="alert"
                      className="m-0 mt-3 text-xs font-semibold text-red-700"
                    >
                      {previewError}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={downloading || !selectedStay}
                      onClick={() => void handleDownloadAsset()}
                      className="primary-button min-h-[44px] flex-1 text-xs"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span>
                        {downloading
                          ? 'Downloading…'
                          : studioTab === 'qr'
                            ? 'Download QR PNG'
                            : 'Download Flyer PNG'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedStay}
                      onClick={() => void handleStudioWhatsAppShare()}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <span>Share on WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedStay}
                      onClick={() => void handleCopyQrTargetLink()}
                      className="secondary-button min-h-[44px] text-xs"
                    >
                      {copiedQrLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 shrink-0" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Shareable Approved Properties Directory */}
            <section aria-label="Shareable approved properties" className="mt-10">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="serif m-0 text-2xl font-medium text-ink-950 sm:text-3xl">
                    Approved stays ready to share ({filteredStays.length})
                  </h2>
                  <p className="m-0 mt-1 text-xs text-ink-600">
                    Every link carries your opaque HAMLET attribution token across browsing, sign-up, and booking settlement.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search stays or areas…"
                      aria-label="Search shareable stays"
                      className="min-h-[42px] w-full rounded-full border border-ink-200 bg-white pr-4 pl-9 text-xs font-medium text-ink-900 focus:border-ink-950 focus:outline-none"
                    />
                  </div>

                  <select
                    aria-label="Filter by Lagos neighbourhood"
                    value={areaFilter}
                    onChange={e => setAreaFilter(e.target.value)}
                    className="min-h-[42px] rounded-full border border-ink-200 bg-white px-4 text-xs font-bold text-ink-800 focus:border-ink-950 focus:outline-none"
                  >
                    <option value="all">All Lagos areas</option>
                    {availableAreas.map(area => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {filteredStays.map(stay => (
                  <article
                    key={stay.id}
                    className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="m-0 text-[11px] font-extrabold uppercase tracking-wider text-brass-700">
                            {stay.area || 'Lagos'} ·{' '}
                            {formatAccommodationLabel(
                              stay.property_type,
                              stay.bedrooms,
                            )}
                          </p>
                          <h3 className="serif m-0 mt-1 text-xl font-medium text-ink-950 sm:text-2xl">
                            <Link
                              href={`/stays/${encodeURIComponent(stay.id)}`}
                              className="hover:underline"
                            >
                              {stay.title}
                            </Link>
                          </h3>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="m-0 font-mono text-base font-extrabold text-ink-950">
                            {formatNaira(stay.guest_nightly_ngn)}
                          </p>
                          <p className="m-0 text-[11px] text-ink-500">
                            guest / night
                          </p>
                        </div>
                      </div>

                      {stay.deal_terms?.authorised &&
                        (stay.deal_terms.estimated_per_night_ngn ?? 0) > 0 && (
                          <p className="m-0 mt-2.5 inline-block rounded-full border border-brass-300/70 bg-brass-500/10 px-3 py-1 text-[11px] font-bold text-ink-900">
                            Est. partner opportunity:{' '}
                            <span className="font-mono">
                              {formatNaira(
                                stay.deal_terms.estimated_per_night_ngn ?? 0,
                              )}
                              /night
                            </span>{' '}
                            on completed stays
                          </p>
                        )}
                    </div>

                    <div className="mt-4 border-t border-ink-100 pt-4">
                      <PartnerShareActions
                        stay={{
                          id: stay.id,
                          title: stay.title,
                          area: stay.area,
                          propertyType: stay.property_type,
                          bedrooms: stay.bedrooms,
                          capacity: stay.capacity,
                          guestNightlyNgn: stay.guest_nightly_ngn,
                          ownerNightlyRateNgn: stay.nightly_rate,
                          initialShareToken: stay.share_token,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default function PartnerMarketingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col bg-paper">
          <SiteHeader />
          <main className="shell flex-1 py-10">
            <p className="text-sm text-ink-600">Loading Marketing Studio…</p>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <PartnerMarketingContent />
    </Suspense>
  );
}
