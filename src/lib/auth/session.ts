import { cookies } from "next/headers";
import type { GitHubConnection } from "@/lib/github/connect";
import { log } from "@/lib/log";
import { authCookieOptions, isAuthCookie } from "@/lib/supabase/cookies";
import { createSupabaseServerClient, supabaseAuthConfigured } from "@/lib/supabase/server";
import { ensureUser, toSessionUser } from "@/lib/users";
import { clearDevSession, getDevUser } from "./dev";
import { devAuthActive } from "./dev-mode";
import { devGitHubConnection, githubConnectionOf } from "./github";
import { authErrorFields, isSignedOutError } from "./supabase-errors";
import type { AuthMode, SessionUser } from "./types";

export function authMode(): AuthMode {
  if (devAuthActive()) return "dev";
  return supabaseAuthConfigured() ? "supabase" : "off";
}

export type CurrentAccount = {
  user: SessionUser;
  github: GitHubConnection | null;
};

// getUser, not getClaims: a revoked session stops at once. Throws so an outage signs nobody out.
export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  if (devAuthActive()) {
    const user = await getDevUser();
    return user ? { user, github: devGitHubConnection() } : null;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isSignedOutError(error)) return null;
    log.warn("auth.get_user_failed", authErrorFields(error));
    throw new Error("Supabase Auth is unavailable", { cause: error });
  }
  const { id, email } = data.user;
  if (!email) return null;
  return {
    user: toSessionUser(await ensureUser({ id, email })),
    github: githubConnectionOf(data.user),
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getCurrentAccount())?.user ?? null;
}

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
