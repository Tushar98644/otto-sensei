import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { log } from "@/lib/log";
import { verifyFollowUpToken } from "@/lib/notifications/unsubscribe";
import type { ReminderJob, ReminderRequest } from "./_components/reminder-action";

// Only a link we signed names the job, so a guessed id learns nothing; the page still works without it.
export async function reminderJob(request: ReminderRequest | null): Promise<ReminderJob | null> {
  if (!request || request.kind === "unsubscribe") return null;
  if (!verifyFollowUpToken(request.u, request.a, request.kind, request.t)) return null;
  try {
    const db = await getDb();
    const [row] = await db
      .select({ company: applications.company, role: applications.role })
      .from(applications)
      .where(and(eq(applications.userId, request.u), eq(applications.id, request.a)))
      .limit(1);
    return row ?? null;
  } catch (error) {
    log.warn("notifications.reminder_job_failed", {}, error);
    return null;
  }
}
