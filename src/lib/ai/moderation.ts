import { z } from "zod";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

export const MODERATION_MODEL = "meta-llama/llama-guard-4-12b";

// thorough skips the word pre-check: first publish and share links, where a miss is public.
export type ModerationContext = { source: string; thorough?: boolean };
export type Verdict = { allowed: boolean; categories: string[] };

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
// Llama Guard 4 ids: S3 sex-related crimes, S4 child sexual exploitation, S12 sexual content.
const BLOCKED_CATEGORIES: ReadonlySet<string> = new Set(["S3", "S4", "S12"]);
const TIMEOUT_MS = 6_000;
const MAX_TOKENS = 32;
const CHUNK_CHARS = 8_000;
const PARALLEL_CHUNKS = 4;

const ALLOWED: Verdict = { allowed: true, categories: [] };

// Only text with sexual words reaches the safety model, so normal writing pays no delay or cost.
const SEXUAL_WORDS =
  /\b(?:sex(?:ual\w*|y|t\w*)?|nsfw|porn\w*|xxx|nude\w*|naked|erotic\w*|orgasm\w*|genital\w*|penis\w*|vagina\w*|breasts?|nipples?|masturbat\w*|fetish\w*|bdsm|kink\w*|horny|arous\w*|intercourse|blowjob\w*|handjob\w*|dick\w*|cock\w*|puss(?:y|ies)|boobs?|tits?|anal|onlyfans|camgirl\w*|webcam\w*|escort\w*|stripper\w*|stripclub\w*|hooker\w*|prostitut\w*|incest\w*|rape\w*|molest\w*|pedo\w*|underage|hentai|seduc\w*|lust\w*|slut\w*|whore\w*)\b/i;

export function mightBeSexual(text: string): boolean {
  return SEXUAL_WORDS.test(text);
}

const VERDICT = /^(safe|unsafe)\b([\s\S]*)$/i;
const CATEGORY = /\bS\d{1,2}\b/g;

const ReplySchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullish() }).nullish() }))
    .min(1),
});

export function parseVerdict(content: string): Verdict | null {
  const match = VERDICT.exec(content.trim());
  if (!match) return null;
  if (match[1]!.toLowerCase() === "safe") return ALLOWED;
  const categories = [...new Set(match[2]!.toUpperCase().match(CATEGORY) ?? [])];
  if (categories.length === 0) return null;
  return { allowed: !categories.some((id) => BLOCKED_CATEGORIES.has(id)), categories };
}

export function textsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (value && typeof value === "object") return Object.values(value).flatMap(textsOf);
  return [];
}

function chunksOf(text: string): string[] {
  const piece = new RegExp(`[\\s\\S]{1,${CHUNK_CHARS}}`, "g");
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n").flatMap((line) => line.match(piece) ?? [])) {
    if (current && current.length + line.length + 1 > CHUNK_CHARS) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

function failureReason(error: unknown): string {
  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return "timeout";
  }
  if (error instanceof SyntaxError) return "malformed";
  return error instanceof TypeError ? "network" : "unexpected";
}

async function classify(
  text: string,
  apiKey: string,
  context: ModerationContext,
): Promise<Verdict | null> {
  const unavailable = (detail: Record<string, string | number>): null => {
    log.warn("moderation.unavailable", { source: context.source, ...detail });
    return null;
  };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        messages: [{ role: "user", content: text }],
        temperature: 0,
        max_tokens: MAX_TOKENS,
        provider: { data_collection: "deny" },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return unavailable({ status: res.status });
    const reply = ReplySchema.safeParse(await res.json());
    const verdict = reply.success
      ? parseVerdict(reply.data.choices[0]!.message?.content ?? "")
      : null;
    return verdict ?? unavailable({ reason: "malformed" });
  } catch (error) {
    return unavailable({ reason: failureReason(error) });
  }
}

// Fails open: a safety-model outage must not break writing or publishing.
export async function checkContent(
  texts: readonly string[],
  context: ModerationContext,
): Promise<Verdict> {
  const apiKey = env().OPENROUTER_API_KEY;
  const text = texts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  if (!text || !apiKey) return ALLOWED;
  if (!context.thorough && !mightBeSexual(text)) return ALLOWED;

  const chunks = chunksOf(text);
  const verdicts: Verdict[] = [];
  for (let start = 0; start < chunks.length; start += PARALLEL_CHUNKS) {
    const batch = chunks.slice(start, start + PARALLEL_CHUNKS);
    const results = await Promise.all(batch.map((chunk) => classify(chunk, apiKey, context)));
    verdicts.push(...results.filter((verdict): verdict is Verdict => verdict !== null));
    if (verdicts.some((verdict) => !verdict.allowed)) break;
  }

  const categories = [...new Set(verdicts.flatMap((verdict) => verdict.categories))].sort();
  const allowed = verdicts.every((verdict) => verdict.allowed);
  const fields = { source: context.source, categories: categories.join(",") };
  if (!allowed) log.warn("moderation.blocked", fields);
  else if (categories.length > 0) log.info("moderation.flagged", fields);
  return { allowed, categories };
}
