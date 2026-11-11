"use client";

import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useStudioStore } from "@/lib/store/resume-store";

// Removes at once and offers Undo instead of asking first. That Undo restores the resume exactly
// while nothing else changed; after that the editor's own Undo walks back step by step.
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
