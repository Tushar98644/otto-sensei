import { resumeToText, visibleResume } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { monthOf, parseRange } from "@/lib/sendcheck/dates";
import { findSkills } from "./skills";
import { MATCH_PROFILE_LIMITS, type MatchProfile } from "./types";

// Only skills, titles and years are sent for ranking; nothing else leaves the browser.

export function yearsOfExperience(resume: Resume, now: number): number | null {
  const nowMonth = monthOf(now);
  const spans: [number, number][] = [];
  for (const job of resume.experience) {
    if (job.hidden) continue;
    const range = parseRange(job.startDate, job.endDate, nowMonth);
    if (!range.start || !range.end) continue;
    const from = range.start.earliest;
    const to = Math.min(range.end.latest, nowMonth);
    if (to >= from) spans.push([from, to]);
  }
  if (spans.length === 0) return null;
  spans.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let [from, to] = spans[0]!;
  for (const [start, end] of spans.slice(1)) {
    if (start <= to + 1) {
      to = Math.max(to, end);
    } else {
      months += to - from + 1;
      [from, to] = [start, end];
    }
  }
  months += to - from + 1;
  return Math.round((months / 12) * 10) / 10;
}

export function matchProfileOf(resume: Resume, now: number): MatchProfile {
  const shown = visibleResume(resume);
  const titles = [...shown.experience.map((job) => job.title), shown.basics.headline]
    .map((title) => title.trim().slice(0, MATCH_PROFILE_LIMITS.titleChars))
    .filter(Boolean);
  return {
    skills: findSkills(resumeToText(resume), MATCH_PROFILE_LIMITS.skills),
    titles: [...new Set(titles)].slice(0, MATCH_PROFILE_LIMITS.titles),
    years: yearsOfExperience(shown, now),
  };
}
