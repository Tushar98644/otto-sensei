import { applyFollowUpAction } from "@/app/api/applications/records";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { type FollowUpActionResponse } from "@/lib/notifications/types";
import { FollowUpRequestSchema } from "@/lib/notifications/validation";
import { verifyFollowUpToken } from "@/lib/notifications/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID = "That reminder link isn't valid any more. Open your applications instead.";

// An email's link is often opened without a session, so its signature is the proof; the bell uses the session.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const body = await readJson(req, FollowUpRequestSchema);
    if (!body.ok) {
      log.info("notifications.follow_up_bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400, NO_STORE);
    }
    let userId: string;
    if ("t" in body.data) {
      const { u, a, act, t } = body.data;
      if (!verifyFollowUpToken(u, a, act, t)) {
        log.info("notifications.follow_up_invalid");
        return fail("bad_request", INVALID, 400, NO_STORE);
      }
      userId = u;
    } else {
      const user = await getCurrentUser();
      if (!user) return fail("unauthorized", "Sign in to change this reminder.", 401, NO_STORE);
      userId = user.id;
    }
    const { a, act } = body.data;
    const result = await applyFollowUpAction(userId, a, act);
    if (!result) {
      return fail("not_found", "That application isn't in your list any more.", 404, NO_STORE);
    }
    log.info("notifications.follow_up_action", { action: act, from: "t" in body.data ? "email" : "bell" });
    const response: Omit<FollowUpActionResponse, "ok"> = result;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.follow_up_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
}
