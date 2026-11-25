import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { NO_REPLY_AFTER_DAYS } from "@/lib/applications/nudge";
import type { Application } from "@/lib/applications/schema";
import {
  interviewRate,
  MIN_FOR_RATE,
  type Tally,
  type VersionComparison,
  type VersionStats,
} from "@/lib/applications/stats";
import {
  MIN_GROUP,
  REPLY_WAIT_DAYS,
  type Comparison,
  type Working,
} from "@/lib/applications/working";
import type { SkillGap } from "@/lib/insights/skill-gaps";
import type { ApplicationsMessages } from "../i18n";

// The dashboard's words for what lib/applications/{view,nudge,stats,working} and lib/insights/skill-gaps say in English for the recap and studio.

export function sentLine(
  application: Pick<Application, "resumeId" | "resumeTitle">,
  titles: ReadonlyMap<string, { title: string }>,
  { row }: ApplicationsMessages,
): string {
  if (!application.resumeId) return row.notInOtto;
  const live = titles.get(application.resumeId);
  if (live) return fmt(row.quoted, { title: live.title });
  return application.resumeTitle
    ? fmt(row.quotedDeleted, { title: application.resumeTitle })
    : row.deletedResume;
}

export function nudgeLine(
  stale: readonly Pick<Application, "company">[],
  { nudge }: ApplicationsMessages,
  format: Format,
): string {
  const names = [
    ...new Set(stale.map((application) => application.company.trim()).filter(Boolean)),
  ];
  const weeks = format.number(NO_REPLY_AFTER_DAYS / 7);
  if (stale.length === 1) return fmt(nudge.one, { name: names[0] ?? nudge.oneCompany, weeks });
  const [first = "", second = ""] = names;
  const rest = stale.length - Math.min(names.length, 2);
  const who =
    names.length === 0
      ? fmt(nudge.companies, { count: format.number(stale.length) })
      : rest > 0
        ? fmt(nudge.moreNames, {
            names: names.slice(0, 2).join(", "),
            count: format.number(rest),
          })
        : names.length === 1
          ? first
          : fmt(nudge.twoNames, { first, second });
  return fmt(nudge.many, { who, weeks });
}

export function countsLine(counts: Tally, t: ApplicationsMessages, format: Format): string {
  if (counts.applications === 0) return t.winRate.noneYet;
  return fmt(t.winRate.countsLine, {
    interviews: format.plural(t.count.interviews, counts.interviews),
    applications: format.plural(t.count.applications, counts.applications),
  });
}

export function rateHeadline(counts: Tally, t: ApplicationsMessages, format: Format): string {
  const line = countsLine(counts, t, format);
  if (counts.applications === 0) return `${line}.`;
  const rate = interviewRate(counts);
  if (rate.shown) return fmt(t.winRate.headlineRate, { line, percent: rate.percent });
  return fmt(t.winRate.headlineWait, {
    line,
    min: format.number(MIN_FOR_RATE),
    left: format.number(rate.needed),
  });
}

export function swingNote(counts: Tally, t: ApplicationsMessages, format: Format): string {
  const { winRate } = t;
  const total = counts.applications;
  if (total === 0) return winRate.ownOnly;
  if (total < MIN_FOR_RATE) return fmt(winRate.swingSmall, { min: format.number(MIN_FOR_RATE) });
  const points = 100 / total;
  const moves = points < 1 ? winRate.underPoint : format.plural(winRate.points, Math.round(points));
  const applications = format.plural(t.count.applications, total);
  return fmt(total < 100 ? winRate.swingSome : winRate.swingMany, { applications, moves });
}

export function versionTitle(version: VersionStats, { winRate }: ApplicationsMessages): string {
  return version.state === "none" ? winRate.notInOtto : version.title;
}

