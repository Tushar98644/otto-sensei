import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Db, Tx } from "@/db/client";
import { applications, jobBoards, listings, writings } from "@/db/schema";
import { listingId, listingIdOf, publicJobId } from "@/lib/job-feed/codes";
import { listingRows, snapshotOf } from "@/lib/job-feed/records";
import type { JobSnapshot } from "@/lib/job-feed/types";

type Executor = Db | Tx;

export type JobFacts = { jobUrl: string; company: string; role: string };

function sameJob(
  left: { url: AnyPgColumn; company: AnyPgColumn; role: AnyPgColumn },
  right: JobFacts,
): SQL {
  const byName = right.company
    ? sql`(lower(${left.company}) = lower(${right.company}) and lower(${left.role}) = lower(${right.role}))`
    : null;
  if (!right.jobUrl) return byName ?? sql`false`;
  if (!byName) return eq(left.url, right.jobUrl);
  return or(eq(left.url, right.jobUrl), and(eq(left.url, ""), byName))!;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Each board's link pattern as a test that gives back the job's own id.
async function linkPatterns(db: Executor): Promise<{ board: number; test: RegExp }[]> {
  const rows = await db
    .select({ id: jobBoards.id, template: jobBoards.urlTemplate })
    .from(jobBoards)
    .where(sql`${jobBoards.urlTemplate} <> ''`);
  return rows.map((row) => {
    // The first {id} is captured; any later one must repeat it.
    const [first = "", after = "", ...more] = row.template.split("{id}");
    const rest = more.map((part) => `\\1${escape(part)}`).join("");
    return { board: row.id, test: new RegExp(`^${escape(first)}(.+?)${escape(after)}${rest}$`) };
  });
}

// The open job a link or id names, with what to keep of it: by link only when exactly one job has it.
export async function linkedJob(
  db: Executor,
  jobId: string | null,
  jobUrl: string,
): Promise<{ id: string; job: JobSnapshot } | null> {
  const listing = jobId ? listingIdOf(jobId) : null;
  if (listing !== null) {
    const [row] = await listingRows(db, [listing]);
    if (row) return { id: row.id, job: snapshotOf(row) };
  }
  if (!jobUrl) return null;
  const ids = new Set<number>();
  for (const { board, test } of await linkPatterns(db)) {
    const ext = test.exec(jobUrl)?.[1];
    if (ext) ids.add(listingId(board, ext));
  }
  const stored = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(sql`${listings.url} <> ''`, eq(listings.url, jobUrl)))
    .limit(2);
  for (const row of stored) ids.add(row.id);
  const rows = (await listingRows(db, [...ids])).filter((row) => row.url === jobUrl);
  const [only] = rows;
  return rows.length === 1 && only
    ? { id: publicJobId(only.listing), job: snapshotOf(only) }
    : null;
}

export async function resolveJobId(
  db: Executor,
  jobId: string | null,
  jobUrl: string,
): Promise<string | null> {
  return (await linkedJob(db, jobId, jobUrl))?.id ?? null;
}

export async function linkWritings(
  db: Executor,
  userId: string,
  applicationId: string,
  job: JobFacts,
): Promise<void> {
  await db
    .update(writings)
    .set({ applicationId })
    .where(
      and(
        eq(writings.userId, userId),
        isNull(writings.applicationId),
        sameJob({ url: writings.jobUrl, company: writings.company, role: writings.role }, job),
      ),
    );
}

export async function applicationForWriting(
  db: Executor,
  userId: string,
  applicationId: string | null,
  job: JobFacts,
): Promise<string | null> {
  const own = eq(applications.userId, userId);
  if (applicationId) {
    const [row] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(own, eq(applications.id, applicationId)))
      .limit(1);
    if (row) return row.id;
  }
  if (!job.jobUrl && !job.company) return null;
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        own,
        sameJob(
          { url: applications.jobUrl, company: applications.company, role: applications.role },
          job,
        ),
      ),
    )
    .orderBy(desc(applications.appliedAt), desc(applications.id))
    .limit(1);
  return row?.id ?? null;
}
