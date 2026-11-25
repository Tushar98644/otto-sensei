import type { ContentLang } from "@/lib/i18n/languages";
import { resumeLang } from "@/lib/resume/lang";
import { listBullets } from "@/lib/resume/ops";
import { extrasOf, type Resume } from "@/lib/resume/schema";
import { PRESENT_WORDS } from "@/lib/resume/date-words";
import {
  firstPerson,
  lacksMethod,
  passives,
  resultMarker,
  tenseSpan,
  TOO_SHORT_WORDS,
  vagueSpans,
} from "./bullets/checks";
import { findDuplicates } from "./bullets/duplicates";
import {
  DUPLICATE,
  dutyMessage,
  firstPersonMessage,
  NO_METHOD,
  NO_RESULT,
  noNumberMessage,
  passiveMessage,
  stockMessage,
  tenseMessage,
  TOO_SHORT,
  tooLongMessage,
  vagueMessage,
  weakStartMessage,
} from "./bullets/messages";
import { CONTENT, countWords, findPhrases, opener, tokenize, type Span } from "./bullets/tokens";
import { makeIssue } from "./issue";
import { lintLanguage, runs, type LintLanguage } from "./lang";
import { punctuationIssues, type EntryLine } from "./punctuation";
import type {
  LintContext,
  LintIssue,
  LintIssueId,
  LintMessage,
  LintSeverity,
  ResumeLint,
} from "./types";

const TOO_LONG_WORDS = 32;
const TOO_LONG_CHARS = 220;

const SEVERITY: Record<LintIssueId, LintSeverity> = {
  "stock-phrase": "high",
  duty: "high",
  "no-result": "high",
  "weak-start": "high",
  "first-person": "high",
  "too-long": "high",
  "no-number": "low",
  "no-method": "low",
  tense: "low",
  "too-short": "low",
  passive: "low",
  vague: "low",
  duplicate: "low",
  punctuation: "low",
};
const PRIORITY: readonly LintIssueId[] = [
  "duty",
  "weak-start",
  "stock-phrase",
  "first-person",
  "no-result",
  "too-long",
  "tense",
  "passive",
  "vague",
  "no-number",
  "no-method",
  "too-short",
  "duplicate",
  "punctuation",
];
const WHOLE_LINE = Number.MAX_SAFE_INTEGER;

const WORK: LintContext = { kind: "work" };
const OTHER: LintContext = { kind: "other" };

const NUMERIC = /[\p{N}%\p{Sc}]/u;

type Analysis = { issues: LintIssue[]; hasContent: boolean; hasNumber: boolean; words: string[] };
type Ranked = { issue: LintIssue; position: number };

