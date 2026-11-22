import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { listEntries, readSettings } from "@/lib/career-log/records";
import type { CareerLogResponse } from "@/lib/career-log/types";
import { log } from "@/lib/log";
import { emailConfigured } from "@/lib/notifications/email";
import { SIGN_IN } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Free on every plan: the log and its check-ins never ask for Pro.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const [entries, settings] = await Promise.all([listEntries(user.id), readSettings(user.id)]);
    if (settings === null) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<CareerLogResponse, "ok"> = {
      entries,
      settings,
      emailAvailable: emailConfigured(),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("career_log.read_failed", error);
    return fail("server_error", "Couldn't load your career log. Please try again.", 500, NO_STORE);
  }
}
