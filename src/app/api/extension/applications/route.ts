import { applicationLimit, isPaidPlan } from "@/config/plans";
import { CreateApplicationSchema } from "@/lib/applications/validation";
import { captureServerEvent } from "@/lib/analytics/server";
import { fail, ok } from "@/lib/api/respond";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { applicationPath, companyFromLink } from "@/lib/extension/applied";
import { readResume } from "@/lib/extension/fill";
import {
  extensionPreflight,
  extensionRoute,
  fillRequired,
  SIGNED_OUT,
} from "@/lib/extension/route";
import type { ExtensionApplicationResponse } from "@/lib/extension/types";
import { canonicalJobUrl } from "@/lib/extension/urls";
import { ExtensionApplicationSchema } from "@/lib/extension/validation";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { planFullText } from "@/lib/plan-limits-copy";
import { resumeTitle } from "@/lib/resume/ops";
import { HOUR_MS } from "@/lib/time";
import { createApplication } from "../../applications/records";
import { PRO_TOOL_MESSAGES } from "../../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = { name: "applied", limit: 60, windowMs: HOUR_MS };
const UNREADABLE = "Otto couldn't add this application. Add it on your board instead.";

// Applied after a form Otto filled is sent: one application on the board, with the link and the resume that went.
export async function POST(req: Request): Promise<Response> {
  return extensionRoute(req, LIMIT, async ({ user }, headers) => {
    const blocked = fillRequired(user, headers) ?? rejectNonJson(req);
    if (blocked) return blocked;
    const body = await readJson(req, ExtensionApplicationSchema);
    if (!body.ok) {
      log.info("extension.applied_bad_request", { reason: body.message });
      return fail("bad_request", UNREADABLE, 400, headers);
    }
    const { id, url, title, company, resumeId } = body.data;
    const jobUrl = canonicalJobUrl(url);
    const resume = resumeId ? await readResume(user.id, resumeId) : null;
    const input = CreateApplicationSchema.safeParse({
      id,
      resumeId: resume?.id ?? null,
      resumeTitle: resume ? resumeTitle(resume) : "",
      company: company.trim() || companyFromLink(url),
      role: title,
      jobUrl: jobUrl ?? "",
      appliedAt: Date.now(),
      status: "applied",
    });
    if (!input.success || !jobUrl) return fail("bad_request", UNREADABLE, 400, headers);
    const result = await createApplication(
      user.id,
      input.data,
      Date.now(),
      applicationLimit(user.plan),
    );
    if (result.status === "no_user") return fail("unauthorized", SIGNED_OUT, 401, headers);
    if (result.status === "id_taken") return fail("bad_request", UNREADABLE, 409, headers);
    if (result.status === "limit_reached") {
      log.info("extension.applied_limit_reached", { plan: user.plan });
      const message = isPaidPlan(user.plan)
        ? planFullText("tracker", user.plan)
        : PRO_TOOL_MESSAGES.tracker;
      return fail("limit_reached", message, 429, headers);
    }
    const { application } = result;
    captureServerEvent(user.id, "application_logged", { status: application.status });
    log.info("extension.applied", { tailored: Boolean(resume?.tailor) });
    const response: Omit<ExtensionApplicationResponse, "ok"> = {
      application: { id: application.id, company: application.company, role: application.role },
      boardPath: applicationPath(application.id),
    };
    return ok(response, { headers, status: 201 });
  });
}

export function OPTIONS(req: Request): Response {
  return extensionPreflight(req);
}