function rank({ issue, position }: Ranked): [number, number, number] {
  return [issue.severity === "high" ? 0 : 1, position, PRIORITY.indexOf(issue.id)];
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

function analyze(text: string, context: LintContext = WORK): Analysis {
  if (!CONTENT.test(text)) return { issues: [], hasContent: false, hasNumber: false, words: [] };
  const pack: LintLanguage = lintLanguage(context.lang);
  const tokens = pack.elisions ? tokenize(text, true) : tokenize(text);
  const skips = pack.openerSkips;

  const found: Ranked[] = [];
  const claimed: Span[] = [];
  const add = (id: LintIssueId, message: LintMessage, match: string | null, position: number) => {
    found.push({ issue: makeIssue(id, SEVERITY[id], message, match), position });
  };
  const claim = (
    id: LintIssueId,
    spans: readonly Span[],
    message: (first: Span, free: readonly Span[]) => LintMessage,
  ) => {
    if (!runs(id, pack)) return false;
    const free = spans.filter((span) => !claimed.some((taken) => overlaps(span, taken)));
    const [first] = free;
    if (!first) return false;
    claimed.push(...free);
    add(id, message(first, free), first.text, first.start);
    return true;
  };
  const phrases = (index: LintLanguage["stock"], first: boolean) =>
    !index ? [] : first ? opener(tokens, text, index, skips) : findPhrases(tokens, text, index);

  const duty = claim("duty", phrases(pack.duty, true), dutyMessage);
  claim("weak-start", phrases(pack.weakStart, true), weakStartMessage);
  claim("stock-phrase", phrases(pack.stock, false), stockMessage);
  claim("first-person", firstPerson(tokens, text, pack), (span) => firstPersonMessage(span, pack));
  if (context.ended) {
    const tense = tenseSpan(tokens, text, pack);
    if (tense) claim("tense", [tense.span], (span) => tenseMessage(span, tense.past));
  }
  claim("passive", passives(tokens, text, pack), passiveMessage);
  claim("vague", vagueSpans(tokens, text, pack), (span) => vagueMessage(span, pack));

  const hasNumber =
    NUMERIC.test(text) || tokens.some((token) => pack.numberWords?.has(token.lower) === true);
  if (context.kind === "work") {
    const marker = hasNumber || !runs("no-result", pack) ? null : resultMarker(tokens, text, pack);
    if (!hasNumber && !marker && !duty && runs("no-result", pack)) {
      add("no-result", NO_RESULT, null, WHOLE_LINE);
    }
    if (marker && runs("no-number", pack))
      add("no-number", noNumberMessage(marker), null, WHOLE_LINE);
    if (hasNumber && runs("no-method", pack) && lacksMethod(tokens, text, pack)) {
      add("no-method", NO_METHOD, null, WHOLE_LINE);
    }
  }

  const words = countWords(text);
  const chars = text.trim().length;
  if (words > TOO_LONG_WORDS || chars > TOO_LONG_CHARS) {
    add("too-long", tooLongMessage(words, chars, TOO_LONG_WORDS), null, WHOLE_LINE);
  } else if (context.kind === "work" && words < TOO_SHORT_WORDS) {
    add("too-short", TOO_SHORT, null, WHOLE_LINE);
  }

  found.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return {
    issues: found.map((entry) => entry.issue),
    hasContent: true,
    hasNumber,
    words: tokens.map((token) => token.lower),
  };
}

const MAX_ANALYSES = 1_000;
const analyses = new Map<string, Analysis>();

// Typing re-lints every line, so the browser keeps recent results; servers keep no resume text.
function analyzeOnce(text: string, context: LintContext): Analysis {
  if (typeof window === "undefined") return analyze(text, context);
  const lang = context.lang && context.lang !== "en" ? `${context.lang}|` : "";
  const key = `${lang}${context.kind}|${context.ended ? 1 : 0}|${text}`;
  const hit = analyses.get(key);
  if (hit) {
    analyses.delete(key);
    analyses.set(key, hit);
    return hit;
  }
  const fresh = analyze(text, context);
  analyses.set(key, fresh);
  if (analyses.size > MAX_ANALYSES) analyses.delete(analyses.keys().next().value as string);
  return fresh;
}

export function lintBullet(text: string, context: LintContext = WORK): LintIssue[] {
  return analyze(text, context).issues;
}

const PRESENT = new RegExp(
  `^(?:present|current|now|today|ongoing|to date|${PRESENT_WORDS})$`,
  "iu",
);
const WORK_EXTRAS: ReadonlySet<string> = new Set(["volunteering"]);

export function hasEnded(endDate: string): boolean {
  const end = endDate.trim();
  return end !== "" && !PRESENT.test(end);
}

export function lintContexts(resume: Resume): ReadonlyMap<string, LintContext> {
  const lang = resumeLang(resume);
  const work: LintContext = lang === "en" ? WORK : { kind: "work", lang };
  const other: LintContext = lang === "en" ? OTHER : { kind: "other", lang };
  const contexts = new Map<string, LintContext>();
  for (const job of resume.experience) {
    const ended = hasEnded(job.endDate);
    const context: LintContext = lang === "en" ? { kind: "work", ended } : { ...work, ended };
    for (const bullet of job.bullets) contexts.set(bullet.id, context);
  }
  for (const project of resume.projects) {
    for (const bullet of project.bullets) contexts.set(bullet.id, work);
  }
  for (const school of resume.education) {
    for (const bullet of school.bullets) contexts.set(bullet.id, other);
  }
  for (const section of extrasOf(resume)) {
    const context = WORK_EXTRAS.has(section.kind) ? work : other;
    for (const item of section.items) {
      for (const bullet of item.bullets) contexts.set(bullet.id, context);
    }
  }
  return contexts;
}

function entryGroups(refs: ReturnType<typeof listBullets>): EntryLine[][] {
  const groups = new Map<string, EntryLine[]>();
  for (const ref of refs) {
    if (ref.section !== "experience" && ref.section !== "projects") continue;
    const key = `${ref.section}:${ref.parentId}`;
    const group = groups.get(key) ?? [];
    group.push({ id: ref.bulletId, text: ref.text });
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function lintResume(resume: Resume): ResumeLint {
  const lang = resumeLang(resume);
  const contexts = lintContexts(resume);
  const fallback: LintContext = lang === "en" ? WORK : { kind: "work", lang };
  const refs = listBullets(resume);
  const lines = refs.map((ref) => ({
    id: ref.bulletId,
    ...analyzeOnce(ref.text, contexts.get(ref.bulletId) ?? fallback),
  }));
  const duplicates = findDuplicates(lines.map((line) => line.words));
  const punctuation = new Map<string, LintIssue>();
  for (const group of entryGroups(refs)) {
    for (const [id, issue] of punctuationIssues(group, lang)) punctuation.set(id, issue);
  }
  const totals = { bullets: 0, withIssues: 0, withNumbers: 0, highSeverity: 0 };
  const entries: [string, LintIssue[]][] = [];
  lines.forEach((line, index) => {
    const duplicate = makeIssue("duplicate", SEVERITY.duplicate, DUPLICATE, null);
    const pattern = punctuation.get(line.id);
    const issues = [
      ...line.issues,
      ...(duplicates.has(index) ? [duplicate] : []),
      ...(pattern ? [pattern] : []),
    ];
    entries.push([line.id, issues]);
    if (!line.hasContent) return;
    totals.bullets += 1;
    if (issues.length > 0) totals.withIssues += 1;
    if (line.hasNumber) totals.withNumbers += 1;
    if (issues.some((issue) => issue.severity === "high")) totals.highSeverity += 1;
  });
  // fromEntries defines own properties, so an id like "__proto__" can't touch the prototype.
  return { byBullet: Object.fromEntries(entries), totals };
}

export function lintSummary(summary: string, lang: ContentLang = "en"): LintIssue[] {
  return analyzeOnce(summary, lang === "en" ? OTHER : { kind: "other", lang }).issues.filter(
    (issue) => issue.id === "stock-phrase" || issue.id === "first-person",
  );
}