export function comparisonLine(
  { first, second, points }: VersionComparison,
  t: ApplicationsMessages,
  format: Format,
): string {
  const rateOf = (version: VersionStats) =>
    fmt(t.winRate.rateOf, {
      percent: version.rate.shown ? version.rate.percent : 0,
      applications: format.plural(t.count.applications, version.tally.applications),
    });
  const values = {
    first: versionTitle(first, t),
    second: versionTitle(second, t),
    firstRate: rateOf(first),
    secondRate: rateOf(second),
  };
  return fmt(points === 0 ? t.winRate.same : t.winRate.led, values);
}

// "4 of 12" never breaks across lines.
function outcome(group: Comparison["with"], comparison: Comparison, t: ApplicationsMessages) {
  const hits = comparison.measure === "interviews" ? group.interviews : group.replies;
  return fmt(t.working.outcome, { hits, counted: group.counted }).replaceAll(" ", " ");
}

// What a comparison found: `lead` holds a <b> around the number to mark, `rest` the other group.
export function findingLines(
  comparison: Comparison,
  t: ApplicationsMessages,
): { lead: string; rest: string } {
  const { findings } = t.working;
  const interviews = comparison.measure === "interviews";
  const lead =
    comparison.topic === "resume"
      ? interviews
        ? findings.resumeInterviews
        : findings.resumeReplies
      : interviews
        ? findings.letterInterviews
        : findings.letterReplies;
  const rest = comparison.topic === "resume" ? findings.resumeRest : findings.letterRest;
  return {
    lead: fmt(lead, { outcome: outcome(comparison.with, comparison, t) }),
    rest: fmt(rest, { outcome: outcome(comparison.without, comparison, t) }),
  };
}

export function notEnoughText(comparison: Comparison, t: ApplicationsMessages, format: Format) {
  const { with: a, without: b } = comparison;
  const min = format.number(MIN_GROUP);
  if (comparison.topic === "letter") {
    const counts = { with: format.number(a.counted), without: format.number(b.counted) };
    return fmt(t.working.notEnoughLetter, { ...counts, min });
  }
  if (a.sent + b.sent === 0) return t.working.notEnoughNone;
  return fmt(t.working.notEnoughResume, {
    tailored: format.plural(t.working.tailoredCount, a.counted),
    general: format.plural(t.working.generalCount, b.counted),
    min,
  });
}

export function waitingText(waiting: number, t: ApplicationsMessages, format: Format) {
  if (waiting === 0) return null;
  return format.plural(t.working.waiting, waiting, { days: format.number(REPLY_WAIT_DAYS) });
}

export function suggestionText(
  working: Working,
  t: ApplicationsMessages,
  format: Format,
): { text: string; action: string | null } {
  const { suggest } = t.working;
  switch (working.suggestion) {
    case "tailor":
      return {
        text: working.resume.ready ? suggest.tailorWorks : suggest.tailorTry,
        action: suggest.tailorAction,
      };
    case "letter":
      return {
        text:
          working.letter?.measure === "interviews"
            ? suggest.letterInterviews
            : suggest.letterReplies,
        action: suggest.letterAction,
      };
    case "apply":
      return {
        text: working.resume.leader === "same" ? suggest.applySame : suggest.applyGeneral,
        action: suggest.applyAction,
      };
    case "wait":
      return { text: fmt(suggest.wait, { days: format.number(REPLY_WAIT_DAYS) }), action: null };
    case "log":
      return {
        text:
          working.total === 0
            ? fmt(suggest.logFirst, { min: format.number(MIN_GROUP) })
            : suggest.logNext,
        action: suggest.logAction,
      };
  }
}

export function gapLineText(gap: SkillGap, jobs: number, t: ApplicationsMessages, format: Format) {
  const of = format.plural(t.gaps.of, jobs, { short: format.number(gap.missing + gap.listed) });
  const line =
    gap.listed === 0 ? t.gaps.missing : gap.missing === 0 ? t.gaps.listOnly : t.gaps.notShown;
  return fmt(line, { term: gap.term, of });
}

export function gapNudgeText(gap: SkillGap, t: ApplicationsMessages, format: Format): string {
  if (gap.listed > 0 && gap.missing === 0) return fmt(t.gaps.show, { term: gap.term });
  return fmt(t.gaps.learn, { term: gap.term, asked: format.number(gap.asked) });
}
