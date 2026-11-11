import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { deletePortfolio } from "@/lib/portfolio/content-records";
import { canBuildPortfolio } from "@/lib/portfolio/plan";
import {
  createPortfolio,
  getPortfolio,
  updatePortfolio,
  type SaveResult,
} from "@/lib/portfolio/records";
import { SLUG_MESSAGES } from "@/lib/portfolio/slug";
import { type PortfolioResponse, type PortfolioSaveResponse } from "@/lib/portfolio/types";
import { CreatePortfolioSchema, UpdatePortfolioSchema } from "@/lib/portfolio/validation";
import { NEEDS_PLAN, NO_PORTFOLIO, SIGN_IN, writeLimited } from "./limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function answer(result: SaveResult, createdStatus = 200): Response {
  switch (result.status) {
    case "saved": {
      // Before answering, so the owner's "Open page" never lands on the old copy.
      refreshPortfolioPages([result.portfolio.slug, ...result.touched]);
      const body: Omit<PortfolioSaveResponse, "ok"> = {
        portfolio: result.portfolio,
        created: result.created,
      };
      return ok(body, { status: result.created ? createdStatus : 200, headers: NO_STORE });
    }
    case "bad_slug":
      return fail("bad_request", result.message, 400);
    case "slug_taken":
      return fail("bad_request", SLUG_MESSAGES.taken, 400);
    case "needs_portfolio_plan":
      return fail("upgrade_required", NEEDS_PLAN, 402);
    case "not_found":
      return fail("not_found", NO_PORTFOLIO, 404);
    case "no_user":
      return fail("unauthorized", SIGN_IN, 401);
  }
}

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body: Omit<PortfolioResponse, "ok"> = { portfolio: await getPortfolio(user.id) };
    return ok(body, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.load_failed", error);
    return fail("server_error", "Couldn't load your portfolio. Please try again.", 500, NO_STORE);
  }
}

// Nothing goes live until the owner publishes.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    if (!canBuildPortfolio(user.plan)) return fail("upgrade_required", NEEDS_PLAN, 402);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, CreatePortfolioSchema);
    if (!body.ok) {
      // readJson names the field and the rule it broke, never the value.
      log.info("portfolio.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That resume couldn't be made into a portfolio. Reload the page and try again.",
        400,
      );
    }
    return answer(await createPortfolio(user.id, body.data), 201);
  } catch (error) {
    log.error("portfolio.create_failed", error);
    return fail("server_error", "Couldn't make your portfolio. Please try again.", 500);
  }
}

export async function PATCH(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, UpdatePortfolioSchema);
    if (!body.ok) {
      log.info("portfolio.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That change couldn't be saved. Reload the page and try again.",
        400,
      );
    }
    return answer(await updatePortfolio(user.id, body.data, user));
  } catch (error) {
    log.error("portfolio.update_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
  }
}

// The page stops answering at once; the resume it came from is untouched.
export async function DELETE(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const slugs = await deletePortfolio(user.id);
    if (!slugs) return fail("not_found", NO_PORTFOLIO, 404);
    refreshPortfolioPages(slugs);
    return ok({}, { headers: NO_STORE });
  } catch (error) {
    log.error("portfolio.delete_failed", error);
    return fail("server_error", "Couldn't delete your portfolio. Please try again.", 500);
  }
}
