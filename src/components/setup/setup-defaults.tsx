"use client";

import { useEffect, useMemo } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { defaultsDue, ownResumes } from "@/lib/setup/checklist";
import { useResumeList } from "@/lib/store/resume-store";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { useAccountSetup } from "./use-account-setup";

// First login asks nothing: Otto saves its guesses into blank settings instead, once.
export function SetupDefaults() {
  const userId = useSessionUserId();
  const loadingResumes = useFirstLoadPending(userId);
  const work = useWorkProfile();
  const setup = useAccountSetup();
  const resumes = useResumeList();
  const own = useMemo(() => ownResumes(resumes), [resumes]);
  const ready = setup.status === "ready" && work.status === "ready" && !loadingResumes;
  const defaultsAt = ready ? setup.defaultsAt : null;
  const lookingForAt = ready ? setup.lookingForAt : null;
  const due = ready && defaultsDue({ defaultsAt, lookingForAt }, own);

  useEffect(() => {
    if (!due || !userId) return;
    let live = true;
    import("./run-setup-defaults")
      .then(({ runSetupDefaults }) => {
        if (live) runSetupDefaults(userId, { defaultsAt, lookingForAt }, own);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [due, userId, defaultsAt, lookingForAt, own]);

  return null;
}
