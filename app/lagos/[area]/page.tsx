import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { SiteHeader, SiteFooter, StayListingCard } from '@/components/site/SiteShell';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  PUBLIC_VIEW_SELECT,
  toPublicStayRecord,
  type PublicStayRecord,
} from '@/lib/next-supabase';
import {
  LAGOS_AREA_GUIDES,
  getLagosAreaGuide,
  stayMatchesAreaGuide,
  type LagosAreaGuide,
} from '@/lib/lagosAreaGuides';
import {
  buildInformationalPageSchema,
  buildNextCanonicalUrl,
  buildPublicPageMetadata,
  HAMLET_CANONICAL_ORIGIN,
} from '@/lib/structured-data';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return LAGOS_AREA_GUIDES.map(guide => ({ area: guide.slug }));
}

const loadAreaStays = cache(async (slug: string): Promise<PublicStayRecord[]> => {
  const guide = getLagosAreaGuide(slug);
  const db = getPublicSupabase();
  if (!guide || !db) return [];
  const { data, error } = await db
    .from('public_properties')
    .select(PUBLIC_VIEW_SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? [])
    .map(row => toPublicStayRecord(row as Record<string, unknown>))
    .filter(stay => stayMatchesAreaGuide(stay, guide));
});

export async function generateMetadata({ params }: { params: Promise<{ area: string }> }): Promise<Metadata> {
  const { area } = await params;
  const guide = getLagosAreaGuide(area);
  if (!guide) return { title: 'Area not found', robots: { index: false, follow: false } };
  const stays = await loadAreaStays(area);
  const meta = buildPublicPageMetadata({
    title: `Shortlets in ${guide.name}, Lagos`,
    description: `Verified shortlets in ${guide.name}, Lagos (${guide.subareas.replaceAll(' · ', ', ')}). ${guide.summary} Request a stay and pay only once the partner accepts.`.slice(0, 300),
    pathname: `/lagos/${guide.slug}`,
  });
  // A page with no live stay yet is useful to visitors but too thin to ask search engines to index.
  return stays.length > 0 ? meta : { ...meta, robots: { index: false, follow: true } };
}

function AreaSchema(guide: LagosAreaGuide, stays: PublicStayRecord[]) {
  const pathname = `/lagos/${guide.slug}`;
  const base = buildInformationalPageSchema({
    title: `Shortlets in ${guide.name}, Lagos`,
    description: guide.summary,
    pathname,
    breadcrumbName: guide.name,
    parentBreadcrumbs: [{ name: 'Lagos area guide', path: '/lagos' }],
  }) as { '@graph': Record<string, unknown>[] } & Record<string, unknown>;
  const graph = [...base['@graph']];
  if (stays.length > 0) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${buildNextCanonicalUrl(pathname)}#stays`,
      name: `Verified shortlets in ${guide.name}`,
      numberOfItems: stays.length,
      itemListElement: stays.slice(0, 20).map((stay, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${HAMLET_CANONICAL_ORIGIN}/stays/${encodeURIComponent(stay.id)}`,
        name: stay.title,
      })),
    });
  }
  return { ...base, '@graph': graph };
}

export default async function LagosAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params;
  const guide = getLagosAreaGuide(area);
  if (!guide) notFound();
  const stays = await loadAreaStays(area);
  const nearby = guide.nearby.map(getLagosAreaGuide).filter((g): g is LagosAreaGuide => Boolean(g));
  const searchHref = `/stays?area=${encodeURIComponent(guide.searchArea)}`;

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id={`hamlet-lagos-area-${guide.slug}-jsonld`} data={AreaSchema(guide, stays)} />

      <main className="hm-main hm-content" style={{ flex: 1 }}>
        <section className="hm-band hm-content-hero">
          <div className="hm-shell hm-band-inner">
            <p className="hm-label">Lagos {guide.side === 'Island' ? 'Island and Lekki' : 'Mainland'}</p>
            <h1 className="hm-display hm-content-title">Shortlets in {guide.name}</h1>
            <p className="hm-body">{guide.summary}</p>
          </div>
        </section>

        <div className="hm-shell hm-section-tight space-y-12">
          <section aria-labelledby="area-stays">
            <div className="hp-head">
              <div>
                <p className="hp-note">{stays.length > 0 ? `${stays.length} verified ${stays.length === 1 ? 'stay' : 'stays'} live now` : 'Verified stays'}</p>
                <h2 className="hp-h2" id="area-stays">Where you can stay in {guide.name}</h2>
              </div>
              <Link className="hm-link" href={searchHref}>Search {guide.name} with dates</Link>
            </div>
            {stays.length > 0 ? (
              <div className="hp-stays">
                {stays.map(stay => <StayListingCard key={stay.id} stay={stay} />)}
              </div>
            ) : (
              <div className="hp-empty">
                <p className="hp-empty-title">No verified stays in {guide.name} yet.</p>
                <p className="hm-body">Every listing passes HAMLET&apos;s checks before it appears. See what is live across Lagos, or try a neighbouring area.</p>
                <div className="hm-chip-row">
                  <Link className="hm-chip" href="/stays">All Lagos stays</Link>
                  {nearby.map(item => <Link key={item.slug} className="hm-chip" href={`/lagos/${item.slug}`}>{item.name}</Link>)}
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="area-about" className="hm-area-facts">
            <h2 className="hp-h2" id="area-about">About {guide.name}</h2>
            <dl>
              <div><dt>Includes</dt><dd>{guide.subareas.replaceAll(' · ', ', ')}</dd></div>
              <div><dt>Good for</dt><dd>{guide.summary}</dd></div>
              <div><dt>Booking</dt><dd>Send a request first. You pay only once the partner accepts, and the exact address unlocks after a confirmed, paid booking.</dd></div>
              <div><dt>Price</dt><dd>The nightly price already includes HAMLET&apos;s service fee. Cleaning and the refundable caution deposit are shown separately before you request.</dd></div>
            </dl>
          </section>

          <section aria-labelledby="area-nearby">
            <h2 className="hp-h2" id="area-nearby">Nearby areas</h2>
            <div className="hm-chip-row" style={{ marginTop: 16 }}>
              {nearby.map(item => <Link key={item.slug} className="hm-chip" href={`/lagos/${item.slug}`}>{item.name}</Link>)}
              <Link className="hm-chip" href="/lagos">Full Lagos guide</Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
