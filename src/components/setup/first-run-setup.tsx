"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { loadingScreenUp } from "@/components/mascot/otto-loading-screen";
import { recordSetupStep, useAccountSetup } from "./use-account-setup";
import { useSetupStepDecision } from "./use-setup-step";

type SetupDialog = typeof import("./work-setup-dialog").WorkSetupDialog;

const START_DELAY_MS = 800;
const RETRY_MS = 1_500;

export function FirstRunSetup() {
  const pathname = usePathname();
  const decision = useSetupStepDecision();
  const setup = useAccountSetup();
  const work = useWorkProfile();
  const pro = useProTools();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  // Not through Suspense, whose 300 ms fallback throttle would hold the dialog back.
  const [WorkSetupDialog, setWorkSetupDialog] = useState<SetupDialog | null>(null);

  useEffect(() => {
    if (decision !== "show" || WorkSetupDialog) return;
    let live = true;
    import("./work-setup-dialog")
      .then((module) => {
        if (live) setWorkSetupDialog(() => module.WorkSetupDialog);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [decision, WorkSetupDialog]);

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
  if (!WorkSetupDialog) return null;
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
