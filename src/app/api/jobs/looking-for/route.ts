import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { saveLookingFor } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { LookingForChoiceSchema, type LookingForResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const SIGN_IN = "Sign in to keep what you're looking for.";

// PUT /api/jobs/looking-for: the parts of the Jobs tab's "Looking for" card the person changed.
// Free and Pro alike, since it only shapes the order of their own matches. It is read back with
// the work profile (GET /api/profile).
export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, LookingForChoiceSchema);
    if (!body.ok) {
      log.info("jobs.looking_for_bad_request", { reason: body.message });
      return fail("bad_request", "That choice didn't work. Pick one from the list.", 400, NO_STORE);
    }
    const result = await saveLookingFor(user.id, body.data);
    if (result.status === "no_user") return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<LookingForResponse, "ok"> = { choice: result.stored.lookingFor };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.looking_for_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
}
