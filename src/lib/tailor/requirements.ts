import { clip, clipWords, oneLine } from "@/lib/ai/text";
import type {
  RequirementImportance,
  RequirementSource,
  TailorRequirement,
} from "@/lib/ai/types";
import type { Resume } from "@/lib/resume/schema";
import { snippetAround } from "./evidence";
import { findTermIn, termKey } from "./keywords";
import { foldCase, textTokens, type Token } from "./tokens";

// Screener AI grades one qualification at a time, so a row is "proven" only when a real line shows
// it, never because the model says so.

export const MAX_REQUIREMENTS = 16;
const TEXT_CHARS = 140;
const TERM_CHARS = 60;
const MAX_TERMS = 4;
// Longer than this it's a description, not a name a recruiter types into a search box.
const MAX_TERM_WORDS = 5;
const QUOTE_CHARS = 300;
const ASK_CHARS = 160;
// Two words ("built APIs") match too much by accident to count as a quote.
const MIN_QUOTE_WORDS = 3;
// Lines this long are cut around the match, so a row shows the proof, not a paragraph.
const LINE_CHARS = 200;

const SOURCES: ReadonlySet<string> = new Set<RequirementSource>(["wording", "structure", "guess"]);
// "required" is the one off-spec answer that plainly means must.
const MUST_VALUES: ReadonlySet<string> = new Set(["must", "required"]);
const LEADING_MARKER = /^[\s\-–—•*·]+/u;
const WORDS = /[\p{L}\p{N}]+/gu;
const ELLIPSIS = /\s*(?:\.{3}|…)\s*/u;

export type RawRequirement = {
  text: string;
  importance: string;
  source: string;
  terms: readonly string[];
  quote: string;
  ask: string;
};

export type ProofStatus = "proven" | "listed" | "missing";

export type ProofLine = {
  // "Senior Engineer at Acme Payments, line 2", "Summary".
  place: string;
  // Cut around the match when it's long.
  text: string;
  // So the UI can jump to that line in the editor.
  bulletId: string | null;
};

export type Proof = {
  status: ProofStatus;
  // The proving line or the Skills line; null when missing.
  line: ProofLine | null;
  // quote: the model's quote was found word for word. added: a line the person wrote for it.
  via: "term" | "quote" | "added" | null;
};

export type RequirementStatus = ProofStatus | "declined";

export type RequirementRow = TailorRequirement & { status: RequirementStatus; proof: Proof };

export type ProvenCount = { proven: number; total: number };
export type ScreenerCounts = { must: ProvenCount; nice: ProvenCount };

export type ScreenerOptions = {
  // Requirements the person said they don't have. Ignored once the resume proves one anyway.
  declined?: ReadonlySet<string>;
  // They prove a kind of experience; a named tool still has to be named in the line.
  linked?: ReadonlyMap<string, string>;
};

type Line = ProofLine & { full: string; tokens: Token[]; words: string[] };
type ResumeLines = { shown: Line[]; listed: Line[] };

function wordsOf(text: string): string[] {
  return foldCase(text).match(WORDS) ?? [];
}

function cleanTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of terms) {
    const term = clip(oneLine(value), TERM_CHARS);
    const key = termKey(term);
    if (!key || seen.has(key) || term.split(" ").length > MAX_TERM_WORDS) continue;
    seen.add(key);
    out.push(term);
    if (out.length === MAX_TERMS) break;
  }
  return out;
}

function cleanAsk(ask: string, text: string, terms: readonly string[]): string {
  const question = clipWords(oneLine(ask), ASK_CHARS);
  if (/[\p{L}].*\?$/u.test(question)) return question;
  const [term] = terms;
  if (term) return `Have you used ${term}?`;
  // "Strong writing" reads as "strong writing" mid-sentence; "SQL" and "Go" keep their capitals.
  const phrase = text.replace(/^\p{Lu}(?=\p{Ll})/u, (letter) => letter.toLowerCase());
  return `Do you have experience with ${phrase.replace(/[.?!]+$/u, "")}?`;
}

function readSource(value: string): RequirementSource {
  const source = value.trim().toLowerCase();
  return SOURCES.has(source) ? (source as RequirementSource) : "guess";
}

