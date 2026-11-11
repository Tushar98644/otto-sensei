import { and, asc, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { RESUME_LIMITS } from "@/config/plans";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { resumes, resumeTombstones } from "@/db/schema";
import { log } from "@/lib/log";
import { type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";

// Server-only. Cloud backups of studio resumes, one row per (user_id, id), so resumes follow
// their owner to another device; the browser copy stays the source of truth. `updated_at` holds
// the resume's own updatedAt: it orders the list and decides which of two copies is newer, the
// same rule the studio uses when it merges the cloud copies in.
//
// Deleting a backup leaves a tombstone. Without one, another device that still holds the resume
// would see it missing from the cloud and upload it again.

export const MAX_RESUMES_PER_USER = RESUME_LIMITS.paid;
// 50 x 80 KiB keeps GET /api/resumes under Vercel's 4.5 MB response limit. A long real CV is
// around 30 KiB of JSON.
export const MAX_RESUME_BYTES = 80 * 1024;
// Newest deletions sent with the list. At most 64-character ids, so this adds ~35 KB at worst.
export const MAX_DELETED_IDS_LISTED = 500;
// More are kept than listed, so a device that was away for a long time still gets "deleted"
// back from PUT for an older deletion instead of restoring it.
export const MAX_TOMBSTONES_PER_USER = 1_000;
export const TOMBSTONE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1_000;
// Rows one request may prune, so cleanup never turns a delete into a long write.
const PRUNE_LIMIT = 100;

// no_user: the account was deleted after the request was signed in, so nothing may be written.
// plan_limit: a new resume past the plan's own limit (Free keeps RESUME_LIMITS.free).
export type SaveStatus =
  | "saved"
  | "stale"
  | "deleted"
  | "too_large"
  | "limit_reached"
  | "plan_limit"
  | "no_user";

export type BackupList = { resumes: Resume[]; deletedIds: string[] };

/**
 * The user's backups, newest first, and the ids of resumes deleted from the account, newest
 * deletion first. A row that no longer passes ResumeSchema is skipped.
 */
export async function listBackups(userId: string): Promise<BackupList> {
  const db = await getDb();
  // One snapshot for both reads: a delete landing mid-request can't list a resume as both live
  // and deleted, or as neither.
  const [rows, tombstones] = await db.transaction(
    async (tx) =>
      Promise.all([
        tx
          .select({ id: resumes.id, data: resumes.data })
          .from(resumes)
          .where(eq(resumes.userId, userId))
          .orderBy(desc(resumes.updatedAt), asc(resumes.id))
          .limit(MAX_RESUMES_PER_USER),
        tx
          .select({ id: resumeTombstones.id })
          .from(resumeTombstones)
          .where(eq(resumeTombstones.userId, userId))
          .orderBy(desc(resumeTombstones.deletedAt), desc(resumeTombstones.id))
          .limit(MAX_DELETED_IDS_LISTED),
      ]),
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  const list: Resume[] = [];
  for (const row of rows) {
    const parsed = ResumeSchema.safeParse(row.data);
    // Writes are validated, so a bad row means the schema moved on since. Skipping it keeps the
    // rest of the list loading.
    if (parsed.success) list.push(parsed.data);
    else log.warn("resumes.invalid_row", { resumeId: row.id });
  }
  return { resumes: list, deletedIds: tombstones.map((tombstone) => tombstone.id) };
}

/**
 * Inserts or updates one backup. Runs under the account's row lock, so concurrent saves can't
 * push it past MAX_RESUMES_PER_USER or the plan's `planLimit`, and a save can't slip past a
 * concurrent delete. Both limits only stop new resumes: an account already past `planLimit` (a
 * paid plan that ended) keeps saving edits to the ones it has. An existing
 * row only changes when the incoming copy is at least as new, so a late retry of an older version
 * is a no-op ("stale"). A resume deleted from the account is never written again ("deleted"), and
 * nothing is written once the account itself is gone ("no_user").
 */
export async function saveBackup(
  userId: string,
  resume: Resume,
  now = Date.now(),
  planLimit: number = MAX_RESUMES_PER_USER,
): Promise<{ status: SaveStatus; bytes: number }> {
  const data = JSON.stringify(resume, storableText);
  const bytes = Buffer.byteLength(data, "utf8");
  if (bytes > MAX_RESUME_BYTES) return { status: "too_large", bytes };

  const db = await getDb();
  const own = and(eq(resumes.userId, userId), eq(resumes.id, resume.id));
  const status = await db.transaction(async (tx): Promise<SaveStatus> => {
    if (!(await lockUser(tx, userId))) return "no_user";
    const [buried] = await tx
      .select({ id: resumeTombstones.id })
      .from(resumeTombstones)
      .where(and(eq(resumeTombstones.userId, userId), eq(resumeTombstones.id, resume.id)))
      .limit(1);
    if (buried) return "deleted";
    const [existing] = await tx.select({ id: resumes.id }).from(resumes).where(own).limit(1);
    if (!existing) {
      const [stored] = await tx.select({ n: count() }).from(resumes).where(eq(resumes.userId, userId));
      const total = stored?.n ?? 0;
      if (total >= MAX_RESUMES_PER_USER) return "limit_reached";
      if (total >= planLimit) return "plan_limit";
    }
    const written = await tx
      .insert(resumes)
      .values({ userId, id: resume.id, data: sql`${data}::jsonb`, createdAt: now, updatedAt: resume.updatedAt })
      .onConflictDoUpdate({
        target: [resumes.userId, resumes.id],
        set: { data: sql`excluded.data`, updatedAt: sql`excluded.updated_at` },
        setWhere: sql`excluded.updated_at >= ${resumes.updatedAt}`,
      })
      .returning({ id: resumes.id });
    return written.length > 0 ? "saved" : "stale";
  });
  return { status, bytes };
}

/**
 * Deletes one backup and leaves a tombstone for it, in one transaction under the account's row
 * lock, so no device can restore it in between. Also prunes this account's oldest tombstones a
 * little at a time: by age, and down to MAX_TOMBSTONES_PER_USER.
 */
export async function deleteBackup(userId: string, id: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  const ownTombstones = eq(resumeTombstones.userId, userId);
  await db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return;
    const deleted = await tx
      .delete(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.id, id)))
      .returning({ id: resumes.id });
    // Only a resume that was backed up can come back from another device. Skipping the rest
    // keeps deletes of made-up ids from growing the table.
    if (deleted.length > 0) {
      await tx
        .insert(resumeTombstones)
        .values({ userId, id, deletedAt: now })
        .onConflictDoUpdate({
          target: [resumeTombstones.userId, resumeTombstones.id],
          set: { deletedAt: now },
        });
    }
    await tx.delete(resumeTombstones).where(
      and(
        ownTombstones,
        inArray(
          resumeTombstones.id,
          tx
            .select({ id: resumeTombstones.id })
            .from(resumeTombstones)
            .where(and(ownTombstones, lt(resumeTombstones.deletedAt, now - TOMBSTONE_MAX_AGE_MS)))
            .limit(PRUNE_LIMIT),
        ),
      ),
    );
    await tx.delete(resumeTombstones).where(
      and(
        ownTombstones,
        inArray(
          resumeTombstones.id,
          tx
            .select({ id: resumeTombstones.id })
            .from(resumeTombstones)
            .where(ownTombstones)
            .orderBy(desc(resumeTombstones.deletedAt), desc(resumeTombstones.id))
            .limit(PRUNE_LIMIT)
            .offset(MAX_TOMBSTONES_PER_USER),
        ),
      ),
    );
  });
}

// jsonb can't hold U+0000 or a lone surrogate, and both can come out of a PDF's text layer.
// Dropping them beats a backup that fails on every retry.
function storableText(_key: string, value: unknown): unknown {
  return typeof value === "string" ? value.toWellFormed().replaceAll("\u0000", "") : value;
}
