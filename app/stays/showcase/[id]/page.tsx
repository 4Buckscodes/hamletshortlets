import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, BedDouble, Bath, Users, MapPin } from 'lucide-react';
import inventory from '../../../../docs/lagos-showcase-inventory.json';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';

type Props = { params: Promise<{ id: string }> };
const properties = inventory.properties;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = properties.find(item => item.id === id);
  return {
    title: property ? `${property.title} | HAMLET Preview` : 'Property preview',
    robots: { index: false, follow: false },
  };
}

const money = (value: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
}).format(value);

export default async function ShowcasePropertyPage({ params }: Props) {
  const { id } = await params;
  const property = properties.find(item => item.id === id);
  if (!property) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <Link href="/stays" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink-700"><ArrowLeft className="h-4 w-4" /> Back to Lagos previews</Link>
        <div className="mt-5 overflow-hidden rounded-3xl border border-ink-100 bg-white">
          <div className="grid min-h-64 place-items-center bg-gradient-to-br from-[#d9c9b3] to-[#f3eee6] sm:min-h-96">
            <div className="text-center">
              <span className="block text-7xl text-ink-700/40">⌂</span>
              <span className="mt-3 block text-xs font-extrabold uppercase tracking-[0.2em] text-ink-700/70">Illustrative concept · no property photo supplied</span>
            </div>
          </div>
          <div className="p-5 sm:p-8">
            <span className="inline-flex rounded-full bg-brass-100 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-800">HAMLET showcase preview</span>
            <p className="mt-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brass-700"><MapPin className="h-4 w-4" />{property.area}, Lagos</p>
            <h1 className="serif mt-2 text-3xl font-medium text-ink-950 sm:text-5xl">{property.title}</h1>
            <p className="mt-3 text-sm text-ink-600">{property.property_type}</p>
            <div className="mt-6 flex flex-wrap gap-4 border-y border-ink-100 py-4 text-sm font-semibold text-ink-700">
              <span className="inline-flex items-center gap-2"><BedDouble className="h-4 w-4" />{property.bedrooms} bedrooms</span>
              <span className="inline-flex items-center gap-2"><Bath className="h-4 w-4" />{property.bathrooms} bathrooms</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />Up to {property.capacity} guests</span>
            </div>
            <section className="mt-6">
              <h2 className="text-lg font-bold text-ink-900">Concept amenities</h2>
              <div className="mt-3 flex flex-wrap gap-2">{property.amenities.map(item => <span key={item} className="rounded-full border border-ink-200 bg-paper px-3 py-2 text-xs text-ink-700">{item}</span>)}</div>
            </section>
            <div className="mt-7 rounded-2xl border border-brass-300 bg-brass-50 p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-brass-800">Not accepting bookings</p>
              <h2 className="serif mt-2 text-2xl font-medium text-ink-950">This is a property concept, not a live listing.</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">The property, photos, amenities, price and availability have not been confirmed by an owner or property manager. The indicative estimate below is for illustration only.</p>
              <p className="mt-4 text-sm text-ink-600">Illustrative nightly estimate</p>
              <p className="text-2xl font-extrabold text-ink-950">{money(property.nightly_rate_ngn)}</p>
            </div>
            <Link href="/partners/apply" className="primary-button mt-6 inline-flex">List a property with HAMLET</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
