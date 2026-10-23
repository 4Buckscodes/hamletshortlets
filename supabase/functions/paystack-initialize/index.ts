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

if (denoRuntime) {
  denoRuntime.serve(async (req: Request) => {
    const supabaseUrl = denoRuntime.env.get('SUPABASE_URL');
    const serviceRoleKey = denoRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = denoRuntime.env.get('PAYSTACK_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Supabase service credentials are not configured.' }),
        {
          status: 503,
          headers: {
            'access-control-allow-origin': '*',
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
          .select('id,reference,guest_id,property_id,check_in,check_out,status,guest_total,payment_deadline')
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingError) return { data: null, error: { message: bookingError.message } };
        if (!bookingRow) return { data: null, error: null };

        const [{ data: propRow, error: propError }, { data: conflicts, error: conflictError }] =
          await Promise.all([
            serviceClient
              .from('properties')
              .select('status')
              .eq('id', bookingRow.property_id)
              .maybeSingle(),
            serviceClient
              .from('bookings')
              .select('id')
              .eq('property_id', bookingRow.property_id)
              .eq('status', 'confirmed')
              .neq('id', bookingRow.id)
              .lt('check_in', bookingRow.check_out)
              .gt('check_out', bookingRow.check_in)
              .limit(1),
          ]);

        if (propError) return { data: null, error: { message: propError.message } };
        if (conflictError) return { data: null, error: { message: conflictError.message } };

        const snapshot: CheckoutBookingSnapshot = {
          id: bookingRow.id as string,
          reference: bookingRow.reference as string,
          guest_id: bookingRow.guest_id as string,
          property_id: bookingRow.property_id as string,
          property_status: (propRow?.status as string | undefined) ?? 'suspended',
          status: bookingRow.status as string,
          guest_total: bookingRow.guest_total as number,
          payment_deadline: (bookingRow.payment_deadline as string | null) ?? null,
          has_confirmed_conflict: (conflicts?.length ?? 0) > 0,
        };
        return { data: snapshot, error: null };
      },
    });
  });
}
