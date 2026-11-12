import { DAY_MS, MINUTE_MS } from "@/lib/time";

export const TRANSCRIBE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  // The browser stops at 120 s; the slack covers its timer.
  maxSeconds: 125,
  burst: { calls: 20, windowMs: 10 * MINUTE_MS },
  daily: { calls: 150, windowMs: DAY_MS },
} as const;
