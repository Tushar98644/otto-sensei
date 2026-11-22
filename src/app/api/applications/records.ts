import { and, count, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications } from "@/db/schema";
import { firstFollowUpAt, snoozedUntil } from "@/lib/applications/follow-up";
import { linkWritings, resolveJobId } from "@/lib/applications/links";
import {
  APPLICATION_LIMITS,
  type Application,
  type CreateApplicationInput,
  type UpdateApplicationInput,
} from "@/lib/applications/schema";
import { ApplicationIdSchema } from "@/lib/applications/validation";
import {
  isStage,
  readStage,
  readStatus,
  STATUS_HISTORY_LIMIT,
  type ApplicationStatus,
  type StatusEvent,
} from "@/lib/applications/status";
import { followUpDaysOf, followUpDaysSql } from "@/lib/notifications/records";
import type { FollowUpAction, InterviewOutcome } from "@/lib/notifications/types";

// Every query filters by user_id, so a guessed id never reaches another account's rows.

export const APPLICATION_COLUMNS = {
  id: applications.id,
  resumeId: applications.resumeId,
  resumeTitle: applications.resumeTitle,
  company: applications.company,
  role: applications.role,
  jobUrl: applications.jobUrl,
  appliedAt: applications.appliedAt,
  status: applications.status,
  stageReached: applications.stageReached,
  statusChangedAt: applications.statusChangedAt,
  notes: applications.notes,
  followUpAt: applications.followUpAt,
  jobId: applications.jobId,
  interviewAt: applications.interviewAt,
  interviewTime: applications.interviewTime,
  interviewZone: applications.interviewZone,
  hasPrep: sql<boolean>`${applications.prep} is not null`.mapWith(Boolean),
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
};

type Row = Pick<
  typeof applications.$inferSelect,
  Exclude<keyof typeof APPLICATION_COLUMNS, "hasPrep">
> & {
  hasPrep: boolean;
};

export type Cursor = { appliedAt: number; id: string };

export type ApplicationPage = { applications: Application[]; nextCursor: string | null };

export type CreateResult =
  | { status: "created"; application: Application }
  | { status: "limit_reached" }
  | { status: "id_taken" }
  | { status: "no_user" };

export function toApplication(row: Row): Application {
  const status = readStatus(row.status) ?? "applied";
  return {
    id: row.id,
    resumeId: row.resumeId,
    resumeTitle: row.resumeTitle,
    company: row.company,
    role: row.role,
    jobUrl: row.jobUrl,
    appliedAt: row.appliedAt,
    status,
    stageReached: readStage(row.stageReached),
    statusChangedAt: row.statusChangedAt,
    notes: row.notes,
    followUpAt: row.followUpAt,
    jobId: row.jobId,
    hasPrep: row.hasPrep,
    interviewAt: row.interviewAt,
    interviewTime: row.interviewAt === null ? null : row.interviewTime,
    interviewZone:
      row.interviewAt === null || row.interviewTime === null ? null : row.interviewZone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function appendHistory(status: ApplicationStatus, now: number) {
  const entry = sql`jsonb_build_array(jsonb_build_object('status', ${status}::text, 'at', ${now}::bigint))`;
  return sql`jsonb_path_query_array(${applications.statusHistory} || ${entry}, ${`$[last - ${STATUS_HISTORY_LIMIT - 1} to last]`}::jsonpath)`;
}

export function startingHistory(
  status: ApplicationStatus,
  appliedAt: number,
  now: number,
): StatusEvent[] {
  const sent: StatusEvent = { status: "applied", at: appliedAt };
  return status === "applied" ? [sent] : [sent, { status, at: Math.max(now, appliedAt) }];
}

export function encodeCursor({ appliedAt, id }: Cursor): string {
  return `${appliedAt}.${id}`;
}

export function parseCursor(value: string): Cursor | null {
  const dot = value.indexOf(".");
  if (dot < 1 || value.length > 64) return null;
  const appliedAt = Number(value.slice(0, dot));
  const id = value.slice(dot + 1);
  if (!Number.isSafeInteger(appliedAt) || !ApplicationIdSchema.safeParse(id).success) return null;
  return { appliedAt, id };
}

export async function listApplications(
  userId: string,
  cursor: Cursor | null,
  limit: number = APPLICATION_LIMITS.pageSize,
): Promise<ApplicationPage> {
  const db = await getDb();
  const own = eq(applications.userId, userId);
  const after = cursor
    ? or(
        lt(applications.appliedAt, cursor.appliedAt),
        and(eq(applications.appliedAt, cursor.appliedAt), lt(applications.id, cursor.id)),
      )
    : undefined;
  const rows = await db
    .select(APPLICATION_COLUMNS)
    .from(applications)
    .where(after ? and(own, after) : own)
    .orderBy(desc(applications.appliedAt), desc(applications.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    applications: page.map(toApplication),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}

// Under the account's row lock, so parallel requests can't push it past its limit.
export async function createApplication(
  userId: string,
  input: Omit<CreateApplicationInput, "jobId"> & { jobId?: string | null },
  now = Date.now(),
  max: number = APPLICATION_LIMITS.perUser,
): Promise<CreateResult> {
  const db = await getDb();
  const stage = isStage(input.status) ? input.status : "applied";
  return db.transaction(async (tx): Promise<CreateResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [stored] = await tx
      .select({ n: count() })
      .from(applications)
      .where(eq(applications.userId, userId));
    if ((stored?.n ?? 0) >= max) return { status: "limit_reached" };
    const followUpAt =
      input.status === "applied"
        ? firstFollowUpAt(input.appliedAt, now, await followUpDaysOf(tx, userId))
        : null;
    const id = input.id ?? crypto.randomUUID();
    const [row] = await tx
      .insert(applications)
      .values({
        id,
        userId,
        resumeId: input.resumeId,
        resumeTitle: input.resumeTitle,
        company: input.company,
        role: input.role,
        jobUrl: input.jobUrl,
        appliedAt: input.appliedAt,
        status: input.status,
        stageReached: stage,
        statusChangedAt: now,
        notes: input.notes,
        followUpAt,
        jobId: await resolveJobId(tx, input.jobId ?? null, input.jobUrl),
        statusHistory: startingHistory(input.status, input.appliedAt, now),
        ...interviewFields(input),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: applications.id })
      .returning(APPLICATION_COLUMNS);
    if (!row) {
      const [existing] = await tx
        .select(APPLICATION_COLUMNS)
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.userId, userId)));
      return existing
        ? { status: "created", application: toApplication(existing) }
        : { status: "id_taken" };
    }
    await linkWritings(tx, userId, id, input);
    return { status: "created", application: toApplication(row) };
  });
}

