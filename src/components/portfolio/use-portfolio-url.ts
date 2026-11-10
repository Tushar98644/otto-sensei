"use client";

import { useSyncExternalStore } from "react";
import { portfolioPath } from "@/lib/portfolio/types";

const noSubscribe = () => () => {};

/** The page's full address from wherever the app runs; "" on the server. */
export function usePortfolioUrl(slug: string): string {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  return origin ? new URL(portfolioPath(slug), origin).href : "";
}
