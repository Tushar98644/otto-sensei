"use client";

import { entryFieldId, SUMMARY_INPUT_ID } from "@/components/studio/editor/focus";
import type { Messages } from "@/i18n/messages";
import { jumpToLine, showInEditor } from "@/components/studio/tailor/jump";
import type { ReviewTarget } from "@/lib/lint/review";
import { useStudioStore } from "@/lib/store/resume-store";

export function openTarget(resumeId: string, target: ReviewTarget | null): void {
  if (target?.kind === "line") {
    jumpToLine(resumeId, target.bulletId);
    return;
  }
  const store = useStudioStore.getState();
  if (store.activeId !== resumeId) store.setActive(resumeId);
  showInEditor(
    target?.kind === "summary"
      ? SUMMARY_INPUT_ID
      : target?.kind === "entry"
        ? entryFieldId(target.entryId, "heading")
        : null,
  );
}

export function targetLabel(t: Messages["studio"]["targets"], target: ReviewTarget | null): string {
  if (target?.kind === "line") return t.line;
  if (target?.kind === "summary") return t.summary;
  if (target?.kind === "entry") return t.entry;
  return t.editor;
}
