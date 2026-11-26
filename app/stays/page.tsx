import type { Metadata } from 'next';
import {
  parseDiscoverySearchParams,
  validateStayDates,
} from '@/lib/discovery';
import { JsonLd } from '@/components/seo/JsonLd';
import { PUBLIC_VIEW_SELECT, toPublicStayRecord, type PublicStayRecord } from '@/lib/next-supabase';
import { prioritiseIkateProperties } from '@/lib/property-priority';
import { lagosIsoDateOffset } from '@/lib/pricing';
import {
  buildPropertyListingPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import { getPublicSupabase } from '@/lib/supabase-public';
import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';
import { AreaTicker, PageBand } from '@/components/ui';
import { StaysExplorer } from './stays-explorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Explore Shortlet Stays in Nigeria',
  description:
    'Explore shortlet accommodation across Lagos, Abuja and Ibadan, including Lekki Phase 1, Victoria Island, Ikoyi, Ikeja, Yaba and more.',
  pathname: '/stays',
});

export default async function StaysCataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const flatParams: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(rawParams)) {
    flatParams[key] = Array.isArray(val) ? val[0] : val;
  }

  const initialFilters = parseDiscoverySearchParams(flatParams);
  const db = getPublicSupabase();

  let approvedStays: PublicStayRecord[] = [];
  let queryError = false;
  let initialUnavailableIds: string[] | null = null;
  let availabilitySupported = true;

  if (db) {
    const { data, error } = await db
      .from('public_properties')
      .select(PUBLIC_VIEW_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      queryError = true;
    } else {
      approvedStays = prioritiseIkateProperties(
        (data ?? []).map(row => toPublicStayRecord(row as Record<string, unknown>)),
      );
    }

    const dateCheck = validateStayDates(
      initialFilters.checkIn,
      initialFilters.checkOut,
      lagosIsoDateOffset(0),
    );
    if (!queryError && approvedStays.length > 0 && dateCheck.valid) {
      const { data: unavailableData, error: rpcError } = await db.rpc(
        'get_unavailable_property_ids',
        {
          requested_check_in: initialFilters.checkIn,
          requested_check_out: initialFilters.checkOut,
        },
      );
      if (rpcError) {
        availabilitySupported = false;
      } else {
        initialUnavailableIds = Array.isArray(unavailableData)
          ? unavailableData.map(id => String(id))
          : [];
      }
    }
  }

  const staysPageSchema = buildPropertyListingPageSchema({ approvedStays });

  const liveCount = approvedStays.length;
  const heroPhoto = approvedStays.find(stay => (stay.image_urls ?? []).some(url => url.trim()));
  const heroSrc = heroPhoto?.image_urls?.find(url => url.trim())?.trim();

  return (
    <div className="hm-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <JsonLd id="hamlet-stays-jsonld" data={staysPageSchema} />

      <main className="hm-main" style={{ flex: 1 }}>
        <PageBand
          className="hm-band-compact"
          headingId="stays-title"
          live={liveCount > 0}
          kicker={liveCount > 0 ? `Explore stays · ${liveCount} HAMLET partner listings` : 'Explore shortlet stays'}
          title="Find a stay"
          accent="that feels like yours."
          intro="HAMLET partner properties are reviewed before publication. Any external listings are clearly identified and link to their original platform."
          scrollCue={{
            href: '#places-worth-staying-in',
            label: liveCount > 0 ? `Scroll to see ${liveCount} ${liveCount === 1 ? 'stay' : 'stays'}` : 'Scroll to explore',
          }}
          media={{
            src: heroSrc || '/images/prop/penthouse.jpg',
            alt: heroPhoto ? `${heroPhoto.title} in ${heroPhoto.area || 'Lagos'}` : 'Penthouse living room with a Lagos skyline view',
            caption: ['A good place to land', heroPhoto?.area?.trim() || 'Lagos'],
            inset: { src: '/images/prop/bed-1.jpg', alt: 'Calm bedroom in a Lagos shortlet' },
            stamp: ['Verified', 'Your stay', 'Lagos'],
          }}
          footer={<AreaTicker />}
        />

        <div className="hm-shell hm-section-tight">
          <StaysExplorer
            approvedStays={approvedStays}
            initialFilters={initialFilters}
            initialUnavailableIds={initialUnavailableIds}
            availabilitySupported={availabilitySupported}
            queryError={queryError}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
