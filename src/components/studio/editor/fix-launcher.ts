"use client";

import { createContext, use } from "react";

export type OpenFix = (bulletId: string) => void;

export const FixLauncherContext = createContext<OpenFix>(() => {});

export function useOpenFix(): OpenFix {
  return use(FixLauncherContext);
}
