import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleAdminNotificationsDispatch,
  type AdminNotificationUpdateInput,
  type ClaimedAdminNotificationRow,
} from './handler.ts';

interface Runtime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

const runtime = (globalThis as unknown as { Deno?: Runtime }).Deno;

if (runtime) {
  runtime.serve(async (req: Request) => {
    const url = runtime.env.get('SUPABASE_URL');
    const serviceKey = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const db =
      url && serviceKey
        ? createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;

    return handleAdminNotificationsDispatch(req, {
      internalDispatchSecret: runtime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET'),
      supabaseConfigured: Boolean(db),
      resendApiKey: runtime.env.get('RESEND_API_KEY'),
      resendFromEmail: runtime.env.get('RESEND_FROM_EMAIL'),
      resendReplyToEmail: runtime.env.get('RESEND_REPLY_TO_EMAIL'),
      operationsEmail: runtime.env.get('HAMLET_BOOKINGS_EMAIL'),
      hamletAppUrl: runtime.env.get('HAMLET_APP_URL'),
      claimAdminNotifications: async (batchLimit: number) => {
        if (!db) {
          return { data: null, error: { message: 'Supabase client is not configured.' } };
        }
        const { data, error } = await db.rpc('claim_admin_notifications', {
          batch_limit: batchLimit,
        });
        if (error) return { data: null, error: { message: error.message } };
        return {
          data: ((data ?? []) as unknown as ClaimedAdminNotificationRow[]),
          error: null,
        };
      },
      updateAdminNotification: async (input: AdminNotificationUpdateInput) => {
        if (!db) {
          return { error: { message: 'Supabase client is not configured.' } };
        }
        const patch: Record<string, unknown> = {
          delivery_status: input.delivery_status,
          last_delivery_error: input.last_delivery_error,
        };
        if (input.delivered_at !== undefined) {
          patch.delivered_at = input.delivered_at;
        }
        if (input.next_attempt_at !== undefined) {
          patch.next_attempt_at = input.next_attempt_at;
        }
        const { error } = await db
          .from('admin_notifications')
          .update(patch)
          .eq('id', input.id);
        return { error: error ? { message: error.message } : null };
      },
    });
  });
}
