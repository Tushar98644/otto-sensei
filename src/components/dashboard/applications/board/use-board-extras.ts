"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { SavedJob } from "@/lib/job-feed/types";
import type { Writing } from "@/lib/writings/schema";

// What the board shows beside the applications themselves: saved jobs (the To apply column) and
// the letters and answers (a small mark on each card). One load per visit. Either failing only
// leaves its part out: the board itself still works from the applications and this browser's
// tailored copies.

export type BoardExtras = {
  savedJobs: SavedJob[];
  writings: Writing[];
};

const EMPTY: BoardExtras = { savedJobs: [], writings: [] };

export function useBoardExtras(): BoardExtras {
  const [extras, setExtras] = useState<BoardExtras>(EMPTY);

  useEffect(() => {
    let live = true;
    void Promise.allSettled([api.savedJobs(), api.writings()]).then(([saved, written]) => {
      if (!live) return;
      setExtras({
        savedJobs: saved.status === "fulfilled" ? saved.value.jobs : [],
        writings: written.status === "fulfilled" ? written.value.writings : [],
      });
    });
    return () => {
      live = false;
    };
  }, []);

  return extras;
}
