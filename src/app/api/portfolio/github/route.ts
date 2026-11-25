import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import type { GitHubRefreshResponse } from "@/lib/portfolio/content";
import { refreshGitHub } from "@/lib/portfolio/content-records";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";
import { NO_PORTFOLIO, SIGN_IN } from "../limits";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Without a token GitHub allows this server 60 calls an hour in all, and a refresh costs three.
const REFRESHES_PER_HOUR = 6;

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401);
    const { user } = account;
    const limit = await rateLimit(`portfolio:github:user:${user.id}`, REFRESHES_PER_HOUR, HOUR_MS);
    if (!limit.allowed) {
      return fail(
        "rate_limited",
        `Your GitHub numbers were just updated. Try again in ${waitText(limit.retryAfterMs)}.`,
        429,
        retryAfterHeader(limit.retryAfterMs),
      );
    }
    const result = await refreshGitHub(user.id, account.github?.login ?? null, { force: true });
    if (!result) return fail("not_found", NO_PORTFOLIO, 404);
    if (result.changed) refreshPortfolioPages([result.slug]);
    const body: Omit<GitHubRefreshResponse, "ok"> = { github: result.github };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.github_refresh_failed", error);
    return fail("server_error", "Couldn't reach GitHub. Please try again in a minute.", 502);
  }
});
