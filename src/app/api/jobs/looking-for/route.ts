import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { saveLookingFor } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { type LookingForResponse } from "@/lib/job-feed/types";
import { noteTitles, titleVectorKey } from "@/lib/job-feed/title-vectors";
import { LookingForChoiceSchema } from "@/lib/job-feed/validation";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to keep what you're looking for.";

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
    // A role typed in is embedded once by the next jobs workflow run, then matched by its own vector.
    const title = body.data.role?.title ? titleVectorKey(body.data.role.title) : "";
    if (title) {
      await noteTitles(await getDb(), [title], Date.now(), { touch: true }).catch(
        (error: unknown) => log.warn("jobs.looking_for_title_not_noted", {}, error),
      );
    }
    const response: Omit<LookingForResponse, "ok"> = { choice: result.stored.lookingFor };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.looking_for_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
}
