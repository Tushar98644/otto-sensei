"use client";

import { createContext, use } from "react";

export type OpenFix = (bulletId: string) => void;
export type StartFixAll = () => void;

export const FixLauncherContext = createContext<OpenFix>(() => {});
export const FixAllContext = createContext<StartFixAll>(() => {});

export function useOpenFix(): OpenFix {
  return use(FixLauncherContext);
}

export function useStartFixAll(): StartFixAll {
  return use(FixAllContext);
}
