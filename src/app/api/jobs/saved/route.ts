import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { SavedJobsResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { listSavedJobs } from "@/lib/job-feed/records";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Readable on every plan: a Free account keeps the jobs it saved on Pro or the trial.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your saved jobs.", 401, NO_STORE);
    const response: Omit<SavedJobsResponse, "ok"> = {
      jobs: await listSavedJobs(await getDb(), user.id),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.saved_list_failed", error);
    return fail("server_error", "Couldn't load your saved jobs. Please try again.", 500, NO_STORE);
  }
}
