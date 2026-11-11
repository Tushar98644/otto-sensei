"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    for (const notify of listeners) notify();
  }, TICK_MS);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (Date.now() - now > TICK_MS) now = Date.now();
  return now;
}

const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
