"use client";

import { useSyncExternalStore } from "react";

// One line at a time: a newer fix replaces the older mark. Never flashed on the server.

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

// One always-present live region, so the change is announced though the pill comes and goes.
export function useFlashAnnouncement(): string {
  return useSyncExternalStore(
    subscribe,
    () => (flashedId ? LINE_FLASH_LABEL : ""),
    () => "",
  );
}
