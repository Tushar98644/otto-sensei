import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { writings } from "@/db/schema";
import { textLimit, WRITING_LIMITS, type CreateWritingInput, type Writing } from "./schema";

// Server-only. A user's saved cover letters and answers. Every query is filtered by user_id, so one
// account can never read, change or delete another's rows, even with a guessed id.

type Row = typeof writings.$inferSelect;

export type CreateWritingResult =
  | { status: "created"; writing: Writing }
  | { status: "limit_reached" }
  // The account was deleted after the request was signed in, so nothing may be written.
  | { status: "no_user" };

export type UpdateWritingResult =
  | { status: "updated"; writing: Writing }
  | { status: "too_long" }
  | { status: "not_found" };

function toWriting(row: Row): Writing {
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
    // jsonb written only by createWriting, but a hand-edited row must not break the list.
    warnings: Array.isArray(row.warnings)
      ? row.warnings.filter((item): item is string => typeof item === "string")
      : [],
    demo: row.demo,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** The newest WRITING_LIMITS.listed, newest first, and how many the account keeps in all. */
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

/**
 * Keeps one letter or answer. Runs under the account's row lock, so parallel saves can't push an
 * account past WRITING_LIMITS.perUser, and nothing is written for a deleted account.
 */
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
        warnings: input.warnings,
        demo: input.demo,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new Error("createWriting: insert returned no row");
    return { status: "created", writing: toWriting(row) };
  });
}

/** Replaces the text with the person's edit. An answer keeps its own, smaller cap. */
export async function updateWriting(
  userId: string,
  id: string,
  text: string,
  now = Date.now(),
): Promise<UpdateWritingResult> {
  const db = await getDb();
  const own = and(eq(writings.userId, userId), eq(writings.id, id));
  const [current] = await db.select({ kind: writings.kind }).from(writings).where(own).limit(1);
  if (!current) return { status: "not_found" };
  if (text.length > textLimit(current.kind)) return { status: "too_long" };
  const [row] = await db.update(writings).set({ body: text, updatedAt: now }).where(own).returning();
  return row ? { status: "updated", writing: toWriting(row) } : { status: "not_found" };
}

/** True when a row was deleted. */
export async function deleteWriting(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .delete(writings)
    .where(and(eq(writings.userId, userId), eq(writings.id, id)))
    .returning({ id: writings.id });
  return rows.length > 0;
}
