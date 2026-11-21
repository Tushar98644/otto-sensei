import { z } from "zod";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { refreshOwnerPortfolio } from "@/lib/portfolio/cache";
import { revokeShare, updateShareOptions } from "@/lib/share/records";
import { type ShareResponse } from "@/lib/share/types";
import { UpdateShareSchema } from "@/lib/share/validation";
import { NOT_FOUND, SIGN_IN } from "../messages";
import { writeLimited } from "../write-limit";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const isShareId = (id: string) => z.uuid().safeParse(id).success;

// Another account's id gets the same 404 as a missing one, so ids can't be probed.
export async function PATCH(req: Request, { params }: Context): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (!isShareId(id)) return fail("not_found", NOT_FOUND, 404);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, UpdateShareSchema);
    if (!body.ok) {
      log.info("share.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That change couldn't be saved. Reload the page and try again.",
        400,
      );
    }
    const link = await updateShareOptions(user.id, id, body.data);
    if (!link) return fail("not_found", NOT_FOUND, 404);
    await refreshOwnerPortfolio(user.id);
    const response: Omit<ShareResponse, "ok"> = { link, created: false };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("share.update_failed", error);
    return fail("server_error", "Couldn't save that change. Please try again.", 500);
  }
}

export async function DELETE(req: Request, { params }: Context): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (isShareId(id) && (await revokeShare(user.id, id))) await refreshOwnerPortfolio(user.id);
    return ok({});
  } catch (error) {
    log.error("share.revoke_failed", error);
    return fail("server_error", "Couldn't turn off the link. Please try again.", 500);
  }
}
