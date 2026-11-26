import type { MetadataRoute } from 'next';
import { HAMLET_CANONICAL_ORIGIN } from '@/lib/structured-data';
import { getPublicSupabase } from '@/lib/supabase-public';
import { LAGOS_AREA_GUIDES, stayMatchesAreaGuide } from '@/lib/lagosAreaGuides';
import { BLOG_POSTS } from '@/lib/blogPosts';

/** Revalidate /sitemap.xml every 15 minutes so newly approved stays surface without requiring a redeploy. */
export const revalidate = 900;

const site = HAMLET_CANONICAL_ORIGIN;
const STATIC_BASELINE_LAST_MODIFIED = new Date('2026-11-08T00:00:00.000Z');

function resolveValidDate(raw: string | null | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getPublicSupabase();
  let approvedRows: Array<{
    id: string;
    updated_at?: string | null;
    created_at?: string | null;
    area?: string | null;
    public_address?: string | null;
    title?: string | null;
  }> = [];

  if (db) {
    const { data, error } = await db
      .from('public_properties')
      .select('id,updated_at,created_at,area,public_address,title')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (!error && Array.isArray(data)) {
      approvedRows = data;
    }
  }

  const latestInventoryDate =
    approvedRows.length > 0
      ? resolveValidDate(
          approvedRows[0]?.updated_at ?? approvedRows[0]?.created_at,
          STATIC_BASELINE_LAST_MODIFIED,
        )
      : STATIC_BASELINE_LAST_MODIFIED;

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${site}/`,
      lastModified: latestInventoryDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${site}/stays`,
      lastModified: latestInventoryDate,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${site}/lagos`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${site}/blog`,
      lastModified: resolveValidDate(BLOG_POSTS[0]?.dateModified ?? BLOG_POSTS[0]?.datePublished, STATIC_BASELINE_LAST_MODIFIED),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${site}/how-it-works`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${site}/safety`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${site}/faqs`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${site}/about`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${site}/legal`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${site}/partners/apply`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${site}/partners/apply/form`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${site}/llms.txt`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    {
      url: `${site}/llms-full.txt`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    {
      url: `${site}/llms-stays.txt`,
      lastModified: latestInventoryDate,
      changeFrequency: 'hourly',
      priority: 0.5,
    },
    {
      url: `${site}/llms.md`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    {
      url: `${site}/llms-full.md`,
      lastModified: STATIC_BASELINE_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.3,
    },
  ];

  for (const post of BLOG_POSTS) {
    routes.push({
      url: `${site}/blog/${post.slug}`,
      lastModified: resolveValidDate(post.dateModified ?? post.datePublished, STATIC_BASELINE_LAST_MODIFIED),
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  // Area pages are listed only once they have a live stay, matching their indexable state.
  for (const guide of LAGOS_AREA_GUIDES) {
    const matching = approvedRows.filter(row => stayMatchesAreaGuide(row, guide));
    if (matching.length === 0) continue;
    routes.push({
      url: `${site}/lagos/${guide.slug}`,
      lastModified: resolveValidDate(
        matching[0]?.updated_at ?? matching[0]?.created_at,
        STATIC_BASELINE_LAST_MODIFIED,
      ),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  for (const property of approvedRows) {
    routes.push({
      url: `${site}/stays/${encodeURIComponent(property.id)}`,
      lastModified: resolveValidDate(
        property.updated_at ?? property.created_at,
        STATIC_BASELINE_LAST_MODIFIED,
      ),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return routes;
}
