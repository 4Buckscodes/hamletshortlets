import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  handleCustomerEmailDispatch,
  type CustomerEmailNotificationRow,
  type CustomerEmailCompletion,
} from './handler.ts';

interface Runtime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

const runtime = (globalThis as unknown as { Deno?: Runtime }).Deno;

if (runtime) {
  runtime.serve(async (req: Request) => {
    const supabaseUrl = runtime.env.get('SUPABASE_URL');
    const serviceRoleKey = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const db = supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

    return handleCustomerEmailDispatch(req, {
      internalDispatchSecret: runtime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET'),
      supabaseConfigured: Boolean(db),
      resendApiKey: runtime.env.get('RESEND_API_KEY'),
      resendFromEmail: runtime.env.get('RESEND_FROM_EMAIL'),
      resendReplyToEmail: runtime.env.get('RESEND_REPLY_TO_EMAIL'),
      hamletAppUrl: runtime.env.get('HAMLET_APP_URL'),
      claimNotifications: async (batchLimit: number) => {
        if (!db) return { data: null, error: { message: 'Supabase is not configured.' } };
        const { data, error } = await db.rpc('claim_pending_customer_email_notifications', {
          batch_limit: batchLimit,
        });
        if (error) return { data: null, error: { message: error.message } };
        return {
          data: (data ?? []) as CustomerEmailNotificationRow[],
          error: null,
        };
      },
      completeNotification: async (input: CustomerEmailCompletion) => {
        if (!db) return { error: { message: 'Supabase is not configured.' } };
        const { error } = await db.rpc('complete_customer_email_notification', {
          target_notification_id: input.id,
          next_delivery_status: input.status,
          resolved_recipient_email: input.recipientEmail ?? null,
          resolved_provider_message_id: input.providerMessageId ?? null,
          error_detail: input.errorDetail ?? null,
          backoff_seconds: input.backoffSeconds ?? 60,
        });
        return { error: error ? { message: error.message } : null };
      },
    });
  });
}
