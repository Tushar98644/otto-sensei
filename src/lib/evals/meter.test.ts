import { describe, expect, it, vi } from "vitest";
import { Budget, BudgetError, type Price } from "../../../scripts/evals/cost";
import { createMeter } from "../../../scripts/evals/meter";

const CHAT = "https://openrouter.ai/api/v1/chat/completions";
const PRICE: Price = { prompt: 1, completion: 2 };

type Usage = { prompt_tokens?: number; completion_tokens?: number; cost?: number };

function setup(options: { maxUsd?: number; liftPriceCap?: boolean; usage?: Usage } = {}) {
  const realFetch = vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify({ choices: [], usage: options.usage ?? {} }), { status: 200 }),
  );
  const budget = new Budget(options.maxUsd ?? 1);
  const meter = createMeter({
    realFetch,
    budget,
    priceOf: (model) => (model === "lab/known" ? PRICE : null),
    fallbackPrice: { prompt: 100, completion: 100 },
    liftPriceCap: options.liftPriceCap,
  });
  const sentBody = (call = 0) =>
    JSON.parse(String(realFetch.mock.calls[call]![1]!.body)) as Record<string, unknown>;
  return { realFetch, budget, meter, sentBody };
}

const post = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

describe("createMeter", () => {
  it("only lets OpenRouter through", async () => {
    const { meter, realFetch } = setup();
    await expect(meter.fetch("https://us.i.posthog.com/batch")).rejects.toThrow(
      "blocked us.i.posthog.com",
    );
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("passes other OpenRouter requests through untouched and unbilled", async () => {
    const { meter, realFetch, budget } = setup();
    await meter.fetch("https://openrouter.ai/api/v1/models");
    expect(realFetch).toHaveBeenCalledWith("https://openrouter.ai/api/v1/models", undefined);
    expect(budget.spentUsd).toBe(0);
  });

  it("bills OpenRouter's own cost when it sends one, and asks for it", async () => {
    const { meter, budget, sentBody } = setup({
      usage: { prompt_tokens: 1_000, completion_tokens: 100, cost: 0.0123 },
    });
    const { calls } = await meter.scope(() => meter.fetch(CHAT, post({ model: "lab/known" })));
    expect(sentBody()).toMatchObject({ model: "lab/known", usage: { include: true } });
    expect(budget.spentUsd).toBeCloseTo(0.0123);
    expect(calls).toEqual([
      { model: "lab/known", status: 200, inputTokens: 1_000, outputTokens: 100, usd: 0.0123 },
    ]);
  });

  it("prices tokens itself when there is no cost: listed price, then the sent cap, then the fallback", async () => {
    const usage = { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 };
    const listed = setup({ usage });
    await listed.meter.fetch(CHAT, post({ model: "lab/known" }));
    expect(listed.budget.spentUsd).toBe(3);

    const capped = setup({ usage, maxUsd: 1_000 });
    const cap = { prompt: 0.1, completion: 0.3 };
    await capped.meter.fetch(CHAT, post({ model: "lab/new", provider: { max_price: cap } }));
    expect(capped.budget.spentUsd).toBeCloseTo(0.4);

    const unknown = setup({ usage, maxUsd: 1_000 });
    await unknown.meter.fetch(CHAT, post({ model: "lab/new" }));
    expect(unknown.budget.spentUsd).toBe(200);
  });

  it("keeps the product's price cap unless asked to lift it", async () => {
    const body = { model: "lab/known", provider: { sort: "price", max_price: { prompt: 0.1 } } };
    const kept = setup();
    await kept.meter.fetch(CHAT, post(body));
    expect(kept.sentBody().provider).toEqual(body.provider);

    const lifted = setup({ liftPriceCap: true });
    await lifted.meter.fetch(CHAT, post(body));
    expect(lifted.sentBody().provider).toEqual({ sort: "price" });
  });

  it("refuses chat calls once the budget is spent", async () => {
    const { meter, budget, realFetch } = setup({ maxUsd: 0.01 });
    budget.add(0.01);
    await expect(meter.fetch(CHAT, post({ model: "lab/known" }))).rejects.toBeInstanceOf(
      BudgetError,
    );
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("remembers a budget refusal in its scope even when the caller swallows the error", async () => {
    const { meter, budget } = setup({ maxUsd: 0.01 });
    const fine = await meter.scope(() => meter.fetch(CHAT, post({ model: "lab/known" })));
    expect(fine.refused).toBe(false);

    budget.add(0.01);
    const hidden = await meter.scope(async () => {
      await meter.fetch(CHAT, post({ model: "lab/known" })).catch(() => null);
      return "fallback";
    });
    expect(hidden).toMatchObject({ outcome: { status: "fulfilled" }, refused: true });
  });

  it("keeps each scope's calls apart, even when they overlap", async () => {
    const { meter } = setup({ usage: { cost: 0.001 } });
    const [a, b] = await Promise.all([
      meter.scope(async () => {
        await meter.fetch(CHAT, post({ model: "lab/a" }));
        await meter.fetch(CHAT, post({ model: "lab/a" }));
      }),
      meter.scope(() => meter.fetch(CHAT, post({ model: "lab/b" }))),
    ]);
    expect(a.calls.map((call) => call.model)).toEqual(["lab/a", "lab/a"]);
    expect(b.calls.map((call) => call.model)).toEqual(["lab/b"]);
  });

  it("reports a failed scope instead of throwing", async () => {
    const { meter } = setup();
    const { outcome } = await meter.scope(() => {
      throw new Error("boom");
    });
    expect(outcome).toMatchObject({ status: "rejected", reason: new Error("boom") });
  });
});
