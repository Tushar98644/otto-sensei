import { applyFollowUpAction } from "@/app/api/applications/records";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { type FollowUpActionResponse } from "@/lib/notifications/types";
import { FollowUpActionSchema } from "@/lib/notifications/validation";
import { verifyFollowUpToken } from "@/lib/notifications/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID = "That reminder link isn't valid any more. Open your applications instead.";

// Often sent without a session, so the signed link is the proof of whose application it is.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const body = await readJson(req, FollowUpActionSchema);
    if (!body.ok) {
      log.info("notifications.follow_up_bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400, NO_STORE);
    }
    const { u, a, act, t } = body.data;
    if (!verifyFollowUpToken(u, a, act, t)) {
      log.info("notifications.follow_up_invalid");
      return fail("bad_request", INVALID, 400, NO_STORE);
    }
    const result = await applyFollowUpAction(u, a, act);
    if (!result) {
      return fail("not_found", "That application isn't in your list any more.", 404, NO_STORE);
    }
    log.info("notifications.follow_up_action", { action: act });
    const response: Omit<FollowUpActionResponse, "ok"> = result;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.follow_up_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
}
