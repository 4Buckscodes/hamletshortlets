import type { Metadata } from 'next';
import Link from 'next/link';
import {
  parseDiscoverySearchParams,
  toPublicStayView,
  validateStayDates,
} from '@/lib/discovery';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  PUBLIC_PROPERTY_SELECT,
  type PublicStayRecord,
  type PublicStayView,
} from '@/lib/next-supabase';
import { lagosIsoDateOffset } from '@/lib/pricing';
import {
  buildPropertyListingPageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import { getPublicSupabase } from '@/lib/supabase-public';
import { SiteFooter, SiteHeader } from '@/components/site/SiteShell';
import { StaysExplorer } from './stays-explorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildPublicPageMetadata({
  title: 'Explore Lagos Shortlet Stays',
  description:
    'Explore verified shortlets across Lagos Island (Lekki Phase 1, Ikate, Victoria Island, Ikoyi, Ajah) and Lagos Mainland (Yaba, Ikeja GRA, Surulere, Shomolu).',
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

  let approvedStays: PublicStayView[] = [];
  let queryError = false;
  let initialUnavailableIds: string[] | null = null;
  let availabilitySupported = true;

  if (db) {
    const { data, error } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      queryError = true;
    } else {
      approvedStays = (data ?? []).map(row =>
        toPublicStayView(row as PublicStayRecord),
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

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />
      <JsonLd id="hamlet-stays-jsonld" data={staysPageSchema} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 flex flex-col gap-3 border-b border-ink-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brass-700">
              Lagos Island &amp; Lagos Mainland
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-ink-950 sm:text-4xl">
              Explore verified shortlet stays across Lagos.
            </h1>
          </div>

          <Link
            href="/lagos"
            className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full border border-ink-200 bg-white px-4 text-xs font-bold text-ink-900 shadow-2xs transition hover:border-ink-900 sm:self-auto"
          >
            Lagos guide →
          </Link>
        </header>

        <StaysExplorer
          approvedStays={approvedStays}
          initialFilters={initialFilters}
          initialUnavailableIds={initialUnavailableIds}
          availabilitySupported={availabilitySupported}
          queryError={queryError}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
