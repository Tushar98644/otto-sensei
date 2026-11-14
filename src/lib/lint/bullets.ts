import { listBullets } from "@/lib/resume/ops";
import { extrasOf, type Resume } from "@/lib/resume/schema";
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
  DUPLICATE_MESSAGE,
  dutyMessage,
  firstPersonMessage,
  NO_METHOD_MESSAGE,
  NO_RESULT_MESSAGE,
  noNumberMessage,
  passiveMessage,
  stockMessage,
  tenseMessage,
  TOO_SHORT_MESSAGE,
  tooLongMessage,
  vagueMessage,
  weakStartMessage,
} from "./bullets/messages";
import { CONTENT, countWords, findPhrases, opener, tokenize, type Span } from "./bullets/tokens";
import { DUTY_INDEX, NUMBER_WORDS, STOCK_INDEX, WEAK_START_INDEX } from "./bullets/words";
import { punctuationIssues, type EntryLine } from "./punctuation";
import type { LintContext, LintIssue, LintIssueId, LintSeverity, ResumeLint } from "./types";

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
  const tokens = tokenize(text);

  const found: Ranked[] = [];
  const claimed: Span[] = [];
  const add = (id: LintIssueId, message: string, match: string | null, position: number) => {
    found.push({ issue: { id, severity: SEVERITY[id], message, match }, position });
  };
  const claim = (
    id: LintIssueId,
    spans: readonly Span[],
    message: (first: Span, free: readonly Span[]) => string,
  ) => {
    const free = spans.filter((span) => !claimed.some((taken) => overlaps(span, taken)));
    const [first] = free;
    if (!first) return false;
    claimed.push(...free);
    add(id, message(first, free), first.text, first.start);
    return true;
  };

  const duty = claim("duty", opener(tokens, text, DUTY_INDEX), dutyMessage);
  claim("weak-start", opener(tokens, text, WEAK_START_INDEX), weakStartMessage);
  claim("stock-phrase", findPhrases(tokens, text, STOCK_INDEX), stockMessage);
  claim("first-person", firstPerson(tokens, text), firstPersonMessage);
  if (context.ended) {
    const tense = tenseSpan(tokens, text);
    if (tense) claim("tense", [tense.span], (span) => tenseMessage(span, tense.past));
  }
  claim("passive", passives(tokens, text), passiveMessage);
  claim("vague", vagueSpans(tokens, text), vagueMessage);

  const hasNumber = NUMERIC.test(text) || tokens.some((token) => NUMBER_WORDS.has(token.lower));
  if (context.kind === "work") {
    const marker = hasNumber ? null : resultMarker(tokens, text);
    if (!hasNumber && !marker && !duty) add("no-result", NO_RESULT_MESSAGE, null, WHOLE_LINE);
    if (marker) add("no-number", noNumberMessage(marker), null, WHOLE_LINE);
    if (hasNumber && lacksMethod(tokens, text)) {
      add("no-method", NO_METHOD_MESSAGE, null, WHOLE_LINE);
    }
  }

  const words = countWords(text);
  const chars = text.trim().length;
  if (words > TOO_LONG_WORDS || chars > TOO_LONG_CHARS) {
    const size = words > TOO_LONG_WORDS ? `${words} words` : `${chars} characters`;
    add("too-long", tooLongMessage(size), null, WHOLE_LINE);
  } else if (context.kind === "work" && words < TOO_SHORT_WORDS) {
    add("too-short", TOO_SHORT_MESSAGE, null, WHOLE_LINE);
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
  const key = `${context.kind}|${context.ended ? 1 : 0}|${text}`;
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

const PRESENT = /^(?:present|current|now|today|ongoing|to date)$/i;
const WORK_EXTRAS: ReadonlySet<string> = new Set(["volunteering"]);

export function hasEnded(endDate: string): boolean {
  const end = endDate.trim();
  return end !== "" && !PRESENT.test(end);
}

export function lintContexts(resume: Resume): ReadonlyMap<string, LintContext> {
  const contexts = new Map<string, LintContext>();
  for (const job of resume.experience) {
    const context: LintContext = { kind: "work", ended: hasEnded(job.endDate) };
    for (const bullet of job.bullets) contexts.set(bullet.id, context);
  }
  for (const project of resume.projects) {
    for (const bullet of project.bullets) contexts.set(bullet.id, WORK);
  }
  for (const school of resume.education) {
    for (const bullet of school.bullets) contexts.set(bullet.id, OTHER);
  }
  for (const section of extrasOf(resume)) {
    const context = WORK_EXTRAS.has(section.kind) ? WORK : OTHER;
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
  const contexts = lintContexts(resume);
  const refs = listBullets(resume);
  const lines = refs.map((ref) => ({
    id: ref.bulletId,
    ...analyzeOnce(ref.text, contexts.get(ref.bulletId) ?? WORK),
  }));
  const duplicates = findDuplicates(lines.map((line) => line.words));
  const punctuation = new Map<string, LintIssue>();
  for (const group of entryGroups(refs)) {
    for (const [id, issue] of punctuationIssues(group)) punctuation.set(id, issue);
  }
  const totals = { bullets: 0, withIssues: 0, withNumbers: 0, highSeverity: 0 };
  const entries: [string, LintIssue[]][] = [];
  lines.forEach((line, index) => {
    const duplicate: LintIssue = {
      id: "duplicate",
      severity: SEVERITY.duplicate,
      message: DUPLICATE_MESSAGE,
      match: null,
    };
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

export function lintSummary(summary: string): LintIssue[] {
  return analyzeOnce(summary, OTHER).issues.filter(
    (issue) => issue.id === "stock-phrase" || issue.id === "first-person",
  );
}
