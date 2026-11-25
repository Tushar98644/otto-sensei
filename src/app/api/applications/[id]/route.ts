import { trackStatusChanges } from "@/lib/analytics/retention";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import {
  UpdateApplicationSchema,
  type ApplicationResponse,
  type ApplicationThreadResponse,
  type EmptyOk,
} from "@/lib/api/types";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { INVALID, NOT_FOUND, SIGN_IN } from "../messages";
import { deleteApplication, updateApplication } from "../records";
import { getApplicationThread } from "../thread";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const EMPTY: Omit<EmptyOk, "ok"> = {};

function isApplicationId(id: string): boolean {
  return ApplicationIdSchema.safeParse(id).success;
}

export const GET = withApiLocale(async function GET(
  _req: Request,
  { params }: Context,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const { id } = await params;
    const thread = isApplicationId(id) ? await getApplicationThread(user.id, id) : null;
    if (!thread) return fail("not_found", NOT_FOUND, 404, NO_STORE);
    const response: Omit<ApplicationThreadResponse, "ok"> = { thread };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("applications.thread_failed", error);
    return fail("server_error", "Couldn't load that application. Please try again.", 500, NO_STORE);
  }
});

// Another account's id gets the same 404 as one that never existed, so ids can't be probed.
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
    if (!isApplicationId(id)) return fail("not_found", NOT_FOUND, 404);
    const body = await readJson(req, UpdateApplicationSchema);
    if (!body.ok) {
      log.info("applications.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400);
    }
    const updated = await updateApplication(user.id, id, body.data);
    if (!updated) return fail("not_found", NOT_FOUND, 404);
    if (updated.moved) trackStatusChanges(user.id, [updated.moved]);
    const response: Omit<ApplicationResponse, "ok"> = { application: updated.application };
    return ok(response);
  } catch (error) {
    log.error("applications.update_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
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
    if (isApplicationId(id)) await deleteApplication(user.id, id);
    return ok(EMPTY);
  } catch (error) {
    log.error("applications.delete_failed", error);
    return fail("server_error", "Couldn't delete that application. Please try again.", 500);
  }
});
