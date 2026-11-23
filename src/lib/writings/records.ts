import { and, count, desc, eq, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, jobs, writings } from "@/db/schema";
import { applicationForWriting, resolveJobId } from "@/lib/applications/links";
import {
  textLimit,
  WRITING_LIMITS,
  type CreateWritingInput,
  type UpdateWritingInput,
  type Writing,
  type WritingKind,
} from "./schema";

// Every query is filtered by user_id, so a guessed id never reaches another account's rows.

type Row = typeof writings.$inferSelect;

export type CreateWritingResult =
  { status: "created"; writing: Writing } | { status: "limit_reached" } | { status: "no_user" };

export type UpdateWritingResult =
  | { status: "updated"; writing: Writing }
  | { status: "too_long"; kind: WritingKind }
  | { status: "not_outreach" }
  | { status: "not_found" };

export type OutreachMatch = { jobId: string | null; applicationId: string | null };

export function toWriting(row: Row): Writing {
  return {
    id: row.id,
    kind: row.kind,
    resumeId: row.resumeId,
    resumeTitle: row.resumeTitle,
    company: row.company,
    role: row.role,
    jobUrl: row.jobUrl,
    question: row.question,
    text: row.body,
    warnings: Array.isArray(row.warnings)
      ? row.warnings.filter((item): item is string => typeof item === "string")
      : [],
    demo: row.demo,
    applicationId: row.applicationId,
    ...(row.kind === "outreach"
      ? { outreach: { subject: row.subject, note: row.note, jobId: row.jobId } }
      : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listWritings(
  userId: string,
  limit: number = WRITING_LIMITS.listed,
): Promise<{ writings: Writing[]; total: number }> {
  const db = await getDb();
  const own = eq(writings.userId, userId);
  const [rows, [stored]] = await Promise.all([
    db
      .select()
      .from(writings)
      .where(own)
      .orderBy(desc(writings.createdAt), desc(writings.id))
      .limit(limit),
    db.select({ n: count() }).from(writings).where(own),
  ]);
  return { writings: rows.map(toWriting), total: stored?.n ?? rows.length };
}

// The applications with a letter among the writings listWritings returns, for Home's What's working.
export async function letteredApplicationIds(
  userId: string,
  limit: number = WRITING_LIMITS.listed,
): Promise<string[]> {
  const db = await getDb();
  const listed = db
    .select({ kind: writings.kind, applicationId: writings.applicationId })
    .from(writings)
    .where(eq(writings.userId, userId))
    .orderBy(desc(writings.createdAt), desc(writings.id))
    .limit(limit)
    .as("listed");
  const rows = await db
    .selectDistinct({ id: listed.applicationId })
    .from(listed)
    .where(and(eq(listed.kind, "letter"), isNotNull(listed.applicationId)));
  return rows.flatMap(({ id }) => (id ? [id] : []));
}

// Under the account's row lock, so parallel saves can't pass WRITING_LIMITS.perUser.
export async function createWriting(
  userId: string,
  input: CreateWritingInput,
  now = Date.now(),
): Promise<CreateWritingResult> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<CreateWritingResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [stored] = await tx
      .select({ n: count() })
      .from(writings)
      .where(eq(writings.userId, userId));
    if ((stored?.n ?? 0) >= WRITING_LIMITS.perUser) return { status: "limit_reached" };
    const applicationId = await applicationForWriting(tx, userId, input.applicationId, input);
    const outreach = input.kind === "outreach";
    const jobId = outreach ? await resolveJobId(tx, input.jobId, input.jobUrl) : null;
    const [row] = await tx
      .insert(writings)
      .values({
        id: crypto.randomUUID(),
        userId,
        kind: input.kind,
        resumeId: input.resumeId,
        resumeTitle: input.resumeTitle,
        company: input.company,
        role: input.role,
        jobUrl: input.jobUrl,
        question: input.kind === "answer" ? input.question : "",
        body: input.text,
        subject: outreach ? input.subject : "",
        note: outreach ? input.note : "",
        jobId,
        warnings: input.warnings,
        demo: input.demo,
        applicationId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new Error("createWriting: insert returned no row");
    return { status: "created", writing: toWriting(row) };
  });
}

export async function updateWriting(
  userId: string,
  id: string,
  change: UpdateWritingInput,
  now = Date.now(),
): Promise<UpdateWritingResult> {
  const db = await getDb();
  const own = and(eq(writings.userId, userId), eq(writings.id, id));
  const [current] = await db.select({ kind: writings.kind }).from(writings).where(own).limit(1);
  if (!current) return { status: "not_found" };
  const { text, subject, note } = change;
  if (current.kind !== "outreach" && (subject !== undefined || note !== undefined)) {
    return { status: "not_outreach" };
  }
  if (text !== undefined && text.length > textLimit(current.kind)) {
    return { status: "too_long", kind: current.kind };
  }
  const [row] = await db
    .update(writings)
    .set({
      ...(text === undefined ? {} : { body: text }),
      ...(subject === undefined ? {} : { subject }),
      ...(note === undefined ? {} : { note }),
      updatedAt: now,
    })
    .where(own)
    .returning();
  return row ? { status: "updated", writing: toWriting(row) } : { status: "not_found" };
}

// The newest message for an application, else for a job, never one written for another of either.
export async function findOutreach(userId: string, match: OutreachMatch): Promise<Writing | null> {
  const db = await getDb();
  const same =
    (await forApplication(db, userId, match.applicationId)) ?? (await forJob(db, match.jobId));
  if (!same) return null;
  const [row] = await db
    .select()
    .from(writings)
    .where(and(eq(writings.userId, userId), eq(writings.kind, "outreach"), same))
    .orderBy(desc(writings.createdAt), desc(writings.id))
    .limit(1);
  return row ? toWriting(row) : null;
}

// Its own messages, and ones tied to no application that were written for its job, as its page lists them.
async function forApplication(
  db: Db,
  userId: string,
  applicationId: string | null,
): Promise<SQL | undefined> {
  if (!applicationId) return undefined;
  const [application] = await db
    .select({ jobId: applications.jobId, jobUrl: applications.jobUrl })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, applicationId)))
    .limit(1);
  if (!application) return undefined;
  const byUrl = application.jobUrl ? eq(writings.jobUrl, application.jobUrl) : undefined;
  const sameJob = application.jobId
    ? or(eq(writings.jobId, application.jobId), byUrl && and(isNull(writings.jobId), byUrl))
    : byUrl;
  return or(
    eq(writings.applicationId, applicationId),
    sameJob && and(isNull(writings.applicationId), sameJob),
  );
}

// By its id, or by its link on a message saved without a job, but only while no other job shares that link.
async function forJob(db: Db, jobId: string | null): Promise<SQL | undefined> {
  if (!jobId) return undefined;
  const byId = eq(writings.jobId, jobId);
  const [job] = await db.select({ url: jobs.url }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job?.url || (await resolveJobId(db, null, job.url)) !== jobId) return byId;
  return or(byId, and(isNull(writings.jobId), eq(writings.jobUrl, job.url)));
}

export async function deleteWriting(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .delete(writings)
    .where(and(eq(writings.userId, userId), eq(writings.id, id)))
    .returning({ id: writings.id });
  return rows.length > 0;
}
