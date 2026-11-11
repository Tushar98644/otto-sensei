import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { ResumesResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { listBackups } from "./backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to sync your resumes.", 401, NO_STORE);
    const response: Omit<ResumesResponse, "ok"> = await listBackups(user.id);
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("resumes.list_failed", error);
    return fail("server_error", "Couldn't load your saved resumes. Please try again.", 500, NO_STORE);
  }
}
