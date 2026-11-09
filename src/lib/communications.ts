'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Best-effort flush for the signed-in user's own pending email events.
 * Delivery errors never block signup, application submission, property intake or booking.
 */
export async function dispatchPendingCommunications(db: SupabaseClient | null | undefined): Promise<void> {
  if (!db) return;
  try {
    const { data } = await db.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/communications/dispatch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    // The durable outbox and daily production retry keep the event available.
  }
}
