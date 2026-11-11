"use client";

import { createContext, use } from "react";

// Stable, so opening, loading and closing the one Fix dialog never re-renders the lines.
export type OpenFix = (bulletId: string) => void;

export const FixLauncherContext = createContext<OpenFix>(() => {});

export function useOpenFix(): OpenFix {
  return use(FixLauncherContext);
}
