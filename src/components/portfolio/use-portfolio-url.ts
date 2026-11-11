"use client";

import { useSyncExternalStore } from "react";
import { portfolioPath } from "@/lib/portfolio/types";

const noSubscribe = () => () => {};

export function usePortfolioUrl(slug: string): string {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  return origin ? new URL(portfolioPath(slug), origin).href : "";
}
