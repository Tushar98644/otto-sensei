"use client";

import { usePathname } from "next/navigation";
import { useFormat, useMessages } from "@/i18n/client";
import { useStudioHydrated } from "@/lib/store/resume-store";
import { dashboardTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

export function DashboardTour() {
  const pathname = usePathname();
  const hydrated = useStudioHydrated();
  const eligible = dashboardTourEligible({ pathname, hydrated });
  const copy = useMessages("onboarding");
  const format = useFormat();

  useFirstRunTour("dashboard", eligible, copy, async () => {
    const [{ dashboardStops }, { setupStepCount }] = await Promise.all([
      import("./stops"),
      import("./targets"),
    ]);
    return dashboardStops({ setupSteps: setupStepCount(), copy, format });
  });

  return null;
}
