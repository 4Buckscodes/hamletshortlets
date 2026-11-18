import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Bath, BedDouble, Check, CheckCircle2, Clock, MapPin, ShieldCheck, Users } from 'lucide-react';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  getStayTrustStatus,
  getValidGuestNightlyNgn,
} from '@/lib/discovery';
import { formatNaira } from '@/lib/pricing';
import { buildPropertyPreviewVersion } from '@/lib/share-engine';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  PUBLIC_PROPERTY_SELECT,
  probePropertyWayfinderMeta,
  toPublicStayRecord,
} from '@/lib/next-supabase';
import {
  buildNextCanonicalUrl,
  buildPropertyDetailSchema,
  HAMLET_BRAND,
  HAMLET_CANONICAL_ORIGIN,
} from '@/lib/structured-data';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { StatusPill, type StatusTone } from '@/components/ui';
import { StayGallery } from './stay-gallery';
import BookingRequestForm from './booking-request-form';
import { PartnerPropertyDetailBar } from '@/components/share/PartnerShareActions';
import { PropertyEnquiryCard } from '@/components/share/PropertyEnquiryCard';

type Props = { params: Promise<{ id: string }> };

const PILLAR_LABELS: Array<{ key: string; label: string }> = [
  { key: 'ownership', label: 'Ownership / title evidence' },
  { key: 'identity', label: 'Partner identity check' },
  { key: 'authority', label: 'Authority to list' },
  { key: 'inspection', label: 'Physical property inspection' },
];

