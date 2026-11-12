import { z } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import {
  ErrorBodySchema,
  statusFailure,
  thrownFailure,
  type AICallFields,
  type CallFailure,
} from "./errors";
import { checkContent, textsOf } from "./moderation";
import { noteTokens } from "./token-meter";
import { AIError } from "./types";

export type AITask = "structure" | "fix" | "tailor" | "letter" | "answer";
export type Effort = "low" | "medium";

export type StructuredRequest<T> = {
  task: AITask;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: Effort;
  maxTokens?: number;
};

export type RunOptions = { deadlineMs?: number };

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS: Record<AITask, number> = {
  structure: 16_000,
  tailor: 8_000,
  fix: 4_000,
  letter: 4_000,
  answer: 3_000,
};
// Routes have maxDuration = 60 and work around the call, so all attempts share this deadline.
const DEADLINE_MS = 50_000;
// A call cut off at the deadline is still billed, so a retry only starts if it can finish.
const MIN_ATTEMPT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 400;
const MAX_RETRY_WAIT_MS = 4_000;

const ContentSchema = z.union([
  z.string(),
  z.array(z.object({ type: z.string(), text: z.string().nullish() })),
]);

const UsageSchema = z.object({
  prompt_tokens: z.number().nullish(),
  completion_tokens: z.number().nullish(),
  total_tokens: z.number().nullish(),
  prompt_tokens_details: z
    .object({ cached_tokens: z.number().nullish(), cache_write_tokens: z.number().nullish() })
    .nullish(),
  completion_tokens_details: z.object({ reasoning_tokens: z.number().nullish() }).nullish(),
});

const BilledSchema = z.object({
  usage: UsageSchema.pick({ prompt_tokens: true, completion_tokens: true, total_tokens: true }),
});

const ChatResponseSchema = z.object({
  provider: z.string().nullish(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        native_finish_reason: z.string().nullish(),
        message: z
          .object({ content: ContentSchema.nullish(), refusal: z.string().nullish() })
          .nullish(),
      }),
    )
    .nullish(),
  usage: UsageSchema.nullish(),
  error: ErrorBodySchema.nullish(),
});

type ChatResponse = z.infer<typeof ChatResponseSchema>;

type Attempt =
  | { ok: true; response: ChatResponse }
  | { ok: false; failure: CallFailure; retryAfterMs: number | null };

const schemaCache = new WeakMap<z.ZodType, Record<string, unknown>>();

export function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const cached = schemaCache.get(schema);
  if (cached) return cached;
  const json: Record<string, unknown> = {
    ...z.toJSONSchema(schema, { io: "output", unrepresentable: "throw" }),
  };
  // Some providers reject the meta-schema keyword in strict mode.
  delete json.$schema;
  schemaCache.set(schema, json);
  return json;
}

export function modelFor(task: AITask): string {
  const { AI_MODEL, AI_STRUCTURE_MODEL } = env();
  return task === "structure" ? AI_STRUCTURE_MODEL : AI_MODEL;
}

function isClaude(model: string): boolean {
  return model.startsWith("anthropic/");
}

function requestBody<T>(request: StructuredRequest<T>, model: string) {
  const system = isClaude(model)
    ? [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }]
    : request.system;
  return {
    model,
    max_tokens: request.maxTokens ?? MAX_TOKENS[request.task],
    messages: [
      { role: "system", content: system },
      { role: "user", content: request.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: request.task, strict: true, schema: jsonSchemaFor(request.schema) },
    },
    reasoning: { effort: request.effort, exclude: true },
    provider: {
      // Otherwise OpenRouter may pick an endpoint that treats the schema as a hint.
      require_parameters: true,
      // Resume text is personal data: never send it to providers that may train on it.
      data_collection: "deny",
      sort: "price",
      // US$ per million tokens: caps the worst case if the cheapest endpoints are down.
      max_price: AI_MAX_PRICE,
    },
  };
}

export const AI_MAX_PRICE = { prompt: 0.1, completion: 0.25 } as const;

