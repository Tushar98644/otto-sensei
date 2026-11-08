"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { useMe } from "@/components/account/use-me";
import { api, isApiError } from "@/lib/api/client";
import type { Application, CreateApplicationBody, UpdateApplicationBody } from "@/lib/api/types";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import { stageAfter } from "@/lib/applications/status";
import { sortApplications, upsertApplication, withoutApplication } from "./view";

// The signed-in user's applications, shared by the Applications page, the home page's win rate
// and the "Mark as applied" shortcut on resume cards: one load per page visit, kept per account
// so a different sign-in in the same tab never sees the last person's list.

export type ApplicationsStatus = "loading" | "ready" | "error";

type State = {
  userId: string | null;
  status: "idle" | ApplicationsStatus;
  items: Application[];
};

const useApplicationsStore = create<State>()(() => ({ userId: null, status: "idle", items: [] }));

const EMPTY: Application[] = [];
const MAX_PAGES = Math.ceil(APPLICATION_LIMITS.perUser / APPLICATION_LIMITS.pageSize) + 1;

type Change = (items: Application[]) => Application[];

let loadToken = 0;
// Changes made while a load is in flight, replayed over its result so none of them is lost.
let replay: Change[] = [];

function apply(change: Change) {
  useApplicationsStore.setState((state) => ({ items: change(state.items) }));
  if (useApplicationsStore.getState().status === "loading") replay.push(change);
}

async function load(userId: string): Promise<void> {
  const token = ++loadToken;
  replay = [];
  useApplicationsStore.setState((state) => ({
    userId,
    status: "loading",
    items: state.userId === userId ? state.items : EMPTY,
  }));
  try {
    const items: Application[] = [];
    let cursor: string | null = null;
    // Bounded by the per-account cap, in case a server ever keeps handing out cursors.
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await api.listApplications(cursor);
      items.push(...res.applications);
      cursor = res.nextCursor;
      if (cursor === null) break;
    }
    if (token !== loadToken) return;
    const merged = replay.reduce((list, change) => change(list), sortApplications(items));
    replay = [];
    useApplicationsStore.setState({ userId, status: "ready", items: merged });
  } catch {
    if (token !== loadToken) return;
    replay = [];
    useApplicationsStore.setState({ status: "error" });
  }
}

function clear() {
  loadToken += 1;
  replay = [];
  if (useApplicationsStore.getState().userId !== null) {
    useApplicationsStore.setState({ userId: null, status: "idle", items: EMPTY });
  }
}

export async function addApplication(body: CreateApplicationBody): Promise<Application> {
  const { application } = await api.createApplication(body);
  apply((items) => upsertApplication(items, application));
  return application;
}

/**
 * Saves a change. A status or reminder change shows at once and is rolled back if the save fails;
 * other fields wait for the server, since they come from a dialog that's still open.
 */
export async function changeApplication(
  original: Application,
  patch: UpdateApplicationBody,
): Promise<Application> {
  const { status, followUpAt } = patch;
  if (status !== undefined || followUpAt !== undefined) {
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
    };
    apply((items) => upsertApplication(items, optimistic));
  }
  try {
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
    await api.deleteApplication(application.id);
  } catch (error) {
    apply((items) => upsertApplication(items, application));
    throw error;
  }
}

// The two halves of a delete that can be undone: hide the row now, and send the delete only once
// the chance to undo it has passed (or the page is closing).
export function hideApplication(application: Application): void {
  apply((items) => withoutApplication(items, application.id));
}

export function restoreApplication(application: Application): void {
  apply((items) => upsertApplication(items, application));
}

export async function commitDelete(
  application: Application,
  options: { keepalive: boolean },
): Promise<void> {
  try {
    await api.deleteApplication(application.id, options);
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
  const { user, loading } = useMe();
  const userId = user?.id ?? null;
  const owner = useApplicationsStore((state) => state.userId);
  const status = useApplicationsStore((state) => state.status);
  const items = useApplicationsStore((state) => state.items);

  useEffect(() => {
    if (!userId) {
      // Signed out: nothing of that account's list stays in this tab.
      if (!loading) clear();
      return;
    }
    const state = useApplicationsStore.getState();
    if (state.userId !== userId || state.status === "idle") void load(userId);
  }, [userId, loading]);

  const retry = useCallback(() => {
    if (userId) void load(userId);
  }, [userId]);

  const mine = userId !== null && owner === userId;
  return {
    status: mine && status !== "idle" ? status : "loading",
    items: mine ? items : EMPTY,
    retry,
  };
}
