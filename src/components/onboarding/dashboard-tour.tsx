"use client";

import { usePathname } from "next/navigation";
import { useSetupStepDecision } from "@/components/setup/use-setup-step";
import { useStudioHydrated } from "@/lib/store/resume-store";
import { dashboardTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

// The dashboard home's first-run tour: the quick actions, the resume library and the win rate.
export function DashboardTour() {
  const pathname = usePathname();
  const hydrated = useStudioHydrated();
  const setupStep = useSetupStepDecision();
  const eligible = dashboardTourEligible({
    pathname,
    hydrated,
    setupStep,
  });

  useFirstRunTour("dashboard", eligible, async () => {
    const { dashboardStops } = await import("./stops");
    return dashboardStops();
  });

  return null;
}
