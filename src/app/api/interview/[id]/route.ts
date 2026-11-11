import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { InterviewPrepResponse } from "@/lib/api/types";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrep } from "@/lib/insights/prep-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const NOT_FOUND = "That application isn't in your list anymore.";

// Another account's id gets the same 404 as a missing one, so ids can't be probed.
export async function GET(_req: Request, { params }: Context): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your interview prep.", 401, NO_STORE);
    const { id } = await params;
    if (!ApplicationIdSchema.safeParse(id).success) return fail("not_found", NOT_FOUND, 404, NO_STORE);
    const record = await getPrep(user.id, id);
    if (!record) return fail("not_found", NOT_FOUND, 404, NO_STORE);
    const response: Omit<InterviewPrepResponse, "ok"> = record;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("interview.load_failed", error);
    return fail("server_error", "Couldn't load your interview prep. Please try again.", 500, NO_STORE);
  }
}
