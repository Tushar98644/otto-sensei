"use client";

import { useEffect, useEffectEvent } from "react";
import { tailorLink } from "./view";

// Read from the address bar, not page props: Back restores the cached render, the link already gone.
export function useTailorLink(ready: boolean, start: (jobId: string) => void): void {
  const run = useEffectEvent(start);
  useEffect(() => {
    if (!ready) return;
    const link = tailorLink(window.location.href);
    if (!link) return;
    window.history.replaceState(null, "", link.rest);
    const { jobId } = link;
    // Not cancelled on cleanup: Strict Mode's second run finds the link gone and would lose it.
    if (jobId) window.setTimeout(() => run(jobId), 0);
  }, [ready]);
}
