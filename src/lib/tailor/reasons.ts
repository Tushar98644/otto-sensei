import type { Locale } from "@/i18n/config";
import { fmt, selectPlural } from "@/i18n/format";
import lintEn from "@/i18n/messages/en/lint";
import studioTailorEn from "@/i18n/messages/en/studio-tailor";
import type { Translation } from "@/i18n/types";
import { yearsOfExperience } from "@/lib/job-feed/profile";
import { issueText, joinList, type LintMessages } from "@/lib/lint/i18n";
import type { LintIssue, LintIssueId, ResumeLint } from "@/lib/lint/types";
import { listBullets, resumeToText, type BulletRef } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { otherForm, type OtherForm } from "./acronyms";
import { findTermIn } from "./keywords";
import { refPlace } from "./place";
import type { RequirementRow } from "./requirements";
import type { SummaryCheck, TitleCheck } from "./title-checks";
import { foldCase, textTokens } from "./tokens";

export type ReasonTone = "pass" | "warn" | "neutral";

export type RowReason = {
  text: string;
  tone: ReasonTone;
  form: OtherForm | null;
};

export type ReasonWords = Translation<typeof studioTailorEn.reasons>;

const LINE_PROBLEMS: Partial<Record<LintIssueId, string>> = studioTailorEn.reasons.problems;

const YEARS_ASKED = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i;

export type ReasonContext = {
  resume: Resume;
  lint: ResumeLint;
  now: number;
  // The reader's words; English when left out.
  words?: ReasonWords;
  lintWords?: LintMessages;
  locale?: Locale;
};

function wordsOf(context: ReasonContext) {
  return {
    t: context.words ?? studioTailorEn.reasons,
    lint: context.lintWords ?? lintEn,
    locale: context.locale ?? "en",
  };
}

function problemOf(id: LintIssueId, t: ReasonWords): string {
  return (t.problems as Partial<Record<LintIssueId, string>>)[id] ?? "";
}

function refsById(resume: Resume): Map<string, BulletRef> {
  return new Map(listBullets(resume).map((ref) => [ref.bulletId, ref]));
}

function lineProblem(issues: readonly LintIssue[] | undefined): LintIssue | null {
  return issues?.find((issue) => issue.severity === "high" && LINE_PROBLEMS[issue.id]) ?? null;
}

function hasExactForm(line: string, terms: readonly string[]): boolean {
  const folded = foldCase(line);
  return terms.some((term) => {
    const needle = foldCase(term.trim());
    if (!needle) return false;
    const at = folded.indexOf(needle);
    if (at === -1) return false;
    const before = folded.charAt(at - 1);
    const after = folded.charAt(at + needle.length);
    return !/[\p{L}\p{N}]/u.test(before) && !/[\p{L}\p{N}]/u.test(after);
  });
}

function yearsNote(row: RequirementRow, context: ReasonContext): string | null {
  const asked = YEARS_ASKED.exec(row.text);
  if (!asked) return null;
  const years = yearsOfExperience(context.resume, context.now);
  if (years === null) return null;
  const whole = Math.floor(years);
  const { t, locale } = wordsOf(context);
  return fmt(selectPlural(locale, t.years, whole), { asked: asked[1] ?? "", count: whole });
}

// The place a proof line names, as a kind, when it isn't a line about what you did.
function placeKind(place: string, t: ReasonWords) {
  const kinds = ["jobTitle", "certifications", "education", "summary"] as const;
  return kinds.find((kind) => t.places[kind] === place) ?? null;
}

