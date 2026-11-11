"use client";

import { useEffect, useEffectEvent } from "react";
import { loadingScreenUp } from "@/components/mascot/otto-loading-screen";
import { browserStorage } from "@/lib/browser-storage";
import { hasSeenTour, markTourSeen, replayRequested, tourDue } from "./seen";
import type { TourName, TourStop } from "./tours";

const START_DELAY_MS = 900;
const RETRY_MS = 1_500;

let active: { name: TourName; stop: () => void } | null = null;
const replayed = new Set<TourName>();

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

    // Only the pending start is cancelled: a running tour outlives the step it moves through.
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [eligible, name]);

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
