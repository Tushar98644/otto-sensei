import { recordActivity } from "@/lib/analytics/activity";
import { beaconEvent, BeaconSchema } from "@/lib/analytics/beacon";
import { posthogKey } from "@/lib/analytics/config";
import type { ServerEventProps } from "@/lib/analytics/events";
import { dashboardSection } from "@/lib/analytics/landing";
import { trackingRefusedByHeaders } from "@/lib/analytics/privacy";
import { captureBatch, type BatchEvent } from "@/lib/analytics/server";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { currentUserIdHint, getCurrentUser } from "@/lib/auth/session";
import { burstAllowed } from "@/lib/burst-limit";
import { appUrl } from "@/lib/env";
import { clientIp, readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { isAutomatedAgent } from "@/lib/share/visits";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 60;
const NOT_NOTED = { noted: false, identified: false };

// The browser's beacon: page views, named events and web vitals, sent on to PostHog from here.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  // Crawlers, speed tests and headless browsers aren't visitors; PostHog can't tell without the agent.
  if (
    !posthogKey() ||
    trackingRefusedByHeaders(req.headers) ||
    isAutomatedAgent(req.headers.get("user-agent"))
  ) {
    return ok(NOT_NOTED, { headers: NO_STORE });
  }
  if (!burstAllowed(`activity:${clientIp(req)}`, PER_MINUTE, 60_000)) {
    return fail("rate_limited", "Too many at once. Try again in a minute.", 429, {
      ...NO_STORE,
      "Retry-After": "60",
    });
  }
  const body = await readJson(req, BeaconSchema);
  if (!body.ok) return fail("bad_request", "That didn't look right.", 400, NO_STORE);
  const beacon = body.data;
  try {
    const appView = beacon.items.find(
      (item) => item.type === "view" && dashboardSection(item.route) !== null,
    );
    const mustLink = beacon.visitor !== undefined && beacon.linked !== true;
    // The session's own claim names who is looking; the full check only where a row is written or ids are linked.
    const hint = await currentUserIdHint();
    const verify = hint !== null && (appView !== undefined || mustLink);
    const user = verify ? await getCurrentUser() : null;
    const userId = verify ? (user?.id ?? null) : hint;

    const context = {
      distinctId: userId ?? beacon.visitor ?? crypto.randomUUID(),
      anonymous: userId === null,
      session: beacon.session,
      origin: appUrl(),
    };
    const events: BatchEvent[] = beacon.items.map((item) => beaconEvent(item, context));
    const visitor = mustLink ? beacon.visitor : undefined;
    const identified = user !== null && visitor !== undefined;
    if (user && visitor) {
      const signedIn: ServerEventProps["signed_in"] = { plan: user.plan };
      events.unshift(
        { event: "$identify", distinctId: user.id, properties: { $anon_distinct_id: visitor } },
        { event: "signed_in", distinctId: user.id, properties: signedIn },
      );
    }
    captureBatch(events);

    if (user && appView?.type === "view") {
      const section = dashboardSection(appView.route);
      const limit = await rateLimit(`activity:user:${user.id}`, PER_MINUTE, 60_000);
      if (section && limit.allowed) {
        await recordActivity(user.id, {
          section,
          ...(appView.timeZone ? { timeZone: appView.timeZone } : {}),
          ...(appView.email ? { email: appView.email } : {}),
        });
      }
    }
    return ok({ noted: true, identified }, { headers: NO_STORE });
  } catch (error) {
    log.warn("analytics.activity_failed", {}, error);
    return ok(NOT_NOTED, { headers: NO_STORE });
  }
});
