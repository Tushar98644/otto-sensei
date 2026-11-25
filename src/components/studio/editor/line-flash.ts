"use client";

import { useSyncExternalStore } from "react";

export const LINE_FLASH_MS = 2500;

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

// Whether a line just changed, for the editor's status message.
export function useLineFlashed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => flashedId !== null,
    () => false,
  );
}
