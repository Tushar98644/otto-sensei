"use client";

import { useSyncExternalStore } from "react";
import { defaultPageSize, isPdfPageSize, type PdfPageSize } from "@/lib/pdf/page-size";

// The user's page size, remembered in this browser. Kept in memory too, so the toggle still works
// when storage is blocked (private windows, strict privacy settings).

const STORAGE_KEY = "otto-pdf-page-size";
const listeners = new Set<() => void>();
let current: PdfPageSize | null = null;

function readStored(): PdfPageSize | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isPdfPageSize(value) ? value : null;
  } catch {
    return null;
  }
}

function getSnapshot(): PdfPageSize {
  current ??= readStored() ?? defaultPageSize(navigator.language);
  return current;
}

function getServerSnapshot(): PdfPageSize {
  return "LETTER";
}

function notify() {
  for (const listener of listeners) listener();
}

// Another tab changing the setting updates this one too.
function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  current = readStored() ?? current;
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

export function setPageSize(size: PdfPageSize): void {
  current = size;
  try {
    window.localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Not remembered after a reload, but still applied now.
  }
  notify();
}

export function usePageSize(): PdfPageSize {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
