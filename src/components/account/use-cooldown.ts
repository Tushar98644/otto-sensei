"use client";

import { useCallback, useEffect, useState } from "react";

// Whole seconds left on a countdown, plus a function that (re)starts it. Counts against a deadline
// instead of decrementing, so a throttled background tab shows the right number when it wakes up.
export function useCooldown(seconds: number): [remaining: number, start: () => void] {
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const running = remaining > 0;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const start = useCallback(() => {
    const startedAt = Date.now();
    setNow(startedAt);
    setDeadline(startedAt + seconds * 1000);
  }, [seconds]);

  return [remaining, start];
}
