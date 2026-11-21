"use client";

import { FixFirst, type FixFirstEntry } from "@/components/studio/fix-first";
import { StatusPill } from "@/components/ui/status";
import type { FixFirstAction } from "@/lib/tailor/reasons";
import { requirementDomId } from "./requirement-row";
import { revealSection } from "./reveal";
import type { Screener } from "./screener";

export type ResultsOverviewProps = {
  screener: Screener;
  onJump: (bulletId: string) => void;
};

function showElement(id: string): void {
  const element = revealSection(id);
  if (element?.matches("li") && element.tabIndex >= -1) element.focus({ preventScroll: true });
}

function actionOf(action: FixFirstAction, onJump: (bulletId: string) => void) {
  if (action.kind === "line") return { label: "Show line", onClick: () => onJump(action.bulletId) };
  if (action.kind === "row") {
    return { label: "Go to it", onClick: () => showElement(requirementDomId(action.rowId)) };
  }
  return { label: "See it", onClick: () => showElement(action.id) };
}

export function ResultsOverview({ screener, onJump }: ResultsOverviewProps) {
  const items: FixFirstEntry[] = screener.fixFirst.map((item) => ({
    key: item.key,
    title: item.title,
    reason: item.reason,
    action: actionOf(item.action, onJump),
  }));

  return (
    <FixFirst
      title="Fix these first for this job"
      items={items}
      empty={
        <StatusPill status="pass">Every must-have shows in a line about what you did.</StatusPill>
      }
    />
  );
}
