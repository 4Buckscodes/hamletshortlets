import type { Metadata } from 'next';
import { getPublicSupabase } from '@/lib/supabase-public';
import { PUBLIC_PROPERTY_SELECT, type PublicStayRecord } from '@/lib/next-supabase';
import { isMainlandArea, matchesLagosAreaFilter } from '@/lib/areas';
import { guestFacingNightlyNgn } from '@/lib/pricing';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { StaysExplorer } from './stays-explorer';

type SearchParams = Promise<{
  area?: string;
  side?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  bedrooms?: string;
  maxPrice?: string;
  type?: string;
}>;

const validDate = (value: string | undefined): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const boundedInt = (value: string | undefined, min: number, max: number) => {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
};

export const metadata: Metadata = {
  title: 'Explore Shortlets in Lagos',
  description:
    'Search approved shortlets across Lagos Island and Lagos Mainland — Victoria Island, Ikoyi, Lekki, Yaba, Shomolu, Surulere and Ikeja GRA.',
  alternates: { canonical: '/stays' },
};

export default async function StaysPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const area = (params.area || '').trim().slice(0, 80);
  const side = (params.side || '').trim().toLowerCase();
  const guests = boundedInt(params.guests, 1, 50);
  const bedrooms = boundedInt(params.bedrooms, 0, 20);
  const maxPrice = boundedInt(params.maxPrice, 20000, 100000000);
  const type = (params.type || '').trim().slice(0, 60);
  const checkIn = validDate(params.checkIn) ? params.checkIn : '';
  const checkOut = validDate(params.checkOut) ? params.checkOut : '';
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn);

  const supabase = getPublicSupabase();
  let stays: PublicStayRecord[] = [];
  let connected = false;
  let availabilityVerified = false;
  let availabilityMessage = '';

  if (supabase) {
    let query = supabase
      .from('properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(150);

    if (type) query = query.ilike('property_type', `%${type}%`);
    if (guests !== null) query = query.gte('capacity', guests);
    if (bedrooms !== null) query = query.gte('bedrooms', bedrooms);

    const result = await query;
    if (!result.error) {
      connected = true;
      stays = ((result.data ?? []) as PublicStayRecord[]).filter(stay => {
        if (side === 'mainland' && !isMainlandArea(stay.area || '')) return false;
        if (side === 'island' && isMainlandArea(stay.area || '')) return false;
        if (
          area &&
          !matchesLagosAreaFilter(
            {
              area: stay.area || '',
              address: stay.public_address || '',
              title: stay.title || '',
            },
            area,
          )
        ) {
          return false;
        }
        if (
          maxPrice !== null &&
          guestFacingNightlyNgn(Number(stay.nightly_rate || 0)) > maxPrice
        ) {
          return false;
        }
        return true;
      });

      if (datesValid) {
        const calendar = await supabase.rpc('get_unavailable_property_ids', {
          requested_check_in: checkIn,
          requested_check_out: checkOut,
        });
        if (!calendar.error) {
          const unavailable = new Set((calendar.data ?? []) as string[]);
          stays = stays.filter(stay => !unavailable.has(stay.id));
          availabilityVerified = true;
          availabilityMessage = `Showing stays without recorded calendar conflicts for ${checkIn} → ${checkOut}. Property partner confirmation is still required.`;
        } else {
          availabilityMessage =
            'We could not verify calendar blocks right now. Property partners confirm every booking request directly.';
        }
      } else if (params.checkIn || params.checkOut) {
        availabilityMessage =
          'Select both check-in and check-out (with check-out after check-in) to check calendar conflicts.';
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <section className="page-hero border-b border-ink-800 bg-ink-950 py-10 text-paper sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="eyebrow-light">Lagos shortlets · Mainland &amp; Island</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-[1.06] text-white sm:text-5xl">
              Explore verified{' '}
              <span className="italic text-brass-300">shortlet stays.</span>
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-ink-200 sm:text-base">
              Compare approved stays across Lagos Mainland (Yaba, Shomolu, Surulere, Ikeja GRA) and Lagos Island (Victoria Island, Ikoyi, Lekki Phase 1, Ajah) in ₦, $, or £.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <StaysExplorer
            stays={stays}
            connected={connected}
            availabilityVerified={availabilityVerified}
            availabilityMessage={availabilityMessage}
            initialFilters={{
              area,
              checkIn,
              checkOut,
              guests,
              bedrooms,
              maxPrice,
              type,
            }}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
