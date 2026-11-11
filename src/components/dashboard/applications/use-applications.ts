"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { signedInUserId, useMe } from "@/components/account/use-me";
import { api, isApiError } from "@/lib/api/client";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@/lib/api/types";
import { firstFollowUpAt, FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";
import { APPLICATION_LIMITS, cleanLine, normalizeJobUrl } from "@/lib/applications/schema";
import { isStage, stageAfter } from "@/lib/applications/status";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, queryKeys } from "@/lib/queries/keys";
import { fetchAllApplications, type ReminderSettingsData } from "@/lib/queries/options";
import { sortApplications, upsertApplication, withoutApplication } from "./view";

// Every change shows at once and rolls back if the server says no.

export type ApplicationsStatus = "loading" | "ready" | "error";

type Change = (items: Application[]) => Application[];

const EMPTY: Application[] = [];

// Changes made while a load is on its way, replayed over its answer so none of them is lost.
let replay: Change[] = [];
// Deletes still inside their undo window: the server keeps them until then, so a fresh load must
// not bring them back.
const hidden = new Set<string>();
// Applications shown before the server has them, by the id they keep (see addApplication).
const creating = new Map<string, Promise<unknown>>();

export const applicationsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.applications(userId),
    queryFn: async () => {
      replay = [];
      const items = await fetchAllApplications();
      const merged = replay.reduce((list, change) => change(list), sortApplications(items));
      replay = [];
      return merged.filter((item) => !hidden.has(item.id));
    },
  });

function apply(change: Change) {
  const client = getQueryClient();
  client.setQueriesData<Application[]>({ queryKey: APPLICATIONS }, (items) =>
    items ? change(items) : items,
  );
  if (client.isFetching({ queryKey: APPLICATIONS }) > 0) replay.push(change);
}

// The row as the server will store it, so it shows (and links to its page) at once.
function draftApplication(id: string, body: CreateApplicationBody, now: number): Application {
  const status = body.status ?? "applied";
  const userId = signedInUserId();
  const reminders = userId
    ? getQueryClient().getQueryData<ReminderSettingsData>(queryKeys.reminderSettings(userId))
    : undefined;
  const days = reminders?.followUpDays ?? FOLLOW_UP_DAYS.default;
  return {
    id,
    resumeId: body.resumeId ?? null,
    resumeTitle: cleanLine(body.resumeTitle ?? ""),
    company: cleanLine(body.company),
    role: cleanLine(body.role ?? ""),
    jobUrl: normalizeJobUrl(body.jobUrl ?? "") ?? "",
    appliedAt: body.appliedAt,
    status,
    stageReached: isStage(status) ? status : "applied",
    statusChangedAt: now,
    notes: body.notes ?? "",
    followUpAt: status === "applied" ? firstFollowUpAt(body.appliedAt, now, days) : null,
    jobId: body.jobId ?? null,
    hasPrep: false,
    interviewAt: body.interviewAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Waits for the create of an application that was shown before the server had it. */
async function created(id: string): Promise<void> {
  await creating.get(id);
}

// Shows at once under the id it keeps, so its links work right away; the server's copy replaces
// it, or it goes again if the server says no.
export async function addApplication(body: CreateApplicationBody): Promise<Application> {
  const id = crypto.randomUUID();
  apply((items) => upsertApplication(items, draftApplication(id, body, Date.now())));
  const request = api.createApplication({ ...body, id });
  creating.set(
    id,
    request.catch(() => undefined),
  );
  try {
    const { application } = await request;
    // The draft's clock is the browser's, so the server's copy replaces it whatever its time.
    apply((items) => upsertApplication(withoutApplication(items, id), application));
    return application;
  } catch (error) {
    apply((items) => withoutApplication(items, id));
    throw error;
  } finally {
    creating.delete(id);
  }
}

// Status, reminder and interview-day changes show at once and roll back on failure; other fields
// wait for the server, since they come from a dialog that's still open.
export async function changeApplication(
  original: Application,
  patch: UpdateApplicationBody,
): Promise<Application> {
  const { status, followUpAt, interviewAt } = patch;
  if (status !== undefined || followUpAt !== undefined || interviewAt !== undefined) {
    const optimistic: Application = {
      ...original,
      ...(status === undefined
        ? {}
        : {
            status,
            stageReached: stageAfter(original.stageReached, status),
            // The server sets the new date; until it answers, only "none" is certain.
            ...(status === "applied" ? {} : { followUpAt: null }),
          }),
      ...(followUpAt === undefined ? {} : { followUpAt }),
      ...(interviewAt === undefined ? {} : { interviewAt }),
    };
    apply((items) => upsertApplication(items, optimistic));
  }
  try {
    await created(original.id);
    const { application } = await api.updateApplication(original.id, patch);
    apply((items) => upsertApplication(items, application));
    return application;
  } catch (error) {
    // Deleted on another device: drop it here too instead of showing a row that can't be saved.
    if (isApiError(error, "not_found")) apply((items) => withoutApplication(items, original.id));
    else apply((items) => upsertApplication(items, original));
    throw error;
  }
}

export async function removeApplication(application: Application): Promise<void> {
  apply((items) => withoutApplication(items, application.id));
  try {
    await created(application.id);
    await api.deleteApplication(application.id);
  } catch (error) {
    apply((items) => upsertApplication(items, application));
    throw error;
  }
}

// The two halves of a delete that can be undone: hide the row now, and send the delete only once
// the chance to undo it has passed (or the page is closing).
export function hideApplication(application: Application): void {
  hidden.add(application.id);
  apply((items) => withoutApplication(items, application.id));
}

export function restoreApplication(application: Application): void {
  hidden.delete(application.id);
  apply((items) => upsertApplication(items, application));
}

export async function commitDelete(
  application: Application,
  options: { keepalive: boolean },
): Promise<void> {
  try {
    await created(application.id);
    await api.deleteApplication(application.id, options);
    hidden.delete(application.id);
  } catch (error) {
    restoreApplication(application);
    throw error;
  }
}

/** Marks these as no reply, in chunks the API takes. Resolves with how many changed. */
export async function markNoReply(list: readonly Application[]): Promise<number> {
  const ids = new Set(list.map((application) => application.id));
  apply((items) =>
    items.map((item): Application => (ids.has(item.id) ? { ...item, status: "no_reply" } : item)),
  );
  try {
    let changed = 0;
    const all = [...ids];
    for (let i = 0; i < all.length; i += APPLICATION_LIMITS.bulk) {
      const res = await api.setApplicationsStatus({
        ids: all.slice(i, i + APPLICATION_LIMITS.bulk),
        status: "no_reply",
      });
      apply((items) => res.applications.reduce(upsertApplication, items));
      changed += res.applications.length;
    }
    return changed;
  } catch (error) {
    // Rows a finished chunk already saved are newer than these copies, so they stay saved.
    apply((items) => list.reduce(upsertApplication, items));
    throw error;
  }
}

export function useApplications(): {
  status: ApplicationsStatus;
  items: Application[];
  retry: () => void;
} {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const client = useAppQueryClient();
  const query = useQuery({ ...applicationsQuery(userId ?? ""), enabled: userId !== null }, client);
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  const status: ApplicationsStatus = query.data ? "ready" : query.isError ? "error" : "loading";
  return { status, items: query.data ?? EMPTY, retry };
}
