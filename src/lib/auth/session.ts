import { cookies } from "next/headers";
import { log } from "@/lib/log";
import { authCookieOptions, isAuthCookie } from "@/lib/supabase/cookies";
import { createSupabaseServerClient, supabaseAuthConfigured } from "@/lib/supabase/server";
import { ensureUser, toSessionUser } from "@/lib/users";
import { clearDevSession, getDevUser } from "./dev";
import { devAuthActive } from "./dev-mode";
import { authErrorFields, isSignedOutError } from "./supabase-errors";
import type { AuthMode, SessionUser } from "./types";

// Server-only. Sessions belong to Supabase Auth (httpOnly "sb-..." cookies, refreshed by
// src/proxy.ts). Signing in happens in ./codes.ts (email code) and ./oauth.ts (Google). In
// development's dev sign-in, ./dev holds the session instead.

/** How people sign in on this deployment, for the sign-in form. */
export function authMode(): AuthMode {
  if (devAuthActive()) return "dev";
  return supabaseAuthConfigured() ? "supabase" : "off";
}

/**
 * The signed-in user with a fresh plan from our users row (webhooks change it), or null. Asks
 * Supabase on every call (getUser, not getClaims) so a signed-out or deleted session stops working
 * at once, as the old revocable sessions did. Throws when Supabase can't answer, instead of
 * returning null, so an outage can't send every visitor through the sign-out path.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (devAuthActive()) return getDevUser();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isSignedOutError(error)) return null;
    log.warn("auth.get_user_failed", authErrorFields(error));
    throw new Error("Supabase Auth is unavailable", { cause: error });
  }
  const { id, email } = data.user;
  // Every sign-in method here proves an address, so a user without one isn't ours.
  if (!email) return null;
  return toSessionUser(await ensureUser({ id, email }));
}

/**
 * Ends this browser's session at Supabase (other devices stay signed in) and expires the cookies.
 * The cookies go even when Supabase can't be reached, so signing out always works here.
 */
export async function clearSession(): Promise<void> {
  if (devAuthActive()) return clearDevSession();
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !isSignedOutError(error)) log.warn("auth.sign_out_failed", authErrorFields(error));
  }
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (isAuthCookie(name)) jar.delete({ name, ...authCookieOptions() });
  }
}
