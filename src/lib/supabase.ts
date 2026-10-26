import { createClient } from '@supabase/supabase-js';

// Read public Supabase settings from Next.js or Vite without exposing server secrets.
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
const supabaseUrl =
  runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  runtimeEnv?.VITE_SUPABASE_URL?.trim() ||
  viteEnv?.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey =
  runtimeEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  runtimeEnv?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
  throw new Error(
    'Configure both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or both VITE equivalents) to enable Supabase.',
  );
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase =
  isSupabaseConfigured ? createClient(supabaseUrl!, supabasePublishableKey!) : null;

/**
 * Extract a useful message from Supabase Edge Function errors where available.
 */
export async function extractEdgeFunctionError(
  error: unknown,
  fallbackMessage: string,
): Promise<string> {
  if (error && typeof error === 'object') {
    const maybeContext = (error as { context?: unknown }).context;
    if (
      maybeContext &&
      typeof maybeContext === 'object' &&
      typeof (maybeContext as { clone?: unknown }).clone === 'function'
    ) {
      try {
        const body = (await (maybeContext as Response).clone().json()) as {
          error?: unknown;
          message?: unknown;
        };
        if (typeof body?.error === 'string' && body.error.trim()) return body.error.trim();
        if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim();
      } catch {
        // Use the normal error message below when the response is not JSON.
      }
    }

    const message = (error as { message?: unknown }).message;
    if (
      typeof message === 'string' &&
      message.trim() &&
      message.trim() !== 'Edge Function returned a non-2xx status code'
    ) {
      return message.trim();
    }
  }
  return fallbackMessage;
}
