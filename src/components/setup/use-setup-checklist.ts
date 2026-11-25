"use client";

import { useMemo } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { undoToast } from "@/components/ui/undo-toast";
import { useMessages } from "@/i18n/client";
import type { Resume } from "@/lib/resume/schema";
import {
  checklistShows,
  ownResumes,
  setupItems,
  setupProgress,
  type SetupItem,
  type WeakLineTarget,
} from "@/lib/setup/checklist";
import { weakLineState, type WeakLineState } from "@/lib/setup/weak-line";
import { useResumeList } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { rememberWeakLine, setChecklistHidden, useAccountSetup } from "./use-account-setup";

export type SetupChecklist = {
  own: Resume[];
  items: SetupItem[];
  progress: { done: number; total: number };
  shown: boolean;
  weakLine: WeakLineState;
  hide: () => void;
  remember: (target: WeakLineTarget) => void;
};

// Null until every fact behind the ticks has loaded, so no row flips from to-do to done.
export function useSetupChecklist(): SetupChecklist | null {
  const pro = useProTools();
  const work = useWorkProfile();
  const setup = useAccountSetup();
  const resumes = useResumeList();
  const loadingResumes = useFirstLoadPending();
  const hidden = useMessages("workProfile").setupHidden;
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const userId = "userId" in setup ? setup.userId : null;
  const remembered = "weakLine" in setup ? setup.weakLine : null;
  const weakLine = useMemo(() => weakLineState(own, remembered), [own, remembered]);

  const settled =
    userId !== null &&
    pro !== null &&
    !loadingResumes &&
    (work.status === "ready" || work.status === "error") &&
    (setup.status === "ready" || setup.status === "error");
  if (!settled || !userId) return null;

  const items = setupItems({
    pro,
    ownResumes: own.length,
    work: work.status === "ready" ? { profile: work.profile, lookingFor: work.lookingFor } : null,
    guess: "guess" in setup ? setup.guess : null,
    weakLine,
  });
  const hiddenAt = "checklistHiddenAt" in setup ? setup.checklistHiddenAt : null;

  return {
    own,
    items,
    progress: setupProgress(items),
    shown: checklistShows(items, hiddenAt),
    weakLine,
    hide: () => {
      void setChecklistHidden(userId, true);
      undoToast({
        title: hidden.title,
        description: hidden.description,
        onUndo: () => void setChecklistHidden(userId, false),
      });
    },
    remember: (target) => rememberWeakLine(userId, target),
  };
}
