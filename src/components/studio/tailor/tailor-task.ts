"use client";

import { patchMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { MeteredRun } from "@/lib/api/request-id";
import { newId, type Resume } from "@/lib/resume/schema";
import { closeRun, finishRun, interruptedRun, sendRun } from "./pending-run";
import { saveTailorResult, type SavedResult, type TailorDraft } from "./session";

export type TailorTask = {
  done: SavedResult | null;
  promise: Promise<SavedResult>;
  startedAt: number;
  cancelled: boolean;
};

// Outlives the workspace: a run is paid up front, so leaving the step can't lose it or pay twice.
const tasks = new Map<string, TailorTask>();

// After a reload mid-run, picks the run up again instead of showing nothing.
export function tailorTaskFor(source: Resume): TailorTask | null {
  const running = tasks.get(source.id);
  if (running) return running;
  const cut = interruptedRun(source);
  return cut ? startTailorTask(source, cut.job, cut.run) : null;
}

export function startTailorTask(source: Resume, job: TailorDraft, run?: MeteredRun): TailorTask {
  const running = tasks.get(source.id);
  if (running) return running;
  const task: TailorTask = {
    done: null,
    startedAt: Date.now(),
    cancelled: false,
    promise: api
      .tailor(
        {
          resume: source,
          job: { text: job.text.trim(), title: job.title.trim(), company: job.company.trim() },
        },
        run ?? sendRun(source, job),
      )
      .then((response) => {
        finishRun(source.id);
        patchMe({ usage: response.usage });
        const saved: SavedResult = {
          id: newId(),
          sourceId: source.id,
          sourceUpdatedAt: source.updatedAt,
          job,
          result: response.result,
          demo: response.demo === true,
        };
        if (!task.cancelled) saveTailorResult(saved);
        task.done = saved;
        return saved;
      }),
  };
  tasks.set(source.id, task);
  task.promise.catch(() => {
    closeRun(source.id);
    forgetTailorTask(source.id, task);
  });
  return task;
}

export function forgetTailorTask(sourceId: string, task: TailorTask): void {
  if (tasks.get(sourceId) === task) tasks.delete(sourceId);
}

// The server has counted the run already, so its usage still lands; only the result is dropped.
export function cancelTailorTask(sourceId: string, task: TailorTask): void {
  task.cancelled = true;
  closeRun(sourceId);
  forgetTailorTask(sourceId, task);
}
