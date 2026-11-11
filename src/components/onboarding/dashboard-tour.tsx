"use client";

import { usePathname } from "next/navigation";
import { useAccountSetup } from "@/components/setup/use-account-setup";
import { useSetupStepDecision } from "@/components/setup/use-setup-step";
import { useStudioHydrated } from "@/lib/store/resume-store";
import { dashboardTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

// The dashboard home's first-run tour: the quick actions, the resume library and the win rate.
export function DashboardTour() {
  const pathname = usePathname();
  const hydrated = useStudioHydrated();
  const setupStep = useSetupStepDecision();
  const setup = useAccountSetup();
  const eligible = dashboardTourEligible({
    pathname,
    hydrated,
    setupStep,
    setupShown: "shownThisLoad" in setup && setup.shownThisLoad,
  });

  useFirstRunTour("dashboard", eligible, async () => {
    const { dashboardStops } = await import("./stops");
    return dashboardStops();
  });

  return null;
}
