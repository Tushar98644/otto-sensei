import { AsyncLocalStorage } from "node:async_hooks";

// So the route that knows the account can charge the AI budget without helpers passing usage up.

type Meter = { tokens: number };

const meters = new AsyncLocalStorage<Meter>();

// `settle` also runs when `work` threw, and must not throw: it would replace the work's own
// outcome.
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

/** Outside metered() nothing is counted. */
export function noteTokens(tokens: number): void {
  const meter = meters.getStore();
  if (meter && Number.isFinite(tokens) && tokens > 0) meter.tokens += Math.round(tokens);
}
