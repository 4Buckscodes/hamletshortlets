import type { MetadataRoute } from 'next';
import { getPublicSupabase } from '@/lib/supabase-public';

const site = 'https://www.hamlet.rest';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    { url: site, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${site}/stays`, lastModified: now, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${site}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/safety`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${site}/lagos`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${site}/faqs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${site}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site}/partners/apply`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
  const db = getPublicSupabase();
  if (!db) return routes;
  const { data } = await db.from('properties')
    .select('id,updated_at,created_at')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(5000);
  for (const property of data ?? []) {
    routes.push({
      url: `${site}/stays/${encodeURIComponent(property.id)}`,
      lastModified: property.updated_at ? new Date(property.updated_at) : property.created_at ? new Date(property.created_at) : now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }
  return routes;
}
