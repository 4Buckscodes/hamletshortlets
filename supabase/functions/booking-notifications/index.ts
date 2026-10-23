import { createClient } from '@supabase/supabase-js';
import {
  handleBookingNotifications,
  type ClaimedBookingNotificationRow,
  type DispatchAuthorizationResult,
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

    return handleBookingNotifications(req, {
      resendApiKey: denoRuntime.env.get('RESEND_API_KEY'),
      resendFromEmail: denoRuntime.env.get('RESEND_FROM_EMAIL'),
      resendReplyToEmail: denoRuntime.env.get('RESEND_REPLY_TO_EMAIL'),
      hamletBookingsEmail: denoRuntime.env.get('HAMLET_BOOKINGS_EMAIL'),
      hamletAppUrl: denoRuntime.env.get('HAMLET_APP_URL'),
      internalDispatchSecret: denoRuntime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET'),
      getAuthenticatedUser: async (bearerToken: string) => {
        const { data, error } = await serviceClient.auth.getUser(bearerToken);
        if (error || !data.user) return null;
        return { id: data.user.id, email: data.user.email ?? undefined };
      },
      authorizeDispatch: async (bookingId: string | null, callerUserId: string) => {
        const { data, error } = await serviceClient.rpc(
          'authorize_booking_notification_dispatch',
          {
            target_booking_id: bookingId,
            caller_user_id: callerUserId,
          },
        );
        if (error) return { data: null, error: { message: error.message } };
        return { data: (data as DispatchAuthorizationResult | null) ?? null, error: null };
      },
      claimPendingNotifications: async ({ bookingId, batchLimit, ignoreBackoff }) => {
        const { data, error } = await serviceClient.rpc(
          'claim_pending_booking_notifications',
          {
            target_booking_id: bookingId,
            batch_limit: batchLimit,
            ignore_backoff: ignoreBackoff,
          },
        );
        if (error) return { data: null, error: { message: error.message } };
        return {
          data: ((data ?? []) as unknown as ClaimedBookingNotificationRow[]),
          error: null,
        };
      },
      completeNotification: async (input) => {
        const { error } = await serviceClient.rpc('complete_booking_notification', {
          target_notification_id: input.id,
          next_delivery_status: input.status,
          resolved_recipient_email: input.recipientEmail ?? null,
          rendered_subject: input.subject ?? null,
          message_id: input.providerMessageId ?? null,
          error_detail: input.errorDetail ?? null,
          backoff_seconds: input.backoffSeconds ?? 60,
        });
        return { error: error ? { message: error.message } : null };
      },
    });
  });
}
