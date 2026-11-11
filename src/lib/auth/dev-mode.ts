import { env } from "@/lib/env";

// Light (no database), so src/proxy.ts can use it. DEV_AUTH=supabase switches development to real
// Supabase sign-in. NODE_ENV is read directly: production builds inline it, so every dev branch is
// dead code there whatever else is set.

export const DEV_SESSION_COOKIE = "otto_dev_session";

export function devAuthActive(): boolean {
  return process.env.NODE_ENV === "development" && env().DEV_AUTH !== "supabase";
}
