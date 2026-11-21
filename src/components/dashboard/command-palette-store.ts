"use client";

import { useSyncExternalStore } from "react";

// Shared with menus outside the dashboard shell, which offer Search only where a palette is mounted.
let open = false;
let hosts = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const onServer = () => false;
const noChanges = () => () => {};

export function setCommandPaletteOpen(next: boolean): void {
  open = next && hosts > 0;
  notify();
}

export function openCommandPalette(): void {
  setCommandPaletteOpen(true);
}

export function registerCommandPalette(): () => void {
  hosts += 1;
  notify();
  return () => {
    hosts = Math.max(0, hosts - 1);
    if (hosts === 0) open = false;
    notify();
  };
}

export function useCommandPaletteOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, onServer);
}

export function useCommandPaletteAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => hosts > 0, onServer);
}

export function isApplePlatform(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function applePlatform(): boolean {
  const agent = navigator as Navigator & { userAgentData?: { platform?: string } };
  return isApplePlatform(agent.userAgentData?.platform || navigator.platform || navigator.userAgent);
}

export function commandPaletteShortcut(apple: boolean): string {
  return apple ? "⌘K" : "Ctrl K";
}

export function useCommandPaletteShortcut(): string {
  return useSyncExternalStore(
    noChanges,
    () => commandPaletteShortcut(applePlatform()),
    () => "",
  );
}

type ShortcutKey = {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
};

// Ctrl+K on a Mac deletes to the end of the line in text fields, so Macs use only ⌘K.
export function isPaletteShortcut(event: ShortcutKey, apple: boolean): boolean {
  if (event.isComposing || event.altKey || event.shiftKey) return false;
  const modifier = apple ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!modifier) return false;
  const key = event.key.toLowerCase();
  // Non-Latin layouts report their own letter, so the physical K key counts there.
  return key === "k" || (!/^[a-z]$/.test(key) && event.code === "KeyK");
}
