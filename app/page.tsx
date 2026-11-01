import showcaseInventory from '../docs/lagos-showcase-inventory.json';
import { sanitizeShowcaseInventory } from '@/lib/discovery';
import { getPublicSupabase } from '@/lib/supabase-public';
import { PUBLIC_PROPERTY_SELECT, type PublicStayRecord } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { HomeMarketplaceExperience } from './home-slideshow';

export const revalidate = 60;

const SHOWCASE_CONCEPTS = sanitizeShowcaseInventory(
  showcaseInventory as { properties?: ReadonlyArray<Record<string, unknown>> },
);

export default async function HomePage() {
  const db = getPublicSupabase();
  let approvedStays: PublicStayRecord[] = [];
  let queryError = false;

  if (db) {
    const { data, error } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(36);
    if (error) {
      queryError = true;
    } else {
      approvedStays = (data ?? []) as PublicStayRecord[];
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <HomeMarketplaceExperience
          approvedStays={approvedStays}
          showcaseConcepts={SHOWCASE_CONCEPTS}
          queryError={queryError}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