function provenReason(
  row: RequirementRow,
  context: ReasonContext,
  refs: ReadonlyMap<string, BulletRef>,
): RowReason {
  const { line, via } = row.proof;
  if (!line) return { text: "", tone: "pass", form: null };
  const { t } = wordsOf(context);
  if (via === "added") return { text: t.added, tone: "pass", form: null };
  const exact = row.terms.length === 0 || hasExactForm(line.text, row.terms);
  const spelled = exact ? "" : fmt(t.spelled, { term: row.terms[0] ?? "" });
  const ref = line.bulletId ? refs.get(line.bulletId) : undefined;
  const years = yearsNote(row, context) ?? "";
  if (!ref) {
    const kind = placeKind(line.place, t);
    const where = kind ? t.onlyInPlaces[kind] : `your ${line.place.toLowerCase()}`;
    return {
      text: `${fmt(t.onlyIn, { where })}${spelled}${years}`,
      tone: row.importance === "must" ? "warn" : "neutral",
      form: null,
    };
  }
  if (ref.section !== "experience") {
    const where =
      ref.section === "projects"
        ? fmt(t.outsidePlaces.project, { name: ref.parentLabel })
        : ref.section === "education"
          ? t.outsidePlaces.education
          : fmt(t.outsidePlaces.other, { name: ref.parentLabel });
    const atWork = row.importance === "must" ? t.atWork : "";
    return {
      text: `${fmt(t.shownOutside, { where })}${atWork}${spelled}${years}`,
      tone: "neutral",
      form: null,
    };
  }
  const where = ref.company.trim() || ref.parentLabel;
  const problem = lineProblem(context.lint.byBullet[ref.bulletId]);
  if (problem) {
    const text = fmt(t.shownWithProblem, { where, problem: problemOf(problem.id, t) });
    return { text: `${text}${spelled}${years}`, tone: "warn", form: null };
  }
  return {
    text: `${fmt(t.shownAt, { where })}${spelled}${years}`,
    tone: spelled ? "warn" : "pass",
    form: null,
  };
}

function reasonWith(
  row: RequirementRow,
  context: ReasonContext,
  refs: ReadonlyMap<string, BulletRef>,
  text: string,
): RowReason {
  if (row.status === "proven") return provenReason(row, context, refs);
  const { t } = wordsOf(context);
  if (row.status === "declined") return { text: t.declined, tone: "neutral", form: null };
  const form =
    row.terms.map((term) => otherForm(term, text)).find((found) => found !== null) ?? null;
  if (form) {
    return { text: fmt(t.otherForm, { ...form }), tone: "warn", form };
  }
  if (row.status === "listed") {
    const place = row.proof.line?.place ?? t.places.skills;
    const group = skillsGroup(place, context.resume, t);
    const list =
      place === t.places.headline
        ? t.lists.headline
        : group
          ? fmt(t.lists.group, { group })
          : t.lists.skills;
    return { text: fmt(t.listed, { list }), tone: "warn", form: null };
  }
  return {
    text: row.importance === "must" ? t.missingMust : t.missingNice,
    tone: "neutral",
    form: null,
  };
}

// The group label a skills line names, found by building each group's place again.
function skillsGroup(place: string, resume: Resume, t: ReasonWords): string | null {
  for (const group of resume.skills) {
    const label = group.label.trim().replace(/:$/, "");
    if (label && fmt(t.places.skillsGroup, { label }) === place) return label;
  }
  return null;
}

export function rowReasons(
  rows: readonly RequirementRow[],
  context: ReasonContext,
): Record<string, RowReason> {
  const refs = refsById(context.resume);
  const text = resumeToText(context.resume);
  return Object.fromEntries(rows.map((row) => [row.id, reasonWith(row, context, refs, text)]));
}

export type JobLine = {
  bulletId: string;
  place: string;
  text: string;
  proves: { id: string; text: string; importance: "must" | "nice" }[];
  problem: LintIssue | null;
  note: string;
};

export function jobLines(
  rows: readonly RequirementRow[],
  context: ReasonContext,
): { lines: JobLine[]; unrelated: number } {
  const { t, lint, locale } = wordsOf(context);
  const refs = listBullets(context.resume).filter(
    (ref) => (ref.section === "experience" || ref.section === "projects") && ref.text.trim(),
  );
  const proofs = new Map<string, JobLine["proves"]>();
  for (const row of rows) {
    const id = row.status === "proven" ? row.proof.line?.bulletId : null;
    if (!id) continue;
    proofs.set(id, [
      ...(proofs.get(id) ?? []),
      { id: row.id, text: row.text, importance: row.importance },
    ]);
  }
  for (const ref of refs) {
    const tokens = textTokens(ref.text);
    for (const row of rows) {
      if (row.terms.length === 0 || (proofs.get(ref.bulletId) ?? []).some((p) => p.id === row.id))
        continue;
      if (row.terms.some((term) => findTermIn(ref.text, tokens, term).found)) {
        proofs.set(ref.bulletId, [
          ...(proofs.get(ref.bulletId) ?? []),
          { id: row.id, text: row.text, importance: row.importance },
        ]);
      }
    }
  }
  const lines: JobLine[] = [];
  let unrelated = 0;
  for (const ref of refs) {
    const proves = proofs.get(ref.bulletId);
    if (!proves) {
      unrelated += 1;
      continue;
    }
    proves.sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
    const problem = lineProblem(context.lint.byBullet[ref.bulletId]);
    const names = joinList(
      proves.slice(0, 2).map((p) => p.text),
      locale,
    );
    const kind = t.lineKinds[proves[0]?.importance === "must" ? "must" : "nice"];
    const next = problem ? issueText(problem, lint, locale) : t.keepNearTop;
    const note = fmt(t.lineNote, { names, kind, next });
    lines.push({
      bulletId: ref.bulletId,
      place: refPlace(ref, t.places),
      text: ref.text.trim(),
      proves,
      problem,
      note,
    });
  }
  const weight = (line: JobLine) =>
    (line.proves[0]?.importance === "must" ? 0 : 2) + (line.problem ? 0 : 1);
  lines.sort((a, b) => weight(a) - weight(b));
  return { lines, unrelated };
}

