import { checkContent } from "@/lib/ai/moderation";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshOwnerPortfolio } from "@/lib/portfolio/cache";
import { listShares, saveShare } from "@/lib/share/records";
import { shareSnapshot, snapshotText } from "@/lib/share/snapshot";
import { SHARE_LIMITS, type ShareResponse, type SharesResponse } from "@/lib/share/types";
import { CreateShareSchema } from "@/lib/share/validation";
import { requireProTool } from "../pro-tools";
import { pageBlocked } from "../public-pages";
import { SIGN_IN } from "./messages";
import { writeLimited } from "./write-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<SharesResponse, "ok"> = { links: await listShares(user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("share.list_failed", error);
    return fail(
      "server_error",
      "Couldn't load your shared links. Please try again.",
      500,
      NO_STORE,
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const locked = requireProTool(user, "share");
    if (locked) return locked;
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, CreateShareSchema);
    if (!body.ok) {
      log.info("share.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That resume couldn't be shared. Reload the page and try again.",
        400,
      );
    }
    const text = snapshotText(shareSnapshot(body.data.resume));
    if (!(await checkContent([text], { source: "share.create", thorough: true })).allowed)
      return pageBlocked();
    const result = await saveShare(user.id, body.data);
    if (result.status === "no_user") return fail("unauthorized", SIGN_IN, 401);
    if (result.status === "limit_reached") {
      return fail(
        "limit_reached",
        `You can share up to ${SHARE_LIMITS.live} resumes at once. Turn off a link you don't need, then try again.`,
        429,
      );
    }
    await refreshOwnerPortfolio(user.id);
    const response: Omit<ShareResponse, "ok"> = { link: result.link, created: result.created };
    return ok(response, { status: result.created ? 201 : 200, headers: NO_STORE });
  } catch (error) {
    log.error("share.save_failed", error);
    return fail("server_error", "Couldn't make the link. Please try again.", 500);
  }
}
