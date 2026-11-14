"use client";

import { patchMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import { newId, type Resume } from "@/lib/resume/schema";
import { saveTailorResult, type SavedResult, type TailorDraft } from "./session";

export type TailorTask = { done: SavedResult | null; promise: Promise<SavedResult> };

// Outlives the workspace: a run is paid up front, so leaving the step can't lose it or pay twice.
const tasks = new Map<string, TailorTask>();

export function tailorTaskFor(sourceId: string): TailorTask | null {
  return tasks.get(sourceId) ?? null;
}

export function startTailorTask(source: Resume, job: TailorDraft): TailorTask {
  const running = tasks.get(source.id);
  if (running) return running;
  const task: TailorTask = {
    done: null,
    promise: api
      .tailor({
        resume: source,
        job: { text: job.text.trim(), title: job.title.trim(), company: job.company.trim() },
      })
      .then((response) => {
        patchMe({ usage: response.usage });
        const saved: SavedResult = {
          id: newId(),
          sourceId: source.id,
          sourceUpdatedAt: source.updatedAt,
          job,
          result: response.result,
          demo: response.demo === true,
        };
        saveTailorResult(saved);
        task.done = saved;
        return saved;
      }),
  };
  tasks.set(source.id, task);
  task.promise.catch(() => forgetTailorTask(source.id, task));
  return task;
}

export function forgetTailorTask(sourceId: string, task: TailorTask): void {
  if (tasks.get(sourceId) === task) tasks.delete(sourceId);
}
