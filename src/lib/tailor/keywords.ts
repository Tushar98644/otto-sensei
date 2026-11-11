import { resumeToText } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { snippetAround } from "./evidence";
import { termTokens, textTokens, type Token } from "./tokens";

export type KeywordMatch = {
  term: string;
  found: boolean;
  evidence: string;
};

export type KeywordCoverage = {
  matches: KeywordMatch[];
  matched: number;
  total: number;
  percent: number;
};

const MAX_TERMS = 100;
const PARENTHETICAL = /\(([^()]*)\)/g;

type TermForm = { surface: string; target: string; tokens: string[] };

function termForms(term: string): TermForm[] {
  const inner = [...term.matchAll(PARENTHETICAL)].map((match) => match[1] ?? "");
  return [term.replace(PARENTHETICAL, " "), ...inner]
    .map((variant) => variant.trim())
    .filter(Boolean)
    .map((surface) => {
      const tokens = termTokens(surface);
      return { surface, target: tokens.join(""), tokens };
    })
    .filter((form) => form.target !== "");
}

function joinTokens(tokens: readonly string[]): string {
  return tokens.reduce(
    (out, token) => (out === "" || token.startsWith(".") ? out + token : `${out} ${token}`),
    "",
  );
}

export function isPlausible(text: string, start: number, end: number, surface: string): boolean {
  const span = text.slice(start, end);
  if (!/^\p{L}{1,2}$/u.test(span)) return true;
  const capitalized =
    span === span.toUpperCase() || span === "Go" || (span === surface && /\p{Lu}/u.test(span));
  if (!capitalized) return false;
  return span.length > 1 || !/[-‐‑.'’]/u.test(text.charAt(start - 1) + text.charAt(end));
}

function locate(text: string, tokens: readonly Token[], form: TermForm) {
  const { target, surface } = form;
  const withJs = `${target}js`;
  for (let i = 0; i < tokens.length; i++) {
    const first = tokens[i];
    if (!first || (tokens[i - 1]?.end ?? -1) > first.start) continue;
    let squashed = "";
    for (let j = i; j < tokens.length; j++) {
      const token = tokens[j];
      if (!token || (j > i && !token.joined)) break;
      squashed += token.value;
      if (!withJs.startsWith(squashed)) break;
      const closesGroup = (tokens[j + 1]?.start ?? Infinity) >= token.end;
      const hit = squashed === target || (squashed === withJs && token.value.endsWith("js"));
      if (closesGroup && hit) {
        if (isPlausible(text, first.start, token.end, surface)) {
          return { start: first.start, end: token.end };
        }
        break;
      }
    }
  }
  return null;
}

function matchTerm(text: string, tokens: readonly Token[], term: string): KeywordMatch {
  const label = term.trim().replace(/\s+/g, " ");
  for (const form of termForms(term)) {
    const span = locate(text, tokens, form);
    if (span) {
      return { term: label, found: true, evidence: snippetAround(text, span.start, span.end) };
    }
  }
  return { term: label, found: false, evidence: "" };
}

export function normalizeTerm(term: string): string {
  const [form] = termForms(term);
  return form ? joinTokens(form.tokens) : "";
}

export function termKey(term: string): string {
  return normalizeTerm(term).replace(/ /g, "");
}

export function findTerm(resumeText: string, term: string): KeywordMatch {
  return matchTerm(resumeText, textTokens(resumeText), term);
}

export function findTermIn(text: string, tokens: readonly Token[], term: string): KeywordMatch {
  return matchTerm(text, tokens, term);
}

export function keywordCoverage(resume: Resume, terms: string[]): KeywordCoverage {
  const text = resumeToText(resume);
  const tokens = textTokens(text);
  const seen = new Set<string>();
  const matches: KeywordMatch[] = [];
  for (const term of terms) {
    if (matches.length >= MAX_TERMS) break;
    const key = normalizeTerm(term).replace(/ /g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    matches.push(matchTerm(text, tokens, term));
  }
  const matched = matches.filter((match) => match.found).length;
  const total = matches.length;
  const percent = total === 0 ? 0 : Math.round((matched / total) * 100);
  return { matches, matched, total, percent };
}
