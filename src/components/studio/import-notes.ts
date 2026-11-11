"use client";

import { useSyncExternalStore } from "react";

const readByRules = new Set<string>();
const pastAllowance = new Set<string>();
const readWell = new Set<string>();
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
