import type { TailorRequirement } from "@/lib/ai/types";
import { extraSectionTitle, visibleResume } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { findTerm } from "@/lib/tailor/keywords";
import { screenerRows } from "@/lib/tailor/requirements";
import { readPost, type Importance, type PostRead, type PostTerm } from "./post";

export type MatchStatus = "shown" | "listed" | "missing";

export type MatchWhere = { place: string; text: string };

export type MatchRow = {
  id: string;
  term: string;
  importance: Importance;
  status: MatchStatus;
  where: MatchWhere | null;
};

export type MatchCount = { found: number; total: number };

export type MatchCheck = {
  rows: MatchRow[];
  total: number;
  found: number;
  shown: number;
  listed: number;
  must: MatchCount;
  nice: MatchCount;
  sorted: boolean;
  asks: string[];
};

export type MatchLine = MatchWhere & { shown: boolean };

type Found = Pick<MatchRow, "status" | "where">;

const LINE_CHARS = 200;
const MISSING: Found = { status: "missing", where: null };

function joined(parts: readonly (string | undefined)[], separator: string): string {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(separator);
}

// Shown lines are searched first, so a skill that is both listed and used counts as used.
export function findInLines(terms: readonly string[], lines: readonly MatchLine[]): Found {
  for (const shown of [true, false]) {
    for (const line of lines) {
      if (line.shown !== shown) continue;
      for (const term of terms) {
        const match = findTerm(line.text, term);
        if (!match.found) continue;
        const text = line.text.length > LINE_CHARS ? match.evidence : line.text;
        return { status: shown ? "shown" : "listed", where: { place: line.place, text } };
      }
    }
  }
  return MISSING;
}

function rowId(index: number): string {
  return `m${index + 1}`;
}

function count(rows: readonly MatchRow[], importance: Importance): MatchCount {
  const group = rows.filter((row) => row.importance === importance);
  return { found: group.filter((row) => row.status !== "missing").length, total: group.length };
}

export function summarize(
  post: PostRead,
  find: (term: PostTerm, index: number) => Found,
): MatchCheck {
  const rows = post.terms.map((term, index): MatchRow => ({
    id: rowId(index),
    term: term.label,
    importance: term.importance,
    ...find(term, index),
  }));
  const shown = rows.filter((row) => row.status === "shown").length;
  const listed = rows.filter((row) => row.status === "listed").length;
  return {
    rows,
    total: rows.length,
    found: shown + listed,
    shown,
    listed,
    must: count(rows, "must"),
    nice: count(rows, "nice"),
    sorted: post.sorted,
    asks: post.asks,
  };
}

// Parts of a resume the screener's own lines skip: project tools and names, and extra sections.
function extraLines(resume: Resume): MatchLine[] {
  const lines: MatchLine[] = [];
  const push = (text: string, place: string, shown: boolean) => {
    if (text.trim()) lines.push({ text: text.trim(), place, shown });
  };
  for (const project of resume.projects) {
    push(project.tech ?? "", `${project.name.trim() || "Project"}, tools`, false);
    push(project.name, "Projects", false);
  }
  for (const section of resume.extras ?? []) {
    const title = extraSectionTitle(section);
    for (const item of section.items) {
      let position = 0;
      for (const bullet of item.bullets) {
        if (!bullet.text.trim()) continue;
        position += 1;
        push(bullet.text, `${joined([title, item.title], ", ")}, line ${position}`, true);
      }
      // A languages section is where a recruiter looks for a language, so it counts as shown.
      push(
        joined([item.title, item.subtitle, item.detail], ", "),
        title,
        section.kind === "languages",
      );
    }
  }
  return lines;
}

export function matchCheck(resume: Resume, jobText: string): MatchCheck {
  const post = readPost(jobText);
  const visible = visibleResume(resume);
  const requirements = post.terms.map((term, index): TailorRequirement => ({
    id: rowId(index),
    text: term.label,
    importance: term.importance === "must" ? "must" : "nice",
    source: "wording",
    terms: term.terms,
    quote: "",
    ask: "",
  }));
  const proofs = screenerRows(visible, requirements);
  const lines = extraLines(visible);
  const shownLines = lines.filter((line) => line.shown);
  return summarize(post, (term, index) => {
    const proof = proofs[index]?.proof;
    if (!proof?.line || proof.status === "missing") return findInLines(term.terms, lines);
    // A skill both listed and used counts as used, wherever the line that uses it is.
    if (proof.status !== "proven") {
      const used = findInLines(term.terms, shownLines);
      if (used.status === "shown") return used;
    }
    return {
      status: proof.status === "proven" ? "shown" : "listed",
      where: { place: proof.line.place, text: proof.line.text },
    };
  });
}
