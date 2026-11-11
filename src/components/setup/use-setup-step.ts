"use client";

import { usePathname } from "next/navigation";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { useWorkProfile } from "@/components/eligibility/use-work-profile";
import { setupStepDecision, type StepDecision } from "@/lib/setup/step";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { useAccountSetup } from "./use-account-setup";

// Whether the first-login step is due on this screen, from the shared stores the step itself and
// the dashboard tour both read, so the two never open on top of each other.
export function useSetupStepDecision(): StepDecision {
  const pathname = usePathname();
  const { user, loading } = useMe();
  const pro = useProTools();
  // The account's resumes have arrived from the cloud: the prefills read them.
  const firstLoadPending = useFirstLoadPending();
  const work = useWorkProfile();
  const setup = useAccountSetup();

  if (loading) return "wait";
  return setupStepDecision({
    pathname,
    signedIn: user !== null,
    ready: !firstLoadPending && pro !== null,
    work:
      work.status === "ready"
        ? { status: "ready", updatedAt: work.updatedAt }
        : { status: work.status === "error" ? "error" : "loading", updatedAt: null },
    setup:
      setup.status === "ready" || setup.status === "error" || setup.status === "loading"
        ? { status: setup.status, stepAt: setup.stepAt }
        : { status: "loading", stepAt: null },
    localStepAt:
      setup.status === "ready" || setup.status === "error" || setup.status === "loading"
        ? setup.localStepAt
        : null,
  });
}
