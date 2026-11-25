import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { withApiLocale } from "@/lib/api/localize";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import {
  addAlert,
  JOB_ALERTS,
  listAlerts,
  NewJobAlertSchema,
  type JobAlertsResponse,
} from "@/lib/job-feed/alerts";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";
import { requireProTool } from "../../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to see your job alerts.";
const PER_HOUR = 20;

export const GET = withApiLocale(async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<JobAlertsResponse, "ok"> = {
      alerts: await listAlerts(await getDb(), user.id),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.alerts_list_failed", error);
    return fail("server_error", "Couldn't load your job alerts. Please try again.", 500, NO_STORE);
  }
});

// The body holds filters and a role, never a point: an alert near you needs a city.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const locked = requireProTool(user, "jobs");
    if (locked) return locked;
    const limit = await rateLimit(`job-alerts:user:${user.id}`, PER_HOUR, HOUR_MS);
    if (!limit.allowed) {
      return fail("rate_limited", "That's a lot of searches at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, NewJobAlertSchema);
    if (!body.ok) {
      log.info("jobs.alert_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That alert didn't work. Pick a city instead of your location, then try again.",
        400,
        NO_STORE,
      );
    }
    const result = await addAlert(await getDb(), user.id, body.data, Date.now());
    if (result.kind === "no_user") return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    if (result.kind === "full") {
      return fail(
        "bad_request",
        `You can keep up to ${JOB_ALERTS.perAccount} job alerts. Remove one to add another.`,
        400,
        NO_STORE,
      );
    }
    const response: Omit<JobAlertsResponse, "ok"> = { alerts: result.alerts };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.alert_save_failed", error);
    return fail("server_error", "Couldn't save that job alert. Please try again.", 500, NO_STORE);
  }
});
