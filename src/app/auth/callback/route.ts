import { NextResponse, type NextRequest } from "next/server";
import { loginHref, safeNextPath } from "@/components/account/next-path";
import { GITHUB_LINK } from "@/lib/auth/github";
import { finishOAuthSignIn } from "@/lib/auth/oauth";
import { GITHUB_ERROR_PARAM, type GitHubConnectError } from "@/lib/github/connect";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Supabase adds ?code=... on success and ?error=... on cancel or refusal. A GitHub sign-in started
// by hand ends here too, like any sign-in: GitHub has verified the email Supabase uses.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const code = params.get("code");
  try {
    if (code && (await finishOAuthSignIn(code))) return noStore(NextResponse.redirect(new URL(next, req.url)));
  } catch (error) {
    log.error("auth.oauth_callback_failed", error);
  }
  if (params.get("link") === GITHUB_LINK) return noStore(NextResponse.redirect(linkFailed(next, params, req.url)));
  if (params.has("error")) log.info("auth.oauth_cancelled", { reason: params.get("error")?.slice(0, 64) });
  const login = new URL(loginHref(next), req.url);
  login.searchParams.set("error", "google");
  return noStore(NextResponse.redirect(login));
}

// Connecting GitHub happens while signed in, so it goes back to the page it started on, saying
// why. Cancelling at GitHub needs no message.
function linkFailed(next: string, params: URLSearchParams, base: string): URL {
  const error = params.get("error");
  const reason = params.get("error_code") ?? error ?? "exchange_failed";
  log.info("auth.github_link_failed", { reason: reason.slice(0, 64) });
  const target = new URL(next, base);
  if (error !== "access_denied") {
    const why: GitHubConnectError = reason === "identity_already_exists" ? "taken" : "failed";
    target.searchParams.set(GITHUB_ERROR_PARAM, why);
  }
  return target;
}

// It carries session cookies: no shared cache may keep it.
function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
