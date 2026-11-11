import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { createWriting, listWritings } from "@/lib/writings/records";
import { WRITING_LIMITS, type WritingResponse, type WritingsResponse } from "@/lib/writings/schema";
import { CreateWritingSchema } from "@/lib/writings/validation";
import { requirePlanFeature } from "../metered-free";
import { INVALID, NO_STORE, SIGN_IN, writeLimited } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const count = new Intl.NumberFormat("en-US");

// GET /api/writings: readable on every plan, so letters written on Pro or the trial stay after it.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<WritingsResponse, "ok"> = await listWritings(user.id);
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("writings.list_failed", error);
    return fail(
      "server_error",
      "Couldn't load your letters and answers. Please try again.",
      500,
      NO_STORE,
    );
  }
}

// POST /api/writings: keeps a letter or answer the AI routes just wrote. Those are Pro and the
// trial only, so Free gets the same 402 as asking for one; a lapsed plan keeps what it saved.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const locked = requirePlanFeature(user, "letter");
    if (locked) return locked;
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, CreateWritingSchema);
    if (!body.ok) {
      // readJson names the field and the rule it broke, never the value.
      log.info("writings.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400);
    }
    const result = await createWriting(user.id, body.data);
    if (result.status === "no_user") return fail("unauthorized", SIGN_IN, 401);
    if (result.status === "limit_reached") {
      log.info("writings.limit_reached", { max: WRITING_LIMITS.perUser });
      return fail(
        "bad_request",
        `You can keep up to ${count.format(WRITING_LIMITS.perUser)} letters and answers. Delete some old ones to save more.`,
        400,
      );
    }
    const response: Omit<WritingResponse, "ok"> = { writing: result.writing };
    return ok(response, { status: 201 });
  } catch (error) {
    log.error("writings.create_failed", error);
    return fail("server_error", "Couldn't save that letter. Please try again.", 500);
  }
}
