"use client";

import { useSyncExternalStore } from "react";

// Uploads read by the rule-based parser, so the recruiter view can say so. Memory only on purpose.

const readByRules = new Set<string>();
// Of those, the ones the basic reader read because the plan's AI reads were used up.
const pastAllowance = new Set<string>();
// Of those, the ones the rules read well enough that the AI reader wasn't needed.
const readWell = new Set<string>();
// One file at a time, so a long session doesn't hold on to every upload.
let rereadable: { resumeId: string; file: File } | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function noteReadByRules(resumeId: string, limited = false): void {
  if (readByRules.has(resumeId) && (!limited || pastAllowance.has(resumeId))) return;
  readByRules.add(resumeId);
  readWell.delete(resumeId);
  if (limited) pastAllowance.add(resumeId);
  notify();
}

export function noteReadWell(resumeId: string, file: File): void {
  readByRules.add(resumeId);
  readWell.add(resumeId);
  rereadable = { resumeId, file };
  notify();
}

export function noteReadByAI(resumeId: string): void {
  readByRules.delete(resumeId);
  pastAllowance.delete(resumeId);
  readWell.delete(resumeId);
  if (rereadable?.resumeId === resumeId) rereadable = null;
  notify();
}

export function rereadableFile(resumeId: string): File | null {
  return rereadable?.resumeId === resumeId ? rereadable.file : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type ReadBy = "ai" | "rules" | "rules_past_allowance" | "rules_read_well";

export function useReadByRules(resumeId: string | null): ReadBy {
  return useSyncExternalStore(
    subscribe,
    (): ReadBy => {
      if (!resumeId || !readByRules.has(resumeId)) return "ai";
      if (pastAllowance.has(resumeId)) return "rules_past_allowance";
      return readWell.has(resumeId) ? "rules_read_well" : "rules";
    },
    () => "ai",
  );
}
