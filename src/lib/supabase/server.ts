import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";
import { authCookieOptions } from "./cookies";
import { fetchWithDeadline } from "./deadline";

// Never cache it across requests: it carries one visitor's session.

export type ServerSupabase = SupabaseClient;

export function supabaseAuthConfigured(): boolean {
  return supabaseConfig() !== null;
}

export async function createSupabaseServerClient(): Promise<ServerSupabase | null> {
  // Read cookies first, configured or not, or a keyless build prerenders /dashboard signed out.
  const store = await cookies();
  const config = supabaseConfig();
  if (!config) return null;
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Server components can't set cookies; src/proxy.ts already refreshed the session.
        }
      },
    },
    global: { fetch: fetchWithDeadline() },
  });
}
