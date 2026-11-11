"use client";

import { useSyncExternalStore } from "react";
import type { Feature, ProTool } from "@/config/plans";
import { LazyUpgradeDialog } from "./lazy-dialogs";

// The trial prompt for the Pro tools, opened from anywhere with openUpgradePrompt(): a store action,
// an Undo in a toast, a menu item. Mount <UpgradePromptHost /> once per page; the app shell, the
// studio shell and /account each do.

type Prompt = { open: boolean; tool?: ProTool; feature?: Feature };

const CLOSED: Prompt = { open: false };
let prompt: Prompt = CLOSED;
const listeners = new Set<() => void>();

function setPrompt(next: Prompt) {
  prompt = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openUpgradePrompt(tool: ProTool): void {
  setPrompt({ open: true, tool });
}

// The same prompt for AI help Free doesn't have (a letter, interview prep), named by its allowance.
export function openFeaturePrompt(feature: Feature): void {
  setPrompt({ open: true, feature });
}

export function UpgradePromptHost() {
  const current = useSyncExternalStore(
    subscribe,
    () => prompt,
    () => CLOSED,
  );
  return (
    <LazyUpgradeDialog
      open={current.open}
      // The tool stays while the dialog animates closed, so its copy doesn't change mid-fade.
      onOpenChange={(open) => setPrompt({ ...prompt, open })}
      tool={current.tool}
      feature={current.feature}
    />
  );
}
