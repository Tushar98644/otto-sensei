"use client";

import { useSyncExternalStore } from "react";
import type { ProTool } from "@/config/plans";
import { UpgradeDialog } from "./upgrade-dialog";

// The trial prompt for the Pro tools, opened from anywhere with openUpgradePrompt(): a store action,
// an Undo in a toast, a menu item. Mount <UpgradePromptHost /> once per page; the app shell, the
// studio shell and /account each do.

type Prompt = { open: boolean; tool?: ProTool };

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

export function UpgradePromptHost() {
  const current = useSyncExternalStore(
    subscribe,
    () => prompt,
    () => CLOSED,
  );
  return (
    <UpgradeDialog
      open={current.open}
      // The tool stays while the dialog animates closed, so its copy doesn't change mid-fade.
      onOpenChange={(open) => setPrompt({ ...prompt, open })}
      tool={current.tool}
    />
  );
}