function statusChange(
  userId: string,
  status: ApplicationStatus,
  now: number,
): PgUpdateSetSource<typeof applications> {
  return {
    status,
    statusChangedAt: sql`case when ${applications.status} = ${status} then ${applications.statusChangedAt} else ${now} end`,
    statusHistory: sql`case when ${applications.status} = ${status} then ${applications.statusHistory} else ${appendHistory(status, now)} end`,
    ...(isStage(status) ? { stageReached: status } : {}),
    followUpAt:
      status === "applied"
        ? sql`case when ${applications.status} = 'applied' then ${applications.followUpAt} else ${now}::bigint + ${followUpDaysSql(userId)}::bigint * 86400000 end`
        : null,
  };
}

type InterviewInput = Pick<
  UpdateApplicationInput,
  "interviewAt" | "interviewTime" | "interviewZone"
>;

// A time keeps the zone it was typed in; a cleared day or time takes the rest with it.
type InterviewColumns = {
  interviewAt?: number | null;
  interviewTime?: number | null;
  interviewZone?: string | null;
};

export function interviewFields(input: InterviewInput): InterviewColumns {
  if (input.interviewAt === undefined && input.interviewTime === undefined) return {};
  if (input.interviewAt === null) {
    return { interviewAt: null, interviewTime: null, interviewZone: null };
  }
  const time = input.interviewTime ?? null;
  return {
    ...(input.interviewAt === undefined ? {} : { interviewAt: input.interviewAt }),
    interviewTime: time,
    interviewZone: time === null ? null : (input.interviewZone ?? null),
  };
}

export type StatusMove = { from: ApplicationStatus; to: ApplicationStatus };

// Read from the updated row: a change appends to the history, so the entry before the last is where it was.
const PREVIOUS_STATUS = sql<string | null>`${applications.statusHistory} -> -2 ->> 'status'`;

function moveOf(row: Row & { previousStatus: string | null }, now: number): StatusMove | null {
  if (row.statusChangedAt !== now) return null;
  const from = readStatus(row.previousStatus);
  const to = readStatus(row.status);
  return from !== null && to !== null && from !== to ? { from, to } : null;
}

export type UpdatedApplication = { application: Application; moved: StatusMove | null };

