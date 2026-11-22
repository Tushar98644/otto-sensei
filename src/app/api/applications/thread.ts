import { and, desc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, jobs, writings } from "@/db/schema";
import { readHistory } from "@/lib/applications/status";
import type { ApplicationThread, ThreadJob } from "@/lib/applications/thread";
import { readPrep } from "@/lib/insights/prep";
import { questionCount } from "@/lib/insights/prep-view";
import { toWriting } from "@/lib/writings/records";
import { APPLICATION_COLUMNS, toApplication } from "./records";

const THREAD_WRITINGS = 50;

export async function getApplicationThread(
  userId: string,
  id: string,
): Promise<ApplicationThread | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      ...APPLICATION_COLUMNS,
      statusHistory: applications.statusHistory,
      prep: applications.prep,
    })
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .limit(1);
  if (!row) return null;
  const { statusHistory, prep: storedPrep, ...columns } = row;
  const application = toApplication(columns);

  const [jobRows, writingRows] = await Promise.all([
    application.jobId
      ? db
          .select({
            id: jobs.id,
            company: jobs.company,
            title: jobs.title,
            location: jobs.location,
            remote: jobs.remote,
            url: jobs.url,
            postedAt: jobs.postedAt,
            closedAt: jobs.closedAt,
            source: jobs.source,
          })
          .from(jobs)
          .where(eq(jobs.id, application.jobId))
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(writings)
      .where(
        and(
          eq(writings.userId, userId),
          application.jobUrl
            ? or(
                eq(writings.applicationId, id),
                and(isNull(writings.applicationId), eq(writings.jobUrl, application.jobUrl)),
              )
            : eq(writings.applicationId, id),
        ),
      )
      .orderBy(desc(writings.createdAt), desc(writings.id))
      .limit(THREAD_WRITINGS),
  ]);

  const jobRow = jobRows[0];
  const job: ThreadJob | null = jobRow
    ? {
        id: jobRow.id,
        company: jobRow.company,
        title: jobRow.title,
        location: jobRow.location,
        remote: jobRow.remote,
        url: jobRow.url,
        postedAt: jobRow.postedAt,
        closed: jobRow.closedAt !== null,
        source: jobRow.source,
      }
    : null;
  const prep = readPrep(storedPrep);

  return {
    application,
    history: readHistory(statusHistory),
    job,
    writings: writingRows.map(toWriting),
    prep: prep
      ? {
          createdAt: prep.createdAt,
          questions: questionCount(prep),
          stories: prep.stories.length,
          demo: prep.demo,
        }
      : null,
  };
}
