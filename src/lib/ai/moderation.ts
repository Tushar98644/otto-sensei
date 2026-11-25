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

// Only text with sexual words reaches the safety model; lookarounds skip job words like CockroachDB.
const SEXUAL_WORDS =
  /\b(?:sex(?:ual\w*|y|t(?!ant|et|on|ile|uple)\w*)?|nsfw|porn\w*|(?<!x[\s.()-]*)xxx(?![\s.()-]*x)|nude\w*|naked(?!\s+(?:wines?|eye))|erotic\w*|orgasm\w*|genital\w*|penis\w*|vagina\w*|breasts?(?!\s+(?:cancer|care|health|imaging|screening|surg\w*|oncolog\w*|milk|pump))|nipples?|masturbat\w*|fetish\w*|bdsm|kink(?!o)\w*|horny|arous\w*|intercourse|blowjob\w*|handjob\w*|dick(?!ens|inson|son|ies|ey|erson|['’]s\b)\w*|cock(?!roach|tail|pit|burn|atoo|ney)\w*|puss(?:y|ies)|boobs?|tits?|anal|onlyfans|camgirl\w*|webcam\s*(?:girl|boy|model|show|sex)\w*|(?<!(?:patient|security|police)[\s-])escort(?!ed|ing)\w*|(?<!(?:wire|cable|paint|insulation)[\s-])stripper\w*|stripclub\w*|hooker(?!\s+furniture)\w*|prostitut\w*|incest\w*|rape(?!seed)\w*|molest\w*|pedo(?!met|log|dont)\w*|underage|hentai|seduc\w*|lust(?!r|er)\w*|slut\w*|whore\w*)\b/i;

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

// The same pre-check for Spanish, Portuguese, French and German; none of these is an English word.
const OTHER_LANGUAGES: Record<"es" | "pt" | "fr" | "de", string> = {
  es: [
    "sexo",
    "desnud[oa]s?",
    "desnudez",
    "er[óo]tic[oa]s?",
    "erotismo",
    "penes?",
    "senos",
    "pechos",
    "tetas?",
    "culo",
    "coño",
    "polla",
    "verga",
    "follar",
    "follando",
    "put[ao]s?",
    "zorras?",
    "mamadas?",
    "violaci[óo]n",
    "violador(?:es)?",
    "ped[óo]fil\\p{L}*",
    "pederast\\p{L}*",
    "masturba\\p{L}*",
    "fetiches?",
    "cachond[oa]s?",
  ].join("|"),
  pt: [
    "sexo",
    "nua",
    "nuas",
    "nudez",
    "er[óo]tic[oa]s?",
    "erotismo",
    "p[êe]nis",
    "seios",
    "peitos",
    "bunda",
    "buceta",
    "xoxota",
    "caralho",
    "foder",
    "fodendo",
    "transar",
    "putas?",
    "prostitui\\p{L}*",
    "estupr\\p{L}*",
    "ped[óo]fil\\p{L}*",
    "masturba\\p{L}*",
    "fetiches?",
    "safad[oa]s?",
    "tes[ãa]o",
  ].join("|"),
  fr: [
    "sexe",
    "sexes",
    "sexuel\\p{L}*",
    "sexualit\\p{L}*",
    "nue",
    "nues",
    "nudit[ée]",
    "[ée]rotique\\p{L}*",
    "[ée]rotisme",
    "p[ée]nis",
    "vagin",
    "seins",
    "nichons",
    "chatte",
    "baiser",
    "baise\\p{L}*",
    "branl\\p{L}*",
    "putes?",
    "putain",
    "salopes?",
    "prostitu\\p{L}*",
    "viols?",
    "viol[ée]e?s?",
    "violeurs?",
    "p[ée]doph\\p{L}*",
    "p[ée]doporn\\p{L}*",
    "masturb\\p{L}*",
    "f[ée]tich\\p{L}*",
  ].join("|"),
  de: [
    "sexuell\\p{L}*",
    "sexarbeit\\p{L}*",
    "sexkauf",
    "sexpartner\\p{L}*",
    "sexspielzeug\\p{L}*",
    "sexvideos?",
    "sexfilm\\p{L}*",
    "\\p{L}*porno\\p{L}*",
    "nackt\\p{L}*",
    "erotis\\p{L}*",
    "erotik\\p{L}*",
    "br[üu]ste",
    "titten",
    "busen",
    "muschi",
    "fick(?:en|t|te|st)?",
    "gefickt",
    "geil\\p{L}*",
    "huren?",
    "nutten?",
    "bordell\\p{L}*",
    "vergewaltig\\p{L}*",
    "p[äa]dophil\\p{L}*",
    "kindersch[äa]nder\\p{L}*",
    "masturb\\p{L}*",
    "fetisch\\p{L}*",
    "inzest\\p{L}*",
  ].join("|"),
};
const OTHER_SEXUAL_WORDS = new RegExp(
  `${B}(?:${Object.values(OTHER_LANGUAGES).join("|")})${E}`,
  "iu",
);

export function mightBeSexual(text: string): boolean {
  return SEXUAL_WORDS.test(text) || OTHER_SEXUAL_WORDS.test(text);
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