export async function updateApplication(
  userId: string,
  id: string,
  patch: UpdateApplicationInput,
  now = Date.now(),
): Promise<UpdatedApplication | null> {
  const db = await getDb();
  const set: PgUpdateSetSource<typeof applications> = {
    updatedAt: now,
    ...(patch.status === undefined ? {} : statusChange(userId, patch.status, now)),
  };
  if (patch.resumeId !== undefined) set.resumeId = patch.resumeId;
  if (patch.resumeTitle !== undefined) set.resumeTitle = patch.resumeTitle;
  if (patch.company !== undefined) set.company = patch.company;
  if (patch.role !== undefined) set.role = patch.role;
  if (patch.jobUrl !== undefined) {
    set.jobUrl = patch.jobUrl;
    set.jobId = await resolveJobId(db, null, patch.jobUrl);
  }
  if (patch.appliedAt !== undefined) set.appliedAt = patch.appliedAt;
  if (patch.notes !== undefined) set.notes = patch.notes;
  Object.assign(set, interviewFields(patch));
  if (patch.followUpAt !== undefined) set.followUpAt = patch.followUpAt;
  const rows = await db
    .update(applications)
    .set(set)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .returning({ ...APPLICATION_COLUMNS, previousStatus: PREVIOUS_STATUS });
  const row = rows[0];
  if (!row) return null;
  if (patch.jobUrl !== undefined || patch.company !== undefined || patch.role !== undefined) {
    await linkWritings(db, userId, row.id, row);
  }
  return {
    application: toApplication(row),
    moved: patch.status === undefined ? null : moveOf(row, now),
  };
}

export async function setStatusMany(
  userId: string,
  ids: readonly string[],
  status: ApplicationStatus,
  now = Date.now(),
): Promise<{ applications: Application[]; moves: StatusMove[] }> {
  const db = await getDb();
  const rows = await db
    .update(applications)
    .set({ ...statusChange(userId, status, now), updatedAt: now })
    .where(
      and(
        eq(applications.userId, userId),
        inArray(applications.id, [...new Set(ids)]),
        ne(applications.status, status),
      ),
    )
    .returning({ ...APPLICATION_COLUMNS, previousStatus: PREVIOUS_STATUS });
  return {
    applications: rows.map(toApplication),
    moves: rows.flatMap((row) => moveOf(row, now) ?? []),
  };
}

export async function deleteApplication(userId: string, id: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .delete(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .returning({ id: applications.id });
  return rows.length > 0;
}

export type FollowUpResult = { company: string; followUpAt: number | null };

export async function applyFollowUpAction(
  userId: string,
  id: string,
  action: FollowUpAction,
  now = Date.now(),
): Promise<FollowUpResult | null> {
  const db = await getDb();
  const own = and(eq(applications.userId, userId), eq(applications.id, id));
  const [row] = await db
    .update(applications)
    .set(
      action === "done"
        ? { followUpAt: null, updatedAt: now }
        : {
            // After an interview there's only something to snooze once Otto set the follow-up.
            followUpAt: sql`case when ${applications.status} = 'applied' or (${applications.status} = 'interview' and ${applications.followUpAt} is not null) then ${snoozedUntil(now)}::bigint else null end`,
            updatedAt: now,
          },
    )
    .where(own)
    .returning({ company: applications.company, followUpAt: applications.followUpAt });
  return row ?? null;
}

// "How did it go?": the answer closes the question; Next round clears the day for the next one, Waiting keeps the follow-up, Rejected closes the card.
export async function answerInterview(
  userId: string,
  id: string,
  outcome: InterviewOutcome,
  now = Date.now(),
): Promise<UpdatedApplication | null> {
  const db = await getDb();
  const answered = { interviewAnsweredFor: sql`${applications.interviewAt}`, updatedAt: now };
  const set: PgUpdateSetSource<typeof applications> =
    outcome === "rejected"
      ? { ...answered, ...statusChange(userId, "rejected", now) }
      : outcome === "next_round"
        ? {
            ...answered,
            interviewAt: null,
            interviewTime: null,
            interviewZone: null,
            followUpAt: null,
          }
        : answered;
  const rows = await db
    .update(applications)
    .set(set)
    .where(
      and(
        eq(applications.userId, userId),
        eq(applications.id, id),
        eq(applications.status, "interview"),
        sql`${applications.interviewAt} is not null`,
      ),
    )
    .returning({ ...APPLICATION_COLUMNS, previousStatus: PREVIOUS_STATUS });
  const row = rows[0];
  if (!row) return null;
  return {
    application: toApplication(row),
    moved: outcome === "rejected" ? moveOf(row, now) : null,
  };
}
