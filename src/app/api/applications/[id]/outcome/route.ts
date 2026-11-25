import { trackStatusChanges } from "@/lib/analytics/retention";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { InterviewOutcomeSchema, type InterviewOutcomeResponse } from "@/lib/interviews/types";
import { log } from "@/lib/log";
import { SIGN_IN } from "../../messages";
import { answerInterview } from "../../records";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const GONE = "That interview isn't waiting for an answer any more.";

export const POST = withApiLocale(async function POST(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const { id } = await params;
    if (!ApplicationIdSchema.safeParse(id).success) return fail("not_found", GONE, 404, NO_STORE);
    const body = await readJson(req, InterviewOutcomeSchema);
    if (!body.ok) return fail("bad_request", "That answer isn't valid.", 400, NO_STORE);
    const answered = await answerInterview(user.id, id, body.data.outcome);
    if (!answered) return fail("not_found", GONE, 404, NO_STORE);
    if (answered.moved) trackStatusChanges(user.id, [answered.moved]);
    log.info("interview.outcome", { outcome: body.data.outcome });
    const response: Omit<InterviewOutcomeResponse, "ok"> = { application: answered.application };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("interview.outcome_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
});
