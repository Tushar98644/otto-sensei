import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { listNotifications, markNotificationsRead } from "@/lib/notifications/records";
import {
  type MarkNotificationsReadResponse,
  type NotificationsResponse,
} from "@/lib/notifications/types";
import { MarkNotificationsReadSchema } from "@/lib/notifications/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user and changes as they're read, so no browser or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };
const SIGN_IN = "Sign in to see your notifications.";

// GET /api/notifications: the newest notifications and the unread count.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const list: Omit<NotificationsResponse, "ok"> = await listNotifications(user.id);
    return ok(list, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.list_failed", error);
    return fail("server_error", "Couldn't load your notifications. Please try again.", 500, NO_STORE);
  }
}

// PATCH /api/notifications: { ids } or { all: true } marked read.
export async function PATCH(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, MarkNotificationsReadSchema);
    if (!body.ok) {
      log.info("notifications.bad_request", { reason: body.message });
      return fail("bad_request", "Those notifications couldn't be marked as read.", 400, NO_STORE);
    }
    const unread = await markNotificationsRead(user.id, body.data);
    const response: Omit<MarkNotificationsReadResponse, "ok"> = { unread };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.mark_read_failed", error);
    return fail(
      "server_error",
      "Couldn't mark your notifications as read. Please try again.",
      500,
      NO_STORE,
    );
  }
}
