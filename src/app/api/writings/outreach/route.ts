import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { findOutreach } from "@/lib/writings/records";
import type { OutreachWritingResponse } from "@/lib/writings/schema";
import { OutreachLookupSchema } from "@/lib/writings/validation";
import { SIGN_IN } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The message kept for one job, so reopening the outreach dialog shows it instead of an empty one.
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const params = new URL(req.url).searchParams;
    const lookup = OutreachLookupSchema.parse({
      job: params.get("job") ?? undefined,
      application: params.get("application") ?? undefined,
    });
    const writing = await findOutreach(user.id, {
      jobId: lookup.job,
      applicationId: lookup.application,
    });
    const response: Omit<OutreachWritingResponse, "ok"> = { writing };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("writings.outreach_lookup_failed", error);
    return fail(
      "server_error",
      "Couldn't look for your saved message. Please try again.",
      500,
      NO_STORE,
    );
  }
}
