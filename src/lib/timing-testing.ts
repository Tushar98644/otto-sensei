import { onTestFinished, vi } from "vitest";

function spentSince(started: NodeJS.CpuUsage): number {
  const { user, system } = process.threadCpuUsage(started);
  return (user + system) / 1_000;
}

// CPU time this thread spent, in ms; unlike wall-clock time, a busy machine can't stretch it by making the test wait for a core.
export function cpuMs(run: () => unknown): number {
  const started = process.threadCpuUsage();
  run();
  return spentSince(started);
}

export async function cpuMsAsync(run: () => Promise<unknown>): Promise<number> {
  const started = process.threadCpuUsage();
  await run();
  return spentSince(started);
}

// vi.waitFor options for a condition behind a dynamic import, which a busy machine can hold up for seconds.
export const WAIT_FOR_IMPORT = { timeout: 20_000 };

// Rate limits count per fixed clock window, so a loop that ran across a window's end would start a fresh count.
export function freezeClock(): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  onTestFinished(() => {
    vi.useRealTimers();
  });
}
