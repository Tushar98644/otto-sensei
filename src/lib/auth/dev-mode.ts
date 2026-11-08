import { env } from "@/lib/env";

// Server-only and light (no database), so src/proxy.ts can use it. Development sign-in: `bun dev`
// signs people in with a code shown on screen and keeps everything in the local database, with no
// Supabase needed. DEV_AUTH=supabase switches development to real Supabase sign-in.
//
// The NODE_ENV check reads process.env directly: production builds replace it with "production",
// so every dev-mode branch is dead code there, whatever other variables are set.

export const DEV_SESSION_COOKIE = "otto_dev_session";

export function devAuthActive(): boolean {
  return process.env.NODE_ENV === "development" && env().DEV_AUTH !== "supabase";
}
