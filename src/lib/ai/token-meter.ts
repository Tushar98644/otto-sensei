import { AsyncLocalStorage } from "node:async_hooks";

// Server-only. Adds up the tokens the provider billed for every AI call made inside metered(), so
// the route that knows the account can charge them to its AI budget (src/lib/ai-budget.ts) without
// every AI helper passing usage back up through its result or its errors.

type Meter = { tokens: number };

const meters = new AsyncLocalStorage<Meter>();

/**
 * Runs `work`, then hands `settle` the tokens billed inside it, also when it threw. `settle` must
 * not throw: it would replace the work's own result or error.
 */
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

/** One response's billed tokens. Outside metered() nothing is counted. */
export function noteTokens(tokens: number): void {
  const meter = meters.getStore();
  if (meter && Number.isFinite(tokens) && tokens > 0) meter.tokens += Math.round(tokens);
}
