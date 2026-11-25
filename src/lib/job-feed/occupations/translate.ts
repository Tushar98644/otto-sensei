import { foldCase } from "@/lib/tailor/tokens";
import DE from "./langs/de";
import ES from "./langs/es";
import FR from "./langs/fr";
import PT from "./langs/pt";

// Job titles in Spanish, Portuguese, French and German read as the English the title rules know
// ("Analista de Dados Sênior" is "senior data analyst"). JobBERT-v2 reads English only (docs/matching.md).

export type TitleTable = {
  // Words and phrases that name the job; "engineer|engineering" gives the form used as a qualifier.
  // A "~" value is a word English spells the same way: it is read only in a title already foreign.
  heads: Readonly<Record<string, string>>;
  // Words and phrases that qualify it; "" drops the word.
  words: Readonly<Record<string, string>>;
  // Level words, moved to the front ("" drops one, like "Pleno").
  ranks: Readonly<Record<string, string>>;
  // Words that join the job to what it is about ("de", "für").
  joins: readonly string[];
  // Long words read as a known word plus the job ("Softwareentwickler").
  compounds?: boolean;
};

export const TITLE_TABLES: Readonly<Record<"es" | "pt" | "fr" | "de", TitleTable>> = {
  es: ES,
  pt: PT,
  fr: FR,
  de: DE,
};

type Kind = "head" | "word" | "rank" | "join" | "other";
// marker: the word is this language's own; moved: it reads differently in English; size: title words read.
type Unit = {
  kind: Kind;
  out: string;
  alt: string;
  marker: boolean;
  moved: boolean;
  size: number;
};

type Lexicon = {
  entries: Map<string, Unit>;
  longest: number;
  suffixes: [string, Unit][];
  compounds: boolean;
};

const SHARED_RANKS: Readonly<Record<string, string>> = {
  senior: "senior",
  sr: "sr",
  junior: "junior",
  jr: "jr",
  lead: "lead",
  principal: "principal",
  staff: "staff",
};

const GENDER =
  /\(\s*(?:[mwfdhxi]|gn|div|all genders?|tous genres|todos os g[eê]neros)(?:\s*[/|,]\s*(?:[mwfdhxi]|gn|div))*\s*\)|(?<![\p{L}])(?:[mwfh]\s*\/\s*[mwfdhx](?:\s*\/\s*[mwfdhx])?)(?![\p{L}])/giu;
// Inclusive endings: "Entwickler:in", "Desarrollador/a", "Engenheiro(a)", "Développeur·se".
const ENDINGS =
  /(?<=\p{L})(?:[:*_/]innen|[:*_/]in|\(in\)|\/(?:a|as|o|os|e|ne|se|euse|ice|rice)|\((?:a|as|o|e|ne|se|euse|ice|rice)\)|[·.](?:e|ne|se|euse|ice|rice|es)(?=\s|$))(?![\p{L}])/gu;
