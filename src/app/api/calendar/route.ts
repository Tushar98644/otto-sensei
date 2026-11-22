import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureFeed } from "@/lib/calendar/records";
import { CalendarFeedRequestSchema, type CalendarFeedResponse } from "@/lib/calendar/types";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to get your calendar link.";
const UNAVAILABLE = "Calendar links aren't available right now. Please try again later.";

// POST, not GET: the first ask makes the link, and "Make a new link" retires the old one.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, CalendarFeedRequestSchema);
    if (!body.ok) return fail("bad_request", "That request isn't valid.", 400, NO_STORE);
    const links = await ensureFeed(user.id, { renew: body.data.renew === true });
    if (!links) {
      log.warn("calendar.feed_unavailable");
      return fail("server_error", UNAVAILABLE, 503, NO_STORE);
    }
    if (body.data.renew) log.info("calendar.feed_renewed");
    const response: Omit<CalendarFeedResponse, "ok"> = { links };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("calendar.feed_link_failed", error);
    return fail(
      "server_error",
      "Couldn't get your calendar link. Please try again.",
      500,
      NO_STORE,
    );
  }
}
