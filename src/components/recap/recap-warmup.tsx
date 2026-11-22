"use client";

import { useEffect } from "react";
import { whenIdle } from "@/components/ui/lazy";
import { loadRecapIndex } from "./recap-store";

// Once the first page settles: builds last week's recap on its first visit, and rings the bell.
export function RecapWarmup({ userId }: { userId: string }): null {
  useEffect(() => whenIdle(() => loadRecapIndex(userId)), [userId]);
  return null;
}
