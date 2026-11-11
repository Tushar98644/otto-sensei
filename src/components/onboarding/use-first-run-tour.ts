"use client";

import { useEffect, useEffectEvent } from "react";
import { loadingScreenUp } from "@/components/mascot/otto-loading-screen";
import { browserStorage } from "@/lib/browser-storage";
import { hasSeenTour, markTourSeen, replayRequested, tourDue } from "./seen";
import type { TourName, TourStop } from "./tours";

// Long enough for the screen to settle (an upload's own focus move, late layout), short enough to
// still feel like part of arriving.
const START_DELAY_MS = 900;
// While a dialog or menu is open, someone is typing, the loading screen is up, or the tab is in
// the background.
const RETRY_MS = 1_500;

// One tour at a time across the app.
let active: { name: TourName; stop: () => void } | null = null;
// ?tour=1 replays once per page load, not on every step change that follows.
const replayed = new Set<TourName>();

// `prepare` builds the stops when the tour starts (it may load code), or returns null to skip.
export function useFirstRunTour(
  name: TourName,
  eligible: boolean,
  prepare: () => Promise<readonly TourStop[] | null>,
): void {
  const prepareStops = useEffectEvent(prepare);

  useEffect(() => {
    if (!eligible || active) return;
    const storage = browserStorage();
    const replay = replayRequested(window.location.search) && !replayed.has(name);
    if (!tourDue({ seen: hasSeenTour(storage, name), replay })) return;

    let cancelled = false;
    let timer = 0;
    const attempt = async () => {
      if (cancelled || active) return;
      if (busy()) {
        timer = window.setTimeout(() => void attempt(), RETRY_MS);
        return;
      }
      const [stops, runner] = await Promise.all([prepareStops(), import("./run-tour")]);
      if (cancelled || active || !stops || stops.length === 0) return;
      let ended = false;
      const stop = runner.startTour({
        stops,
        onShown: () => {
          replayed.add(name);
          markTourSeen(storage, name);
        },
        onEnd: () => {
          ended = true;
          if (active?.name === name) active = null;
        },
      });
      if (stop && !ended) active = { name, stop };
    };
    timer = window.setTimeout(() => void attempt(), START_DELAY_MS);

    // Only the pending start is cancelled here: a running tour outlives the studio step it moves
    // through. Leaving the page ends it (below).
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [eligible, name]);

  // The page moved on under the tour (the browser's back button still works during it), so its
  // stops no longer exist.
  useEffect(() => {
    if (!eligible && active?.name === name) active.stop();
  }, [eligible, name]);

  useEffect(
    () => () => {
      if (active?.name === name) active.stop();
    },
    [name],
  );
}

function busy(): boolean {
  if (document.visibilityState === "hidden") return true;
  if (loadingScreenUp()) return true;
  if (document.querySelector("dialog[open]")) return true;
  const focused = document.activeElement;
  if (
    focused instanceof HTMLElement &&
    (focused.isContentEditable || focused.matches("input, textarea, select"))
  ) {
    return true;
  }
  try {
    return document.querySelector(":popover-open") !== null;
  } catch {
    // Browsers without the popover API don't know the selector.
    return false;
  }
}
