"use client";

import { entryFieldId, SUMMARY_INPUT_ID } from "@/components/studio/editor/focus";
import { jumpToLine, showInEditor } from "@/components/studio/tailor/jump";
import type { ReviewTarget } from "@/lib/lint/review";
import { useStudioStore } from "@/lib/store/resume-store";

// Opens the editor on the thing a check points at: the line, the job's heading, or the summary.
// The name-and-contact section may be folded away, so a headline check only opens the editor.
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

export function targetLabel(target: ReviewTarget | null): string {
  if (target?.kind === "line") return "Show line";
  if (target?.kind === "summary") return "Open summary";
  if (target?.kind === "entry") return "Open job";
  return "Open editor";
}
