import { describe, expect, it, vi } from "vitest";
import { AI_MAX_PRICE } from "@/lib/ai/client";
import { AIError } from "@/lib/ai/types";
import {
  Budget,
  BudgetError,
  cappedPrice,
  fetchPrices,
  tokensOf,
  usdOf,
} from "../../../scripts/evals/cost";

describe("prices", () => {
  it("prices tokens per million", () => {
    expect(
      usdOf({ inputTokens: 1_000_000, outputTokens: 500_000 }, { prompt: 2, completion: 8 }),
    ).toBe(6);
    expect(tokensOf("x".repeat(36))).toBe(10);
  });

  it("never prices a capped product call above the product's cap", () => {
    expect(cappedPrice(undefined)).toEqual(AI_MAX_PRICE);
    expect(cappedPrice({ prompt: 3, completion: 0.01 })).toEqual({
      prompt: AI_MAX_PRICE.prompt,
      completion: 0.01,
    });
  });

  it("reads per-token prices from OpenRouter's model list", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        data: [
          { id: "lab/small", pricing: { prompt: "0.0000002", completion: "0.0000008" } },
          { id: "lab/other", pricing: { prompt: "0.000001", completion: "0.000002" } },
          { id: "lab/free" },
        ],
      }),
    );
    const prices = await fetchPrices(["lab/small", "lab/free"], fetchMock);
    expect(fetchMock).toHaveBeenCalledWith("https://openrouter.ai/api/v1/models");
    expect([...prices.keys()]).toEqual(["lab/small"]);
    expect(prices.get("lab/small")!.prompt).toBeCloseTo(0.2);
    expect(prices.get("lab/small")!.completion).toBeCloseTo(0.8);
  });

  it("fails loudly when the list can't be read", async () => {
    const down = vi.fn<typeof fetch>(async () => new Response("no", { status: 503 }));
    await expect(fetchPrices(["lab/small"], down)).rejects.toThrow("HTTP 503");
  });
});

describe("Budget", () => {
  it("refuses a reservation that would pass the cap, counting what is reserved", () => {
    const budget = new Budget(1);
    expect(budget.reserve(0.6)).toBe(true);
    expect(budget.reserve(0.6)).toBe(false);
    expect(budget.stopped).toBe(true);
    budget.release(0.6);
    expect(budget.reserve(0.6)).toBe(true);
  });

  it("is exhausted once spending reaches the cap", () => {
    const budget = new Budget(0.5);
    budget.add(0.2);
    budget.add(Number.NaN);
    expect(budget.exhausted).toBe(false);
    budget.add(0.3);
    expect(budget.exhausted).toBe(true);
    expect(budget.reserve(0)).toBe(false);
  });

  it("stops the product client without a retry", () => {
    expect(new BudgetError()).toBeInstanceOf(AIError);
  });
});
