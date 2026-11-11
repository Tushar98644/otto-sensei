"use client";

import { useSyncExternalStore } from "react";
import { readItem, writeItem } from "@/lib/browser-storage";
import { defaultPageSize, isPdfPageSize, type PdfPageSize } from "@/lib/pdf/page-size";

const STORAGE_KEY = "otto-pdf-page-size";
const listeners = new Set<() => void>();
let current: PdfPageSize | null = null;

function readStored(): PdfPageSize | null {
  const value = readItem(STORAGE_KEY);
  return isPdfPageSize(value) ? value : null;
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
  writeItem(STORAGE_KEY, size);
  notify();
}

export function usePageSize(): PdfPageSize {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
