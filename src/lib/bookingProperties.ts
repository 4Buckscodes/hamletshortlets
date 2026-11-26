import type { SupabaseClient } from '@supabase/supabase-js';

export interface BookingPropertySummary {
  title: string | null;
  area: string | null;
  image_urls: string[] | null;
}

/**
 * Name, area and photos of the stays the signed-in guest has booked. Read through a narrow database
 * function because guests cannot read raw property rows. A missing function or an error gives an
 * empty map, so booking pages still render with their fallback label.
 */
export async function loadBookingPropertySummaries(
  db: SupabaseClient,
): Promise<Map<string, BookingPropertySummary>> {
  const summaries = new Map<string, BookingPropertySummary>();
  try {
    const { data, error } = await db.rpc('get_my_booking_property_summaries');
    if (error || !Array.isArray(data)) return summaries;
    for (const row of data as Array<BookingPropertySummary & { property_id: string }>) {
      summaries.set(row.property_id, { title: row.title, area: row.area, image_urls: row.image_urls });
    }
  } catch {
    // Keep the empty map.
  }
  return summaries;
}

/** Adds a `properties` field to each booking, in the shape the booking pages already render. */
export function withPropertySummaries<T extends { property_id?: string | null }>(
  bookings: T[],
  summaries: Map<string, BookingPropertySummary>,
): Array<T & { properties: BookingPropertySummary | null }> {
  return bookings.map(booking => ({
    ...booking,
    properties: (booking.property_id ? summaries.get(booking.property_id) : undefined) ?? null,
  }));
}
