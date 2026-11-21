"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { upgradeReturnPath } from "@/components/account/upgrade-return";
import { refreshMe } from "@/components/account/use-me";
import { toast } from "@/components/ui/toast";
import { BILLING_INTERVALS, PAID_PLANS, type BillingInterval, type PaidPlanId } from "@/config/plans";

export type AccountArrival = {
  upgrade: boolean;
  plan: PaidPlanId | null;
  interval: BillingInterval | null;
  checkout: "success" | "cancelled" | null;
  portalMock: boolean;
  next: string | null;
};

const ARRIVAL_PARAMS = [
  "upgrade",
  "plan",
  "interval",
  "checkout",
  "trial",
  "portal",
  "next",
] as const;

function oneOf<T extends string>(value: string | null, options: readonly T[]): T | null {
  return value !== null && (options as readonly string[]).includes(value) ? (value as T) : null;
}

export function readArrival(searchParams: Pick<URLSearchParams, "get">): AccountArrival {
  const checkout = searchParams.get("checkout");
  return {
    upgrade: searchParams.get("upgrade") === "1",
    plan: oneOf(searchParams.get("plan"), PAID_PLANS),
    interval: oneOf(searchParams.get("interval"), BILLING_INTERVALS),
    checkout: checkout === "success" || checkout === "cancelled" ? checkout : null,
    portalMock: searchParams.get("portal") === "mock",
    next: upgradeReturnPath(searchParams.get("next")),
  };
}

export function useAccountArrival(): AccountArrival {
  const searchParams = useSearchParams();
  const [arrival] = useState<AccountArrival>(() => readArrival(searchParams));

  useEffect(() => {
    if (arrival.checkout === "success") {
      // Going back to a page gets its own toast once the plan shows.
      if (!arrival.next) {
        toast({
          title: "Thanks for upgrading!",
          description: "Your upgrade can take a minute to appear.",
          variant: "success",
        });
      }
      void refreshMe();
    } else if (arrival.checkout === "cancelled") {
      toast({ title: "Checkout cancelled", description: "Nothing was charged." });
    }
    if (arrival.portalMock) toast({ title: "Test mode: you're back on Free." });
  }, [arrival]);

  // Next patches replaceState in its own mount effect, which runs after this one: wait a tick.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (!ARRIVAL_PARAMS.some((key) => url.searchParams.has(key))) return;
      for (const key of ARRIVAL_PARAMS) url.searchParams.delete(key);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return arrival;
}
