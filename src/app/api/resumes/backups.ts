import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { RESUME_LIMITS } from "@/config/plans";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { resumes, resumeTombstones } from "@/db/schema";
import { log } from "@/lib/log";
import { type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { MAX_KNOWN_RESUMES, type KnownResumes } from "@/lib/sync/api-types";

// Deletes leave a tombstone, or another device would see the resume missing and upload it again.

export const MAX_RESUMES_PER_USER = RESUME_LIMITS.paid;
// 50 x 80 KiB keeps GET /api/resumes under Vercel's 4.5 MB response limit.
export const MAX_RESUME_BYTES = 80 * 1024;
export const MAX_DELETED_IDS_LISTED = 500;
export const MAX_TOMBSTONES_PER_USER = 1_000;
export const TOMBSTONE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1_000;
const PRUNE_LIMIT = 100;

export const KnownResumesSchema = z.object({
  known: z
    .record(ResumeSchema.shape.id, z.number().int().nonnegative())
    .refine((known) => Object.keys(known).length <= MAX_KNOWN_RESUMES, "Too many resumes."),
});

export type SaveStatus =
  | "saved"
  | "stale"
  | "deleted"
  | "too_large"
  | "limit_reached"
  | "plan_limit"
  | "no_user";

export type BackupList = { resumes: Resume[]; deletedIds: string[]; unchanged: string[] };

// postgres.js returns the rows; PGlite (dev and tests) wraps them.
function rowsOf<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

// One statement is one snapshot: a delete landing mid-request can't list a resume as live and deleted.
export async function listBackups(userId: string, known: KnownResumes = {}): Promise<BackupList> {
  const db = await getDb();
  // A resume at the version in `known` comes back as its id alone, so its data is never read.
  const rows = rowsOf<{ kind: string; id: string; data: unknown }>(
    await db.execute(sql`
      select kind, id, data, n from (
        select 'resume' as kind, r.id,
          case when k.value is null or k.value::float8 <> r.updated_at::float8 then r.data end as data,
          row_number() over (order by r.updated_at desc, r.id asc) as n
        from ${resumes} r
        left join jsonb_each_text(${JSON.stringify(known)}::jsonb) k on k.key = r.id
        where r.user_id = ${userId}
      ) live
      where n <= ${MAX_RESUMES_PER_USER}
      union all
      select kind, id, null, n from (
        select 'deleted' as kind, t.id,
          row_number() over (order by t.deleted_at desc, t.id desc) as n
        from ${resumeTombstones} t
        where t.user_id = ${userId}
      ) gone
      where n <= ${MAX_DELETED_IDS_LISTED}
      order by kind, n
    `),
  );
  const list: Resume[] = [];
  const unchanged: string[] = [];
  const deletedIds: string[] = [];
  for (const row of rows) {
    if (row.kind === "deleted") deletedIds.push(row.id);
    else if (row.data === null) unchanged.push(row.id);
    else {
      const parsed = ResumeSchema.safeParse(row.data);
      if (parsed.success) list.push(parsed.data);
      else log.warn("resumes.invalid_row", { resumeId: row.id });
    }
  }
  return { resumes: list, deletedIds, unchanged };
}

// Under the account's row lock, so concurrent saves can't pass the limits or slip past a delete.
export async function saveBackup(
  userId: string,
  resume: Resume,
  now = Date.now(),
  planLimit: number = MAX_RESUMES_PER_USER,
  base?: number,
): Promise<{ status: SaveStatus; bytes: number }> {
  const data = JSON.stringify(resume, storableText);
  const bytes = Buffer.byteLength(data, "utf8");
  if (bytes > MAX_RESUME_BYTES) return { status: "too_large", bytes };

  const db = await getDb();
  const status = await db.transaction(async (tx): Promise<SaveStatus> => {
    if (!(await lockUser(tx, userId))) return "no_user";
    // After the lock, in its own statement: one taken with it would read from before the wait.
    const [checks] = rowsOf<{ buried: boolean; stored: number | null; total: number }>(
      await tx.execute(sql`
        select
          exists (select 1 from ${resumeTombstones} t where t.user_id = ${userId} and t.id = ${resume.id}) as buried,
          (select r.updated_at::float8 from ${resumes} r where r.user_id = ${userId} and r.id = ${resume.id}) as stored,
          (select count(*)::int from ${resumes} r where r.user_id = ${userId}) as total
      `),
    );
    if (checks?.buried) return "deleted";
    const stored = checks?.stored ?? null;
    // The same copy sent twice (a retry, or again as the page closed) is already saved.
    if (stored === resume.updatedAt) return "saved";
    if (stored === null) {
      const total = checks?.total ?? 0;
      if (total >= MAX_RESUMES_PER_USER) return "limit_reached";
      if (total >= planLimit) return "plan_limit";
    }
    const newer = sql`excluded.updated_at >= ${resumes.updatedAt}`;
    const written = await tx
      .insert(resumes)
      .values({ userId, id: resume.id, data: sql`${data}::jsonb`, createdAt: now, updatedAt: resume.updatedAt })
      .onConflictDoUpdate({
        target: [resumes.userId, resumes.id],
        set: { data: sql`excluded.data`, updatedAt: sql`excluded.updated_at` },
        // With a base, only the copy the edit was made on is replaced, never one it didn't see.
        setWhere: base === undefined ? newer : sql`${newer} and ${resumes.updatedAt} = ${base}`,
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