// Anything unclear is a guess, and a guess is never a must-have. Repeats merge into the first,
// keeping the stronger importance. Must-haves first, each group in post order.
export function normalizeRequirements(raw: readonly RawRequirement[]): TailorRequirement[] {
  const kept: Omit<TailorRequirement, "id">[] = [];
  const byText = new Map<string, number>();
  const byTerms = new Map<string, number>();
  for (const item of raw) {
    const text = clipWords(oneLine(item.text).replace(LEADING_MARKER, ""), TEXT_CHARS);
    const textKey = termKey(text);
    if (!textKey) continue;
    const source = readSource(item.source);
    const isMust = source !== "guess" && MUST_VALUES.has(item.importance.trim().toLowerCase());
    const importance: RequirementImportance = isMust ? "must" : "nice";
    const terms = cleanTerms(item.terms);
    const termsKey = terms.length ? terms.map(termKey).sort().join("|") : null;

    const repeat = byText.get(textKey) ?? (termsKey ? byTerms.get(termsKey) : undefined);
    if (repeat !== undefined) {
      const first = kept[repeat];
      if (first && isMust && first.importance === "nice") {
        kept[repeat] = { ...first, importance, source };
      }
      continue;
    }
    byText.set(textKey, kept.length);
    if (termsKey) byTerms.set(termsKey, kept.length);
    kept.push({
      text,
      importance,
      source,
      terms,
      // A named tool is proven by its name, never by the model's opinion of a line.
      quote: terms.length ? "" : clipWords(oneLine(item.quote), QUOTE_CHARS),
      ask: cleanAsk(item.ask, text, terms),
    });
  }
  const ordered = [
    ...kept.filter((item) => item.importance === "must"),
    ...kept.filter((item) => item.importance === "nice"),
  ].slice(0, MAX_REQUIREMENTS);
  return ordered.map((item, index) => ({ id: `r${index + 1}`, ...item }));
}

function makeLine(full: string, place: string, bulletId: string | null): Line | null {
  const text = oneLine(full);
  if (!text) return null;
  return { place, text, full: text, bulletId, tokens: textTokens(text), words: wordsOf(text) };
}

function joined(parts: readonly string[], separator: string): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator);
}

function entryLabel(title: string, company: string): string {
  return joined([title, company], " at ");
}

// Skills lists and the headline only list a name, so they can't prove one.
function resumeLines(resume: Resume): ResumeLines {
  const shown: Line[] = [];
  const listed: Line[] = [];
  const push = (list: Line[], line: Line | null) => {
    if (line) list.push(line);
  };
  const bullets = (items: Resume["experience"][number]["bullets"], label: string) => {
    let position = 0;
    for (const bullet of items) {
      if (!bullet.text.trim()) continue;
      position += 1;
      push(shown, makeLine(bullet.text, `${label}, line ${position}`, bullet.id));
    }
  };
  for (const job of resume.experience) {
    bullets(job.bullets, entryLabel(job.title, job.company) || "Experience");
  }
  for (const project of resume.projects) bullets(project.bullets, project.name.trim() || "Project");
  for (const school of resume.education) {
    bullets(school.bullets, joined([school.degree, school.school], ", ") || "Education");
  }
  for (const job of resume.experience) {
    push(shown, makeLine(entryLabel(job.title, job.company), "Job title", null));
  }
  for (const cert of resume.certifications) {
    push(shown, makeLine(joined([cert.name, cert.issuer], ", "), "Certifications", null));
  }
  for (const school of resume.education) {
    const degree = joined([school.degree, school.field, school.school], ", ");
    push(shown, makeLine(degree, "Education", null));
  }
  for (const paragraph of resume.summary.split(/\n+/)) {
    push(shown, makeLine(paragraph, "Summary", null));
  }
  for (const group of resume.skills) {
    const items = joined(group.items, ", ");
    const label = group.label.trim().replace(/:$/, "");
    push(listed, makeLine(items, label ? `Skills: ${label}` : "Skills", null));
  }
  push(listed, makeLine(resume.basics.headline, "Headline", null));
  return { shown, listed };
}

function shortened(line: Line, start: number, end: number): ProofLine {
  const text = line.full.length > LINE_CHARS ? snippetAround(line.full, start, end) : line.full;
  return { place: line.place, text, bulletId: line.bulletId };
}

function termIn(line: Line, terms: readonly string[]): ProofLine | null {
  for (const term of terms) {
    const match = findTermIn(line.full, line.tokens, term);
    if (!match.found) continue;
    if (line.full.length <= LINE_CHARS) {
      return { place: line.place, text: line.full, bulletId: line.bulletId };
    }
    // The evidence snippet is already cut around the match.
    return { place: line.place, text: match.evidence, bulletId: line.bulletId };
  }
  return null;
}

