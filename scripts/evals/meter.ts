import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import { BudgetError, usdOf, type Budget, type Price } from "./cost";

const OPENROUTER_HOST = "openrouter.ai";
const CHAT_PATH = "/api/v1/chat/completions";

export type CallRecord = {
  model: string;
  status: number;
  inputTokens: number;
  outputTokens: number;
  usd: number;
};

export type Scoped<T> = {
  outcome: PromiseSettledResult<T>;
  calls: CallRecord[];
  refused: boolean;
};

type ScopeLog = { calls: CallRecord[]; refused: boolean };

export type Meter = {
  fetch: typeof fetch;
  scope: <T>(work: () => Promise<T>) => Promise<Scoped<T>>;
};

export type MeterOptions = {
  realFetch: typeof fetch;
  budget: Budget;
  priceOf: (model: string) => Price | null;
  fallbackPrice: Price;
  liftPriceCap?: boolean;
};

const BodySchema = z.looseObject({
  model: z.string().default(""),
  provider: z.looseObject({ max_price: z.unknown().optional() }).optional(),
});

const MaxPriceSchema = z.object({ prompt: z.number(), completion: z.number() });

const ReplySchema = z.object({
  usage: z
    .object({
      prompt_tokens: z.number().nullish(),
      completion_tokens: z.number().nullish(),
      cost: z.number().nullish(),
    })
    .nullish(),
});

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

async function costOf(
  res: Response,
  price: Price,
): Promise<Pick<CallRecord, "inputTokens" | "outputTokens" | "usd">> {
  const parsed = ReplySchema.safeParse(
    await res
      .clone()
      .json()
      .catch(() => null),
  );
  const usage = parsed.success ? parsed.data.usage : null;
  const tokens = {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
  return { ...tokens, usd: usage?.cost ?? usdOf(tokens, price) };
}

// Every request in an eval goes through here: OpenRouter only, counted against the budget.
export function createMeter(options: MeterOptions): Meter {
  const scopes = new AsyncLocalStorage<ScopeLog>();

  const metered = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(urlOf(input));
    if (url.hostname !== OPENROUTER_HOST) {
      throw new TypeError(`An eval only talks to OpenRouter; blocked ${url.hostname}`);
    }
    if (url.pathname !== CHAT_PATH) return options.realFetch(input, init);
    if (options.budget.exhausted) {
      // Some product code swallows the error and falls back, so the scope remembers the refusal.
      const scope = scopes.getStore();
      if (scope) scope.refused = true;
      throw new BudgetError();
    }

    const raw = typeof init?.body === "string" ? init.body : "{}";
    const body = BodySchema.parse(JSON.parse(raw));
    const sentCap = MaxPriceSchema.safeParse(body.provider?.max_price);
    if (options.liftPriceCap && body.provider) delete body.provider.max_price;
    const price =
      options.priceOf(body.model) ??
      (sentCap.success && !options.liftPriceCap ? sentCap.data : options.fallbackPrice);

    const res = await options.realFetch(url.href, {
      ...init,
      body: JSON.stringify({ ...body, usage: { include: true } }),
    });
    const record = { model: body.model, status: res.status, ...(await costOf(res, price)) };
    options.budget.add(record.usd);
    scopes.getStore()?.calls.push(record);
    return res;
  };

  return {
    fetch: metered as typeof fetch,
    async scope(work) {
      const log: ScopeLog = { calls: [], refused: false };
      try {
        const value = await scopes.run(log, work);
        return { outcome: { status: "fulfilled", value }, calls: log.calls, refused: log.refused };
      } catch (reason) {
        return { outcome: { status: "rejected", reason }, calls: log.calls, refused: log.refused };
      }
    },
  };
}
