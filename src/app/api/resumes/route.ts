import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { ResumesResponse } from "@/lib/api/types";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import type { ResumeList } from "@/lib/sync/api-types";
import { KnownResumesSchema, listBackups } from "./backups";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to sync your resumes.";
const LIST_FAILED = "Couldn't load your saved resumes. Please try again.";

export const GET = withApiLocale(async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const { resumes, deletedIds } = await listBackups(user.id);
    const response: Omit<ResumesResponse, "ok"> = { resumes, deletedIds };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("resumes.list_failed", error);
    return fail("server_error", LIST_FAILED, 500, NO_STORE);
  }
});

// The list again, with only the resumes whose version differs from the browser's sent in full.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, KnownResumesSchema);
    if (!body.ok) return fail("bad_request", "That list of resumes isn't valid.", 400, NO_STORE);
    const response: Omit<ResumeList, "ok"> = await listBackups(user.id, body.data.known);
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("resumes.list_failed", error);
    return fail("server_error", LIST_FAILED, 500, NO_STORE);
  }
});
