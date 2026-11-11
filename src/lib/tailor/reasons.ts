import { yearsOfExperience } from "@/lib/job-feed/profile";
import type { LintIssue, LintIssueId, ResumeLint } from "@/lib/lint/types";
import { listBullets, resumeToText, type BulletRef } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { otherForm, type OtherForm } from "./acronyms";
import { findTermIn } from "./keywords";
import type { RequirementRow } from "./requirements";
import { joinAnd, type SummaryCheck, type TitleCheck } from "./title-checks";
import { foldCase, textTokens } from "./tokens";

// Why each requirement is or isn't shown, in the person's terms ("only in your Skills list"). Title
// and summary checks live in title-checks.ts.

export type ReasonTone = "pass" | "warn" | "neutral";

export type RowReason = {
  text: string;
  tone: ReasonTone;
  // Set when the post's form of a name is missing but the other form is there ("GTM").
  form: OtherForm | null;
};

// What makes a proving line weak, in a few words that fit after "but that line…".
const LINE_PROBLEMS: Partial<Record<LintIssueId, string>> = {
  duty: "reads like a job description",
  "no-result": "doesn't say what changed",
  "weak-start": "starts weak",
  "stock-phrase": "leans on a stock phrase",
  "first-person": "says I or we",
  tense: "is in present tense for a job you've left",
};

const YEARS_ASKED = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i;

export type ReasonContext = {
  resume: Resume;
  lint: ResumeLint;
  now: number;
};

function refsById(resume: Resume): Map<string, BulletRef> {
  return new Map(listBullets(resume).map((ref) => [ref.bulletId, ref]));
}

function lineProblem(issues: readonly LintIssue[] | undefined): LintIssue | null {
  return issues?.find((issue) => issue.severity === "high" && LINE_PROBLEMS[issue.id]) ?? null;
}

// Not only a form the matcher counts as the same ("Amazon Web Services" for "AWS"): searches look
// for the words typed.
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
  return ` The post asks for ${asked[1]}+ years; your job dates add up to about ${whole} ${whole === 1 ? "year" : "years"}.`;
}

