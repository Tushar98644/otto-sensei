"use client";

import { useSyncExternalStore } from "react";

// One shared clock for relative times ("5 minutes ago"), so render stays pure and every label on
// the page ticks together. 0 on the server, where nothing time-relative is rendered.

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

// Refreshes a value left stale while nothing was subscribed, so a list that mounts later doesn't
// start out minutes behind.
function getSnapshot() {
  if (Date.now() - now > TICK_MS) now = Date.now();
  return now;
}

const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
