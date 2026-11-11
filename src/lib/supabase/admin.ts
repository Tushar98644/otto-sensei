import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig, supabaseSecretKey } from "@/lib/env";

// Bypasses every Supabase permission check: server only, and only for what a session can't do.

let cached: { key: string; client: SupabaseClient } | null = null;

export function createSupabaseAdminClient(): SupabaseClient | null {
  const config = supabaseConfig();
  const secretKey = supabaseSecretKey();
  if (!config || !secretKey) return null;
  const key = `${config.url}|${secretKey}`;
  if (cached?.key !== key) {
    cached = {
      key,
      client: createClient(config.url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    };
  }
  return cached.client;
}
