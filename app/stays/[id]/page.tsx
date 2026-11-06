import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  BedDouble,
  Bath,
  Users,
  MapPin,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  getValidGuestNightlyNgn,
} from '@/lib/discovery';
import { formatDate, formatNaira } from '@/lib/pricing';
import {
  buildPublicPropertyTrustSummary,
  computeAvailabilityFreshness,
  HONEST_CAUTION_CUSTODY_DISCLOSURE,
} from '@/lib/competitive-readiness';
import { buildPropertyPreviewVersion } from '@/lib/share-engine';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  PUBLIC_PROPERTY_SELECT,
  probePropertyReadinessMeta,
  probePropertyWayfinderMeta,
  type PublicStayRecord,
} from '@/lib/next-supabase';
import {
  buildNextCanonicalUrl,
  buildPropertyDetailSchema,
  HAMLET_BRAND,
  HAMLET_CANONICAL_ORIGIN,
} from '@/lib/structured-data';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { StayGallery } from './stay-gallery';
import BookingRequestForm from './booking-request-form';
import { GuestShareStrip } from './guest-share-strip';
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

  const stay = data as PublicStayRecord;
  const accommodationLabel = formatAccommodationLabel(
    stay.property_type,
    stay.bedrooms,
  );
  const bedroomLabel = formatBedroomCountLabel(stay.bedrooms, stay.property_type);
  const [wayfinderMeta, readinessMeta] = await Promise.all([
    probePropertyWayfinderMeta(db, stay.id),
    probePropertyReadinessMeta(db, stay.id),
  ]);
  const images = stay.image_urls ?? [];
  const verification = stay.verification ?? {};
  const trustSummary = buildPublicPropertyTrustSummary({
    trustChecks: readinessMeta.checks,
    legacyVerification: verification,
    propertyUpdatedAt: stay.updated_at,
  });
  const availabilitySummary = computeAvailabilityFreshness({
    bookingMode: readinessMeta.booking_mode,
    lastAvailabilityUpdate: readinessMeta.last_availability_update,
    confirmationStatus: stay.availability_confirmation_status,
  });
  const structuredData = buildPropertyDetailSchema({
    stay,
    publicLocationSummary: wayfinderMeta.public_location_summary,
  });

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <JsonLd id="hamlet-property-detail-jsonld" data={structuredData} />

      <main className="shell flex-1 py-6 pb-28 sm:py-10 lg:pb-14">
        <div className="mb-4">
          <Link
            href="/stays"
            className="inline-flex min-h-[42px] items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" /> All Lagos stays
          </Link>
        </div>

        <PartnerPropertyDetailBar
          stay={{
            id: stay.id,
            title: stay.title,
            area: stay.area,
            propertyType: stay.property_type,
            bedrooms: stay.bedrooms,
            capacity: stay.capacity,
            ownerNightlyRateNgn: stay.nightly_rate,
          }}
        />

        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brass-700">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {stay.area || wayfinderMeta.city || 'Lagos'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold normal-case ${
              trustSummary.allChecksVerified
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-ink-200 bg-white text-ink-800'
            }`}
          >
            {trustSummary.allChecksVerified ? (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-ink-700" />
            )}
            {trustSummary.headlineLabel}
          </span>
          {readinessMeta.hamlet_property_code && (
            <span className="rounded-full border border-ink-200 bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink-600">
              {readinessMeta.hamlet_property_code}
            </span>
          )}
        </div>

        <h1 className="serif mt-2 text-3xl font-medium tracking-tight text-ink-900 sm:text-5xl">
          {stay.title}
        </h1>

        <GuestShareStrip
          stay={{
            id: stay.id,
            title: stay.title,
            area: stay.area,
            propertyType: stay.property_type,
            bedrooms: stay.bedrooms,
            capacity: stay.capacity,
            ownerNightlyRateNgn:
              stay.nightly_rate !== null ? Number(stay.nightly_rate) : null,
          }}
        />

        <div className="mt-6">
          <StayGallery title={stay.title} images={images} />
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            {/* Key Specs */}
            <div className="flex flex-wrap gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm font-semibold text-ink-800">
              <span>{accommodationLabel}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 shrink-0 text-brass-600" />
                {bedroomLabel}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4 shrink-0 text-brass-600" />
                {stay.bathrooms ?? 1} {stay.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 shrink-0 text-brass-600" />
                Up to {stay.capacity ?? 2} guests
              </span>
              {stay.bed_setup && (
                <>
                  <span>·</span>
                  <span className="text-ink-600">{stay.bed_setup}</span>
                </>
              )}
            </div>

            {/* Location & Overview */}
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                Location
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {wayfinderMeta.public_location_summary ||
                  stay.public_address ||
                  `Located in ${stay.area || 'Lagos'}. Exact check-in details unlock once confirmed.`}
              </p>
              {wayfinderMeta.public_landmarks && wayfinderMeta.public_landmarks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {wayfinderMeta.public_landmarks.map(lm => (
                    <span key={lm} className="pill text-xs font-medium text-ink-700">
                      Near {lm}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <Clock className="h-4 w-4 shrink-0 text-brass-600" />
                <span>
                  <strong>{availabilitySummary.bookingModeLabel}:</strong>{' '}
                  {availabilitySummary.bookingModeDescription} (
                  {availabilitySummary.lastUpdatedLabel})
                </span>
              </div>
            </section>

            {/* Amenities */}
            {stay.amenities && stay.amenities.length > 0 && (
              <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
                <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                  Amenities
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {stay.amenities.map(amenity => (
                    <span
                      key={amenity}
                      className="pill text-xs font-semibold text-ink-800"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Structured 7-Check Property Trust Profile */}
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                  <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                    Property trust profile
                  </h2>
                </div>
                <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-800">
                  {trustSummary.headlineLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                HAMLET displays only trust checks that have genuinely been completed. Underlying identity and ownership documents remain confidential.
              </p>

              {trustSummary.completedChecks.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="m-0 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                    Completed checks ({trustSummary.completedChecks.length})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {trustSummary.completedChecks.map(item => (
                      <div
                        key={item.check_code}
                        className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-3.5 py-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-ink-950">{item.label}</span>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                            Completed
                          </span>
                        </div>
                        <p className="m-0 mt-1 text-[11px] text-ink-600">
                          {item.public_summary || item.guestDescription}
                          {item.reviewed_at ? ` · ${formatDate(item.reviewed_at)}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trustSummary.pendingChecks.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="m-0 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
                    Not yet completed ({trustSummary.pendingChecks.length})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {trustSummary.pendingChecks.map(item => (
                      <div
                        key={item.check_code}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-paper/50 px-3.5 py-2.5 text-xs"
                      >
                        <span className="font-semibold text-ink-700">{item.label}</span>
                        <span className="shrink-0 rounded-full border border-ink-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-ink-600">
                          {item.status === 'pending_review'
                            ? 'Pending review'
                            : item.status === 'additional_docs_requested'
                              ? 'Docs requested'
                              : 'Not completed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* House Rules & Pre-Booking Caution Disclosure */}
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                House rules & caution policy
              </h2>
              {stay.house_rules && stay.house_rules.length > 0 ? (
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
                  {stay.house_rules.map(rule => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-600">
                  Valid ID at check-in, guests within stated capacity, and no unauthorized events.
                </p>
              )}

              <div className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 bg-paper p-3.5 text-xs leading-relaxed text-ink-700">
                <p className="m-0 font-bold text-ink-950">
                  Caution deposit:{' '}
                  {Number(stay.refundable_deposit || 0) > 0
                    ? `${formatNaira(Number(stay.refundable_deposit))} (tracked separately from stay revenue)`
                    : 'Not applicable (₦0)'}
                </p>
                {Number(stay.refundable_deposit || 0) > 0 && (
                  <>
                    <p className="m-0">
                      <strong>Refund conditions:</strong>{' '}
                      {readinessMeta.caution_refund_conditions ||
                        'Refundable following post-checkout condition inspection if no documented damage or missing items are reported.'}
                    </p>
                    <p className="m-0">
                      <strong>Inspection & damage policy:</strong>{' '}
                      {readinessMeta.caution_inspection_policy ||
                        'Structured check-in and check-out inspection checklists with timestamped photo/video evidence. Normal wear and tear is never treated as damage.'}
                    </p>
                    <p className="m-0 text-[11px] text-ink-500">
                      {HONEST_CAUTION_CUSTODY_DISCLOSURE}
                    </p>
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:col-span-5">
            <BookingRequestForm
              propertyId={stay.id}
              propertyTitle={stay.title}
              nightlyRate={Number(stay.nightly_rate || 0)}
              cleaningFee={Number(stay.cleaning_fee || 0)}
              deposit={Number(stay.refundable_deposit || 0)}
              capacity={stay.capacity}
              firstAvailableDate={stay.first_available_date}
              bookingModeLabel={availabilitySummary.bookingModeLabel}
              availabilityLastUpdatedLabel={availabilitySummary.lastUpdatedLabel}
              cautionRefundConditions={readinessMeta.caution_refund_conditions}
              cautionInspectionPolicy={readinessMeta.caution_inspection_policy}
            />
            <PropertyEnquiryCard
              propertyId={stay.id}
              propertyTitle={stay.title}
            />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
