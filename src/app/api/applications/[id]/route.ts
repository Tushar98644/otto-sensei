import { fail, ok } from "@/lib/api/respond";
import {
  UpdateApplicationSchema,
  type ApplicationResponse,
  type ApplicationThreadResponse,
  type EmptyOk,
} from "@/lib/api/types";
import { ApplicationIdSchema } from "@/lib/applications/schema";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { INVALID, NOT_FOUND, SIGN_IN } from "../messages";
import { deleteApplication, updateApplication } from "../records";
import { getApplicationThread } from "../thread";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type Context = { params: Promise<{ id: string }> };

const EMPTY: Omit<EmptyOk, "ok"> = {};

function isApplicationId(id: string): boolean {
  return ApplicationIdSchema.safeParse(id).success;
}

// The application with everything linked to it, for its own page. Readable on every plan, like
// the list: a Free account keeps what it made on Pro or the trial.
export async function GET(_req: Request, { params }: Context): Promise<Response> {
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
}

// Another account's id gets the same 404 as one that never existed, so ids can't be probed.
export async function PATCH(req: Request, { params }: Context): Promise<Response> {
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
    const application = await updateApplication(user.id, id, body.data);
    if (!application) return fail("not_found", NOT_FOUND, 404);
    const response: Omit<ApplicationResponse, "ok"> = { application };
    return ok(response);
  } catch (error) {
    log.error("applications.update_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
  }
}

// Succeeds when there was nothing to delete too: the caller only needs the row gone. Open on Free:
// people can always clear out their own data.
export async function DELETE(req: Request, { params }: Context): Promise<Response> {
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
}
