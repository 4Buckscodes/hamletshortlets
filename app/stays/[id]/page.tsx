import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  Bath,
  Users,
  MapPin,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  PUBLIC_PROPERTY_SELECT,
  probePropertyWayfinderMeta,
  type PublicStayRecord,
} from '@/lib/next-supabase';
import { guestFacingNightlyNgn } from '@/lib/pricing';
import { buildPropertyStructuredData } from '@/lib/seo';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { StayGallery } from './stay-gallery';
import BookingRequestForm from './booking-request-form';

type Props = { params: Promise<{ id: string }> };

const PILLAR_LABELS: Array<{ key: string; label: string }> = [
  { key: 'ownership', label: 'Ownership / title evidence' },
  { key: 'identity', label: 'Partner identity check' },
  { key: 'authority', label: 'Authority to list' },
  { key: 'inspection', label: 'Physical property inspection' },
];

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  verified: {
    text: 'Verified by HAMLET',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  self_reported: {
    text: 'Self-reported',
    cls: 'border-ink-200 bg-paper text-ink-700',
  },
  pending_review: {
    text: 'Pending review',
    cls: 'border-brass-300 bg-brass-200/40 text-brass-700',
  },
  missing: {
    text: 'Not yet provided',
    cls: 'border-ink-200 bg-ink-50 text-ink-500',
  },
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
    .select('title,area,property_type,bedrooms,capacity,image_urls')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (!data) {
    return {
      title: 'Stay unavailable',
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.title} in ${data.area || 'Lagos'}`;
  const description = `Explore ${data.title} in ${data.area || 'Lagos'} on HAMLET.REST. Compare stay details, verification status, house rules and transparent pricing before requesting to book.`;
  const image =
    Array.isArray(data.image_urls) &&
    data.image_urls[0] &&
    /^https:\/\//i.test(data.image_urls[0])
      ? data.image_urls[0]
      : '/images/lagos-hero.jpg';

  return {
    title,
    description,
    alternates: { canonical: `/stays/${encodeURIComponent(id)}` },
    openGraph: {
      type: 'website',
      siteName: 'HAMLET.REST',
      title: `${title} | HAMLET.REST`,
      description,
      url: `https://www.hamlet.rest/stays/${encodeURIComponent(id)}`,
      images: [{ url: image, alt: data.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | HAMLET.REST`,
      description,
      images: [image],
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
  const wayfinderMeta = await probePropertyWayfinderMeta(db, stay.id);
  const images = stay.image_urls ?? [];
  const verification = stay.verification ?? {};
  const structuredData = buildPropertyStructuredData(
    {
      id: stay.id,
      title: stay.title,
      type: stay.property_type || 'Apartment',
      area: stay.area || 'Lagos',
      address: stay.public_address || stay.area || 'Lagos',
      bedrooms: stay.bedrooms ?? 1,
      bathrooms: stay.bathrooms ?? 1,
      capacity: stay.capacity ?? 2,
      amenities: stay.amenities ?? [],
      images,
    },
    guestFacingNightlyNgn(Number(stay.nightly_rate || 0)),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="shell flex-1 py-6 pb-28 sm:py-10 lg:pb-14">
        <div className="mb-4">
          <Link
            href="/stays"
            className="inline-flex min-h-[42px] items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-900"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" /> All Lagos stays
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brass-700">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {stay.area || wayfinderMeta.city || 'Lagos'}
          </span>
          {stay.trust_label && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold normal-case text-emerald-800">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
              {stay.trust_label}
            </span>
          )}
        </div>

        <h1 className="serif mt-2 text-3xl font-medium tracking-tight text-ink-900 sm:text-5xl">
          {stay.title}
        </h1>

        <div className="mt-6">
          <StayGallery title={stay.title} images={images} />
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            {/* Key Specs */}
            <div className="flex flex-wrap gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm font-semibold text-ink-800">
              <span>{stay.property_type || 'Shortlet'}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 shrink-0 text-brass-600" />
                {stay.bedrooms ?? 0} {stay.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
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
                Location & stay overview
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {wayfinderMeta.public_location_summary ||
                  stay.public_address ||
                  `Located in ${stay.area || 'Lagos'}. Exact check-in instructions are shared only after a booking is confirmed.`}
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
              <div className="mt-4 flex items-center gap-2 text-xs text-ink-500">
                <Clock className="h-4 w-4 shrink-0 text-brass-600" />
                <span>
                  {stay.availability_confirmation_status === 'confirmed' ||
                  stay.availability_confirmation_status === 'confirmed_calendar'
                    ? 'Partner calendar recently reviewed — partner still confirms every booking request.'
                    : 'Partner reconfirms calendar dates on every booking request before payment.'}
                </span>
              </div>
            </section>

            {/* Amenities */}
            {stay.amenities && stay.amenities.length > 0 && (
              <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
                <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                  Amenities & facilities
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

            {/* Honest 4-Pillar Verification Breakdown */}
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                    Four-pillar review status
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-ink-500">
                    HAMLET displays the actual review status recorded for each verification pillar — never assuming unreviewed evidence is verified.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {PILLAR_LABELS.map(({ key, label }) => {
                  const raw = verification[key] || 'pending_review';
                  const badge = STATUS_BADGE[raw] || STATUS_BADGE.pending_review;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-paper/50 px-3.5 py-3"
                    >
                      <span className="text-xs font-bold text-ink-900">{label}</span>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.cls}`}
                      >
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* House Rules & Refundable Caution Terms */}
            <section data-hamlet-reveal className="rounded-3xl border border-ink-100 bg-white p-6">
              <h2 className="serif m-0 text-2xl font-medium text-ink-900">
                House rules & caution deposit terms
              </h2>
              {stay.house_rules && stay.house_rules.length > 0 ? (
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-ink-600">
                  {stay.house_rules.map(rule => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-ink-600">
                  Standard shortlet conduct applies: valid government ID at check-in, guest count within stated capacity, and no unauthorized events.
                </p>
              )}
              {Number(stay.refundable_deposit || 0) > 0 && (
                <p className="mt-4 rounded-2xl border border-ink-100 bg-paper p-3.5 text-xs leading-relaxed text-ink-600">
                  <strong>Refundable caution deposit:</strong> Itemised separately from your stay price with 0% HAMLET markup and 0% FX buffer. Subject to post-checkout inspection and documented condition review.
                </p>
              )}
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
            />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
