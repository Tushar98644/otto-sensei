import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Db, Tx } from "@/db/client";
import { applications, jobs, writings } from "@/db/schema";

// Server-only. The links that make one job one thread: an application points at its opening
// (job_id) and a letter at its application (application_id). The server sets both by itself, so
// nobody links anything by hand; ids sent by the browser are checked against the account first.
// The client mirrors the same "same job" rule for rows saved before these links existed
// (src/lib/applications/thread.ts).

type Executor = Db | Tx;

export type JobFacts = { jobUrl: string; company: string; role: string };

/**
 * The same job, as two rows can tell: the same link when both have one, else (one has no link)
 * the same company and job title. Two different links are two different posts, even at one
 * company.
 */
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

/**
 * The opening an application is for: the id the browser sent while that job's row is kept, else
 * the one opening whose link is this link. Null when neither names exactly one.
 */
export async function resolveJobId(
  db: Executor,
  jobId: string | null,
  jobUrl: string,
): Promise<string | null> {
  if (jobId) {
    const [row] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (row) return row.id;
  }
  if (!jobUrl) return null;
  const rows = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.url, jobUrl)).limit(2);
  return rows.length === 1 ? (rows[0]?.id ?? null) : null;
}

/** Links the account's unlinked letters and answers for this job to the application. */
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

/**
 * The application a new letter or answer belongs to: the one it was written from when that's the
 * account's, else the newest application for the same job. Null when there's none yet; logging
 * one later links it then (linkWritings).
 */
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
