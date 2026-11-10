import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { SaveContentSchema, type ContentResponse } from "@/lib/portfolio/content";
import { refreshGitHub, saveContent } from "@/lib/portfolio/content-records";
import { canBuildPortfolio } from "@/lib/portfolio/plan";
import { getPortfolio } from "@/lib/portfolio/records";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { NEEDS_PLAN, NO_PORTFOLIO, NO_STORE, SIGN_IN } from "../limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
// The editor autosaves a second after typing stops, so a long session sends a lot of these.
const SAVES_PER_HOUR = 900;

// GET /api/portfolio/content: the stored document and the GitHub numbers (fetched again when stale).
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const portfolio = await getPortfolio(user.id);
    if (!portfolio) return fail("not_found", NO_PORTFOLIO, 404, NO_STORE);
    const github = await refreshGitHub(user.id);
    if (github?.changed) refreshPortfolioPages([github.slug]);
    const body: Omit<ContentResponse, "ok"> = {
      content: portfolio.content,
      github: github?.github ?? portfolio.github,
    };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.content_load_failed", error);
    return fail(
      "server_error",
      "Couldn't load your page's content. Please try again.",
      500,
      NO_STORE,
    );
  }
}

// PUT /api/portfolio/content: replaces the document (the editor autosaves it whole).
export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    if (!canBuildPortfolio(user.plan)) return fail("upgrade_required", NEEDS_PLAN, 402);
    const limit = await rateLimit(`portfolio:content:user:${user.id}`, SAVES_PER_HOUR, HOUR_MS);
    if (!limit.allowed) {
      return fail(
        "rate_limited",
        `That's a lot of changes in one hour. Your last ones are kept; try again in ${waitText(limit.retryAfterMs)}.`,
        429,
        retryAfterHeader(limit.retryAfterMs),
      );
    }
    const body = await readJson(req, SaveContentSchema);
    if (!body.ok) {
      log.info("portfolio.content_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That change couldn't be saved. Check the field marked in red.",
        400,
      );
    }
    const result = await saveContent(user.id, body.data.content);
    switch (result.status) {
      case "saved": {
        refreshPortfolioPages([result.slug]);
        const response: Omit<ContentResponse, "ok"> = {
          content: result.content,
          github: (await refreshGitHub(user.id))?.github ?? null,
        };
        return ok(response, { headers: NO_STORE });
      }
      case "not_found":
        return fail("not_found", NO_PORTFOLIO, 404);
      case "no_user":
        return fail("unauthorized", SIGN_IN, 401);
    }
  } catch (error) {
    log.error("portfolio.content_save_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
  }
}
