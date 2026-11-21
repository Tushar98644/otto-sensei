"use client";

import { RESULT_TTL_MS, type MeteredRun } from "@/lib/api/request-id";
import { readJsonItem, removeItem, writeJsonItem } from "@/lib/browser-storage";
import { newId, type Resume } from "@/lib/resume/schema";
import type { TailorDraft } from "./session";

// Kept in this tab until the answer lands, so a retry or a reload never pays for the same run twice.
type PendingRun = { run: string; id: string; job: TailorDraft; at: number; open: boolean };

export type InterruptedRun = { job: TailorDraft; run: MeteredRun };

const keyFor = (sourceId: string) => `otto-tailor-pending-v1:${sourceId}`;
const isText = (value: unknown): value is string => typeof value === "string";

function runOf(source: Resume, job: TailorDraft): string {
  return JSON.stringify([source.updatedAt, job.text.trim(), job.title.trim(), job.company.trim()]);
}

function read(sourceId: string): PendingRun | null {
  const pending = readJsonItem(keyFor(sourceId), "session") as Partial<PendingRun> | null;
  const job = pending?.job;
  if (
    !pending ||
    !isText(pending.run) ||
    !isText(pending.id) ||
    typeof pending.at !== "number" ||
    !job ||
    !isText(job.text) ||
    !isText(job.title) ||
    !isText(job.company)
  ) {
    return null;
  }
  return { run: pending.run, id: pending.id, job, at: pending.at, open: pending.open === true };
}

export function sendRun(source: Resume, job: TailorDraft, now = Date.now()): MeteredRun {
  const run = runOf(source, job);
  const pending = read(source.id);
  const same = pending?.run === run ? pending : null;
  const next: PendingRun = { run, id: same?.id ?? newId(), job, at: now, open: true };
  writeJsonItem(keyFor(source.id), next, "session");
  return { id: next.id };
}

// Still open means a reload cut the request off; the server keeps a paid answer for a few minutes.
export function interruptedRun(source: Resume, now = Date.now()): InterruptedRun | null {
  const pending = read(source.id);
  if (!pending?.open || now - pending.at > RESULT_TTL_MS) return null;
  if (pending.run !== runOf(source, pending.job)) return null;
  return { job: pending.job, run: { id: pending.id, resume: true } };
}

export function closeRun(sourceId: string): void {
  const pending = read(sourceId);
  if (pending) writeJsonItem(keyFor(sourceId), { ...pending, open: false }, "session");
}

export function finishRun(sourceId: string): void {
  removeItem(keyFor(sourceId), "session");
}
