"use client";

import { useSyncExternalStore } from "react";

// Which uploads in this tab were sorted by the rule-based parser instead of AI, so the recruiter
// view can say so. Kept in memory on purpose: the note only matters right after an upload.

const readByRules = new Set<string>();
// Of those, the ones the basic reader read because the plan's AI reads were used up.
const pastAllowance = new Set<string>();
const listeners = new Set<() => void>();

export function noteReadByRules(resumeId: string, limited = false): void {
  if (readByRules.has(resumeId) && (!limited || pastAllowance.has(resumeId))) return;
  readByRules.add(resumeId);
  if (limited) pastAllowance.add(resumeId);
  for (const notify of listeners) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type ReadBy = "ai" | "rules" | "rules_past_allowance";

export function useReadByRules(resumeId: string | null): ReadBy {
  return useSyncExternalStore(
    subscribe,
    (): ReadBy => {
      if (!resumeId || !readByRules.has(resumeId)) return "ai";
      return pastAllowance.has(resumeId) ? "rules_past_allowance" : "rules";
    },
    () => "ai",
  );
}
