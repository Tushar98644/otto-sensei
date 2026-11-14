import { cookies } from "next/headers";
import { cache } from "react";
import type { UserRow } from "@/db/schema";
import type { GitHubConnection } from "@/lib/github/connect";
import { log } from "@/lib/log";
import { authCookieOptions, isAuthCookie } from "@/lib/supabase/cookies";
import {
  createSupabaseServerClient,
  supabaseAuthConfigured,
  type ServerSupabase,
} from "@/lib/supabase/server";
import { ensureUser, findUserById, isUserId, toSessionUser } from "@/lib/users";
import { clearDevSession, getDevUser } from "./dev";
import { DEV_SESSION_COOKIE, devAuthActive } from "./dev-mode";
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
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  if (devAuthActive()) {
    const user = await getDevUser();
    return user ? { user, github: devGitHubConnection() } : null;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const early = readRowEarly(supabase);
  const startedAt = Date.now();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isSignedOutError(error)) return null;
    log.warn("auth.get_user_failed", {
      ...authErrorFields(error),
      durationMs: Date.now() - startedAt,
    });
    throw new Error("Supabase Auth is unavailable", { cause: error });
  }
  const { id, email } = data.user;
  if (!email) return null;
  const read = await early;
  const known = read?.id === id ? read.row : undefined;
  return {
    user: toSessionUser(await ensureUser({ id, email }, Date.now(), known)),
    github: githubConnectionOf(data.user),
  };
});

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getCurrentAccount())?.user ?? null;
}

// The JWT alone (signature checked, revocation not): only for choices that grant nothing.
export async function currentUserIdHint(): Promise<string | null> {
  if (devAuthActive()) return (await getDevUser())?.id ?? null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

// Cookie presence only, for logs: it says nothing about whether the session still works.
export async function hasSessionCookie(): Promise<boolean> {
  const names = (await cookies()).getAll().map(({ name }) => name);
  return names.some(
    (name) =>
      name === DEV_SESSION_COOKIE || (isAuthCookie(name) && !name.includes("-code-verifier")),
  );
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

type EarlyRead = { id: string; row: UserRow | null };

// The cookie's own claim, unchecked: it only lets the row read overlap getUser(), which decides.
async function readRowEarly(supabase: ServerSupabase): Promise<EarlyRead | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const id = subjectOf(data.session?.access_token);
    return id ? { id, row: await findUserById(id) } : null;
  } catch {
    return null;
  }
}

function subjectOf(token: string | undefined): string | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const { sub } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: unknown };
    return typeof sub === "string" && isUserId(sub) ? sub : null;
  } catch {
    return null;
  }
}
