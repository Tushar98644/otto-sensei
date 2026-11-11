import { and, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Db, Tx } from "@/db/client";
import { applications, jobs, writings } from "@/db/schema";

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
