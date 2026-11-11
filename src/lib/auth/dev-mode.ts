import { env } from "@/lib/env";

// NODE_ENV is read directly: production builds inline it, so dev branches are dead code there.

export const DEV_SESSION_COOKIE = "otto_dev_session";

export function devAuthActive(): boolean {
  return process.env.NODE_ENV === "development" && env().DEV_AUTH !== "supabase";
}
