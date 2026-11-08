"use client";

import { useEffect, useState } from "react";

// Holds a fast-changing value back until it has stopped changing for `delayMs`. The first value
// shows at once, so lint tips are there on load but don't flicker with every word typed.
export function useSettled<T>(value: T, delayMs: number): T {
  // Wrapped in functions so a value that is itself a function isn't treated as an updater.
  const [settled, setSettled] = useState(() => value);
  useEffect(() => {
    if (Object.is(settled, value)) return;
    const timer = window.setTimeout(() => setSettled(() => value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, settled, delayMs]);
  return settled;
}
