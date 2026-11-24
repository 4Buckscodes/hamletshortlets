import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bath, BedDouble, Check, MapPin, ShieldCheck, Users } from 'lucide-react';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  getStayTrustStatus,
  getValidPublicGuestNightlyNgn,
} from '@/lib/discovery';
import { formatNaira } from '@/lib/pricing';
import { buildPropertyPreviewVersion } from '@/lib/share-engine';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  PUBLIC_VIEW_SELECT,
  probePropertyWayfinderMeta,
  toPublicStayRecord,
} from '@/lib/next-supabase';
import {
  buildNextCanonicalUrl,
  buildPropertyDetailSchema,
  HAMLET_BRAND,
  HAMLET_CANONICAL_ORIGIN,
} from '@/lib/structured-data';
import { SiteHeader, SiteFooter, StayNightlyPrice } from '@/components/site/SiteShell';
import { StayGallery } from './stay-gallery';
import BookingRequestForm from './booking-request-form';
import { StayVideo } from '@/components/site/StayVideo';
import { toTourVideo } from '@/lib/tourVideo';
import { PartnerPropertyDetailBar } from '@/components/share/PartnerShareActions';
import { PropertyEnquiryCard } from '@/components/share/PropertyEnquiryCard';

type Props = { params: Promise<{ id: string }> };

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
    .from('public_properties')
    .select('title,area,property_type,bedrooms,capacity,guest_nightly_ngn,image_urls,updated_at')
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
  const guestNightly = getValidPublicGuestNightlyNgn(data.guest_nightly_ngn);
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
    .from('public_properties')
    .select(PUBLIC_VIEW_SELECT)
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
  // Best-effort and separate from the main select, so the page keeps working even if the
  // tour_video columns have not been deployed to this database yet.
  const { data: videoRow, error: videoError } = await db
    .from('public_properties')
    .select('tour_video_provider,tour_video_id')
    .eq('id', stay.id)
    .maybeSingle();
  const tourVideo = videoError
    ? null
    : toTourVideo(videoRow?.tour_video_provider, videoRow?.tour_video_id);
  const images = stay.image_urls ?? [];
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
              <ArrowLeft size={16} aria-hidden="true" /> All Lagos stays · {place}
            </Link>
            <div className="hm-band-row">
              <div className="hm-band-copy">
                <p className="hm-label">
                  <MapPin size={14} aria-hidden="true" />
                  {trust.verified ? 'Verified stay · ' : ''}{place}, Lagos
                </p>
                <h1 id="stay-title" className="hm-display hm-detail-title">
                  {stay.title}
                </h1>
              </div>
              <div className="hm-detail-band-action">
                <StayNightlyPrice guestNightlyNgn={Number(stay.guest_nightly_ngn ?? 0)} withFeesNote className="hm-detail-band-price" />
                <a href="#request-to-book" className="hm-btn hm-btn-lime">
                  Check dates <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
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
                {stay.bathrooms != null && (
                  <li>
                    <Bath size={16} aria-hidden="true" />
                    {stay.bathrooms} {stay.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
                  </li>
                )}
                {stay.capacity != null && (
                  <li>
                    <Users size={16} aria-hidden="true" />
                    Up to {stay.capacity} guests
                  </li>
                )}
                <li>{accommodationLabel}</li>
                {stay.bed_setup && <li>{stay.bed_setup}</li>}
              </ul>

              {tourVideo && (
                <section className="hm-detail-block" aria-labelledby="stay-video">
                  <p className="hm-label">{label('Video tour')}</p>
                  <h2 id="stay-video" className="hm-h3">
                    Take a look around
                  </h2>
                  <StayVideo video={tourVideo} title={stay.title} />
                </section>
              )}

              <section className="hm-detail-block" aria-labelledby="stay-location">
                <p className="hm-label">{label('Location')}</p>
                <h2 id="stay-location" className="hm-h3">
                  {place}
                </h2>
                <p className="hm-body">
                  {wayfinderMeta.public_location_summary ||
                    stay.public_address ||
                    `Located in ${stay.area || 'Lagos'}.`}
                </p>
                {wayfinderMeta.public_landmarks && wayfinderMeta.public_landmarks.length > 0 && (
                  <ul className="hm-detail-tags">
                    {wayfinderMeta.public_landmarks.map(lm => (
                      <li key={lm}>Near {lm}</li>
                    ))}
                  </ul>
                )}
                <p className="hm-meta">The exact address and arrival guidance are shared once your booking is confirmed and paid.</p>
              </section>

              {hasAmenities && (
                <>
                  <hr className="hm-rule" />
                  <section className="hm-detail-block" aria-labelledby="stay-amenities">
                    <p className="hm-label" id="stay-amenities">{label('Amenities')}</p>
                    <ul className="hm-detail-amenities">
                      {stay.amenities!.map(amenity => (
                        <li key={amenity}>
                          <Check size={16} aria-hidden="true" />
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              <hr className="hm-rule" />
              <div className="hm-detail-pair">
                <section className="hm-card hm-detail-mini" aria-labelledby="stay-rules">
                  <p className="hm-label" id="stay-rules">{label('House rules')}</p>
                  {stay.house_rules && stay.house_rules.length > 0 ? (
                    <ul className="hm-detail-rules">
                      {stay.house_rules.map(rule => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="hm-meta">HAMLET standard rules apply: valid ID at check-in, guests within the stated capacity, no parties or events.</p>
                  )}
                </section>
                <section className="hm-card hm-detail-mini" aria-labelledby="stay-caution">
                  <p className="hm-label" id="stay-caution">{label('Caution terms')}</p>
                  <p className="hm-meta">
                    {Number(stay.refundable_deposit || 0) > 0
                      ? 'A refundable caution deposit is held for this stay and returned after check-out inspection, under the partner’s caution terms.'
                      : 'No caution deposit is required for this stay.'}
                  </p>
                </section>
              </div>

              <section className="hm-detail-verified-panel" aria-labelledby="stay-verification">
                <span className="hm-detail-verified-icon" aria-hidden="true">
                  <ShieldCheck size={26} />
                </span>
                <div>
                  <h2 id="stay-verification" className="hm-h4">{trust.verified ? 'Verified by HAMLET' : trust.badge}</h2>
                  <p className="hm-meta">
                    {trust.verified
                      ? 'Listing, photos and partner identity were reviewed before this stay went live. Payment is only taken after the partner accepts your request.'
                      : 'HAMLET is still reviewing this listing. Payment is only taken after the partner accepts your request.'}
                  </p>
                </div>
              </section>
            </div>

            <aside id="request-to-book" className="hm-detail-aside" aria-label="Request to book">
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
