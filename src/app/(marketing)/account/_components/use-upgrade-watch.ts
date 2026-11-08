"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshMe } from "@/components/account/use-me";

// The payment webhook can land a little after the user is back here. Ask again for about a minute,
// further apart each time, so a slow webhook never turns into a burst of requests.
const RECHECK_DELAYS_MS = [2_000, 3_000, 5_000, 8_000, 13_000, 21_000];

export type UpgradeWatch = {
  state: "idle" | "checking" | "gave-up";
  // Starts another round of checks, for a "Check again" button.
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
