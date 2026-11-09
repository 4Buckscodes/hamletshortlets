import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { toPublicStayView } from '@/lib/discovery';
import { getPublicSupabase } from '@/lib/supabase-public';
import {
  PUBLIC_PROPERTY_SELECT,
  type PublicStayRecord,
  type PublicStayView,
} from '@/lib/next-supabase';
import {
  buildHomepageSchema,
  buildPublicPageMetadata,
} from '@/lib/structured-data';
import { SiteHeader, SiteFooter } from '@/components/site/SiteShell';
import { HomeMarketplaceExperience } from './home-slideshow';

export const revalidate = 60;

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    title: 'HAMLET.REST — Your stay, sorted.',
    description:
      'Approved shortlet apartments across Lagos Island and Lagos Mainland — clear listing details, recorded verification outcomes, and straightforward booking requests.',
    pathname: '/',
  }),
  title: {
    absolute: 'HAMLET.REST — Your stay, sorted.',
  },
  alternates: {
    canonical: 'https://hamlet.rest',
    types: {
      'text/plain': '/llms.txt',
    },
  },
};

export default async function HomePage() {
  const db = getPublicSupabase();
  let approvedStays: PublicStayView[] = [];
  let queryError = false;

  if (db) {
    const { data, error } = await db
      .from('public_properties')
      .select(PUBLIC_PROPERTY_SELECT)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(36);
    if (error) {
      queryError = true;
    } else {
      approvedStays = (data ?? []).map(row =>
        toPublicStayView(row as PublicStayRecord),
      );
    }
  }

  const pageSchema = buildHomepageSchema({ approvedStays });

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8F5EE] text-[#121F3C]">
      <SiteHeader />
      <JsonLd id="hamlet-homepage-jsonld" data={pageSchema} />

      <main className="flex-1">
        <HomeMarketplaceExperience
          approvedStays={approvedStays}
          queryError={queryError}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
