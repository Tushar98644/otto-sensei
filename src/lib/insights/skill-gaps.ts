import type { TailorRequirement } from "@/lib/ai/types";
import type { Resume } from "@/lib/resume/schema";
import { termKey } from "@/lib/tailor/keywords";
import { screenerRows } from "@/lib/tailor/requirements";
import { foldCase } from "@/lib/tailor/tokens";
import { savedTerms } from "./saved-job";

export const MIN_SHORT_JOBS = 2;
const DEFAULT_LIMIT = 6;
const MAX_JOB_LABELS = 3;
const MAX_JOBS = 200;
const MAX_TERMS_PER_JOB = 60;

export type SkillGap = {
  term: string;
  asked: number;
  missing: number;
  listed: number;
  jobs: string[];
  copyIds: string[];
};

export type SkillGapReport = {
  jobs: number;
  gaps: SkillGap[];
};

type Tally = SkillGap & { spellings: Map<string, number>; firstSeen: number };

function jobKey(resume: Resume): string {
  const meta = resume.tailor;
  const company = foldCase(meta?.company.trim() ?? "");
  const title = foldCase(meta?.jobTitle.trim() ?? "");
  return company || title ? `${company}|${title}` : `id:${resume.id}`;
}

export function jobLabel(resume: Resume): string {
  const title = resume.tailor?.jobTitle.trim() ?? "";
  const company = resume.tailor?.company.trim() ?? "";
  if (title && company) return `${title} at ${company}`;
  return title || company || resume.title.trim() || "A tailored copy";
}

function latestCopyPerJob(resumes: readonly Resume[]): Resume[] {
  const byJob = new Map<string, Resume>();
  for (const resume of resumes) {
    if (!resume.tailor) continue;
    const key = jobKey(resume);
    const kept = byJob.get(key);
    if (!kept || resume.updatedAt > kept.updatedAt) byJob.set(key, resume);
  }
  return [...byJob.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_JOBS);
}

function asRequirements(terms: readonly string[]): TailorRequirement[] {
  const seen = new Set<string>();
  const out: TailorRequirement[] = [];
  for (const raw of terms) {
    const term = raw.trim();
    const key = termKey(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: key,
      text: term,
      importance: "must",
      source: "wording",
      terms: [term],
      quote: "",
      ask: "",
    });
    if (out.length === MAX_TERMS_PER_JOB) break;
  }
  return out;
}

function mostUsed(spellings: ReadonlyMap<string, number>, fallback: string): string {
  let best = fallback;
  let bestCount = 0;
  for (const [spelling, count] of spellings) {
    if (count > bestCount) {
      best = spelling;
      bestCount = count;
    }
  }
  return best;
}

export function skillGaps(resumes: readonly Resume[], limit = DEFAULT_LIMIT): SkillGapReport {
  const copies = latestCopyPerJob(resumes);
  const tallies = new Map<string, Tally>();
  let order = 0;

  for (const copy of copies) {
    const requirements = asRequirements(savedTerms(copy));
    if (requirements.length === 0) continue;
    const label = jobLabel(copy);
    for (const row of screenerRows(copy, requirements)) {
      let tally = tallies.get(row.id);
      if (!tally) {
        tally = {
          term: row.text,
          asked: 0,
          missing: 0,
          listed: 0,
          jobs: [],
          copyIds: [],
          spellings: new Map(),
          firstSeen: order++,
        };
        tallies.set(row.id, tally);
      }
      tally.asked += 1;
      tally.spellings.set(row.text, (tally.spellings.get(row.text) ?? 0) + 1);
      if (row.status === "proven") continue;
      if (row.status === "listed") tally.listed += 1;
      else tally.missing += 1;
      if (tally.jobs.length < MAX_JOB_LABELS) {
        tally.jobs.push(label);
        tally.copyIds.push(copy.id);
      }
    }
  }

  const gaps = [...tallies.values()]
    .filter((tally) => tally.missing + tally.listed >= MIN_SHORT_JOBS)
    .sort(
      (a, b) =>
        b.missing + b.listed - (a.missing + a.listed) ||
        b.missing - a.missing ||
        b.asked - a.asked ||
        a.firstSeen - b.firstSeen,
    )
    .slice(0, Math.max(0, limit))
    .map(
      (tally): SkillGap => ({
        term: mostUsed(tally.spellings, tally.term),
        asked: tally.asked,
        missing: tally.missing,
        listed: tally.listed,
        jobs: tally.jobs,
        copyIds: tally.copyIds,
      }),
    );

  return { jobs: copies.length, gaps };
}

const count = new Intl.NumberFormat("en-US");

export function gapLine(gap: SkillGap, jobs: number): string {
  const short = gap.missing + gap.listed;
  const of = `${count.format(short)} of ${count.format(jobs)} ${jobs === 1 ? "job" : "jobs"}`;
  if (gap.listed === 0) return `${gap.term}: missing in ${of} you tailored for`;
  if (gap.missing === 0) return `${gap.term}: only in your skills list for ${of}`;
  return `${gap.term}: not shown in a line in ${of} you tailored for`;
}

export type GapNudge = { kind: "show" | "learn"; text: string };

export function gapNudge(gap: SkillGap): GapNudge {
  if (gap.listed > 0 && gap.missing === 0) {
    return {
      kind: "show",
      text: `It's in your skills list but no line shows it. Add one that says where you used ${gap.term}.`,
    };
  }
  return {
    kind: "learn",
    text: `If you've used ${gap.term}, add a line that says where. If not, ${count.format(gap.asked)} of your jobs asked for it: a small project counts.`,
  };
}
