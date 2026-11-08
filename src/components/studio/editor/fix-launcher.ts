"use client";

import { createContext, use } from "react";

// Any line can open the one Fix dialog. The function is stable, so opening, loading and closing
// the dialog never re-renders the lines.
export type OpenFix = (bulletId: string) => void;

export const FixLauncherContext = createContext<OpenFix>(() => {});

export function useOpenFix(): OpenFix {
  return use(FixLauncherContext);
}
