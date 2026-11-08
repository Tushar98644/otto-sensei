import type { Application } from "./schema";
import { isStage, stageIndex } from "./status";

// Client-safe and pure: every number the win rate shows. Only the user's own applications count;
// there is no benchmark or average from anyone else, because we don't have an honest one.

// Below this many applications a rate is mostly noise (1 of 3 reads as 33%), so only counts show.
export const MIN_FOR_RATE = 5;

type Counted = Pick<Application, "status" | "stageReached">;
type Grouped = Counted & Pick<Application, "resumeId" | "resumeTitle" | "appliedAt">;

export type Outcome = { replied: boolean; interviewed: boolean; offered: boolean };

/**
 * What an application got: a reply is any step past applied, or a rejection (a "no" is still an
 * answer); a quiet one marked no reply is not. Counted from the furthest step it reached, so an
 * interview that later ended in a rejection still counts as an interview.
 */
export function outcomeOf(application: Counted): Outcome {
  // The status itself also counts, in case a row's furthest step lags behind it.
  const reached = Math.max(
    stageIndex(application.stageReached),
    isStage(application.status) ? stageIndex(application.status) : 0,
  );
  return {
    replied: reached >= stageIndex("screening") || application.status === "rejected",
    interviewed: reached >= stageIndex("interview"),
    offered: reached >= stageIndex("offer"),
  };
}

export type Tally = {
  applications: number;
  replies: number;
  interviews: number;
  offers: number;
  // Still "applied": no answer yet.
  waiting: number;
};

export function tally(list: readonly Counted[]): Tally {
  const counts: Tally = { applications: 0, replies: 0, interviews: 0, offers: 0, waiting: 0 };
  for (const application of list) {
    const outcome = outcomeOf(application);
    counts.applications += 1;
    if (outcome.replied) counts.replies += 1;
    if (outcome.interviewed) counts.interviews += 1;
    if (outcome.offered) counts.offers += 1;
    if (application.status === "applied") counts.waiting += 1;
  }
  return counts;
}

export type InterviewRate = { shown: true; percent: number } | { shown: false; needed: number };

// Interviews (offers included) per application, as a whole percent, from MIN_FOR_RATE on.
export function interviewRate(counts: Tally): InterviewRate {
  if (counts.applications < MIN_FOR_RATE) {
    return { shown: false, needed: MIN_FOR_RATE - counts.applications };
  }
  return { shown: true, percent: Math.round((counts.interviews / counts.applications) * 100) };
}

const number = new Intl.NumberFormat("en-US");

export function formatCount(count: number, one: string, many = `${one}s`): string {
  return `${number.format(count)} ${count === 1 ? one : many}`;
}

// "3 interviews from 20 applications": counts always come before any percentage.
export function countsLine(counts: Tally): string {
  if (counts.applications === 0) return "No applications logged yet";
  return `${formatCount(counts.interviews, "interview")} from ${formatCount(counts.applications, "application")}`;
}

// "3 interviews from 20 applications: a 15% interview rate." The rate only once it means something.
export function rateHeadline(counts: Tally): string {
  const line = countsLine(counts);
  if (counts.applications === 0) return `${line}.`;
  const rate = interviewRate(counts);
  if (rate.shown) return `${line}: a ${rate.percent}% interview rate.`;
  return `${line}. The interview rate shows from ${MIN_FOR_RATE} applications, ${rate.needed} to go.`;
}

// How far one more (or one fewer) interview would move the rate, so a 20% from 5 applications
// reads as the rough number it is.
export function swingNote(counts: Tally): string {
  const total = counts.applications;
  if (total === 0)
    return "Only your own applications count here, never an average from other people.";
  if (total < MIN_FOR_RATE) {
    return `Small numbers swing a lot, so the rate shows from ${MIN_FOR_RATE} applications.`;
  }
  const points = 100 / total;
  const moves = points < 1 ? "under 1 point" : formatCount(Math.round(points), "point");
  const lead = total < 100 ? "Small numbers swing a lot: with" : "With";
  return `${lead} ${formatCount(total, "application")}, 1 interview moves the rate by ${moves}.`;
}

export type VersionState = "live" | "deleted" | "none";

// What the page knows about a resume that still exists.
export type VersionInfo = { title: string; tailored: boolean };

export type VersionStats = {
  // The resume id, or "" for applications sent with a file that isn't in Otto.
  key: string;
  resumeId: string | null;
  title: string;
  state: VersionState;
  tailored: boolean;
  tally: Tally;
  rate: InterviewRate;
};

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/**
 * The win rate per resume version, most-used first. A version deleted since keeps its numbers
 * under the title it had when it was last sent.
 */
export function statsByVersion(
  list: readonly Grouped[],
  versions: ReadonlyMap<string, VersionInfo>,
): VersionStats[] {
  const groups = new Map<string, Grouped[]>();
  for (const application of list) {
    const key = application.resumeId ?? "";
    const group = groups.get(key);
    if (group) group.push(application);
    else groups.set(key, [application]);
  }

  const stats = [...groups].map(([key, group]): VersionStats => {
    const counts = tally(group);
    const live = key === "" ? undefined : versions.get(key);
    const state: VersionState = key === "" ? "none" : live ? "live" : "deleted";
    return {
      key,
      resumeId: key === "" ? null : key,
      title: live?.title ?? (state === "none" ? "A resume not in Otto" : lastTitle(group)),
      state,
      tailored: live?.tailored ?? false,
      tally: counts,
      rate: interviewRate(counts),
    };
  });
  return stats.sort(
    (a, b) =>
      b.tally.applications - a.tally.applications ||
      b.tally.interviews - a.tally.interviews ||
      collator.compare(a.title, b.title),
  );
}

function lastTitle(group: readonly Grouped[]): string {
  const latest = [...group]
    .filter((application) => application.resumeTitle.trim() !== "")
    .sort((a, b) => b.appliedAt - a.appliedAt)[0];
  return latest?.resumeTitle ?? "A deleted resume";
}

export type VersionComparison = {
  // The higher rate first.
  first: VersionStats;
  second: VersionStats;
  // Percentage points between the two.
  points: number;
};

/**
 * The two most-used versions side by side, only when both have MIN_FOR_RATE applications or more:
 * a gap between 1 of 2 and 3 of 10 says nothing.
 */
export function compareVersions(stats: readonly VersionStats[]): VersionComparison | null {
  const [a, b] = stats
    .filter((version) => version.rate.shown)
    .sort((x, y) => y.tally.applications - x.tally.applications);
  if (!a || !b) return null;
  const [first, second] = shownPercent(a) >= shownPercent(b) ? [a, b] : [b, a];
  return { first, second, points: shownPercent(first) - shownPercent(second) };
}

function shownPercent(version: VersionStats): number {
  return version.rate.shown ? version.rate.percent : 0;
}

export function comparisonLine({ first, second, points }: VersionComparison): string {
  const of = (version: VersionStats) =>
    `${shownPercent(version)}% of ${formatCount(version.tally.applications, "application")}`;
  if (points === 0) {
    return `“${first.title}” and “${second.title}” lead to interviews at the same rate so far: ${of(first)} and ${of(second)}.`;
  }
  return `“${first.title}” led to interviews for ${of(first)}, “${second.title}” for ${of(second)}.`;
}