function indexOfRun(words: readonly string[], run: readonly string[], from: number): number {
  for (let i = from; i + run.length <= words.length; i++) {
    if (run.every((word, offset) => words[i + offset] === word)) return i;
  }
  return -1;
}

// Word for word, ignoring case, accents and punctuation. A quote the model shortened with "…"
// must have every piece in the same line, in order.
function quoteIn(line: Line, quote: string): boolean {
  const pieces = quote.split(ELLIPSIS).map(wordsOf).filter((piece) => piece.length > 0);
  if (pieces.reduce((sum, piece) => sum + piece.length, 0) < MIN_QUOTE_WORDS) return false;
  let from = 0;
  for (const piece of pieces) {
    const at = indexOfRun(line.words, piece, from);
    if (at === -1) return false;
    from = at + piece.length;
  }
  return true;
}

function quoteLine(line: Line, quote: string): ProofLine {
  const lower = foldCase(line.full);
  const first = wordsOf(quote)[0] ?? "";
  const start = Math.max(0, lower.indexOf(first));
  return shortened(line, start, start + first.length);
}

function proofIn(
  lines: ResumeLines,
  requirement: TailorRequirement,
  linked: string | undefined,
): Proof {
  const { terms, quote } = requirement;
  if (terms.length > 0) {
    for (const line of lines.shown) {
      const found = termIn(line, terms);
      if (found) return { status: "proven", line: found, via: "term" };
    }
    for (const line of lines.listed) {
      const found = termIn(line, terms);
      if (found) return { status: "listed", line: found, via: "term" };
    }
    return { status: "missing", line: null, via: null };
  }
  if (linked) {
    const line = lines.shown.find((item) => item.bulletId === linked);
    if (line) return { status: "proven", line: shortened(line, 0, 0), via: "added" };
  }
  if (quote) {
    const line = lines.shown.find((item) => quoteIn(item, quote));
    if (line) return { status: "proven", line: quoteLine(line, quote), via: "quote" };
  }
  return { status: "missing", line: null, via: null };
}

export function findProof(resume: Resume, requirement: TailorRequirement): Proof {
  return proofIn(resumeLines(resume), requirement, undefined);
}

// So a model can't "prove" a requirement with a line it made up.
export function withVerifiedQuotes(
  resume: Resume,
  requirements: readonly TailorRequirement[],
): TailorRequirement[] {
  const { shown } = resumeLines(resume);
  return requirements.map((requirement) =>
    requirement.quote && !shown.some((line) => quoteIn(line, requirement.quote))
      ? { ...requirement, quote: "" }
      : requirement,
  );
}

// Lines in a job that prove a must-have, so reordering can put them at the top of their job.
export function mustProofBulletIds(
  resume: Resume,
  requirements: readonly TailorRequirement[],
): Set<string> {
  const must = requirements.filter((requirement) => requirement.importance === "must");
  const ids = new Set<string>();
  for (const job of resume.experience) {
    for (const bullet of job.bullets) {
      const line = makeLine(bullet.text, "", bullet.id);
      if (!line) continue;
      const proves = must.some((requirement) =>
        requirement.terms.length > 0
          ? termIn(line, requirement.terms) !== null
          : requirement.quote !== "" && quoteIn(line, requirement.quote),
      );
      if (proves) ids.add(bullet.id);
    }
  }
  return ids;
}

export function screenerRows(
  resume: Resume,
  requirements: readonly TailorRequirement[],
  options: ScreenerOptions = {},
): RequirementRow[] {
  const lines = resumeLines(resume);
  return requirements.map((requirement) => {
    const proof = proofIn(lines, requirement, options.linked?.get(requirement.id));
    const declined = proof.status === "missing" && options.declined?.has(requirement.id) === true;
    return { ...requirement, proof, status: declined ? "declined" : proof.status };
  });
}

export function screenerCounts(rows: readonly RequirementRow[]): ScreenerCounts {
  const count = (importance: RequirementImportance): ProvenCount => {
    const group = rows.filter((row) => row.importance === importance);
    return { proven: group.filter((row) => row.status === "proven").length, total: group.length };
  };
  return { must: count("must"), nice: count("nice") };
}

export function screenerHeadline({ must, nice }: ScreenerCounts): string {
  const parts = [
    must.total > 0 ? `Must-haves proven: ${must.proven} of ${must.total}` : null,
    nice.total > 0 ? `Nice-to-haves: ${nice.proven} of ${nice.total}` : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" · ");
}
