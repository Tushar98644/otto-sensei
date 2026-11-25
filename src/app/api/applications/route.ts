import { applicationLimit, isPaidPlan } from "@/config/plans";
import { trackStatusChanges } from "@/lib/analytics/retention";
import { captureServerEvent } from "@/lib/analytics/server";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import {
  BulkApplicationStatusSchema,
  CreateApplicationSchema,
  type ApplicationResponse,
  type ApplicationsResponse,
  type BulkApplicationsResponse,
} from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { planFullText } from "@/lib/plan-limits-copy";
import { proToolRequired } from "../pro-tools";
import { INVALID, SIGN_IN } from "./messages";
import { createApplication, listApplications, parseCursor, setStatusMany } from "./records";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiLocale(async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const raw = new URL(req.url).searchParams.get("cursor");
    const cursor = raw === null ? null : parseCursor(raw);
    if (raw !== null && cursor === null) {
      return fail("bad_request", "That page of applications doesn't exist.", 400, NO_STORE);
    }
    const page: Omit<ApplicationsResponse, "ok"> = await listApplications(user.id, cursor);
    return ok(page, { headers: NO_STORE });
  } catch (error) {
    log.error("applications.list_failed", error);
    return fail(
      "server_error",
      "Couldn't load your applications. Please try again.",
      500,
      NO_STORE,
    );
  }
});

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const body = await readJson(req, CreateApplicationSchema);
    if (!body.ok) {
      log.info("applications.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400);
    }
    const max = applicationLimit(user.plan);
    const result = await createApplication(user.id, body.data, Date.now(), max);
    if (result.status === "no_user") {
      log.info("applications.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401);
    }
    if (result.status === "id_taken") {
      log.info("applications.id_taken");
      return fail("bad_request", INVALID, 409);
    }
    if (result.status === "limit_reached") {
      if (!isPaidPlan(user.plan)) return proToolRequired(user, "tracker");
      log.info("applications.limit_reached", { plan: user.plan, max });
      return fail("limit_reached", planFullText("tracker", user.plan), 429);
    }
    captureServerEvent(user.id, "application_logged", { status: result.application.status });
    const response: Omit<ApplicationResponse, "ok"> = { application: result.application };
    return ok(response, { status: 201 });
  } catch (error) {
    log.error("applications.create_failed", error);
    return fail("server_error", "Couldn't save that application. Please try again.", 500);
  }
});

export const PATCH = withApiLocale(async function PATCH(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const body = await readJson(req, BulkApplicationStatusSchema);
    if (!body.ok) {
      log.info("applications.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400);
    }
    const changed = await setStatusMany(user.id, body.data.ids, body.data.status);
    trackStatusChanges(user.id, changed.moves);
    const response: Omit<BulkApplicationsResponse, "ok"> = { applications: changed.applications };
    return ok(response);
  } catch (error) {
    log.error("applications.bulk_update_failed", error);
    return fail("server_error", "Couldn't update those applications. Please try again.", 500);
  }
});
