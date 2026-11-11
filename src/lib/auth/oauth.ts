import { safeNextPath } from "@/components/account/next-path";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureUser, toSessionUser } from "@/lib/users";
import { AUTH_MESSAGES, AuthError } from "./codes";
import { devAuthActive } from "./dev-mode";
import { authErrorFields } from "./supabase-errors";
import type { SessionUser } from "./types";

export const OAUTH_CALLBACK_PATH = "/auth/callback";
const GOOGLE_NEEDS_SUPABASE = "Google sign-in works once Supabase is set up.";

export async function googleSignInUrl(next: string | null | undefined): Promise<string> {
  if (devAuthActive()) throw new AuthError("not_configured", GOOGLE_NEEDS_SUPABASE);
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AuthError("not_configured", AUTH_MESSAGES.not_configured);
  const callback = new URL(OAUTH_CALLBACK_PATH, appUrl());
  callback.searchParams.set("next", safeNextPath(next));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    if (error) log.warn("auth.oauth_start_failed", authErrorFields(error));
    throw new Error("Supabase didn't return a Google sign-in URL", { cause: error ?? undefined });
  }
  return data.url;
}

export async function finishOAuthSignIn(code: string): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    log.info("auth.oauth_exchange_failed", authErrorFields(error));
    return null;
  }
  const { id, email } = data.user;
  if (!email) return null;
  return toSessionUser(await ensureUser({ id, email }));
}
