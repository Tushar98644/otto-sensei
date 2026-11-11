import { and, asc, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { RESUME_LIMITS } from "@/config/plans";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { resumes, resumeTombstones } from "@/db/schema";
import { log } from "@/lib/log";
import { type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";

// Deletes leave a tombstone, or another device would see the resume missing and upload it again.

export const MAX_RESUMES_PER_USER = RESUME_LIMITS.paid;
// 50 x 80 KiB keeps GET /api/resumes under Vercel's 4.5 MB response limit.
export const MAX_RESUME_BYTES = 80 * 1024;
export const MAX_DELETED_IDS_LISTED = 500;
export const MAX_TOMBSTONES_PER_USER = 1_000;
export const TOMBSTONE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1_000;
const PRUNE_LIMIT = 100;

export type SaveStatus =
  | "saved"
  | "stale"
  | "deleted"
  | "too_large"
  | "limit_reached"
  | "plan_limit"
  | "no_user";

export type BackupList = { resumes: Resume[]; deletedIds: string[] };

export async function listBackups(userId: string): Promise<BackupList> {
  const db = await getDb();
  // One snapshot: a delete landing mid-request can't list a resume as both live and deleted.
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
    if (parsed.success) list.push(parsed.data);
    else log.warn("resumes.invalid_row", { resumeId: row.id });
  }
  return { resumes: list, deletedIds: tombstones.map((tombstone) => tombstone.id) };
}

// Under the account's row lock, so concurrent saves can't pass the limits or slip past a delete.
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

// One transaction under the row lock, so no device can restore it in between.
export async function deleteBackup(userId: string, id: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  const ownTombstones = eq(resumeTombstones.userId, userId);
  await db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return;
    const deleted = await tx
      .delete(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.id, id)))
      .returning({ id: resumes.id });
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
function storableText(_key: string, value: unknown): unknown {
  return typeof value === "string" ? value.toWellFormed().replaceAll("\u0000", "") : value;
}
