"use client";

import { useSyncExternalStore } from "react";

export type TouchLayout = "fine" | "tablet" | "phone";

let coarse: MediaQueryList | null = null;
let narrow: MediaQueryList | null = null;

function queries(): [MediaQueryList, MediaQueryList] {
  coarse ??= window.matchMedia("(pointer: coarse)");
  narrow ??= window.matchMedia("(max-width: 39.99rem)");
  return [coarse, narrow];
}

function subscribe(onChange: () => void): () => void {
  const lists = queries();
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

function snapshot(): TouchLayout {
  const [isCoarse, isNarrow] = queries();
  if (!isCoarse.matches) return "fine";
  return isNarrow.matches ? "phone" : "tablet";
}

// One ⋯ menu per row on touch screens instead of a row of tools under it.
export function useTouchLayout(): TouchLayout {
  return useSyncExternalStore(subscribe, snapshot, () => "fine");
}
