import { AsyncLocalStorage } from "node:async_hooks";

type Meter = { tokens: number };

const meters = new AsyncLocalStorage<Meter>();

// `settle` must not throw: it runs after `work` threw too, and would replace its outcome.
export async function metered<T>(
  work: () => Promise<T>,
  settle: (tokens: number) => Promise<void>,
): Promise<T> {
  const meter: Meter = { tokens: 0 };
  try {
    return await meters.run(meter, work);
  } finally {
    await settle(meter.tokens);
  }
}

export function noteTokens(tokens: number): void {
  const meter = meters.getStore();
  if (meter && Number.isFinite(tokens) && tokens > 0) meter.tokens += Math.round(tokens);
}
