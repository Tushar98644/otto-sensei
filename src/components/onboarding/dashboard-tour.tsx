"use client";

import { usePathname } from "next/navigation";
import { useStudioHydrated } from "@/lib/store/resume-store";
import { dashboardTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

export function DashboardTour() {
  const pathname = usePathname();
  const hydrated = useStudioHydrated();
  const eligible = dashboardTourEligible({ pathname, hydrated });

  useFirstRunTour("dashboard", eligible, async () => {
    const [{ dashboardStops }, { setupStepCount }] = await Promise.all([
      import("./stops"),
      import("./targets"),
    ]);
    return dashboardStops({ setupSteps: setupStepCount() });
  });

  return null;
}