function provenReason(
  row: RequirementRow,
  context: ReasonContext,
  refs: ReadonlyMap<string, BulletRef>,
): RowReason {
  const { line, via } = row.proof;
  if (!line) return { text: "", tone: "pass", form: null };
  if (via === "added") {
    return {
      text: "Your new line shows it. It goes into the tailored copy.",
      tone: "pass",
      form: null,
    };
  }
  const exact = row.terms.length === 0 || hasExactForm(line.text, row.terms);
  const spelled = exact
    ? ""
    : ` The post says "${row.terms[0]}" and your line says it another way. Some systems match exact words only, so use "${row.terms[0]}" once too.`;
  const ref = line.bulletId ? refs.get(line.bulletId) : undefined;
  const years = yearsNote(row, context) ?? "";
  if (!ref) {
    // A job title, a certification, the education line or the summary.
    const where = line.place === "Job title" ? "a job title" : `your ${line.place.toLowerCase()}`;
    return {
      text: `Only in ${where}. Show it in a line about what you did, too.${spelled}${years}`,
      tone: row.importance === "must" ? "warn" : "neutral",
      form: null,
    };
  }
  if (ref.section !== "experience") {
    const where =
      ref.section === "projects"
        ? `in your project ${ref.parentLabel}`
        : ref.section === "education"
          ? "under your education"
          : `in ${ref.parentLabel}`;
    const atWork = row.importance === "must" ? " If you used it at work, say so in that job." : "";
    return {
      text: `Shown ${where}, not in a job.${atWork}${spelled}${years}`,
      tone: "neutral",
      form: null,
    };
  }
  const where = ref.company.trim() || ref.parentLabel;
  const problem = lineProblem(context.lint.byBullet[ref.bulletId]);
  if (problem) {
    return {
      // Short on purpose: "Your lines for this job" carries the full tip for the line.
      text: `Shown at ${where}, but that line ${LINE_PROBLEMS[problem.id]}.${spelled}${years}`,
      tone: "warn",
      form: null,
    };
  }
  return {
    text: `Shown in a line at ${where}.${spelled}${years}`,
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
  if (row.status === "declined")
    return { text: "You said you don't have it.", tone: "neutral", form: null };
  const form =
    row.terms.map((term) => otherForm(term, text)).find((found) => found !== null) ?? null;
  if (form) {
    return {
      text: `Your resume says "${form.written}"; the post says "${form.asked}". Keyword searches find only the form typed, so write both once: "${form.both}".`,
      tone: "warn",
      form,
    };
  }
  if (row.status === "listed") {
    const place = row.proof.line?.place ?? "Skills";
    const group = place.startsWith("Skills: ") ? ` (${place.slice("Skills: ".length)})` : "";
    const list = place === "Headline" ? "headline" : `Skills list${group}`;
    return {
      text: `Only in your ${list}. No job line shows you using it, and screeners look for it in what you did.`,
      tone: "warn",
      form: null,
    };
  }
  return {
    text:
      row.importance === "must"
        ? "The post asks for this, and nothing in your resume says it yet."
        : "A plus for this job. Nothing in your resume says it yet.",
    tone: "neutral",
    form: null,
  };
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

// Weakest must-have proof first. Lines that show nothing for this job are only counted.
export function jobLines(
  rows: readonly RequirementRow[],
  context: ReasonContext,
): { lines: JobLine[]; unrelated: number } {
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
  // A line can show more requirements than the one it was picked for: check each term in it.
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
    const names = joinAnd(proves.slice(0, 2).map((p) => p.text));
    const kind = proves[0]?.importance === "must" ? "a must-have" : "a nice-to-have";
    // The lint message already names the problem, so it follows as is.
    const note = problem
      ? `Shows ${names} (${kind}). ${problem.message}`
      : `Shows ${names} (${kind}). Keep it near the top.`;
    lines.push({
      bulletId: ref.bulletId,
      place: ref.parentLabel,
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

// At most three: missing must-haves, must-haves only in Skills, weak must-have proof, then the
// title and summary. Nice-to-haves never make this list.
export function tailorFixFirst(input: {
  rows: readonly RequirementRow[];
  reasons: Readonly<Record<string, RowReason>>;
  lines: readonly JobLine[];
  title: TitleCheck | null;
  summary: SummaryCheck;
}): FixFirst[] {
  const { rows, reasons, lines, title, summary } = input;
  const must = rows.filter((row) => row.importance === "must");
  const items: FixFirst[] = [];
  // A named tool keeps its own spelling; a kind of experience reads mid-sentence in lowercase.
  const names = (list: readonly RequirementRow[]) =>
    joinAnd(
      list
        .slice(0, 3)
        .map(
          (row) => row.terms[0] ?? row.text.replace(/^\p{Lu}(?=\p{Ll})/u, (c) => c.toLowerCase()),
        ),
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
      title: `${missing.length} ${missing.length === 1 ? "must-have isn't" : "must-haves aren't"} on your resume: ${names(missing)}`,
      reason: "If you have done it, say where. If not, say no, and nothing is added.",
      action: first(missing),
    });
  }
  if (listed.length > 0) {
    items.push({
      key: "listed",
      title: `${listed.length} ${listed.length === 1 ? "must-have is" : "must-haves are"} only in your Skills list: ${names(listed)}`,
      reason: "Screeners look for it in a line about what you did. Show where you used it.",
      action: first(listed),
    });
  }
  if (spelled.length > 0) {
    const form = reasons[spelled[0]?.id ?? ""]?.form;
    items.push({
      key: "spelled",
      title: `The post says "${form?.asked}"; your resume says "${form?.written}"`,
      reason: `Keyword searches find only the form typed. Write both once: "${form?.both}".`,
      action: first(spelled),
    });
  }
  if (weak.length > 0) {
    items.push({
      key: "weak",
      title: `${weak.length} ${weak.length === 1 ? "line that shows a must-have reads" : "lines that show must-haves read"} weakly`,
      reason: weak[0]?.note ?? "",
      action: { kind: "line", bulletId: weak[0]?.bulletId ?? "" },
    });
  }
  if (title && title.status !== "match") {
    items.push({
      key: "title",
      title: "Your headline doesn't name this job",
      reason: title.text,
      action: { kind: "section", id: TITLE_SECTION_ID },
    });
  }
  if (summary.status !== "match") {
    items.push({
      key: "summary",
      title:
        summary.status === "missing"
          ? "No summary at the top"
          : "Your summary doesn't speak to this job",
      reason: summary.text,
      action: { kind: "section", id: TITLE_SECTION_ID },
    });
  }
  return items.slice(0, MAX_FIX_FIRST);
}
