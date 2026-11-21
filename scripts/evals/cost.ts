import { z } from "zod";
import { AI_MAX_PRICE } from "@/lib/ai/client";
import { AIError } from "@/lib/ai/types";

// US$ per million tokens, as OpenRouter and AI_MAX_PRICE quote them.
export type Price = { prompt: number; completion: number };

export type Tokens = { inputTokens: number; outputTokens: number };

const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";

export const DEFAULT_JUDGE = "anthropic/claude-haiku-5.5";

// Offline guesses for --dry-run (the judge's from scripts/match-eval.ts); a real run reads live prices.
export const OFFLINE_PRICES: Readonly<Record<string, Price>> = {
  [DEFAULT_JUDGE]: { prompt: 0.1, completion: 0.5 },
};

// Charged when a response carries no cost and the model's price is unknown, so spend is never undercounted.
export const UNKNOWN_PRICE: Price = { prompt: 15, completion: 75 };

export const tokensOf = (text: string) => Math.ceil(text.length / 3.6);

export function usdOf(tokens: Tokens, price: Price): number {
  return (tokens.inputTokens * price.prompt + tokens.outputTokens * price.completion) / 1e6;
}

// The product sends AI_MAX_PRICE as provider.max_price, so no product call costs more than it.
export function cappedPrice(listed: Price | undefined): Price {
  if (!listed) return { ...AI_MAX_PRICE };
  return {
    prompt: Math.min(listed.prompt, AI_MAX_PRICE.prompt),
    completion: Math.min(listed.completion, AI_MAX_PRICE.completion),
  };
}

const PerToken = z.union([z.string(), z.number()]).transform((value) => Number(value) * 1e6);

const ModelsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      pricing: z.object({ prompt: PerToken, completion: PerToken }).nullish(),
    }),
  ),
});

export async function fetchPrices(
  models: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, Price>> {
  const res = await fetchImpl(MODELS_ENDPOINT);
  if (!res.ok) throw new Error(`OpenRouter's model list answered HTTP ${res.status}`);
  const parsed = ModelsSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new Error("OpenRouter's model list was unreadable");
  const wanted = new Set(models);
  const prices = new Map<string, Price>();
  for (const entry of parsed.data.data) {
    const pricing = entry.pricing;
    if (!wanted.has(entry.id) || !pricing) continue;
    if (!(pricing.prompt >= 0 && pricing.completion >= 0)) continue;
    prices.set(entry.id, { prompt: pricing.prompt, completion: pricing.completion });
  }
  return prices;
}

// An AIError, so the product's client stops at once instead of retrying.
export class BudgetError extends AIError {
  constructor() {
    super("unavailable", "Stopped: the eval budget (--max-usd) is spent");
    this.name = "BudgetError";
  }
}

export class Budget {
  spentUsd = 0;
  stopped = false;
  private reservedUsd = 0;

  constructor(readonly maxUsd: number) {}

  get exhausted(): boolean {
    return this.spentUsd >= this.maxUsd;
  }

  // A case reserves its estimate before it starts, so parallel cases can't overshoot the cap together.
  reserve(usd: number): boolean {
    if (this.exhausted || this.spentUsd + this.reservedUsd + usd > this.maxUsd) {
      this.stopped = true;
      return false;
    }
    this.reservedUsd += usd;
    return true;
  }

  release(usd: number): void {
    this.reservedUsd = Math.max(0, this.reservedUsd - usd);
  }

  add(usd: number): void {
    if (Number.isFinite(usd) && usd > 0) this.spentUsd += usd;
  }
}