function retryAfterMs(headers: Headers, now: number): number | null {
  const value = headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function nextWait(attempt: number, suggestedMs: number | null, deadline: number): number | null {
  if (suggestedMs !== null && suggestedMs > MAX_RETRY_WAIT_MS) return null;
  const wait = suggestedMs ?? RETRY_BASE_MS * 2 ** (attempt - 1) + Math.random() * 100;
  return deadline - (Date.now() + wait) >= MIN_ATTEMPT_MS ? wait : null;
}

function errorCode(code: number | string | undefined): number {
  const value = typeof code === "number" ? code : Number(code);
  return Number.isInteger(value) && value >= 400 ? value : 502;
}

async function attemptOnce(
  body: string,
  apiKey: string,
  deadline: number,
  fields: AICallFields,
): Promise<Attempt> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    });
  } catch (error) {
    return { ok: false, failure: thrownFailure(error, fields), retryAfterMs: null };
  }

  let raw: string;
  try {
    raw = await res.text();
  } catch (error) {
    // Accepted and still running (and billed) upstream; a retry would pay twice.
    return {
      ok: false,
      failure: { ...thrownFailure(error, fields), retryable: false },
      retryAfterMs: null,
    };
  }
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {}
  noteTokens(billedTokens(json));

  if (!res.ok) {
    const parsed = z.object({ error: ErrorBodySchema }).safeParse(json);
    return {
      ok: false,
      failure: statusFailure(res.status, parsed.success ? parsed.data.error : null, fields),
      retryAfterMs: retryAfterMs(res.headers, Date.now()),
    };
  }

  const parsed = ChatResponseSchema.safeParse(json);
  if (!parsed.success) {
    log.warn("ai.malformed_response", fields);
    const error = new AIError("unavailable", "The AI provider sent an unreadable response");
    return { ok: false, failure: { error, retryable: false }, retryAfterMs: null };
  }
  const { error } = parsed.data;
  if (error) {
    return {
      ok: false,
      failure: statusFailure(errorCode(error.code), error, fields),
      retryAfterMs: retryAfterMs(res.headers, Date.now()),
    };
  }
  if (parsed.data.choices?.[0]?.finish_reason === "error") {
    log.warn("ai.unavailable", { ...fields, status: 200, finishReason: "error" });
    const failure = {
      error: new AIError("unavailable", "The AI model failed mid-answer"),
      retryable: true,
    };
    return { ok: false, failure, retryAfterMs: null };
  }
  return { ok: true, response: parsed.data };
}

export function billedTokens(json: unknown): number {
  const parsed = BilledSchema.safeParse(json);
  if (!parsed.success) return 0;
  const { total_tokens, prompt_tokens, completion_tokens } = parsed.data.usage;
  return total_tokens ?? (prompt_tokens ?? 0) + (completion_tokens ?? 0);
}

function contentText(content: z.infer<typeof ContentSchema> | null | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");
}

// Some providers wrap JSON in a markdown fence even in structured mode.
function parseJson(content: string): unknown {
  const text = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readOutput<T>(response: ChatResponse, schema: z.ZodType<T>, fields: AICallFields): T {
  const choice = response.choices?.[0];
  const detail = { ...fields, provider: response.provider ?? null };
  if (!choice) {
    log.warn("ai.invalid_output", { ...detail, reason: "no_choice" });
    throw new AIError("invalid_output", "The AI model returned no answer");
  }
  const finishReason = choice.finish_reason ?? null;
  if (
    choice.message?.refusal ||
    finishReason === "content_filter" ||
    choice.native_finish_reason === "refusal"
  ) {
    log.warn("ai.refused", { ...detail, finishReason });
    throw new AIError("refused", "The AI model declined this request");
  }
  if (finishReason === "length") {
    log.warn("ai.output_truncated", detail);
    throw new AIError("invalid_output", "The AI model ran out of room before finishing");
  }
  const content = contentText(choice.message?.content);
  const checked = schema.safeParse(content ? parseJson(content) : undefined);
  if (!checked.success) {
    log.warn("ai.invalid_output", { ...detail, finishReason });
    throw new AIError("invalid_output", "The AI model's answer didn't match the expected shape");
  }
  return checked.data;
}

function logUsage(response: ChatResponse, fields: AICallFields, durationMs: number) {
  if (env().NODE_ENV !== "development") return;
  const usage = response.usage;
  log.info("ai.usage", {
    ...fields,
    provider: response.provider ?? null,
    durationMs,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    cacheReadTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
    cacheWriteTokens: usage?.prompt_tokens_details?.cache_write_tokens ?? 0,
  });
}

// Import only sorts the person's own resume; public pages are checked when they're published.
async function screenOutput(task: AITask, output: unknown): Promise<void> {
  if (task === "structure") return;
  const verdict = await checkContent(textsOf(output), { source: `ai.${task}` });
  if (!verdict.allowed) throw new AIError("refused", "The AI answer failed the safety check");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runStructured<T>(
  request: StructuredRequest<T>,
  options: RunOptions = {},
): Promise<T> {
  const apiKey = env().OPENROUTER_API_KEY;
  if (!apiKey) throw new AIError("unavailable", "OPENROUTER_API_KEY is not set");
  const model = modelFor(request.task);
  const fields: AICallFields = { task: request.task, model };
  const deadline = Date.now() + (options.deadlineMs ?? DEADLINE_MS);
  const body = JSON.stringify(requestBody(request, model));

  for (let attempt = 1; ; attempt++) {
    const started = Date.now();
    const outcome = await attemptOnce(body, apiKey, deadline, fields);
    if (outcome.ok) {
      logUsage(outcome.response, fields, Date.now() - started);
      const output = readOutput(outcome.response, request.schema, fields);
      await screenOutput(request.task, output);
      return output;
    }
    const { failure } = outcome;
    const wait =
      failure.retryable && attempt < MAX_ATTEMPTS
        ? nextWait(attempt, outcome.retryAfterMs, deadline)
        : null;
    if (wait === null) {
      if (failure.status === 503) {
        log.error("ai.no_provider", failure.error, { ...fields, attempts: attempt });
      }
      throw failure.error;
    }
    await sleep(wait);
  }
}
