// Per instance and best-effort: for beacons, where a database write per call would cost more than abuse does.
const MAX_KEYS = 10_000;

const windows = new Map<string, { start: number; count: number }>();

export function burstAllowed(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const start = Math.floor(now / windowMs) * windowMs;
  const entry = windows.get(key);
  if (entry && entry.start === start) {
    entry.count += 1;
    return entry.count <= limit;
  }
  if (windows.size >= MAX_KEYS) windows.clear();
  windows.set(key, { start, count: 1 });
  return true;
}

export function resetBurstLimitsForTests(): void {
  windows.clear();
}
