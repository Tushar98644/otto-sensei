"use client";

import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { useStudioStore } from "@/lib/store/resume-store";

export function removeWithUndo(
  resumeId: string,
  what: string,
  remove: () => void,
  t: Messages["studioEditor"]["undo"],
): void {
  const before = useStudioStore.getState().resumes[resumeId];
  remove();
  const after = useStudioStore.getState().resumes[resumeId];
  if (!before || !after || after === before) return;
  undoToast({
    title: fmt(t.removed, { what }),
    onUndo: () => {
      const state = useStudioStore.getState();
      if (state.resumes[resumeId] !== after) {
        toast({ title: t.changedSince, description: t.useUndo });
        return;
      }
      state.updateResume(resumeId, () => before, { label: fmt(t.broughtBack, { what }) });
    },
  });
}
