import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";
import { authCookieOptions } from "./cookies";

// Server-only. A Supabase client bound to this request's cookies, for route handlers and server
// components. Never cache it across requests: it carries one visitor's session.

export type ServerSupabase = SupabaseClient;

export function supabaseAuthConfigured(): boolean {
  return supabaseConfig() !== null;
}

/** Null when Supabase isn't configured, so sign-in is off and everything else keeps working. */
export async function createSupabaseServerClient(): Promise<ServerSupabase | null> {
  // Read first, configured or not: anything that looks at the session must render per request.
  // Otherwise a build without Supabase keys would prerender /dashboard as signed out, forever.
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
          // Server components can't set cookies. src/proxy.ts already refreshed the session for
          // this request, so nothing is lost.
        }
      },
    },
  });
}
