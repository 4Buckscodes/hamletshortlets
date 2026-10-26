import { getPublicSupabase } from '@/lib/supabase-public';
import { PUBLIC_PROPERTY_SELECT, type PublicStayRecord } from '@/lib/next-supabase';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { HomeMarketplaceExperience } from './home-slideshow';

export const revalidate = 60;

export default async function HomePage() {
  const db = getPublicSupabase();
  let approvedStays: PublicStayRecord[] = [];
  let connected = false;

  if (db) {
    const { data, error } = await db
      .from('properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(18);
    if (!error) {
      approvedStays = (data ?? []) as PublicStayRecord[];
      connected = true;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteHeader />

      <main className="flex-1">
        <HomeMarketplaceExperience
          approvedStays={approvedStays}
          connected={connected}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
