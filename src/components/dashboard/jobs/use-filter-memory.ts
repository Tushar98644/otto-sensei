"use client";

import { useSyncExternalStore } from "react";
import { readJsonItem, writeJsonItem } from "@/lib/browser-storage";
import { NO_MEMORY, parseFilterMemory, type FilterMemory } from "./filter-memory";

const KEY_PREFIX = "otto-job-filters-v1:";

// Held here first, so filters still work for the visit when the browser blocks storage.
let cache: { userId: string; memory: FilterMemory } | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function readFilterMemory(userId: string): FilterMemory {
  if (cache?.userId !== userId) {
    cache = { userId, memory: parseFilterMemory(readJsonItem(KEY_PREFIX + userId)) };
  }
  return cache.memory;
}

export function rememberFilters(userId: string | null, patch: Partial<FilterMemory>): void {
  if (!userId) return;
  const memory = { ...readFilterMemory(userId), ...patch };
  cache = { userId, memory };
  writeJsonItem(KEY_PREFIX + userId, memory);
  notify();
}

function onStorage(event: StorageEvent) {
  if (!cache || event.key !== KEY_PREFIX + cache.userId) return;
  cache = { userId: cache.userId, memory: parseFilterMemory(readJsonItem(event.key)) };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

// The server has no memory, so hydration starts from none and the browser's arrives right after.
export function useFilterMemory(userId: string | null): FilterMemory {
  return useSyncExternalStore(
    subscribe,
    () => (userId ? readFilterMemory(userId) : NO_MEMORY),
    () => NO_MEMORY,
  );
}
