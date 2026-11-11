import type { Resume } from "@/lib/resume/schema";
import { findTermIn } from "./keywords";
import type { RequirementRow } from "./requirements";
import { foldCase, textTokens } from "./tokens";

const SENIORITY = new Set(
  "senior sr jr junior lead principal staff head chief associate entry level mid i ii iii iv".split(
    " ",
  ),
);
const TITLE_STOPWORDS = new Set("a an and the of for to in on with at".split(" "));

export function coreTitle(title: string): string {
  return title.split(/\s+[-–—|]\s+|,|\(|\s+at\s+/i)[0]?.trim() ?? "";
}

function titleWords(title: string): string[] {
  return (foldCase(title).match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (word) => !SENIORITY.has(word) && !TITLE_STOPWORDS.has(word),
  );
}

function covers(have: string, want: readonly string[]): boolean {
  const words = new Set(titleWords(have));
  return want.length > 0 && want.every((word) => words.has(word));
}

export type TitleCheck = { status: "match" | "differs" | "missing"; text: string; core: string };

export function titleCheck(resume: Resume, jobTitle: string): TitleCheck | null {
  const core = coreTitle(jobTitle);
  const want = titleWords(core);
  if (want.length === 0) return null;
  const headline = resume.basics.headline.trim();
  if (covers(headline, want)) {
    return { status: "match", text: `Your headline matches the post's title, "${core}".`, core };
  }
  const latest = resume.experience.find((job) => !job.hidden && job.title.trim());
  if (latest && covers(latest.title, want)) {
    return {
      status: "match",
      text: `Your latest job title matches the post's title, "${core}".`,
      core,
    };
  }
  if (!headline) {
    return {
      status: "missing",
      text: `The post's title is "${core}". If it fits you, put it under your name. Recruiters search by job title.`,
      core,
    };
  }
  return {
    status: "differs",
    text: `The post's title is "${core}"; your headline says "${headline}". If the job fits you, use its title in your headline or summary. Never change a past job's title.`,
    core,
  };
}

export type SummaryCheck = { status: "match" | "differs" | "missing"; text: string };

export function summaryCheck(
  resume: Resume,
  rows: readonly RequirementRow[],
  jobTitle: string,
): SummaryCheck {
  const summary = resume.summary.trim();
  if (!summary) {
    return {
      status: "missing",
      text: "You have no summary. Two lines at the top that name this job and your closest match help a reader who skims.",
    };
  }
  const tokens = textTokens(summary);
  const want = titleWords(coreTitle(jobTitle));
  const named = rows
    .filter((row) => row.importance === "must" && row.terms.length > 0)
    .filter((row) => row.terms.some((term) => findTermIn(summary, tokens, term).found));
  if (named.length > 0 || covers(summary, want)) {
    const what =
      named.length > 0
        ? named
            .map((row) => row.terms[0])
            .slice(0, 3)
            .join(", ")
        : "the job title";
    return { status: "match", text: `Your summary names ${what}.` };
  }
  const proven = rows
    .filter((row) => row.importance === "must" && row.status === "proven" && row.terms.length > 0)
    .map((row) => row.terms[0] ?? "")
    .slice(0, 3);
  const suggest =
    proven.length > 0 ? ` You show ${joinAnd(proven)} in your lines; say it up top too.` : "";
  return {
    status: "differs",
    text: `Your summary doesn't name this job or its must-haves.${suggest}`,
  };
}

export function joinAnd(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
