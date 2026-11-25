"use client";

import { useSyncExternalStore } from "react";
import { readItem, writeItem } from "@/lib/browser-storage";
import type { FocusMusicPlayer } from "./engine";

const KEY = "otto-focus-music-v1";
// A key press or a mouse press counts as a gesture at once; a touch only when the finger lifts.
const GESTURES = ["pointerdown", "pointerup", "keydown"] as const;
const GESTURE_OPTIONS = { capture: true, passive: true } as const;
// Long enough to ride out a remount, short enough that leaving the dashboard ends the sound.
const LEAVE_MS = 1_000;
const TOGGLE = "[data-focus-music]";

type Session = { ctx: AudioContext; player: FocusMusicPlayer | null; cancelled: boolean };

let wanted: boolean | null = null;
let session: Session | null = null;
let armed = false;
let leaveTimer: number | undefined;
const listeners = new Set<() => void>();

export function parseFocusMusic(raw: string | null): boolean {
  return raw === "on";
}

export function isFocusMusicOn(): boolean {
  wanted ??= parseFocusMusic(readItem(KEY));
  return wanted;
}

// The context is made inside the gesture itself, since browsers only let a page start sound then.
function play() {
  if (session || typeof AudioContext === "undefined") return;
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ latencyHint: "playback" });
  } catch {
    return;
  }
  const current: Session = { ctx, player: null, cancelled: false };
  session = current;
  void ctx.resume().catch(() => {});
  import("./engine")
    .then(({ startFocusMusic }) => {
      if (current.cancelled) void ctx.close().catch(() => {});
      else current.player = startFocusMusic(ctx);
    })
    .catch(() => {
      if (session === current) session = null;
      void ctx.close().catch(() => {});
    });
}

function halt() {
  const current = session;
  session = null;
  if (!current) return;
  current.cancelled = true;
  current.player?.stop();
}

function onGesture(event: Event) {
  if (event.target instanceof Element && event.target.closest(TOGGLE)) return;
  if ("userActivation" in navigator && !navigator.userActivation.isActive) return;
  disarm();
  if (isFocusMusicOn() && listeners.size > 0) play();
}

function arm() {
  if (armed || session || !isFocusMusicOn()) return;
  armed = true;
  for (const type of GESTURES) window.addEventListener(type, onGesture, GESTURE_OPTIONS);
}

function disarm() {
  if (!armed) return;
  armed = false;
  for (const type of GESTURES) window.removeEventListener(type, onGesture, GESTURE_OPTIONS);
}

export function setFocusMusic(on: boolean): void {
  wanted = on;
  writeItem(KEY, on ? "on" : "off");
  disarm();
  if (on) play();
  else halt();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.clearTimeout(leaveTimer);
  arm();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(() => {
      if (listeners.size > 0) return;
      disarm();
      halt();
    }, LEAVE_MS);
  };
}

// The server can't know the choice, so hydration starts off and the remembered one follows.
export function useFocusMusic(): boolean {
  return useSyncExternalStore(subscribe, isFocusMusicOn, () => false);
}
