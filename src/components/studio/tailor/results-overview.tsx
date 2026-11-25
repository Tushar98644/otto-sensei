"use client";

import { FixFirst, type FixFirstEntry } from "@/components/studio/fix-first";
import { StatusPill } from "@/components/ui/status";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import type { FixFirstAction } from "@/lib/tailor/reasons";
import { requirementDomId } from "./requirement-row";
import { revealSection } from "./reveal";
import type { Screener } from "./screener";

export type ResultsOverviewProps = {
  screener: Screener;
  onJump: (bulletId: string) => void;
};

type Overview = Messages["studioTailor"]["overview"];

function showElement(id: string): void {
  const element = revealSection(id);
  if (element?.matches("li") && element.tabIndex >= -1) element.focus({ preventScroll: true });
}

function actionOf(t: Overview, action: FixFirstAction, onJump: (bulletId: string) => void) {
  if (action.kind === "line") return { label: t.showLine, onClick: () => onJump(action.bulletId) };
  if (action.kind === "row") {
    return { label: t.goTo, onClick: () => showElement(requirementDomId(action.rowId)) };
  }
  return { label: t.see, onClick: () => showElement(action.id) };
}

export function ResultsOverview({ screener, onJump }: ResultsOverviewProps) {
  const t = useMessages("studioTailor").overview;
  const items: FixFirstEntry[] = screener.fixFirst.map((item) => ({
    key: item.key,
    title: item.title,
    reason: item.reason,
    action: actionOf(t, item.action, onJump),
  }));

  return (
    <FixFirst
      title={t.title}
      items={items}
      empty={<StatusPill status="pass">{t.allShown}</StatusPill>}
    />
  );
}
