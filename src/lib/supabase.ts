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

export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;
