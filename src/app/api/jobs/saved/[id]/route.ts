import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { saveJob, savedCount, unsaveJob } from "@/lib/job-feed/records";
import { SAVED_JOBS_LIMIT, type SavedJobResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { requireProTool } from "../../../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to save jobs.";
const JobIdSchema = z.uuid();

type Context = { params: Promise<{ id: string }> };

async function jobId(context: Context): Promise<string | null> {
  const parsed = JobIdSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

export async function PUT(req: Request, context: Context): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const locked = requireProTool(user, "jobs");
    if (locked) return locked;
    const id = await jobId(context);
    if (!id) return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    const db = await getDb();
    const result = await saveJob(db, user.id, id);
    if (result === "no_user") return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    if (result === "not_found") return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    if (result === "limit_reached") {
      return fail(
        "bad_request",
        `You can save up to ${SAVED_JOBS_LIMIT} jobs. Remove some to save more.`,
        400,
        NO_STORE,
      );
    }
    const response: Omit<SavedJobResponse, "ok"> = { saved: true, savedCount: await savedCount(db, user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.save_failed", error);
    return fail("server_error", "Couldn't save that job. Please try again.", 500, NO_STORE);
  }
}

export async function DELETE(req: Request, context: Context): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const id = await jobId(context);
    const db = await getDb();
    if (id) await unsaveJob(db, user.id, id);
    const response: Omit<SavedJobResponse, "ok"> = { saved: false, savedCount: await savedCount(db, user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.unsave_failed", error);
    return fail("server_error", "Couldn't remove that job. Please try again.", 500, NO_STORE);
  }
}
