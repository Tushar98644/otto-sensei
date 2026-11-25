"use client";

import { roomForCopyOf } from "@/components/account/pro-tools";
import { resumeTitle } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";
import { undoToast } from "./undo-toast";

// `words` puts the toast in the reader's language; English without it.
export function trashWithUndo(id: string, words?: { trashed: string; undo: string }): boolean {
  const store = useStudioStore.getState();
  const resume = store.resumes[id];
  const wasActive = store.activeId === id;
  if (!resume || !store.trashResume(id)) return false;
  undoToast({
    title: words?.trashed ?? "Moved to Recently deleted",
    undoLabel: words?.undo,
    description: resumeTitle(resume),
    // Restored under a new id: the account backup won't take a deleted one.
    onUndo: () =>
      void roomForCopyOf(resume).then((room) => {
        if (!room) return;
        const state = useStudioStore.getState();
        const restored = state.restoreFromTrash(id);
        if (restored && wasActive) state.setActive(restored);
      }),
  });
  return true;
}
