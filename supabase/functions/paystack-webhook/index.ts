import { createClient } from '@supabase/supabase-js';
import {
  handlePaystackWebhook,
  type ConfirmWebhookParams,
  type ConfirmWebhookResult,
} from './handler.ts';

interface DenoRuntime {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
}

const denoRuntime = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

if (denoRuntime) {
  denoRuntime.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, x-paystack-signature',
        },
      });
    }

    const supabaseUrl = denoRuntime.env.get('SUPABASE_URL');
    const serviceRoleKey = denoRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const paystackSecretKey = denoRuntime.env.get('PAYSTACK_SECRET_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Supabase service credentials are not configured.' }),
        { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return handlePaystackWebhook(req, {
      paystackSecretKey,
      confirmPaymentRpc: async (params: ConfirmWebhookParams) => {
        const { data, error } = await serviceClient.rpc(
          'confirm_booking_payment_webhook',
          params,
        );
        return {
          data: (data as ConfirmWebhookResult | null) ?? null,
          error: error ? { message: error.message } : null,
        };
      },
    });
  });
}
