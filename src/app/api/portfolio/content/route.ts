import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { SaveContentSchema, type ContentResponse } from "@/lib/portfolio/content";
import { refreshGitHub, saveContent } from "@/lib/portfolio/content-records";
import { canBuildPortfolio } from "@/lib/portfolio/plan";
import { getPortfolio } from "@/lib/portfolio/records";
import { liveParts, screenedWrite } from "@/lib/portfolio/screen";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";
import { pageBlocked, pageChanged } from "../../public-pages";
import { NEEDS_PLAN, NO_PORTFOLIO, SIGN_IN } from "../limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAVES_PER_HOUR = 900;

export async function GET(): Promise<Response> {
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const { user } = account;
    const portfolio = await getPortfolio(user.id);
    if (!portfolio) return fail("not_found", NO_PORTFOLIO, 404, NO_STORE);
    const github = await refreshGitHub(user.id, account.github?.login ?? null);
    if (github?.changed) refreshPortfolioPages([github.slug]);
    const body: Omit<ContentResponse, "ok"> = {
      content: portfolio.content,
      github: github ? github.github : portfolio.github,
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

export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", SIGN_IN, 401);
    const { user } = account;
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
    const { content } = body.data;
    const result = await screenedWrite(
      user.id,
      "portfolio.content",
      (current) => liveParts(current, { content }),
      (version) => saveContent(user.id, content, Date.now(), version),
    );
    switch (result.status) {
      case "saved": {
        refreshPortfolioPages([result.slug]);
        const response: Omit<ContentResponse, "ok"> = {
          content: result.content,
          github: (await refreshGitHub(user.id, account.github?.login ?? null))?.github ?? null,
        };
        return ok(response, { headers: NO_STORE });
      }
      case "not_found":
        return fail("not_found", NO_PORTFOLIO, 404);
      case "no_user":
        return fail("unauthorized", SIGN_IN, 401);
      case "blocked":
        return pageBlocked();
      case "changed":
        return pageChanged();
    }
  } catch (error) {
    log.error("portfolio.content_save_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
  }
}
