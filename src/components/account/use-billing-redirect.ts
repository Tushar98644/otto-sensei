"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { track } from "@/lib/analytics/client";
import { api, isApiError } from "@/lib/api/client";
import { errorMessage } from "./errors";
import { refreshMe } from "./use-me";

export type BillingDestination = "checkout" | "portal";

const FAILURE_TITLES: Record<BillingDestination, string> = {
  checkout: "Couldn't start checkout",
  portal: "Couldn't open billing",
};

// Sends the browser to the payment provider's checkout or customer portal (in test mode, straight
// back to /account). Failures become a toast; `pending` stays on while the page unloads.
export function useBillingRedirect(destination: BillingDestination) {
  const [pending, setPending] = useState(false);

  // Pressing Back on the provider's page can restore this one from the back/forward cache, with the
  // button still spinning.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // plan and interval: checkout only, Pro monthly unless given.
  const go = useCallback(async (plan?: PaidPlanId, interval?: BillingInterval) => {
    setPending(true);
    if (destination === "checkout") track("upgrade_clicked");
    try {
      const { url } =
        destination === "checkout" ? await api.checkout(plan, interval) : await api.portal();
      window.location.assign(url);
    } catch (error) {
      setPending(false);
      const changingPlan = isApiError(error, "plan_change_failed");
      toast({
        title: changingPlan ? "Couldn't change your plan" : FAILURE_TITLES[destination],
        description: errorMessage(error),
        variant: "error",
      });
      // "You're already on Pro", a lapsed session or a subscription whose status moved on: the plan
      // or user on screen is out of date.
      if (changingPlan || isApiError(error, "bad_request") || isApiError(error, "unauthorized")) {
        void refreshMe();
      }
    }
  }, [destination]);

  return { go, pending };
}
