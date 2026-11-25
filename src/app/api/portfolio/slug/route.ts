import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { checkSlug } from "@/lib/portfolio/records";
import { PORTFOLIO_LIMITS, type PortfolioSlugResponse } from "@/lib/portfolio/types";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { SIGN_IN } from "../limits";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT = 80;

// Signed in only, so nobody can walk the list of taken names.
export const GET = withApiLocale(async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const limit = await rateLimit(
      `portfolio:slug:user:${user.id}`,
      PORTFOLIO_LIMITS.slugChecksPerMinute,
      60_000,
    );
    if (!limit.allowed) {
      return fail("rate_limited", "Slow down a little, then try that address again.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const value = new URL(req.url).searchParams.get("value") ?? "";
    if (value.length > MAX_INPUT) {
      return fail("bad_request", "Keep it to 40 characters or fewer.", 400, NO_STORE);
    }
    const body: Omit<PortfolioSlugResponse, "ok"> = await checkSlug(user.id, value);
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.slug_check_failed", error);
    return fail("server_error", "Couldn't check that address. Please try again.", 500, NO_STORE);
  }
});
