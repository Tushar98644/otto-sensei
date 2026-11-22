"use client";

import { useEffect, useState } from "react";

export const HOVER_INTENT_MS = 120;

export type IntentHandlers = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
  onPointerDown: () => void;
};

// A pointer crossing a link on its way to another isn't intent, so hover waits; the rest act at once.
export function hoverIntent(delayMs = HOVER_INTENT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  const handlers = (onIntent: () => void): IntentHandlers => {
    const now = () => {
      cancel();
      onIntent();
    };
    return {
      onMouseEnter: () => {
        cancel();
        timer = setTimeout(now, delayMs);
      },
      onMouseLeave: cancel,
      onFocus: now,
      onTouchStart: now,
      onPointerDown: now,
    };
  };
  return { cancel, handlers };
}

const SETTLE_DELAY_MS = 1_000;
const SETTLE_TIMEOUT_MS = 3_000;

// True a moment after the page opens, once the browser is idle, so prefetching never competes with it.
export function useSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let idle: number | undefined;
    const settle = () => setSettled(true);
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(settle, { timeout: SETTLE_TIMEOUT_MS });
      } else settle();
    }, SETTLE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, []);
  return settled;
}

export function useHoverIntent(onIntent: () => void): IntentHandlers {
  const [intent] = useState(() => hoverIntent());
  useEffect(() => intent.cancel, [intent]);
  return intent.handlers(onIntent);
}
