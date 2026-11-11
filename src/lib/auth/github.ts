import type { User, UserIdentity } from "@supabase/supabase-js";
import { safeNextPath } from "@/components/account/next-path";
import { appUrl, env } from "@/lib/env";
import type { GitHubConnection } from "@/lib/github/connect";
import { GITHUB_USERNAME } from "@/lib/github/username";
import { log } from "@/lib/log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AUTH_MESSAGES, AuthError } from "./codes";
import { devAuthActive } from "./dev-mode";
import { OAUTH_CALLBACK_PATH } from "./oauth";
import { authErrorFields } from "./supabase-errors";

// Supabase manual identity linking: its login is the only GitHub account the import and portfolio
// read, so nobody can claim someone else's public work.

// /auth/callback?link=github marks a linking round trip, so a failure goes back to the page.
export const GITHUB_LINK = "github";

const NOT_SET_UP = "Connecting GitHub isn't set up yet. Please try again later.";
const DEV_NOT_SET_UP = "Dev sign-in can't link GitHub. Set DEV_GITHUB_LOGIN in .env.local instead.";
// Manual linking off, or the GitHub provider off (older Auth servers call it a validation error).
const SETUP_ERRORS: ReadonlySet<string> = new Set([
  "manual_linking_disabled",
  "provider_disabled",
  "validation_failed",
]);

// Supabase copies GitHub's login into both fields when the identity is linked.
function loginOf(identity: UserIdentity): string | null {
  const data: Record<string, unknown> = identity.identity_data ?? {};
  for (const value of [data.user_name, data.preferred_username]) {
    if (typeof value === "string" && GITHUB_USERNAME.test(value)) return value;
  }
  return null;
}

export function githubConnectionOf(user: Pick<User, "identities">): GitHubConnection | null {
  const identities = user.identities ?? [];
  const github = identities.find((identity) => identity.provider === "github");
  const login = github ? loginOf(github) : null;
  return login ? { login, canDisconnect: identities.length > 1 } : null;
}

export function devGitHubConnection(): GitHubConnection | null {
  if (!devAuthActive()) return null;
  const login = env().DEV_GITHUB_LOGIN?.trim() ?? "";
  return GITHUB_USERNAME.test(login) ? { login, canDisconnect: false } : null;
}

// Like Google sign-in: sets the PKCE verifier cookie and returns to /auth/callback?link=github.
export async function githubLinkUrl(next: string | null | undefined): Promise<string> {
  if (devAuthActive()) throw new AuthError("not_configured", DEV_NOT_SET_UP);
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AuthError("not_configured", AUTH_MESSAGES.not_configured);
  const callback = new URL(OAUTH_CALLBACK_PATH, appUrl());
  callback.searchParams.set("next", safeNextPath(next));
  callback.searchParams.set("link", GITHUB_LINK);
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "github",
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });
  if (error && SETUP_ERRORS.has(error.code ?? "")) {
    log.warn("auth.github_link_not_set_up", authErrorFields(error));
    throw new AuthError("not_configured", NOT_SET_UP);
  }
  if (error || !data.url) {
    if (error) log.warn("auth.github_link_start_failed", authErrorFields(error));
    throw new Error("Supabase didn't return a GitHub link URL", { cause: error ?? undefined });
  }
  return data.url;
}

export type UnlinkResult = "unlinked" | "not_linked" | "only_identity";

/** Supabase keeps it when it's the account's only way to sign in. */
export async function unlinkGitHub(): Promise<UnlinkResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AuthError("not_configured", AUTH_MESSAGES.not_configured);
  const listed = await supabase.auth.getUserIdentities();
  if (listed.error) throw new Error("Supabase didn't list the identities", { cause: listed.error });
  const github = listed.data.identities.find((identity) => identity.provider === "github");
  if (!github) return "not_linked";
  if (listed.data.identities.length < 2) return "only_identity";
  const { error } = await supabase.auth.unlinkIdentity(github);
  if (!error) return "unlinked";
  if (error.code === "single_identity_not_deletable") return "only_identity";
  if (SETUP_ERRORS.has(error.code ?? "")) throw new AuthError("not_configured", NOT_SET_UP);
  log.warn("auth.github_unlink_failed", authErrorFields(error));
  throw new Error("Supabase didn't unlink GitHub", { cause: error });
}
