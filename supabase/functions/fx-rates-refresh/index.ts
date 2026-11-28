import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleFxRatesRefresh } from './handler.ts';

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
        ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : null;

    return handleFxRatesRefresh(req, {
      apiKey: runtime.env.get('EXCHANGERATE_API_KEY'),
      internalDispatchSecret: runtime.env.get('HAMLET_INTERNAL_DISPATCH_SECRET'),
      verifyVaultDispatchSecret: async (candidate: string) => {
        if (!db) return false;
        const { data, error } = await db.rpc('verify_hamlet_email_dispatch_secret', {
          candidate_secret: candidate,
        });
        return !error && data === true;
      },
      applyRate: async input => {
        if (!db) return { error: { message: 'Supabase client is not configured.' } };
        const { error } = await db.rpc('apply_fx_rate_refresh', {
          target_currency: input.currency,
          next_ngn_per_unit: input.ngnPerUnit,
          rate_source: input.source,
          valid_hours: input.validHours,
        });
        return { error: error ? { message: error.message } : null };
      },
    });
  });
}
