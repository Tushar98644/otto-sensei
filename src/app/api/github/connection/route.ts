import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { UrlResponse } from "@/lib/api/types";
import { AuthError } from "@/lib/auth/codes";
import { githubLinkUrl, unlinkGitHub } from "@/lib/auth/github";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import type { GitHubConnectionResponse } from "@/lib/github/connect";
import { GitHubConnectRequestSchema } from "@/lib/github/types";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { refreshGitHub } from "@/lib/portfolio/content-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to connect your GitHub account.";
const SIGN_IN_ONLY_WITH_GITHUB =
  "You sign in to this account with GitHub, so it can't be disconnected.";

export async function GET(): Promise<Response> {
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body: Omit<GitHubConnectionResponse, "ok"> = { connection: account.github };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error("github.connection_failed", error);
    return fail(
      "server_error",
      "Couldn't check your GitHub connection. Please try again.",
      500,
      NO_STORE,
    );
  }
}

// JSON-only, so another site can't start a connection with a form post.
export async function POST(req: Request): Promise<Response> {
  const rejected = rejectCrossSite(req) ?? rejectNonJson(req);
  if (rejected) return rejected;
  try {
    const body = await readJson(req, GitHubConnectRequestSchema);
    if (!body.ok) return fail("bad_request", "That return address isn't valid.", 400);
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401);
    if (account.github) {
      return fail("bad_request", `GitHub is already connected as ${account.github.login}.`, 409);
    }
    const response: Omit<UrlResponse, "ok"> = { url: await githubLinkUrl(body.data.next) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) return fail("auth_unavailable", error.message, 503);
    log.error("github.connect_start_failed", error);
    return fail("server_error", "Couldn't start connecting GitHub. Please try again.", 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const rejected = rejectCrossSite(req);
  if (rejected) return rejected;
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401);
    if (account.github && !account.github.canDisconnect) {
      return fail("bad_request", SIGN_IN_ONLY_WITH_GITHUB, 409);
    }
    if (account.github && (await unlinkGitHub()) === "only_identity") {
      return fail("bad_request", SIGN_IN_ONLY_WITH_GITHUB, 409);
    }
    await dropPortfolioGitHub(account.user.id);
    const body: Omit<GitHubConnectionResponse, "ok"> = { connection: null };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) return fail("auth_unavailable", error.message, 503);
    log.error("github.disconnect_failed", error);
    return fail("server_error", "Couldn't disconnect GitHub. Please try again.", 500);
  }
}

async function dropPortfolioGitHub(userId: string): Promise<void> {
  try {
    const result = await refreshGitHub(userId, null);
    if (result?.changed) refreshPortfolioPages([result.slug]);
  } catch (error) {
    log.warn("github.portfolio_clear_failed", {}, error);
  }
}
