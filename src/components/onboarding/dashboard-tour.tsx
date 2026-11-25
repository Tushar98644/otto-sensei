"use client";

import { usePathname } from "next/navigation";
import { useFormat, useMessagesOr } from "@/i18n/client";
import englishOnboarding from "@/i18n/messages/en/onboarding";
import { useStudioHydrated } from "@/lib/store/resume-store";
import { dashboardTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

export function DashboardTour() {
  const pathname = usePathname();
  const hydrated = useStudioHydrated();
  const eligible = dashboardTourEligible({ pathname, hydrated });
  // The dashboard reads English until its layout passes the onboarding namespace.
  const copy = useMessagesOr("onboarding", englishOnboarding);
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
