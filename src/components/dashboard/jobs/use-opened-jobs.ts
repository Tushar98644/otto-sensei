"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Application } from "@/lib/api/types";
import type { AskedAppliedAnswer } from "@/lib/job-feed/types";
import {
  answerOpenedJob,
  parseOpenedJobs,
  promptsToShow,
  recordOpen,
  splitByPage,
  type OpenedJob,
  type OpenedJobRef,
} from "./applied-prompt";
import { appliedFor } from "./view";

// Kept in localStorage, and in memory when storage is blocked (private windows), so the question
// still works for the visit.

const KEY_PREFIX = "otto-opened-jobs-v1:";
const EMPTY: readonly OpenedJob[] = [];

// One account at a time: someone else signing in on this browser starts from their own list.
let cache: { userId: string; jobs: readonly OpenedJob[] } | null = null;
// 0 until the Jobs tab mounts: nothing opened is asked about before then.
let returnedAt = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStored(userId: string): readonly OpenedJob[] {
  try {
    const raw = storage()?.getItem(KEY_PREFIX + userId);
    return raw ? parseOpenedJobs(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function jobsFor(userId: string): readonly OpenedJob[] {
  if (cache?.userId !== userId) cache = { userId, jobs: readStored(userId) };
  return cache.jobs;
}

function update(userId: string, change: (jobs: readonly OpenedJob[]) => readonly OpenedJob[]) {
  const before = jobsFor(userId);
  const jobs = change(before);
  if (jobs === before) return;
  cache = { userId, jobs };
  try {
    storage()?.setItem(KEY_PREFIX + userId, JSON.stringify(jobs));
  } catch {
    // Full or blocked: remembered for this visit only.
  }
  notify();
}

function markReturned() {
  returnedAt = Date.now();
  notify();
}

// Coming back from the job's tab (or window) is the moment to ask.
function onVisibility() {
  if (document.visibilityState === "visible") markReturned();
}

// An answer in another tab shows here too.
function onStorage(event: StorageEvent) {
  if (!cache || event.key !== KEY_PREFIX + cache.userId) return;
  cache = { userId: cache.userId, jobs: readStored(cache.userId) };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", markReturned);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", markReturned);
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function rememberOpenedJob(userId: string, job: OpenedJobRef): void {
  update(userId, (jobs) => recordOpen(jobs, job, Date.now()));
}

/** An answer, or the job marked applied some other way ("yes"). */
export function answerAppliedPrompt(
  userId: string,
  jobId: string,
  answer: AskedAppliedAnswer,
): void {
  update(userId, (jobs) => answerOpenedJob(jobs, jobId, answer, Date.now()));
}

export type AppliedPrompts = { onCard: OpenedJob[]; offPage: OpenedJob[] };
const NONE: AppliedPrompts = { onCard: [], offPage: [] };

// Nothing until the tracker has loaded, so a job already in it is never asked about.
export function useAppliedPrompts({
  userId,
  applications,
  applicationsReady,
  pageJobIds,
  now,
}: {
  userId: string | null;
  applications: readonly Application[];
  applicationsReady: boolean;
  // null while the list hasn't loaded: until then nobody knows which jobs have a card.
  pageJobIds: readonly string[] | null;
  now: number;
}): AppliedPrompts {
  const jobs = useSyncExternalStore(
    subscribe,
    () => (userId ? jobsFor(userId) : EMPTY),
    () => EMPTY,
  );
  const returned = useSyncExternalStore(
    subscribe,
    () => returnedAt,
    () => 0,
  );

  // Arriving on the Jobs tab counts as coming back, so a job opened on an earlier visit is asked
  // about now.
  useEffect(markReturned, []);

  return useMemo(() => {
    if (!applicationsReady || !pageJobIds) return NONE;
    const due = promptsToShow(jobs, {
      now,
      returnedAt: returned,
      isApplied: (entry) => appliedFor(applications, { id: entry.jobId, url: entry.url }) !== null,
    });
    return due.length === 0 ? NONE : splitByPage(due, pageJobIds);
  }, [jobs, returned, now, applications, applicationsReady, pageJobIds]);
}
