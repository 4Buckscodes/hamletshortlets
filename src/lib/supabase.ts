import { createClient } from '@supabase/supabase-js';

// Keep the shared client compatible with both Next.js and the legacy Vite app.
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
  ¶»§q«^