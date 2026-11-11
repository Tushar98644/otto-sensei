import { ROUTES } from "@/components/site/routes";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { setEmailReminders } from "@/lib/notifications/records";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { isUserId } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 8058 one-click: mail apps send it from their servers with no cookies, so the signed link is
// the only proof, and the app's same-site rules don't apply.
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!isUserId(userId) || !verifyUnsubscribeToken(userId, token)) {
    log.info("notifications.unsubscribe_invalid");
    return fail("bad_request", "That unsubscribe link isn't valid.", 400, NO_STORE);
  }
  try {
    // An account deleted since the email went out has nothing left to turn off.
    await setEmailReminders(userId, false);
    log.info("notifications.unsubscribed");
    return ok({}, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.unsubscribe_failed", error);
    return fail("server_error", "Couldn't turn off reminder emails. Please try again.", 500, NO_STORE);
  }
}

// GET: a person (or a mail app without one-click support) opened the link. Link checkers open
// every link in an email too, so this changes nothing and sends them to the switch instead.
export function GET(): Response {
  return Response.redirect(new URL(`${ROUTES.dashboardAccount}#reminders`, appUrl()), 303);
}
