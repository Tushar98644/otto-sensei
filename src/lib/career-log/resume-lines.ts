import { newBullet, type Resume } from "@/lib/resume/schema";
import { isMonth, monthOf } from "./month";
import type { Month } from "./types";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const BULLETS_PER_JOB = 40;

// "Jan 2024", "January 2024", "2024-01", "01/2024" or "2024" as a month; "Present" and the rest as none.
export function monthFromResumeDate(text: string): Month | null {
  const value = text.trim().toLowerCase();
  const iso = /^(\d{4})-(\d{1,2})/.exec(value);
  if (iso) {
    const month = monthOf(Number(iso[1]), Number(iso[2]));
    return isMonth(month) ? month : null;
  }
  const slash = /^(\d{1,2})\/(\d{4})$/.exec(value);
  if (slash) {
    const month = monthOf(Number(slash[2]), Number(slash[1]));
    return isMonth(month) ? month : null;
  }
  const named = /^([a-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(value);
  if (named) {
    const index = MONTHS.indexOf(named[1] ?? "");
    return index >= 0 ? monthOf(Number(named[2]), index + 1) : null;
  }
  const year = /^(\d{4})$/.exec(value);
  return year ? monthOf(Number(year[1]), 1) : null;
}

// From the job's start when the log reaches back that far, else from the first note; up to the latest note.
export function defaultRange(
  months: readonly Month[],
  startDate: string,
): { from: Month; to: Month } | null {
  const sorted = [...months].sort();
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return null;
  const start = monthFromResumeDate(startDate);
  const from = start && start > first && start <= last ? start : first;
  return { from, to: last };
}

export type JobChoice = { id: string; label: string; title: string; company: string };

export function jobChoices(resume: Resume, numbered = "Job {number}"): JobChoice[] {
  return resume.experience.map((job, index) => {
    const label = [job.title.trim(), job.company.trim()].filter(Boolean).join(", ");
    return {
      id: job.id,
      label: label || numbered.replace("{number}", String(index + 1)),
      title: job.title,
      company: job.company,
    };
  });
}

// Accepted lines go to the top of the job, newest work first, never past the job's line limit.
export function addLines(
  resume: Resume,
  experienceId: string,
  texts: readonly string[],
): { resume: Resume; added: number } {
  const index = resume.experience.findIndex((job) => job.id === experienceId);
  const job = resume.experience[index];
  if (!job) return { resume, added: 0 };
  // An empty line left in a new job goes, so the accepted ones aren't followed by a blank.
  const kept = job.bullets.filter((bullet) => bullet.text.trim() !== "");
  const have = new Set(kept.map((bullet) => bullet.text.trim().toLowerCase()));
  const fresh = [...new Set(texts.map((text) => text.trim()))]
    .filter((text) => text && !have.has(text.toLowerCase()))
    .slice(0, Math.max(0, BULLETS_PER_JOB - kept.length));
  if (fresh.length === 0) return { resume, added: 0 };
  const bullets = [...fresh.map((text) => newBullet(text)), ...kept];
  const experience = resume.experience.map((entry, at) =>
    at === index ? { ...entry, bullets } : entry,
  );
  return { resume: { ...resume, experience }, added: fresh.length };
}

const PLACEHOLDERS = /\[[^\]]+\]/g;

export function blanksIn(text: string): string[] {
  return [...new Set(text.match(PLACEHOLDERS) ?? [])];
}

// Each [blank] Otto left takes the fact the person typed for it; an unanswered one stays.
export function fillBlanks(text: string, facts: Readonly<Record<string, string>>): string {
  return text.replace(PLACEHOLDERS, (blank) => facts[blank]?.trim() || blank);
}

export function blankName(blank: string): string {
  return blank.slice(1, -1).trim();
}

// The offer most recently reached, for the congrats card.
export function latestOffer<T extends { status: string; statusChangedAt: number }>(
  applications: readonly T[],
): T | null {
  return applications
    .filter((application) => application.status === "offer")
    .reduce<T | null>(
      (latest, application) =>
        latest === null || application.statusChangedAt > latest.statusChangedAt
          ? application
          : latest,
      null,
    );
}
