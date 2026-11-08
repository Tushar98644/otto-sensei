"use client";

import { useSyncExternalStore } from "react";

// Marks the line Otto just rewrote, so it can show "Line updated" right where the change happened
// for a moment. One at a time: a newer fix replaces the older mark. Browser-only state, like the
// toast queue: on the server nothing is ever flashed.

export const LINE_FLASH_MS = 2500;
export const LINE_FLASH_LABEL = "Line updated";

let flashedId: string | null = null;
let timer: number | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function flashLine(bulletId: string): void {
  if (typeof window === "undefined") return;
  window.clearTimeout(timer);
  flashedId = bulletId;
  emit();
  timer = window.setTimeout(() => {
    flashedId = null;
    emit();
  }, LINE_FLASH_MS);
}

export function useLineFlash(bulletId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => flashedId === bulletId,
    () => false,
  );
}

// For one always-present live region, so the change is announced even though the pill itself
// appears and disappears.
export function useFlashAnnouncement(): string {
  return useSyncExternalStore(
    subscribe,
    () => (flashedId ? LINE_FLASH_LABEL : ""),
    () => "",
  );
}
