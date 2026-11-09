import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleCustomerNotificationsDispatch,
  type CustomerNotificationUpdate,
  type ClaimedCustomerEmailNotification,
} from './handler.ts';

interface DenoRuntime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

const runtime = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

if (runtime) {
  runtime.serve(async (req: Request) => {
    const supabaseUrl = runtime.env.get('SUPABASE_URL');
    const serviceRoleKey = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Supabase service credentials are not configured.' }),
        { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
      );
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return handleCustomerNotificationsDispatch(req, {
      internalDispatchSecret: runtime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET'),
      resendApiKey: runtime.env.get('RESEND_API_KEY'),
      resendFromEmail: runtime.env.get('RESEND_FROM_EMAIL'),
      hamletAppUrl: runtime.env.get('HAMLET_APP_URL'),
      claimNotifications: async (batchLimit: number) => {
        const { data, error } = await db.rpc('claim_customer_email_notifications', {
          batch_limit: batchLimit,
        });
        if (error) return { data: null, error: { message: error.message } };
        return {
          data: (data ?? []) as unknown as ClaimedCustomerEmailNotification[],
          error: null,
        };
      },
      updateNotification: async (input: CustomerNotificationUpdate) => {
        const patch: Record<string, unknown> = {
          delivery_status: input.delivery_status,
          last_delivery_error: input.last_delivery_error,
          updated_at: new Date().toISOString(),
        };
        if (input.provider_message_id !== undefined) {
          patch.provider_message_id = input.provider_message_id;
        }
        if (input.delivered_at !== undefined) {
          patch.delivered_at = input.delivered_at;
        }
        if (input.next_attempt_at !== undefined) {
          patch.next_attempt_at = input.next_attempt_at;
        }
        const { error } = await db
          .from('customer_email_notifications')
          .update(patch)
          .eq('id', input.id)
          .eq('delivery_status', 'processing');
        return { error: error ? { message: error.message } : null };
      },
    });
  });
}
