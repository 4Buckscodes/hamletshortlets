import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (Boolean(supabaseUrl) !== Boolean(supabasePublishableKey)) {
  throw new Error('Configure both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable Supabase.');
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null;

/**
 * Extracts a structured `{ error, message }` message from a Supabase
 * `FunctionsHttpError` / `FunctionsRelayError` response context instead of
 * returning the generic `"Edge Function returned a non-2xx status code"` text.
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
        const cloned = (maybeContext as Response).clone();
        const body = (await cloned.json()) as { error?: unknown; message?: unknown };
        if (typeof body?.error === 'string' && body.error.trim()) {
          return body.error.trim();
        }
        if (typeof body?.message === 'string' && body.message.trim()) {
          return body.message.trim();
        }
      } catch {
        // Fall through to standard error message inspection
      }
    }

    const rawMessage = (error as { message?: unknown }).message;
    if (
      typeof rawMessage === 'string' &&
      rawMessage.trim() &&
      rawMessage.trim() !== 'Edge Function returned a non-2xx status code'
    ) {
      return rawMessage.trim();
    }
  }

  return fallbackMessage;
}

