"use client";

import { resumeTitle } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";
import { undoToast } from "./undo-toast";

/**
 * Deleting a resume: it goes to Recently deleted at once (30 days), and Undo brings it straight
 * back. No confirm, since nothing is lost either way.
 */
export function trashWithUndo(id: string): boolean {
  const store = useStudioStore.getState();
  const resume = store.resumes[id];
  const wasActive = store.activeId === id;
  if (!resume || !store.trashResume(id)) return false;
  undoToast({
    title: "Moved to Recently deleted",
    description: resumeTitle(resume),
    onUndo: () => {
      const state = useStudioStore.getState();
      // A restored resume comes back under a new id: the account backup won't take a deleted one.
      const restored = state.restoreFromTrash(id);
      if (restored && wasActive) state.setActive(restored);
    },
  });
  return true;
}