const STATUS_BADGE: Record<string, { text: string; tone: StatusTone }> = {
  verified: { text: 'Verified by HAMLET', tone: 'ok' },
  self_reported: { text: 'Self-reported', tone: 'neutral' },
  pending_review: { text: 'Pending review', tone: 'warn' },
  missing: { text: 'Not yet provided', tone: 'neutral' },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = getPublicSupabase();
  if (!db) {
    return {
      title: 'Stay details',
      robots: { index: false, follow: false },
    };
  }
  const { data } = await db
    .from('properties')
    .select('title,area,property_type,bedrooms,capacity,nightly_rate,image_urls,updated_at')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!data) {
    return {
      title: 'Stay unavailable',
      robots: { index: false, follow: false },
    };
  }

  const areaLabel = data.area || 'Lagos';
  const guestNightly = getValidGuestNightlyNgn(data.nightly_rate);
  const accommodationSummary = formatAccommodationLabel(
    data.property_type,
    data.bedrooms,
  );
  const priceSnippet =
    guestNightly !== null ? ` · ${formatNaira(guestNightly)}/night` : '';
  const title = `${data.title} in ${areaLabel}`;
  const description = `${accommodationSummary} in ${areaLabel}, Lagos${priceSnippet}. View photos, verification status, house rules and request dates on HAMLET.`;
  const canonicalUrl = buildNextCanonicalUrl(`/stays/${encodeURIComponent(id)}`);
  const previewVersion = buildPropertyPreviewVersion(data);
  const shareImage = `${HAMLET_CANONICAL_ORIGIN}/api/og/property/${encodeURIComponent(
    id,
  )}?v=${encodeURIComponent(previewVersion)}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      siteName: HAMLET_BRAND,
      locale: 'en_NG',
      title: `${title} | HAMLET`,
      description,
      url: canonicalUrl,
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: `${data.title} — ${areaLabel}, Lagos on HAMLET`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | HAMLET`,
      description,
      images: [shareImage],
    },
  };
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const db = getPublicSupabase();

  if (!db) {
    notFound();
  }

  const { data, error } = await db
    .from('properties')
    .select(PUBLIC_PROPERTY_SELECT)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const stay = toPublicStayRecord(data as Record<string, unknown>);
  const trust = getStayTrustStatus(stay);
  const accommodationLabel = formatAccommodationLabel(
    stay.property_type,
    stay.bedrooms,
  );
  const bedroomLabel = formatBedroomCountLabel(stay.bedrooms, stay.property_type);
  const wayfinderMeta = await probePropertyWayfinderMeta(db, stay.id);
  const images = stay.image_urls ?? [];
  const verification = stay.verification ?? {};
  const structuredData = buildPropertyDetailSchema({
    stay,
    publicLocationSummary: wayfinderMeta.public_location_summary,
  });

  const place = stay.area || wayfinderMeta.city || 'Lagos';
  const hasAmenities = Boolean(stay.amenities && stay.amenities.length > 0);
  let section = 0;
  const label = (text: string) => `${String(++section).padStart(2, '0')} / ${text}`;

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-property-detail-jsonld" data={structuredData} />

      <main className="hm-main hm-detail-main" style={{ flex: 1 }}>
        <section className="hm-band hm-band-arrive" aria-labelledby="stay-title">
          <div className="hm-shell hm-band-inner hm-detail-band">
            <Link href="/stays" className="hm-detail-back">
              <ArrowLeft size={16} aria-hidden="true" /> All Lagos stays
            </Link>
            <div className="hm-band-copy">
              <p className="hm-label">
                <MapPin size={14} aria-hidden="true" />
                {place}, Lagos · {accommodationLabel}
              </p>
              <h1 id="stay-title" className="hm-display hm-detail-title">
                {stay.title}
              </h1>
              <span className={trust.verified ? 'hm-detail-trust hm-detail-trust-ok' : 'hm-detail-trust'}>
                {trust.verified ? <BadgeCheck size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                {trust.badge}
              </span>
            </div>
            <StayGallery title={stay.title} images={images} />
          </div>
        </section>

        <div className="hm-shell hm-section-tight">
          <PartnerPropertyDetailBar
            stay={{
              id: stay.id,
              title: stay.title,
              area: stay.area,
              propertyType: stay.property_type,
              bedrooms: stay.bedrooms,
              capacity: stay.capacity,
              guestNightlyNgn: stay.guest_nightly_ngn,
            }}
          />

          <div className="hm-detail-layout">
            <div className="hm-detail-content">
              <ul className="hm-detail-specs" aria-label="Key facts">
                <li>
                  <BedDouble size={16} aria-hidden="true" />
                  {bedroomLabel}
                </li>
                <li>
                  <Bath size={16} aria-hidden="true" />
                  {stay.bathrooms ?? 1} {stay.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                </li>
                <li>
                  <Users size={16} aria-hidden="true" />
                  Up to {stay.capacity ?? 2} guests
                </li>
                {stay.bed_setup && <li>{stay.bed_setup}</li>}
              </ul>

              <section data-hamlet-reveal="" className="hm-reveal hm-detail-section" aria-labelledby="stay-location">
                <p className="hm-label">{label('Location')}</p>
                <h2 id="stay-location" className="hm-h3">
                  {place}
                </h2>
                <p className="hm-body">
                  {wayfinderMeta.public_location_summary ||
                    stay.public_address ||
                    `Located in ${stay.area || 'Lagos'}. Exact check-in details unlock once confirmed.`}
                </p>
                {wayfinderMeta.public_landmarks && wayfinderMeta.public_landmarks.length > 0 && (
                  <ul className="hm-detail-tags">
                    {wayfinderMeta.public_landmarks.map(lm => (
                      <li key={lm}>Near {lm}</li>
                    ))}
                  </ul>
                )}
                <p className="hm-meta hm-detail-note">
                  <Clock size={15} aria-hidden="true" />
                  Host confirms dates before payment opens. The exact address and arrival guide unlock after confirmation.
                </p>
              </section>

              {hasAmenities && (
                <section data-hamlet-reveal="" className="hm-reveal hm-detail-section" aria-labelledby="stay-amenities">
                  <p className="hm-label">{label('Amenities')}</p>
                  <h2 id="stay-amenities" className="hm-h3">
                    What’s in the place
                  </h2>
                  <ul className="hm-detail-amenities">
                    {stay.amenities!.map(amenity => (
                      <li key={amenity}>
                        <Check size={16} aria-hidden="true" />
                        {amenity}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section data-hamlet-reveal="" className={trust.verified ? 'hm-reveal hm-detail-section hm-detail-verified' : 'hm-reveal hm-detail-section'} aria-labelledby="stay-verification">
                <p className="hm-label">{label('Verification')}</p>
                <h2 id="stay-verification" className="hm-h3">
                  <ShieldCheck size={20} aria-hidden="true" /> Verification status
                </h2>
                <ul className="hm-detail-pillars">
                  {PILLAR_LABELS.map(({ key, label: pillar }) => {
                    const raw = verification[key] || 'pending_review';
                    const badge = STATUS_BADGE[raw] || STATUS_BADGE.pending_review;
                    return (
                      <li key={key}>
                        <span>{pillar}</span>
                        <StatusPill tone={badge.tone}>{badge.text}</StatusPill>
                      </li>
                    );
                  })}
                </ul>
                {trust.verified && <p className="hm-meta">Listing, photos and partner identity were reviewed before this stay went live. Payment is only taken after the partner accepts your request.</p>}
              </section>

              <section data-hamlet-reveal="" className="hm-reveal hm-detail-section" aria-labelledby="stay-rules">
                <p className="hm-label">{label('House rules & caution')}</p>
                <h2 id="stay-rules" className="hm-h3">
                  House rules
                </h2>
                {stay.house_rules && stay.house_rules.length > 0 ? (
                  <ul className="hm-detail-rules">
                    {stay.house_rules.map(rule => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="hm-body">Valid ID at check-in, guests within stated capacity, and no unauthorized events.</p>
                )}
                {Number(stay.refundable_deposit || 0) > 0 && (
                  <p className="hm-notice">
                    <span>
                      <strong>Refundable caution deposit:</strong> Itemised separately without service fee or FX buffer; refunded after post-checkout inspection.
                    </span>
                  </p>
                )}
              </section>
            </div>

            <aside className="hm-detail-aside" aria-label="Request to book">
              <BookingRequestForm
                propertyId={stay.id}
                propertyTitle={stay.title}
                guestNightlyRate={Number(stay.guest_nightly_ngn || 0)}
                cleaningFee={Number(stay.cleaning_fee || 0)}
                deposit={Number(stay.refundable_deposit || 0)}
                capacity={stay.capacity}
                firstAvailableDate={stay.first_available_date}
              />
              <PropertyEnquiryCard propertyId={stay.id} propertyTitle={stay.title} />
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
