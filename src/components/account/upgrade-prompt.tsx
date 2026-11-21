"use client";

import { useSyncExternalStore } from "react";
import type { Feature, ProTool } from "@/config/plans";
import { LazyUpgradeDialog } from "./lazy-dialogs";
import type { ReplaceOffer } from "./upgrade-dialog";

type Prompt = { open: boolean; tool?: ProTool; feature?: Feature; replace?: ReplaceOffer };

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

export function openUpgradePrompt(tool: ProTool, replace?: ReplaceOffer): void {
  setPrompt({ open: true, tool, replace });
}

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
      onOpenChange={(open) => setPrompt({ ...prompt, open })}
      tool={current.tool}
      feature={current.feature}
      replace={current.replace}
    />
  );
}
