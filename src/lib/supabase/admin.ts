import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig, supabaseSecretKey } from "@/lib/env";

// Server-only. Bypasses every Supabase permission check: never import it from client code, and only
// use it for what the signed-in user's own session can't do (deleting their auth account).

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
