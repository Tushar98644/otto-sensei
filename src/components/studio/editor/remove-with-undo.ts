"use client";

import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useStudioStore } from "@/lib/store/resume-store";

export function removeWithUndo(resumeId: string, what: string, remove: () => void): void {
  const before = useStudioStore.getState().resumes[resumeId];
  remove();
  const after = useStudioStore.getState().resumes[resumeId];
  if (!before || !after || after === before) return;
  undoToast({
    title: `Removed ${what}`,
    onUndo: () => {
      const state = useStudioStore.getState();
      if (state.resumes[resumeId] !== after) {
        toast({ title: "You've changed it since", description: "Use Undo at the top of the editor." });
        return;
      }
      state.updateResume(resumeId, () => before, { label: `Brought back ${what}` });
    },
  });
}
