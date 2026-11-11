"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { loadingScreenUp } from "@/components/mascot/otto-loading-screen";
import { recordSetupStep, useAccountSetup } from "./use-account-setup";
import { useSetupStepDecision } from "./use-setup-step";
import { WorkSetupDialog } from "./work-setup-dialog";

// Long enough for the loading screen to fade and the page to settle, so the step arrives as part
// of landing rather than on top of it.
const START_DELAY_MS = 800;
// While another dialog or menu is open, or the tab is in the background.
const RETRY_MS = 1_500;

// Opens the first-login step once per account, on Home or Jobs (lib/setup/step.ts says when).
// Mounted in the app shell, so it survives moving between those pages.
export function FirstRunSetup() {
  const pathname = usePathname();
  const decision = useSetupStepDecision();
  const setup = useAccountSetup();
  const work = useWorkProfile();
  const pro = useProTools();
  // The page it opened on: leaving it (the browser's Back button still works) counts as Skip.
  const [openedOn, setOpenedOn] = useState<string | null>(null);

  useEffect(() => {
    if (decision !== "show" || openedOn !== null) return;
    let timer = 0;
    const attempt = () => {
      if (busy()) {
        timer = window.setTimeout(attempt, RETRY_MS);
        return;
      }
      setOpenedOn(pathname);
    };
    timer = window.setTimeout(attempt, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [decision, openedOn, pathname]);

  const userId = setup.status === "signed_out" || setup.status === "unknown" ? null : setup.userId;
  const answered = setup.status !== "signed_out" && setup.status !== "unknown" && setup.stepAt !== null;

  useEffect(() => {
    if (userId && openedOn !== null && openedOn !== pathname && !answered) {
      void recordSetupStep(userId, "skipped");
    }
  }, [userId, openedOn, pathname, answered]);

  if (openedOn === null || !userId || work.status !== "ready" || pro === null) return null;
  return (
    <WorkSetupDialog
      open={openedOn === pathname && !answered}
      userId={userId}
      pro={pro}
      profile={work.profile}
      onClose={(outcome) => void recordSetupStep(userId, outcome)}
    />
  );
}

function busy(): boolean {
  if (document.visibilityState === "hidden" || loadingScreenUp()) return true;
  if (document.querySelector("dialog[open]")) return true;
  try {
    return document.querySelector(":popover-open") !== null;
  } catch {
    return false;
  }
}
