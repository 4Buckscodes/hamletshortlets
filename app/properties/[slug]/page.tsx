import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PropertyDetailPage, { generateMetadata as generatePropertyMetadata } from '@/app/stays/[id]/page';
import { getPublicSupabase } from '@/lib/supabase-public';

type Props = { params: Promise<{ slug: string }> };

async function resolvePropertyId(slug: string): Promise<string | null> {
  const db = getPublicSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from('properties')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = await resolvePropertyId(slug);
  if (!id) {
    return {
      title: 'Stay unavailable',
      robots: { index: false, follow: false },
    };
  }
  return generatePropertyMetadata({ params: Promise.resolve({ id }) });
}

export default async function PropertySlugPage({ params }: Props) {
  const { slug } = await params;
  const id = await resolvePropertyId(slug);
  if (!id) notFound();

  return PropertyDetailPage({ params: Promise.resolve({ id }) });
}
