export type PublicStay = {
  id: string;
  title: string;
  area: string | null;
  property_type: string | null;
  guest_nightly_ngn: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  capacity: number | null;
  amenities: string[] | null;
  image_urls: string[] | null;
  trust_label: string | null;
  first_available_date: string | null;
};

const configuredBase = process.env.EXPO_PUBLIC_HAMLET_API_URL?.trim().replace(/\/$/, '');
export const HAMLET_API_BASE_URL = configuredBase || 'https://www.hamlet.rest';

export async function getPublicStays(): Promise<PublicStay[]> {
  const response = await fetch(HAMLET_API_BASE_URL + '/api/mobile/stays', {
    headers: { Accept: 'application/json' },
  });
  const payload = (await response.json()) as { properties?: PublicStay[]; error?: string };
  if (!response.ok) throw new Error(payload.error || 'Could not load stays.');
  return Array.isArray(payload.properties) ? payload.properties : [];
}
