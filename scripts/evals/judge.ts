import { z } from "zod";
import { BudgetError } from "./cost";
import type { Rubric, Scale } from "./suite";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const ATTEMPTS = 4;
const RETRY_MS = 2_000;
export const JUDGE_MAX_TOKENS = 400;
export const JUDGE_REPLY_TOKENS = 150;

export const DEFAULT_SCALE: Scale = {
  1: "unusable: wrong, invented, harmful, or ignores the task",
  2: "poor: major problems the person would have to fix before using it",
  3: "acceptable: usable, with clear flaws",
  4: "good: small issues only",
  5: "excellent: what a careful expert would hand over",
};

export type Verdict = { score: number; scores: Record<string, number>; why: string };

export type JudgeResult = { verdict: Verdict | null; error: string | null };

export type JudgeRequest = {
  apiKey: string;
  model: string;
  rubric: Rubric;
  input: string;
  output: string;
  hide: readonly string[];
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
};

export function judgeSystem(rubric: Rubric): string {
  const scale = rubric.scale ?? DEFAULT_SCALE;
  const levels = ([5, 4, 3, 2, 1] as const).map((level) => `${level} = ${scale[level]}`);
  const criteria = rubric.criteria.map(
    (criterion) => `- ${criterion.id}: ${criterion.description}`,
  );
  const shape = rubric.criteria.map((criterion) => `"${criterion.id}": <1-5>`).join(", ");
  return [
    "You grade one output of a resume and job-search assistant, as a strict and fair expert reviewer.",
    `The assistant's task: ${rubric.task}`,
    `Score the OUTPUT on each criterion from 1 to 5:\n${levels.join("\n")}`,
    `Criteria:\n${criteria.join("\n")}`,
    "Judge only from the INPUT and OUTPUT given. Longer is not better. Anything stated that the input does not support counts against it.",
    `Reply with JSON only: {"scores": {${shape}}, "why": "<at most 25 words: the biggest problem, or what makes it strong>"}`,
  ].join("\n\n");
}

export function judgeUser(input: string, output: string): string {
  return `INPUT\n${input}\n\nOUTPUT\n${output}`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The judge must not know which model wrote the output: drop its id and its short name.
export function blind(text: string, models: readonly string[]): string {
  const names = [
    ...new Set(models.flatMap((model) => [model, model.split("/").at(-1) ?? ""])),
  ].filter((name) => name.length >= 3);
  names.sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const pattern = new RegExp(names.map(escapeRegExp).join("|"), "gi");
  return text.replace(pattern, "[hidden]");
}

const ReplySchema = z.object({
  scores: z.record(z.string(), z.number()),
  why: z.string().default(""),
});

export function parseVerdict(content: string, rubric: Rubric): Verdict | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let json: unknown;
  try {
    json = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = ReplySchema.safeParse(json);
  if (!parsed.success) return null;
  const scores: Record<string, number> = {};
  for (const { id } of rubric.criteria) {
    const score = parsed.data.scores[id];
    if (score === undefined || !Number.isInteger(score) || score < 1 || score > 5) return null;
    scores[id] = score;
  }
  const values = Object.values(scores);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { score: Math.round(mean * 100) / 100, scores, why: parsed.data.why.trim() };
}

const ChatSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullish() }).nullish() }))
    .nullish(),
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function judge(request: JudgeRequest): Promise<JudgeResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const wait = request.wait ?? sleep;
  const body = JSON.stringify({
    model: request.model,
    max_tokens: JUDGE_MAX_TOKENS,
    temperature: 0,
    // Haiku thinks by default, and the thinking alone can use up max_tokens.
    reasoning: { enabled: false },
    usage: { include: true },
    messages: [
      { role: "system", content: blind(judgeSystem(request.rubric), request.hide) },
      { role: "user", content: blind(judgeUser(request.input, request.output), request.hide) },
    ],
  });
  let error = "no answer";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await wait(RETRY_MS * attempt);
    let res: Response;
    try {
      res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${request.apiKey}`,
          "content-type": "application/json",
          "x-title": "Otto evals judge",
        },
        body,
      });
    } catch (thrown) {
      if (thrown instanceof BudgetError) return { verdict: null, error: "budget" };
      error = "network error";
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      error = `HTTP ${res.status}`;
      continue;
    }
    if (!res.ok) return { verdict: null, error: `HTTP ${res.status}` };
    const parsed = ChatSchema.safeParse(await res.json().catch(() => null));
    const content = parsed.success ? (parsed.data.choices?.[0]?.message?.content ?? "") : "";
    const verdict = parseVerdict(content, request.rubric);
    return verdict ? { verdict, error: null } : { verdict: null, error: "unreadable verdict" };
  }
  return { verdict: null, error };
}
