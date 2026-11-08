import { fail, ok } from "@/lib/api/respond";
import type { InterviewPrepResponse } from "@/lib/api/types";
import { ApplicationIdSchema } from "@/lib/applications/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrep } from "@/lib/insights/prep-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// Per-user, and replaced by every new pack, so no browser or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };
const NOT_FOUND = "That application isn't in your list anymore.";

// The application's job details and its saved prep pack. Another account's id gets the same 404 as
// one that never existed, so ids can't be probed.
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
