import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import {
  InterviewPrepSchema,
  PREP_LIST_LIMIT,
  readPrep,
  type InterviewPrep,
  type PrepSummary,
  type PrepTarget,
} from "./prep";

// Saving a pack leaves updated_at alone, or the list's "newer copy wins" rule would see an edit.

export type PrepRecord = { target: PrepTarget; prep: InterviewPrep | null };

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

export async function savePrep(
  userId: string,
  applicationId: string,
  prep: InterviewPrep,
): Promise<boolean> {
  const checked = InterviewPrepSchema.parse(prep);
  const db = await getDb();
  const rows = await db
    .update(applications)
    .set({ prep: checked })
    .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)))
    .returning({ id: applications.id });
  return rows.length > 0;
}

const packMadeAt = sql<number>`case when jsonb_typeof(${applications.prep}->'createdAt') = 'number' then (${applications.prep}->>'createdAt')::bigint else ${applications.createdAt} end`;
const lengthOf = (key: "questions" | "stories") => {
  const list = sql`${applications.prep}->${sql.raw(`'${key}'`)}`;
  return sql<number>`case when jsonb_typeof(${list}) = 'array' then jsonb_array_length(${list}) else 0 end`.mapWith(Number);
};

export async function listPreps(userId: string, limit = PREP_LIST_LIMIT): Promise<PrepSummary[]> {
  const db = await getDb();
  return db
    .select({
      applicationId: applications.id,
      company: applications.company,
      role: applications.role,
      jobUrl: applications.jobUrl,
      resumeTitle: applications.resumeTitle,
      createdAt: packMadeAt.mapWith(Number),
      questions: lengthOf("questions"),
      stories: lengthOf("stories"),
      demo: sql<boolean>`coalesce(${applications.prep}->'demo' = 'true'::jsonb, false)`,
    })
    .from(applications)
    .where(and(eq(applications.userId, userId), isNotNull(applications.prep)))
    .orderBy(desc(packMadeAt), desc(applications.id))
    .limit(limit);
}
