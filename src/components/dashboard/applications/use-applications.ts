"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { signedInUserId } from "@/components/account/use-me";
import { api, isApiError } from "@/lib/api/client";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@/lib/api/types";
import { firstFollowUpAt, FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";
import { APPLICATION_LIMITS, cleanLine, normalizeJobUrl } from "@/lib/applications/schema";
import { isStage, stageAfter } from "@/lib/applications/status";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { APPLICATIONS, PREP_PACKS, queryKeys } from "@/lib/queries/keys";
import {
  APPLICATIONS_STALE_MS,
  fetchAllApplications,
  type ReminderSettingsData,
} from "@/lib/queries/options";
import { sortApplications, upsertApplication, withoutApplication } from "./view";

export type ApplicationsStatus = "loading" | "ready" | "error";

type Change = (items: Application[]) => Application[];

const EMPTY: Application[] = [];

// Changes made during a load, replayed over its answer so none is lost.
let replay: Change[] = [];
// Deletes in their undo window: the server still has them, so a fresh load must not restore them.
const hidden = new Set<string>();
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
    staleTime: APPLICATIONS_STALE_MS,
    // Every change made here patches the cache; coming back to the tab picks up other devices'.
    refetchOnWindowFocus: true,
  });

function apply(change: Change) {
  const client = getQueryClient();
  client.setQueriesData<Application[]>({ queryKey: APPLICATIONS }, (items) =>
    items ? change(items) : items,
  );
  if (client.isFetching({ queryKey: APPLICATIONS }) > 0) replay.push(change);
}

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
    interviewTime: body.interviewAt == null ? null : (body.interviewTime ?? null),
    interviewZone:
      body.interviewAt == null || body.interviewTime == null ? null : (body.interviewZone ?? null),
    createdAt: now,
    updatedAt: now,
  };
}

async function created(id: string): Promise<void> {
  await creating.get(id);
}

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
    // The draft uses the browser's clock, so the server's copy replaces it whatever its time.
    apply((items) => upsertApplication(withoutApplication(items, id), application));
    return application;
  } catch (error) {
    apply((items) => withoutApplication(items, id));
    throw error;
  } finally {
    creating.delete(id);
  }
}

export async function changeApplication(
  original: Application,
  patch: UpdateApplicationBody,
): Promise<Application> {
  const { status, followUpAt, interviewAt, interviewTime, interviewZone } = patch;
  if (status !== undefined || followUpAt !== undefined || interviewAt !== undefined) {
    const optimistic: Application = {
      ...original,
      ...(status === undefined
        ? {}
        : {
            status,
            stageReached: stageAfter(original.stageReached, status),
            ...(status === "applied" ? {} : { followUpAt: null }),
          }),
      ...(followUpAt === undefined ? {} : { followUpAt }),
      ...(interviewAt === undefined
        ? {}
        : {
            interviewAt,
            interviewTime: interviewAt === null ? null : (interviewTime ?? null),
            interviewZone:
              interviewAt === null || interviewTime == null ? null : (interviewZone ?? null),
          }),
    };
    apply((items) => upsertApplication(items, optimistic));
  }
  try {
    await created(original.id);
    const { application } = await api.updateApplication(original.id, patch);
    apply((items) => upsertApplication(items, application));
    return application;
  } catch (error) {
    if (isApiError(error, "not_found")) apply((items) => withoutApplication(items, original.id));
    else apply((items) => upsertApplication(items, original));
    throw error;
  }
}

// The prep pack lives on the application's row, so it goes with it.
function forgetPrepOf(application: Application): void {
  if (application.hasPrep) void getQueryClient().invalidateQueries({ queryKey: PREP_PACKS });
}

export async function removeApplication(application: Application): Promise<void> {
  apply((items) => withoutApplication(items, application.id));
  try {
    await created(application.id);
    await api.deleteApplication(application.id);
    forgetPrepOf(application);
  } catch (error) {
    apply((items) => upsertApplication(items, application));
    throw error;
  }
}

export function hideApplication(application: Application): void {
  hidden.add(application.id);
  apply((items) => withoutApplication(items, application.id));
}

export function restoreApplication(application: Application): void {
  hidden.delete(application.id);
  apply((items) => upsertApplication(items, application));
}

// The server's copy after a change made elsewhere, such as an answer in the bell.
export function keepApplication(application: Application): void {
  apply((items) => upsertApplication(items, application));
}

export function markPrepped(id: string): void {
  apply((items) =>
    items.map((item): Application => (item.id === id ? { ...item, hasPrep: true } : item)),
  );
}

export async function commitDelete(
  application: Application,
  options: { keepalive: boolean },
): Promise<void> {
  try {
    await created(application.id);
    await api.deleteApplication(application.id, options);
    hidden.delete(application.id);
    forgetPrepOf(application);
  } catch (error) {
    restoreApplication(application);
    throw error;
  }
}

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
    apply((items) => list.reduce(upsertApplication, items));
    throw error;
  }
}

export function useApplications(): {
  status: ApplicationsStatus;
  items: Application[];
  retry: () => void;
} {
  const userId = useSessionUserId();
  const client = useAppQueryClient();
  const query = useQuery({ ...applicationsQuery(userId ?? ""), enabled: userId !== null }, client);
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  const status: ApplicationsStatus = query.data ? "ready" : query.isError ? "error" : "loading";
  return { status, items: query.data ?? EMPTY, retry };
}
