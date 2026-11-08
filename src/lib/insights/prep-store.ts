import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { InterviewPrepSchema, readPrep, type InterviewPrep, type PrepTarget } from "./prep";

// Server-only. The interview prep pack kept on an application row. Every query is filtered by
// user_id, so a guessed id never reads or writes another account's row. Saving a pack doesn't move
// updated_at: the pack isn't an edit to the application, and the list's "newer copy wins" rule
// shouldn't see it as one.

export type PrepRecord = { target: PrepTarget; prep: InterviewPrep | null };

/** The application's job details and its saved pack. Null when the user has no such row. */
export async function getPrep(userId: string, applicationId: string): Promise<PrepRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      id: applications.id,
      company: applications.company,
      role: applications.role,
      jobUrl: applications.jobUrl,
      resumeId: applications.resumeId,
      resumeTitle: applications.resumeTitle,
      prep: applications.prep,
    })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)))
    .limit(1);
  if (!row) return null;
  const { prep, ...target } = row;
  return { target, prep: readPrep(prep) };
}

/** Stores the pack, replacing any older one. False when the user has no such row. */
export async function savePrep(
  userId: string,
  applicationId: string,
  prep: InterviewPrep,
): Promise<boolean> {
  // Parsed again on the way in, so nothing past the caps ever reaches the column.
  const checked = InterviewPrepSchema.parse(prep);
  const db = await getDb();
  const rows = await db
    .update(applications)
    .set({ prep: checked })
    .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });
  return rows.length > 0;
}
