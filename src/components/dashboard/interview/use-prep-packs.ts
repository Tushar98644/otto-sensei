"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { PrepSummary } from "@/lib/insights/prep";

// The account's prep packs, as counts, for the Interview prep page: one load per visit. A pack is
// made on its own page, so coming back here loads the list again.

export type PrepPacksState = {
  status: "loading" | "ready" | "error";
  items: PrepSummary[];
  retry: () => void;
};

export function usePrepPacks(): PrepPacksState {
  const [status, setStatus] = useState<PrepPacksState["status"]>("loading");
  const [items, setItems] = useState<PrepSummary[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.interviewPacks().then(
      (res) => {
        if (!live) return;
        setItems(res.packs);
        setStatus("ready");
      },
      () => {
        if (live) setStatus("error");
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }, []);

  return { status, items, retry };
}
