"use client";

import { roomForResume } from "@/components/account/pro-tools";
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
    // A restored resume comes back under a new id: the account backup won't take a deleted one.
    // So to the account it's a new resume, and Free past its limit gets the trial prompt.
    onUndo: () =>
      void roomForResume().then((room) => {
        if (!room) return;
        const state = useStudioStore.getState();
        const restored = state.restoreFromTrash(id);
        if (restored && wasActive) state.setActive(restored);
      }),
  });
  return true;
}
