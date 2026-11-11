import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { type WorkProfileResponse } from "@/lib/eligibility/profile";
import { WorkProfileSchema } from "@/lib/eligibility/validation";
import { readWorkProfile, saveWorkProfile } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { requireProTool } from "../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user, so no browser or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };
const SIGN_IN = "Sign in to save your work profile.";

// GET /api/profile: the signed-in account's work profile (an empty one before the first save).
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const stored: Omit<WorkProfileResponse, "ok"> = await readWorkProfile(user.id);
    return ok(stored, { headers: NO_STORE });
  } catch (error) {
    log.error("profile.read_failed", error);
    return fail(
      "server_error",
      "Couldn't load your work profile. Please try again.",
      500,
      NO_STORE,
    );
  }
}

// PUT /api/profile: replaces the whole profile.
export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    // The work profile only feeds the work-rights check and job matching, both Pro. Reading it
    // stays open, so a Free account still sees what it saved.
    const locked = requireProTool(user, "eligibility");
    if (locked) return locked;
    const body = await readJson(req, WorkProfileSchema);
    if (!body.ok) {
      // readJson names the field and the rule it broke, never the value.
      log.info("profile.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Some of those details aren't valid. Check them and try again.",
        400,
      );
    }
    const result = await saveWorkProfile(user.id, body.data);
    if (result.status === "no_user") {
      log.info("profile.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401);
    }
    const response: Omit<WorkProfileResponse, "ok"> = result.stored;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("profile.save_failed", error);
    return fail("server_error", "Couldn't save your work profile. Please try again.", 500);
  }
}
