import type { SessionUser } from "@/lib/auth/types";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { emailTrackingAvailable } from "@/lib/inbound/config";
import { HANDLE_PROBLEMS, normalizeHandle } from "@/lib/inbound/handle";
import { claimHandle, currentHandle, retireHandle } from "@/lib/inbound/handles";
import { canTrackFromEmail } from "@/lib/inbound/plan";
import { confirmSource, forgetConfirmation, trackingState } from "@/lib/inbound/records";
import type { EmailTrackingResponse } from "@/lib/inbound/types";
import { TrackingActionSchema } from "@/lib/inbound/validation";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitLong } from "@/lib/rate-limit";
import { DAY_MS } from "@/lib/time";
import { proToolRequired } from "../pro-tools";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to track applications from email.";
// Picking a first handle and changing it share this: enough to fix a typo, too few to hoard names.
const HANDLES_PER_DAY = 5;
const TAKEN = "Someone already has that one. Try another.";

async function state(user: SessionUser, status = 200): Promise<Response> {
  const response: Omit<EmailTrackingResponse, "ok"> = { tracking: await trackingState(user) };
  return ok(response, { status, headers: NO_STORE });
}

export const GET = withApiLocale(async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    return await state(user);
  } catch (error) {
    log.error("email_tracking.read_failed", error);
    return fail("server_error", "Couldn't load email tracking. Please try again.", 500, NO_STORE);
  }
});

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const body = await readJson(req, TrackingActionSchema);
    if (!body.ok) return fail("bad_request", "That isn't something Otto can do here.", 400);
    const action = body.data;
    if (action.action === "confirmed") {
      await confirmSource(user.id);
      return await state(user);
    }
    if (action.action === "not_mine") {
      await forgetConfirmation(user.id);
      return await state(user);
    }
    if (!canTrackFromEmail(user.plan)) return proToolRequired(user, "tracker");
    if (!emailTrackingAvailable()) {
      return fail("server_error", "Email tracking isn't available yet.", 503);
    }
    const handle = normalizeHandle(action.handle);
    if (action.action === "handle" && (await currentHandle(user.id)) === handle) {
      return await state(user);
    }
    const limited = await rateLimit(`email-handle:user:${user.id}`, HANDLES_PER_DAY, DAY_MS);
    if (!limited.allowed) {
      return fail(
        "rate_limited",
        `That's a lot of new addresses today. Try again in ${waitLong(limited.retryAfterMs)}.`,
        429,
        retryAfterHeader(limited.retryAfterMs),
      );
    }
    const result = await claimHandle(user.id, handle);
    if (result === "no_user") return fail("unauthorized", SIGN_IN, 401);
    if (result === "taken") return fail("bad_request", TAKEN, 409);
    if (result !== "ok") return fail("bad_request", HANDLE_PROBLEMS[result], 400);
    log.info("email_tracking.handle", { action: action.action });
    return await state(user, action.action === "start" ? 201 : 200);
  } catch (error) {
    log.error("email_tracking.start_failed", error);
    return fail("server_error", "Couldn't set up your address. Please try again.", 500);
  }
});

export const DELETE = withApiLocale(async function DELETE(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    await retireHandle(user.id);
    log.info("email_tracking.stopped");
    return await state(user);
  } catch (error) {
    log.error("email_tracking.stop_failed", error);
    return fail("server_error", "Couldn't turn it off. Please try again.", 500);
  }
});
