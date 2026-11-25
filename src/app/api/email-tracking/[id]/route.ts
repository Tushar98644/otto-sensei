import { z } from "zod";
import { isPaidPlan } from "@/config/plans";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { applyEmail, undoEmail } from "@/lib/inbound/apply";
import { dismissEmail, trackingState } from "@/lib/inbound/records";
import type { UndoEmailResponse } from "@/lib/inbound/types";
import { EmailActionSchema } from "@/lib/inbound/validation";
import { log } from "@/lib/log";
import { planFullText } from "@/lib/plan-limits-copy";
import { PRO_TOOL_MESSAGES } from "../../pro-tools";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const SIGN_IN = "Sign in to track applications from email.";
const GONE = "That update isn't in your list anymore.";
const isId = (id: string) => z.uuid().safeParse(id).success;

export const PATCH = withApiLocale(async function PATCH(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (!isId(id)) return fail("not_found", GONE, 404);
    const body = await readJson(req, EmailActionSchema);
    if (!body.ok) return fail("bad_request", "Nothing to change.", 400);
    const result =
      body.data.action === "apply"
        ? await applyEmail(user.id, user.plan, id)
        : await undoEmail(user.id, id);
    if (result === "not_found") return fail("not_found", GONE, 404);
    if (result === "full") {
      log.info("email_tracking.limit_reached", { plan: user.plan });
      const message = isPaidPlan(user.plan)
        ? planFullText("tracker", user.plan)
        : PRO_TOOL_MESSAGES.tracker;
      return fail("limit_reached", message, 429);
    }
    if (result === "changed") {
      return fail(
        "bad_request",
        "That card has changed since, so Undo would lose your edit. Move it by hand instead.",
        409,
      );
    }
    const response: Omit<UndoEmailResponse, "ok"> = { tracking: await trackingState(user) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("email_tracking.change_failed", error);
    return fail("server_error", "Couldn't make that change. Please try again.", 500);
  }
});

export const DELETE = withApiLocale(async function DELETE(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (isId(id)) await dismissEmail(user.id, id);
    const response: Omit<UndoEmailResponse, "ok"> = { tracking: await trackingState(user) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("email_tracking.dismiss_failed", error);
    return fail("server_error", "Couldn't clear that. Please try again.", 500);
  }
});
