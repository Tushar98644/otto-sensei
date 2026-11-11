import { FREE_APPLICATIONS, hasProTools } from "@/config/plans";
import { captureServerEvent } from "@/lib/analytics/server";
import { fail, ok } from "@/lib/api/respond";
import {
  BulkApplicationStatusSchema,
  CreateApplicationSchema,
  type ApplicationResponse,
  type ApplicationsResponse,
  type BulkApplicationsResponse,
} from "@/lib/api/types";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { proToolRequired } from "../pro-tools";
import { INVALID, SIGN_IN } from "./messages";
import { createApplication, listApplications, parseCursor, setStatusMany } from "./records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user and changes with every status click, so no browser or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };
const count = new Intl.NumberFormat("en-US");

// Readable on every plan: a Free account keeps the record it made on Pro or the trial.
export async function GET(req: Request): Promise<Response> {
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
}

export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const body = await readJson(req, CreateApplicationSchema);
    if (!body.ok) {
      // readJson names the field and the rule it broke, never the value.
      log.info("applications.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400);
    }
    const paid = hasProTools(user.plan);
    const max = paid ? APPLICATION_LIMITS.perUser : FREE_APPLICATIONS;
    const result = await createApplication(user.id, body.data, Date.now(), max);
    if (result.status === "no_user") {
      log.info("applications.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401);
    }
    if (result.status === "id_taken") {
      log.info("applications.id_taken");
      return fail("bad_request", INVALID, 409);
    }
    if (result.status === "limit_reached" && !paid) return proToolRequired(user, "tracker");
    if (result.status === "limit_reached") {
      log.info("applications.limit_reached", { max: APPLICATION_LIMITS.perUser });
      return fail(
        "bad_request",
        `You can track up to ${count.format(APPLICATION_LIMITS.perUser)} applications. Delete some old ones to add more.`,
        400,
      );
    }
    captureServerEvent(user.id, "application_logged", { status: result.application.status });
    const response: Omit<ApplicationResponse, "ok"> = { application: result.application };
    return ok(response, { status: 201 });
  } catch (error) {
    log.error("applications.create_failed", error);
    return fail("server_error", "Couldn't save that application. Please try again.", 500);
  }
}

// One status for many, e.g. "no reply" for everything that went quiet weeks ago.
export async function PATCH(req: Request): Promise<Response> {
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
    const response: Omit<BulkApplicationsResponse, "ok"> = { applications: changed };
    return ok(response);
  } catch (error) {
    log.error("applications.bulk_update_failed", error);
    return fail("server_error", "Couldn't update those applications. Please try again.", 500);
  }
}
