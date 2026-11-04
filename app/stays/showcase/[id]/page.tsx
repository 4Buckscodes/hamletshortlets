import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Eye,
  MapPin,
  Users,
} from 'lucide-react';
import inventory from '../../../../docs/lagos-showcase-inventory.json';
import {
  formatAccommodationLabel,
  formatBedroomCountLabel,
  sanitizeShowcaseInventory,
} from '@/lib/discovery';
import { GuestInterestPanel } from '@/components/site/GuestInterestPanel';
import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';
import { ShowcaseIndicativePrice } from './showcase-price';

type Props = { params: Promise<{ id: string }> };

const concepts = sanitizeShowcaseInventory(
  inventory as { properties?: ReadonlyArray<Record<string, unknown>> },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = concepts.find(item => item.id === id);
  return {
    title: property
      ? `${property.title} (Showcase Concept) | HAMLET`
      : 'Property concept preview',
    robots: { index: false, follow: false },
  };
}

export default async function ShowcasePropertyPage({ params }: Props) {
  const { id } = await params;
  const property = concepts.find(item => item.id === id);
  if (!property) notFound();

  const accommodationLabel = formatAccommodationLabel(
    property.property_type,
    property.bedrooms,
  );
  const bedroomLabel = formatBedroomCountLabel(
    property.bedrooms,
    property.property_type,
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <Link
          href="/stays"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-700 hover:text-ink-950"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back to Lagos stays
        </Link>

        <div className="mt-5 overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-2xs">
          <div className="grid min-h-60 place-items-center bg-gradient-to-br from-[#d9c9b3] to-[#f3eee6] px-6 text-center sm:min-h-80">
            <div>
              <span aria-hidden="true" className="block font-display text-6xl text-ink-700/40 sm:text-7xl">
                ⌂
              </span>
              <span className="mt-3 block text-xs font-extrabold uppercase tracking-[0.2em] text-ink-700/80">
                Concept preview
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                <Eye className="h-3.5 w-3.5 shrink-0 text-amber-800" />
                Showcase preview · Not bookable
              </span>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brass-700">
              <MapPin className="h-4 w-4 shrink-0" />
              {property.area}, Lagos
            </p>

            <h1 className="serif mt-2 text-3xl font-medium text-ink-950 sm:text-5xl">
              {property.title}
            </h1>
            <p className="mt-2 text-sm font-semibold text-ink-600">
              {accommodationLabel}
            </p>

            <div className="mt-6 flex flex-wrap gap-4 border-y border-ink-100 py-4 text-sm font-semibold text-ink-700">
              <span className="inline-flex items-center gap-2">
                <BedDouble className="h-4 w-4 shrink-0 text-brass-700" />
                {bedroomLabel}
              </span>
              <span className="inline-flex items-center gap-2">
                <Bath className="h-4 w-4 shrink-0 text-brass-700" />
                {property.bathrooms} {property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-brass-700" />
                Up to {property.capacity} guests
              </span>
            </div>

            <section className="mt-6">
              <h2 className="text-lg font-bold text-ink-900">Concept amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map(item => (
                  <span
                    key={item}
                    className="rounded-full border border-ink-200 bg-paper px-3 py-1.5 text-xs font-medium text-ink-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            {property.house_rules.length > 0 && (
              <section className="mt-6">
                <h2 className="text-lg font-bold text-ink-900">Preview notes</h2>
                <ul className="mt-2 space-y-1.5 pl-5 text-sm leading-relaxed text-ink-600">
                  {property.house_rules.map(rule => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-7 rounded-2xl border border-amber-300 bg-amber-50/75 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                Not accepting bookings
              </p>
              <h2 className="serif mt-2 text-2xl font-medium text-ink-950">
                Illustrative concept — not a live listing.
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                Details and pricing below are indicative only.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-600">
                Indicative nightly estimate
              </p>
              <ShowcaseIndicativePrice nightlyRateNgn={property.nightly_rate_ngn} />
            </div>

            <div className="mt-8">
              <GuestInterestPanel
                preferredArea={property.area}
                preferredType={property.bedrooms === 0 ? 'studio' : `${Math.min(property.bedrooms, 3) === 3 ? '3_plus' : property.bedrooms}_bed`}
                compact
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/partners/apply" className="primary-button min-h-11 px-5">
                List a verified property with HAMLET
              </Link>
              <Link href="/stays" className="secondary-button min-h-11 px-5">
                Return to /stays catalogue
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
