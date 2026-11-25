"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshMe } from "@/components/account/use-me";
import { PLAN_ORDER, type PlanId } from "@/config/plans";

const RECHECK_DELAYS_MS = [2_000, 3_000, 5_000, 8_000, 13_000, 21_000];

// A return that names no plan counts any paid plan as the one bought.
export function planArrived(plan: PlanId, target: PlanId | null): boolean {
  return target ? PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(target) : plan !== "free";
}

export type UpgradeWatch = {
  state: "idle" | "checking" | "gave-up";
  retry: () => void;
};

export function useUpgradeWatch(active: boolean): UpgradeWatch {
  const [attempt, setAttempt] = useState(0);
  const checking = active && attempt < RECHECK_DELAYS_MS.length;

  useEffect(() => {
    if (!checking) return;
    const timer = window.setTimeout(() => {
      void refreshMe().finally(() => setAttempt((count) => count + 1));
    }, RECHECK_DELAYS_MS[attempt]);
    return () => window.clearTimeout(timer);
  }, [checking, attempt]);

  const retry = useCallback(() => setAttempt(0), []);

  return { state: active ? (checking ? "checking" : "gave-up") : "idle", retry };
}
