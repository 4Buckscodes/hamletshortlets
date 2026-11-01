import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

const FEATURED_PREVIEWS = [
  { id: 'hamlet-preview-lagos-001', title: 'The Onyx One-Bedroom Residence', area: 'Lekki Phase 1', type: 'Serviced apartment', beds: '1 bedroom', rate: '₦145,000', image: '/images/hero-sample-living.jpg' },
  { id: 'hamlet-preview-lagos-003', title: 'Ikate Garden Two-Bedroom Suite', area: 'Ikate', type: 'Serviced apartment', beds: '2 bedrooms', rate: '₦185,000', image: '/images/hero-sample-bedroom.jpg' },
  { id: 'hamlet-preview-lagos-010', title: 'Victoria Island Skyline Suite', area: 'Victoria Island', type: 'Serviced apartment', beds: '1 bedroom', rate: '₦220,000', image: '/images/hero-sample-kitchen.jpg' },
  { id: 'hamlet-preview-lagos-012', title: 'Ikoyi Grand One-Bedroom', area: 'Ikoyi', type: 'Serviced apartment', beds: '1 bedroom', rate: '₦260,000', image: '/images/prop/penthouse.jpg' },
  { id: 'hamlet-preview-lagos-014', title: 'Yaba Urban One-Bedroom', area: 'Yaba', type: 'Apartment', beds: '1 bedroom', rate: '₦90,000', image: '/images/prop/bed-1.jpg' },
  { id: 'hamlet-preview-lagos-025', title: 'Ikeja GRA Luxury One-Bedroom', area: 'Ikeja GRA', type: 'Serviced apartment', beds: '1 bedroom', rate: '₦210,000', image: '/images/prop/living-1.jpg' },
] as const;

export function HomeShowcaseSection() {
  return (
    <section data-hamlet-reveal className="border-y border-ink-100 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">A first look at HAMLET</p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.035em] text-ink-900 sm:text-4xl">Explore selected stays</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">A preview of the kinds of homes we’re bringing together across Lagos. These are illustrative concepts, not live properties.</p>
          </div>
          <Link href="/stays" className="btn-outline !rounded-full !px-4 !py-2 text-xs">Explore all previews <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_PREVIEWS.map((stay) => (
            <Link key={stay.id} href={`/stays/showcase/${stay.id}`} className="group overflow-hidden rounded-3xl border border-ink-100 bg-paper transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative aspect-[4/3] overflow-hidden bg-clay">
                <Image src={stay.image} alt={`Illustrative interior concept for ${stay.title}`} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-[1.035]" />
                <span className="absolute left-3 top-3 rounded-full bg-ink-950/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brass-200">Showcase preview</span>
                <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-ink-800">Illustrative image</span>
              </div>
              <div className="p-5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brass-700"><MapPin className="h-3.5 w-3.5" />{stay.area} · {stay.type}</p>
                <h3 className="mt-2 font-display text-lg font-bold text-ink-900 group-hover:text-jade-700">{stay.title}</h3>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-ink-100 pt-3">
                  <div><p className="text-[10px] text-ink-500">{stay.beds} · Indicative nightly estimate</p><p className="mt-0.5 text-base font-bold text-ink-900">{stay.rate}</p></div>
                  <span className="text-xs font-bold text-ink-800">View concept <ArrowRight className="inline h-3.5 w-3.5" /></span>
                </div>
                <p className="mt-3 text-[10px] font-semibold text-ink-500">Not verified · Not bookable</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