export type FixFirstAction =
  | { kind: "row"; rowId: string }
  | { kind: "line"; bulletId: string }
  | { kind: "section"; id: string };

export type FixFirst = { key: string; title: string; reason: string; action: FixFirstAction };

export const MAX_FIX_FIRST = 3;
export const TITLE_SECTION_ID = "tailor-title-summary";

export function tailorFixFirst(input: {
  rows: readonly RequirementRow[];
  reasons: Readonly<Record<string, RowReason>>;
  lines: readonly JobLine[];
  title: TitleCheck | null;
  summary: SummaryCheck;
  words?: ReasonWords;
  locale?: Locale;
}): FixFirst[] {
  const { rows, reasons, lines, title, summary } = input;
  const t = (input.words ?? studioTailorEn.reasons).fixFirst;
  const locale = input.locale ?? "en";
  const count = (forms: typeof t.missing, value: number, names: string) =>
    fmt(selectPlural(locale, forms, value), { count: value, names });
  const must = rows.filter((row) => row.importance === "must");
  const items: FixFirst[] = [];
  // German capitalizes nouns, so a requirement keeps its first letter there.
  const lower = (text: string) =>
    locale === "de" ? text : text.replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase());
  const names = (list: readonly RequirementRow[]) =>
    joinList(
      list.slice(0, 3).map((row) => row.terms[0] ?? lower(row.text)),
      locale,
    );

  const spelled = must.filter((row) => row.status !== "proven" && reasons[row.id]?.form);
  const missing = must.filter((row) => row.status === "missing" && !reasons[row.id]?.form);
  const listed = must.filter((row) => row.status === "listed" && !reasons[row.id]?.form);
  const weak = lines.filter((line) => line.problem && line.proves[0]?.importance === "must");

  const first = (list: readonly RequirementRow[]): FixFirstAction => ({
    kind: "row",
    rowId: list[0]?.id ?? "",
  });
  if (missing.length > 0) {
    items.push({
      key: "missing",
      title: count(t.missing, missing.length, names(missing)),
      reason: t.missingReason,
      action: first(missing),
    });
  }
  if (listed.length > 0) {
    items.push({
      key: "listed",
      title: count(t.listed, listed.length, names(listed)),
      reason: t.listedReason,
      action: first(listed),
    });
  }
  if (spelled.length > 0) {
    const form = reasons[spelled[0]?.id ?? ""]?.form;
    items.push({
      key: "spelled",
      title: fmt(t.spelled, { asked: `${form?.asked}`, written: `${form?.written}` }),
      reason: fmt(t.spelledReason, { both: `${form?.both}` }),
      action: first(spelled),
    });
  }
  if (weak.length > 0) {
    items.push({
      key: "weak",
      title: count(t.weak, weak.length, ""),
      reason: weak[0]?.note ?? "",
      action: { kind: "line", bulletId: weak[0]?.bulletId ?? "" },
    });
  }
  if (title && title.status !== "match") {
    items.push({
      key: "title",
      title: t.title,
      reason: title.text,
      action: { kind: "section", id: TITLE_SECTION_ID },
    });
  }
  if (summary.status !== "match") {
    items.push({
      key: "summary",
      title: summary.status === "missing" ? t.noSummary : t.summary,
      reason: summary.text,
      action: { kind: "section", id: TITLE_SECTION_ID },
    });
  }
  return items.slice(0, MAX_FIX_FIRST);
}