const BINNEN_I = /(?<=\p{Ll})In(?:nen)?(?![\p{L}])/gu;
// "Gesundheits- und Krankenpfleger" shares its last word.
const SHARED_ENDING = /(?<=\p{L})-\s+(?=(?:und|oder|et|ou|y|e)\s)/gu;
const SPLIT = /(\s+[-–—|/•·]+\s+|\s*[,;:|•·]\s*|\s*[()[\]{}]\s*|\s+[-–—]|[-–—]\s+)/u;
const TOKEN = /[\p{L}\p{N}+#.]+(?:'[\p{L}\p{N}]*)?/gu;

const fold = (text: string) => foldCase(text.replaceAll("ß", "ss"));

type Token = { text: string; accented: boolean };

// French elisions stand alone ("d'affaires" is "d'" and "affaires"); hyphens split words.
function tokensOf(text: string): Token[] {
  const out: Token[] = [];
  for (const [raw] of text.replaceAll("’", "'").matchAll(TOKEN)) {
    for (const piece of raw.split(/(?<=^(?:[dlj]|qu)')/i)) {
      const clean = piece.replace(/^\.+|\.+$/g, "");
      if (!clean) continue;
      const folded = fold(clean);
      out.push({ text: folded, accented: folded !== clean.toLowerCase() });
    }
  }
  return out;
}

const keyOf = (phrase: string) =>
  tokensOf(phrase.replaceAll("-", " "))
    .map((token) => token.text)
    .join(" ");

function lexiconOf(table: TitleTable): Lexicon {
  const entries = new Map<string, Unit>();
  const add = (kind: Kind, source: Readonly<Record<string, string>>) => {
    for (const [phrase, value] of Object.entries(source)) {
      const key = keyOf(phrase);
      const weak = value.startsWith("~");
      const [out = "", alt = out] = (weak ? value.slice(1) : value).split("|");
      const moved = out !== key;
      if (!entries.has(key))
        entries.set(key, { kind, out, alt, marker: moved && !weak, moved, size: 1 });
    }
  };
  add("head", table.heads);
  add("rank", table.ranks);
  add("rank", SHARED_RANKS);
  add("word", table.words);
  for (const join of table.joins) {
    const key = keyOf(join);
    if (!entries.has(key))
      entries.set(key, { kind: "join", out: "", alt: "", marker: false, moved: false, size: 1 });
  }
  let longest = 1;
  for (const key of entries.keys()) longest = Math.max(longest, key.split(" ").length);
  const suffixes = [...entries]
    .filter(([key, unit]) => !key.includes(" ") && key.length >= 4 && unit.kind !== "join")
    .sort((a, b) => b[0].length - a[0].length);
  return { entries, longest, suffixes, compounds: table.compounds ?? false };
}

const LEXICONS: readonly Lexicon[] = Object.values(TITLE_TABLES).map(lexiconOf);

const other = (text: string): Unit => ({
  kind: "other",
  out: text,
  alt: text,
  marker: false,
  moved: false,
  size: 0,
});

function lookup(word: string, lexicon: Lexicon): Unit[] | null {
  const unit = lexicon.entries.get(word);
  return unit && unit.kind !== "join" ? [{ ...unit }] : null;
}

function compound(word: string, lexicon: Lexicon, depth = 0): Unit[] | null {
  for (const [suffix, unit] of lexicon.suffixes) {
    if (word.length < suffix.length + 3 || !word.endsWith(suffix)) continue;
    const prefix = word.slice(0, -suffix.length);
    const front =
      lookup(prefix, lexicon) ??
      (prefix.endsWith("s") ? lookup(prefix.slice(0, -1), lexicon) : null) ??
      (depth === 0 ? compound(prefix, lexicon, 1) : null);
    if (front) return [...front.map((part) => ({ ...part, size: 0 })), { ...unit }];
    if (unit.marker) return [other(prefix), { ...unit }];
  }
  return null;
}

// "Softwareentwicklerin" is "Softwareentwickler": the feminine ending, then the parts.
function wordParts(word: string, lexicon: Lexicon): Unit[] | null {
  const forms = word.length > 6 && word.endsWith("in") ? [word, word.slice(0, -2)] : [word];
  for (const form of forms) {
    const found = lookup(form, lexicon) ?? compound(form, lexicon);
    if (found) return found;
  }
  return null;
}

// The form a table lists for a feminine one: "ingeniera", "directrice", "infirmière".
const FEMININE: readonly (readonly [RegExp, string])[] = [
  [/ora$/, "or"],
  [/a$/, "o"],
  [/a$/, "e"],
  [/euse$/, "eur"],
  [/rice$/, "eur"],
  [/iere$/, "ier"],
  [/enne$/, "en"],
  [/e$/, ""],
];

function masculine(word: string, lexicon: Lexicon): Unit[] | null {
  if (word.length < 5) return null;
  for (const [ending, swap] of FEMININE) {
    if (!ending.test(word)) continue;
    const found = lookup(word.replace(ending, swap), lexicon);
    if (found) return found;
  }
  return null;
}

function unitsOf(tokens: readonly Token[], lexicon: Lexicon): Unit[] {
  const units: Unit[] = [];
  let i = 0;
  while (i < tokens.length) {
    let size = Math.min(lexicon.longest, tokens.length - i);
    for (; size >= 1; size--) {
      const slice = tokens.slice(i, i + size);
      const unit = lexicon.entries.get(slice.map((token) => token.text).join(" "));
      if (!unit) continue;
      // An accent marks the word as this language's even when English spells it alike ("Sênior").
      const accented = unit.kind !== "join" && slice.some((token) => token.accented);
      units.push({
        ...unit,
        marker: unit.marker || accented,
        moved: unit.moved || accented,
        size,
      });
      break;
    }
    if (size >= 1) {
      i += size;
      continue;
    }
    const token = tokens[i]!;
    const parts = lexicon.compounds
      ? wordParts(token.text, lexicon)
      : masculine(token.text, lexicon)?.map((unit) => ({
          ...unit,
          marker: unit.marker || token.accented,
          moved: unit.moved || token.accented,
        }));
    units.push(...(parts ?? [other(token.text)]));
    i += 1;
  }
  return units;
}

const known = (unit: Unit | undefined) =>
  unit !== undefined && (unit.kind === "head" || unit.kind === "word");

// A part reads as this language when a word is its own, or "de" joins a job to a known word.
function isForeign(units: readonly Unit[]): boolean {
  return units.some(
    (unit, i) =>
      unit.marker ||
      (unit.kind === "join" &&
        known(units[i - 1]) &&
        known(units[i + 1]) &&
        (units[i - 1]!.kind === "head" || units[i + 1]!.kind === "head")),
  );
}

// Words the title keeps as written stay in their order; translated ones flip to English order.
function inEnglishOrder(units: readonly Unit[]): string {
  const chunks: string[][] = [];
  let run: string[] | null = null;
  for (const unit of units) {
    const text = unit.kind === "head" ? unit.alt : unit.out;
    if (!text) continue;
    if (unit.moved) {
      run = null;
      chunks.push([text]);
    } else if (run) run.push(text);
    else {
      run = [text];
      chunks.push(run);
    }
  }
  return chunks
    .reverse()
    .map((chunk) => chunk.join(" "))
    .join(" ");
}

function segments(units: readonly Unit[]): Unit[][] {
  const out: Unit[][] = [[]];
  for (const unit of units) {
    if (unit.kind === "join") out.push([]);
    else out[out.length - 1]!.push(unit);
  }
  return out.filter((segment) => segment.length > 0);
}

const body = (units: readonly Unit[]) =>
  segments(units).reverse().map(inEnglishOrder).filter(Boolean);

// Jobs that name a stage of training read after the job they're in ("Stagiaire Développeur").
const TRAINING = new Set([
  "intern",
  "internship",
  "apprentice",
  "apprenticeship",
  "working student",
]);

// The job word goes last, its qualifiers before it, level words first: "Ingeniero de Software Senior"
// is "senior software engineer"; a "head of" job keeps its subject after it.
function englishPart(units: readonly Unit[]): string {
  const ranks = units.filter((unit) => unit.kind === "rank" && unit.out).map((unit) => unit.out);
  const heads = units.filter((unit) => unit.kind === "head");
  const main = heads.find((unit) => !TRAINING.has(unit.out)) ?? heads[0];
  const training = heads.filter((unit) => unit !== main && TRAINING.has(unit.out));
  const rest = units.filter((unit) => unit.kind !== "rank" && !training.includes(unit));
  if (!main) return [...ranks, ...body(rest)].join(" ");
  const at = rest.indexOf(main);
  const lead = rest
    .slice(0, at)
    .filter((unit) => unit.kind !== "join")
    .map((unit) => (unit.kind === "head" ? unit.alt : unit.out))
    .filter(Boolean);
  const after = body(rest.slice(at + 1));
  const words = main.out.endsWith(" of")
    ? [...ranks, main.out, ...lead, ...after]
    : [...ranks, ...lead, ...after, main.out];
  return [...words, ...training.map((unit) => unit.out)].join(" ").replace(/\s+/g, " ").trim();
}

const cache = new Map<string, string>();
const CACHE_MAX = 20_000;

// The title in English words when it is written in another language; else the title as given.
export function englishTitle(title: string): string {
  const seen = cache.get(title);
  if (seen !== undefined) return seen;
  const result = translate(title);
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(title, result);
  return result;
}

// Each language reads the title; the one that knows most of its words wins.
function translate(title: string): string {
  const pieces = title
    .replace(GENDER, " ")
    .replace(ENDINGS, "")
    .replace(BINNEN_I, "")
    .replace(SHARED_ENDING, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(SPLIT);
  let best: { text: string; score: number } | null = null;
  for (const lexicon of LEXICONS) {
    const parts = pieces.map((piece, i) =>
      i % 2 === 1 ? null : unitsOf(tokensOf(piece), lexicon),
    );
    if (!parts.some((units) => units && isForeign(units))) continue;
    let score = 0;
    // A part in English words stays as written; the title's other parts can still read "Stage" as French.
    const text = pieces
      .map((piece, i) => {
        const units = parts[i];
        if (!units || !(isForeign(units) || units.some((unit) => unit.moved))) return piece;
        for (const unit of units)
          score += (unit.kind === "other" ? 0 : unit.size) + (unit.marker ? 1 : 0);
        return englishPart(units);
      })
      .join("")
      .trim();
    if (!best || score > best.score) best = { text, score };
  }
  return best?.text ?? title;
}
