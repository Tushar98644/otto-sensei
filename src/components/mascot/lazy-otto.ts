"use client";

import { useSyncExternalStore } from "react";

type OttoModule = typeof import("./otto");

let loaded: OttoModule | null = null;
let loading: Promise<OttoModule | null> | null = null;
const listeners = new Set<() => void>();

// Otto's drawing code for screens every page carries but rarely shows (loading, crash): fetched when one is about to.
export function loadOtto(): Promise<OttoModule | null> {
  loading ??= import("./otto").then(
    (module) => {
      loaded = module;
      for (const listener of listeners) listener();
      return module;
    },
    () => {
      loading = null;
      return null;
    },
  );
  return loading;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const current = () => loaded;

export function useLoadedOtto(): OttoModule | null {
  return useSyncExternalStore(subscribe, current, current);
}
