import { createClient } from '@supabase/supabase-js';
import {
  handlePaystackInitialize,
  type CheckoutBookingSnapshot,
} from './handler.ts';

interface DenoRuntime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

const denoRuntime = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

if (denoRuntime) {
  denoRuntime.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const supabaseUrl = denoRuntime.env.get('SUPABASE_URL');
    const serviceRoleKey = denoRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = denoRuntime.env.get('PAYSTACK_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Supabase service credentials are not configured.' }),
        {
          status: 503,
          headers: {
            ...CORS_HEADERS,
            'content-type': 'application/json; charset=utf-8',
          },
        },
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return handlePaystackInitialize(req, {
      paystackSecretKey,
      getAuthenticatedUser: async (bearerToken: string) => {
        const { data, error } = await serviceClient.auth.getUser(bearerToken);
        if (error || !data.user || !data.user.email) return null;
        return { id: data.user.id, email: data.user.email };
      },
      loadBookingSnapshot: async (bookingId: string) => {
        const { data: bookingRow, error: bookingError } = await serviceClient
          .from('bookings')
          .select(
            'id,reference,guest_id,property_id,check_in,check_out,status,guest_total,settlement_total_ngn,quote_currency,quoted_guest_total,exchange_rate_ngn_per_unit,international_buffer_amount,quote_expires_at,payment_deadline',
          )
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingError) return { data: null, error: { message: bookingError.message } };
        if (!bookingRow) return { data: null, error: null };

        const [
          { data: propRow, error: propError },
          { data: guestProfileRow, error: guestProfileError },
          { data: conflicts, error: conflictError },
          { data: blockConflicts, error: blockError },
        ] = await Promise.all([
          serviceClient
            .from('properties')
            .select('status,first_available_date')
            .eq('id', bookingRow.property_id)
            .maybeSingle(),
          serviceClient
            .from('profiles')
            .select('account_status')
            .eq('id', bookingRow.guest_id)
            .maybeSingle(),
          serviceClient
            .from('bookings')
            .select('id,status,payment_deadline')
            .eq('property_id', bookingRow.property_id)
            .in('status', ['confirmed', 'awaiting_payment'])
            .neq('id', bookingRow.id)
            .lt('check_in', bookingRow.check_out)
            .gt('check_out', bookingRow.check_in),
          serviceClient
            .from('property_availability_blocks')
            .select('id')
            .eq('property_id', bookingRow.property_id)
            .lt('start_date', bookingRow.check_out)
            .gt('end_date', bookingRow.check_in),
        ]);

        if (propError) return { data: null, error: { message: propError.message } };
        if (guestProfileError) return { data: null, error: { message: guestProfileError.message } };
        if (conflictError) return { data: null, error: { message: conflictError.message } };
        if (blockError) return { data: null, error: { message: blockError.message } };

        const nowMs = Date.now();
        const beforeFirstAvailable = Boolean(
          propRow?.first_available_date &&
            String(bookingRow.check_in) < String(propRow.first_available_date),
        );
        const hasActiveHoldOrConfirmed =
          beforeFirstAvailable ||
          (blockConflicts ?? []).length > 0 ||
          (conflicts ?? []).some(row => {
            if (row.status === 'confirmed') return true;
            if (row.status === 'awaiting_payment') {
              if (!row.payment_deadline) return true;
              return new Date(String(row.payment_deadline)).getTime() > nowMs;
            }
            return false;
          });

        const snapshot: CheckoutBookingSnapshot = {
          id: bookingRow.id as string,
          reference: bookingRow.reference as string,
          guest_id: bookingRow.guest_id as string,
          property_id: bookingRow.property_id as string,
          property_status: (propRow?.status as string | undefined) ?? 'suspended',
          status: bookingRow.status as string,
          guest_total: bookingRow.guest_total as number,
          settlement_total_ngn: Number(bookingRow.settlement_total_ngn ?? bookingRow.guest_total),
          quote_currency: (bookingRow.quote_currency as string | undefined) ?? 'NGN',
          quoted_guest_total: Number(bookingRow.quoted_guest_total ?? bookingRow.guest_total),
          exchange_rate_ngn_per_unit: Number(bookingRow.exchange_rate_ngn_per_unit ?? 1),
          international_buffer_amount: Number(bookingRow.international_buffer_amount ?? 0),
          quote_expires_at: (bookingRow.quote_expires_at as string | null) ?? null,
          payment_deadline: (bookingRow.payment_deadline as string | null) ?? null,
          has_confirmed_conflict: hasActiveHoldOrConfirmed,
          check_in: String(bookingRow.check_in),
          guest_account_status: (guestProfileRow?.account_status as string | undefined) ?? 'active',
        };
        return { data: snapshot, error: null };
      },
    });
  });
}
