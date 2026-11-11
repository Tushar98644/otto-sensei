"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { Application } from "@/lib/api/types";
import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
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

const KEY_PREFIX = "otto-opened-jobs-v1:";
const EMPTY: readonly OpenedJob[] = [];

let cache: { userId: string; jobs: readonly OpenedJob[] } | null = null;
let returnedAt = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readStored(userId: string): readonly OpenedJob[] {
  const parsed = readJsonItem(KEY_PREFIX + userId);
  return parsed === null ? EMPTY : parseOpenedJobs(parsed);
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
  writeJsonItem(KEY_PREFIX + userId, jobs);
  notify();
}

function markReturned() {
  returnedAt = Date.now();
  notify();
}

function onVisibility() {
  if (document.visibilityState === "visible") markReturned();
}

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

export function answerAppliedPrompt(
  userId: string,
  jobId: string,
  answer: AskedAppliedAnswer,
): void {
  update(userId, (jobs) => answerOpenedJob(jobs, jobId, answer, Date.now()));
}

export type AppliedPrompts = { onCard: OpenedJob[]; offPage: OpenedJob[] };
const NONE: AppliedPrompts = { onCard: [], offPage: [] };

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
